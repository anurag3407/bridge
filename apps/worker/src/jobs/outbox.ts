import { getPool, OutboxRepository, withTransaction } from '@bridge/database';
import { logger } from '@bridge/observability';
import Redis from 'ioredis';

const outboxRepo = new OutboxRepository();

export async function processOutboxBatch(redisClient?: Redis | null): Promise<number> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const events = await withTransaction(async (txClient) => {
      const unprocessed = await outboxRepo.fetchUnprocessed(txClient, 20);
      for (const event of unprocessed) {
        // Handle outbox event side effects
        if (event.eventType === 'status.reported' || event.eventType === 'bridge.updated') {
          if (redisClient) {
            try {
              await redisClient.del('bridge-platform:v1:directory');
              await redisClient.del(`bridge-platform:v1:bridge-metadata:${event.entityId}`);
            } catch (err) {
              logger.warn('Failed to invalidate Redis cache in outbox processor', {
                error: (err as Error).message,
              });
            }
          }
        }
        await outboxRepo.markProcessed(txClient, event.id);
      }
      return unprocessed;
    });

    return events.length;
  } finally {
    client.release();
  }
}
