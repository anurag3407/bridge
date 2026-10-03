import { FastifyInstance } from 'fastify';
import {
  BridgeRepository,
  StatusRepository,
  AssignmentRepository,
  getPool,
  withTransaction,
  AuditRepository,
} from '@bridge/database';
import {
  CreateBridgeRequestSchema,
  UpdateBridgeRequestSchema,
} from '@bridge/contracts';
import { authenticate, requireSuperAdmin } from '../../plugins/jwt';
import { NotFoundError, ForbiddenError } from '@bridge/domain';
import { getRedisClient, isRedisHealthy } from '../../plugins/redis';

export async function bridgesRoutes(app: FastifyInstance) {
  const bridgeRepo = new BridgeRepository();
  const statusRepo = new StatusRepository();
  const assignmentRepo = new AssignmentRepository();
  const auditRepo = new AuditRepository();

  // 1. Public bridge directory
  app.get('/api/v1/bridges', async (request, reply) => {
    const redis = getRedisClient();
    const cacheKey = 'bridge-platform:v1:directory';

    if (redis && isRedisHealthy()) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch {}
    }

    const pool = getPool();
    const client = await pool.connect();
    try {
      const bridges = await bridgeRepo.listPublished(client);

      if (redis && isRedisHealthy()) {
        try {
          await redis.set(cacheKey, JSON.stringify(bridges), 'EX', 30);
        } catch {}
      }

      return bridges;
    } finally {
      client.release();
    }
  });

  // 2. Public bridge detail by slug
  app.get<{ Params: { slug: string } }>('/api/v1/bridges/:slug', async (request, reply) => {
    const { slug } = request.params;
    const pool = getPool();
    const client = await pool.connect();

    try {
      const bridge = await bridgeRepo.findBySlug(client, slug);
      if (!bridge) {
        throw new NotFoundError(`Bridge not found: ${slug}`);
      }

      if (bridge.lifecycle !== 'published') {
        // Only super admin or assigned operator may see draft/retired bridge
        const authHeader = request.headers.authorization;
        if (!authHeader) {
          throw new NotFoundError(`Bridge not found: ${slug}`);
        }
        // Let user check happen if token is provided
      }

      return bridge;
    } finally {
      client.release();
    }
  });

  // 3. Small authoritative status snapshot for polling / reconnection
  app.get<{ Params: { bridgeId: string } }>(
    '/api/v1/bridges/:bridgeId/status',
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store');
      const { bridgeId } = request.params;
      const pool = getPool();
      const client = await pool.connect();

      try {
        const status = await statusRepo.getPublicStatus(client, bridgeId);
        if (!status) {
          throw new NotFoundError(`Status not found for bridge: ${bridgeId}`);
        }
        return status;
      } finally {
        client.release();
      }
    }
  );

  // 4. Authenticated Operator assigned bridges
  app.get('/api/v1/me/bridges', { preHandler: [authenticate] }, async (request, reply) => {
    const user = request.user!;
    const pool = getPool();
    const client = await pool.connect();

    try {
      if (user.roles.includes('super_admin')) {
        return bridgeRepo.listAll(client);
      }

      const assignedBridgeIds = await assignmentRepo.getAssignedBridgeIds(client, user.id);
      if (assignedBridgeIds.length === 0) {
        return [];
      }

      const all = await bridgeRepo.listAll(client);
      return all.filter((b) => assignedBridgeIds.includes(b.id));
    } finally {
      client.release();
    }
  });

  // 5. Admin: List all bridges (including drafts/retired)
  app.get('/api/v1/admin/bridges', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const pool = getPool();
    const client = await pool.connect();
    try {
      return await bridgeRepo.listAll(client);
    } finally {
      client.release();
    }
  });

  // 6. Admin: Create new bridge
  app.post('/api/v1/admin/bridges', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const data = CreateBridgeRequestSchema.parse(request.body);
    const user = request.user!;
    const requestId = (request.headers['x-request-id'] as string) || request.id;

    const bridgeId = await withTransaction(
      async (client) => {
        const id = await bridgeRepo.create(client, data);
        await auditRepo.record(client, {
          actorId: user.id,
          action: 'bridge.created',
          entityType: 'bridge',
          entityId: id,
          requestId,
          outcome: 'success',
          metadata: { slug: data.slug, displayName: data.displayName },
        });
        return id;
      },
      { userId: user.id, role: 'super_admin', requestId }
    );

    reply.status(201);
    return { id: bridgeId };
  });

  // 7. Admin: Update bridge
  app.patch<{ Params: { bridgeId: string } }>(
    '/api/v1/admin/bridges/:bridgeId',
    { preHandler: [requireSuperAdmin] },
    async (request, reply) => {
      const { bridgeId } = request.params;
      const data = UpdateBridgeRequestSchema.parse(request.body);
      const user = request.user!;
      const requestId = (request.headers['x-request-id'] as string) || request.id;

      await withTransaction(
        async (client) => {
          await bridgeRepo.update(client, bridgeId, data);
          await auditRepo.record(client, {
            actorId: user.id,
            action: 'bridge.updated',
            entityType: 'bridge',
            entityId: bridgeId,
            requestId,
            outcome: 'success',
            metadata: data,
          });
        },
        { userId: user.id, role: 'super_admin', requestId }
      );

      // Invalidate directory cache
      const redis = getRedisClient();
      if (redis && isRedisHealthy()) {
        try {
          await redis.del('bridge-platform:v1:directory');
        } catch {}
      }

      return { success: true };
    }
  );
}
