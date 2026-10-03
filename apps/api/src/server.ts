import { buildApp } from './app';
import { env } from './config/env';
import { logger } from '@bridge/observability';
import { closePool } from '@bridge/database';
import { getRedisClient } from './plugins/redis';

async function start() {
  const app = await buildApp();

  // Initialize Redis connection
  getRedisClient();

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await app.close();
      await closePool();
      const redis = getRedisClient();
      if (redis) {
        await redis.quit();
      }
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', { error: (err as Error).message });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    logger.info(`Bridge Operations API listening on http://0.0.0.0:${env.PORT}`);
    logger.info(`Swagger API docs available at http://localhost:${env.PORT}/documentation`);
  } catch (err) {
    logger.error('Failed to start server', { error: (err as Error).message });
    process.exit(1);
  }
}

if (require.main === module || process.argv[1]?.endsWith('server.ts')) {
  start();
}
