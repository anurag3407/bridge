import { FastifyInstance } from 'fastify';
import { AuditRepository, getPool } from '@bridge/database';
import { requireSuperAdmin } from '../../plugins/jwt';

export async function auditRoutes(app: FastifyInstance) {
  const auditRepo = new AuditRepository();

  app.get('/api/v1/admin/audit', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const limit = (request.query as any).limit ? parseInt((request.query as any).limit, 10) : 50;
    const pool = getPool();
    const client = await pool.connect();
    try {
      return await auditRepo.list(client, limit);
    } finally {
      client.release();
    }
  });
}
