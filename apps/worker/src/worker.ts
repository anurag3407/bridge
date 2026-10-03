import dotenv from 'dotenv';
import Redis from 'ioredis';
import { logger } from '@bridge/observability';
import { closePool } from '@bridge/database';
import { processOutboxBatch } from './jobs/outbox';
import { processAssetJobs } from './jobs/asset-processor';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
let isRunning = true;

async function start() {
  logger.info('Starting Bridge background worker...');

  let redisClient: Redis | null = null;
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    redisClient.on('error', () => {
      // Degraded worker mode without redis
    });
  } catch {}

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down worker...`);
    isRunning = false;
    if (redisClient) {
      await redisClient.quit();
    }
    await closePool();
    logger.info('Worker shutdown completed');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  while (isRunning) {
    try {
      await processOutboxBatch(redisClient);
      await processAssetJobs();
    } catch (err) {
      logger.error('Error in worker processing loop', { error: (err as Error).message });
    }
    // Sleep 1 second between ticks
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

if (require.main === module || process.argv[1]?.endsWith('worker.ts')) {
  start();
}
