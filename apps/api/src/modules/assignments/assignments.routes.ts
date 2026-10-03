import { FastifyInstance } from 'fastify';
import {
  AssignmentRepository,
  ProfileRepository,
  AuditRepository,
  withTransaction,
  getPool,
} from '@bridge/database';
import { AssignOperatorRequestSchema } from '@bridge/contracts';
import { requireSuperAdmin } from '../../plugins/jwt';

export async function assignmentsRoutes(app: FastifyInstance) {
  const assignmentRepo = new AssignmentRepository();
  const profileRepo = new ProfileRepository();
  const auditRepo = new AuditRepository();

  // POST /api/v1/admin/assignments
  app.post('/api/v1/admin/assignments', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { bridgeId, userId } = AssignOperatorRequestSchema.parse(request.body);
    const actor = request.user!;
    const requestId = (request.headers['x-request-id'] as string) || request.id;

    const assignmentId = await withTransaction(
      async (client) => {
        const id = await assignmentRepo.assignOperator(client, bridgeId, userId, actor.id);
        await auditRepo.record(client, {
          actorId: actor.id,
          action: 'operator.assigned',
          entityType: 'bridge_assignment',
          entityId: id,
          requestId,
          outcome: 'success',
          metadata: { bridgeId, userId },
        });
        return id;
      },
      { userId: actor.id, role: 'super_admin', requestId }
    );

    reply.status(201);
    return { id: assignmentId, success: true };
  });

  // DELETE /api/v1/admin/assignments
  app.delete('/api/v1/admin/assignments', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { bridgeId, userId } = AssignOperatorRequestSchema.parse(request.body);
    const actor = request.user!;
    const requestId = (request.headers['x-request-id'] as string) || request.id;

    await withTransaction(
      async (client) => {
        await assignmentRepo.revokeOperator(client, bridgeId, userId);
        await auditRepo.record(client, {
          actorId: actor.id,
          action: 'operator.revoked',
          entityType: 'bridge_assignment',
          entityId: `${bridgeId}:${userId}`,
          requestId,
          outcome: 'success',
          metadata: { bridgeId, userId },
        });
      },
      { userId: actor.id, role: 'super_admin', requestId }
    );

    return { success: true };
  });

  // GET /api/v1/admin/users
  app.get('/api/v1/admin/users', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const pool = getPool();
    const client = await pool.connect();
    try {
      return await profileRepo.list(client);
    } finally {
      client.release();
    }
  });
}
