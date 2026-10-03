import { FastifyInstance } from 'fastify';
import {
  BridgeRepository,
  StatusRepository,
  AssignmentRepository,
  IdempotencyRepository,
  OutboxRepository,
  AuditRepository,
  withTransaction,
  getPool,
} from '@bridge/database';
import { SubmitReportRequestSchema, BridgePublicStatus } from '@bridge/contracts';
import { authenticate, requireAssignedOperator } from '../../plugins/jwt';
import {
  validateConditionTransition,
  incrementRevision,
  assertExpectedRevision,
  computeIdempotencyHash,
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from '@bridge/domain';
import { getRedisClient, isRedisHealthy } from '../../plugins/redis';

export async function statusRoutes(app: FastifyInstance) {
  const bridgeRepo = new BridgeRepository();
  const statusRepo = new StatusRepository();
  const assignmentRepo = new AssignmentRepository();
  const idempotencyRepo = new IdempotencyRepository();
  const outboxRepo = new OutboxRepository();
  const auditRepo = new AuditRepository();

  // POST /api/v1/bridges/:bridgeId/reports
  // Implements Section 7.5 Atomic Report Algorithm
  app.post<{ Params: { bridgeId: string } }>(
    '/api/v1/bridges/:bridgeId/reports',
    { preHandler: [authenticate] },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store');
      const { bridgeId } = request.params;
      const user = request.user!;
      const requestId = (request.headers['x-request-id'] as string) || request.id;
      const idempotencyKey = request.headers['idempotency-key'] as string | undefined;

      const body = SubmitReportRequestSchema.parse(request.body);

      // Verify authorization: must be active super admin or active assigned operator
      if (!user.roles.includes('super_admin')) {
        const pool = getPool();
        const checkClient = await pool.connect();
        try {
          const isAssigned = await assignmentRepo.isOperatorAssigned(checkClient, bridgeId, user.id);
          if (!isAssigned) {
            throw new ForbiddenError('You are not authorized to report condition for this bridge');
          }
        } finally {
          checkClient.release();
        }
      }

      const requestHash = idempotencyKey
        ? computeIdempotencyHash(user.id, `report:${bridgeId}`, body)
        : '';

      const result = await withTransaction(
        async (client) => {
          // Check existing idempotency record
          if (idempotencyKey) {
            const existing = await idempotencyRepo.get(
              client,
              user.id,
              `report:${bridgeId}`,
              idempotencyKey
            );
            if (existing) {
              if (existing.requestHash !== requestHash) {
                throw new ConflictError(
                  'Idempotency key has already been used with a different request payload'
                );
              }
              // Return previous successful response safely
              reply.status(existing.responseStatus);
              return existing.responseBody as BridgePublicStatus;
            }
          }

          // Fetch bridge to check lifecycle
          const bridge = await bridgeRepo.findById(client, bridgeId);
          if (!bridge) {
            throw new NotFoundError(`Bridge not found: ${bridgeId}`);
          }

          // Lock current status row with FOR UPDATE
          const currentStatus = await statusRepo.lockCurrentStatus(client, bridgeId);
          if (!currentStatus) {
            throw new NotFoundError(`Current status row missing for bridge: ${bridgeId}`);
          }

          // Compare revision and throw StaleRevisionError (409) if mismatched
          assertExpectedRevision(currentStatus.revision, body.expectedRevision);

          // Validate domain condition transition rules
          validateConditionTransition({
            currentCondition: currentStatus.condition,
            newCondition: body.condition,
            reason: body.reason,
            lifecycle: bridge.lifecycle,
          });

          // Monotonically increment revision
          const newRevision = incrementRevision(currentStatus.revision);

          // Update current status
          const reportedAt = await statusRepo.updateCurrentStatus(
            client,
            bridgeId,
            body.condition,
            newRevision,
            user.id
          );

          // Append immutable status history
          await statusRepo.appendStatusHistory(client, {
            bridgeId,
            oldCondition: currentStatus.condition,
            newCondition: body.condition,
            oldRevision: currentStatus.revision,
            newRevision,
            actorId: user.id,
            privateReason: body.reason,
            publicNote: body.publicNote,
            requestId,
          });

          // Update public projection if published
          await statusRepo.updatePublicProjection(
            client,
            bridgeId,
            body.condition,
            newRevision,
            body.publicNote
          );

          // Record audit event
          await auditRepo.record(client, {
            actorId: user.id,
            action: 'bridge.condition_reported',
            entityType: 'bridge',
            entityId: bridgeId,
            requestId,
            outcome: 'success',
            metadata: {
              oldCondition: currentStatus.condition,
              newCondition: body.condition,
              revision: newRevision,
              hasPublicNote: !!body.publicNote,
            },
          });

          // Outbox event for worker/cache invalidation
          await outboxRepo.append(client, 'status.reported', bridgeId, {
            bridgeId,
            condition: body.condition,
            revision: newRevision,
            reportedAt: reportedAt.toISOString(),
          });

          // Fetch fresh public status snapshot
          const publicStatus = await statusRepo.getPublicStatus(client, bridgeId);
          if (!publicStatus) {
            throw new Error('Failed to retrieve updated public status snapshot');
          }

          // Store idempotency record if key was provided
          if (idempotencyKey) {
            await idempotencyRepo.save(
              client,
              user.id,
              `report:${bridgeId}`,
              idempotencyKey,
              requestHash,
              200,
              publicStatus
            );
          }

          return publicStatus;
        },
        { userId: user.id, role: user.roles[0], requestId }
      );

      // Invalidate Redis directory cache
      const redis = getRedisClient();
      if (redis && isRedisHealthy()) {
        try {
          await redis.del('bridge-platform:v1:directory');
        } catch {}
      }

      return result;
    }
  );

  // GET /api/v1/bridges/:bridgeId/history
  // Authorized: only super admin or assigned operator may inspect private report history
  app.get<{
    Params: { bridgeId: string };
    Querystring: { before?: string; limit?: string };
  }>(
    '/api/v1/bridges/:bridgeId/history',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { bridgeId } = request.params;
      const user = request.user!;
      const pool = getPool();
      const client = await pool.connect();

      try {
        if (!user.roles.includes('super_admin')) {
          const isAssigned = await assignmentRepo.isOperatorAssigned(client, bridgeId, user.id);
          if (!isAssigned) {
            throw new ForbiddenError('You are not authorized to view history for this bridge');
          }
        }

        const limit = request.query.limit ? parseInt(request.query.limit, 10) : 20;
        const history = await statusRepo.getHistory(client, bridgeId, limit, request.query.before);
        return history;
      } finally {
        client.release();
      }
    }
  );
}
