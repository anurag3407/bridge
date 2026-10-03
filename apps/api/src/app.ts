import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env';
import { errorHandler } from './plugins/error-handler';
import { identityRoutes } from './modules/identity/identity.routes';
import { bridgesRoutes } from './modules/bridges/bridges.routes';
import { statusRoutes } from './modules/status/status.routes';
import { assignmentsRoutes } from './modules/assignments/assignments.routes';
import { auditRoutes } from './modules/audit/audit.routes';
import { assetsRoutes } from './modules/assets/assets.routes';
import { getPool } from '@bridge/database';
import { isRedisHealthy } from './plugins/redis';
import { randomUUID } from 'crypto';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: false, // Observability package handles structured logging
    genReqId: (req) => (req.headers['x-request-id'] as string) || randomUUID(),
  });

  // Global Error Handler
  app.setErrorHandler(errorHandler);

  // Security Headers
  await app.register(helmet, {
    contentSecurityPolicy: false, // Allowed for API
  });

  // CORS
  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return cb(null, true);
      if (env.CORS_ALLOWED_ORIGINS.includes(origin) || env.NODE_ENV !== 'production') {
        return cb(null, true);
      }
      return cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  // Rate Limiting
  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  });

  // OpenAPI / Swagger Documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Bridge Operations Platform API',
        description: 'Authoritative API for bridge operational status, 3D asset manifests, and operator reporting.',
        version: '1.0.0',
      },
      servers: [{ url: `http://localhost:${env.PORT}` }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/documentation',
  });

  // Health Endpoints (Section 17.2)
  app.get('/health/live', async () => ({ status: 'live', timestamp: new Date().toISOString() }));

  app.get('/health/ready', async (request, reply) => {
    try {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
      } finally {
        client.release();
      }

      return {
        status: 'ready',
        database: 'connected',
        redis: isRedisHealthy() ? 'connected' : 'degraded',
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      reply.status(503);
      return {
        status: 'unavailable',
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      };
    }
  });

  // Register Modules
  await app.register(identityRoutes);
  await app.register(bridgesRoutes);
  await app.register(statusRoutes);
  await app.register(assignmentsRoutes);
  await app.register(auditRoutes);
  await app.register(assetsRoutes);

  return app;
}
