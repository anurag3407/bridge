import { FastifyInstance } from 'fastify';
import {
  AssetRepository,
  AuditRepository,
  withTransaction,
  getPool,
} from '@bridge/database';
import { ViewerConfigSchema } from '@bridge/contracts';
import { requireSuperAdmin } from '../../plugins/jwt';
import { z } from 'zod';

const RegisterAssetSchema = z.object({
  modelUrl: z.string(),
  sha256: z.string(),
  byteCount: z.number().int().nonnegative(),
  optimizationMethod: z.enum(['baseline', 'draco', 'meshopt']).default('baseline'),
});

export async function assetsRoutes(app: FastifyInstance) {
  const assetRepo = new AssetRepository();
  const auditRepo = new AuditRepository();

  // POST /api/v1/admin/bridges/:bridgeId/assets
  app.post<{ Params: { bridgeId: string } }>(
    '/api/v1/admin/bridges/:bridgeId/assets',
    { preHandler: [requireSuperAdmin] },
    async (request, reply) => {
      const { bridgeId } = request.params;
      const data = RegisterAssetSchema.parse(request.body);
      const user = request.user!;
      const requestId = (request.headers['x-request-id'] as string) || request.id;

      const assetId = await withTransaction(
        async (client) => {
          const id = await assetRepo.createAsset(
            client,
            bridgeId,
            data.modelUrl,
            data.sha256,
            data.byteCount,
            user.id,
            data.optimizationMethod
          );

          await auditRepo.record(client, {
            actorId: user.id,
            action: 'asset.registered',
            entityType: 'bridge_asset',
            entityId: id,
            requestId,
            outcome: 'success',
            metadata: { bridgeId, modelUrl: data.modelUrl, sha256: data.sha256 },
          });

          return id;
        },
        { userId: user.id, role: 'super_admin', requestId }
      );

      reply.status(201);
      return { id: assetId, success: true };
    }
  );

  // POST /api/v1/admin/bridges/:bridgeId/viewer-config
  app.post<{ Params: { bridgeId: string } }>(
    '/api/v1/admin/bridges/:bridgeId/viewer-config',
    { preHandler: [requireSuperAdmin] },
    async (request, reply) => {
      const { bridgeId } = request.params;
      const config = ViewerConfigSchema.parse(request.body);
      const user = request.user!;
      const requestId = (request.headers['x-request-id'] as string) || request.id;

      const configId = await withTransaction(
        async (client) => {
          const id = await assetRepo.saveViewerConfig(client, bridgeId, config.assetId, config);

          await auditRepo.record(client, {
            actorId: user.id,
            action: 'viewer_config.saved',
            entityType: 'bridge_viewer_config',
            entityId: id,
            requestId,
            outcome: 'success',
            metadata: { bridgeId, assetId: config.assetId },
          });

          return id;
        },
        { userId: user.id, role: 'super_admin', requestId }
      );

      reply.status(201);
      return { id: configId, success: true };
    }
  );
}
