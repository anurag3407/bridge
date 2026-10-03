import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '@bridge/observability';

let redisClient: Redis | null = null;
let isRedisAvailable = false;

export function getRedisClient(): Redis | null {
  if (!redisClient) {
    try {
      redisClient = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
          if (times > 3) {
            logger.warn('Redis unreachable, operating in degraded mode without cache');
            return null;
          }
          return Math.min(times * 100, 1000);
        },
      });

      redisClient.on('connect', () => {
        isRedisAvailable = true;
        logger.info('Connected to Redis');
      });

      redisClient.on('error', (err) => {
        isRedisAvailable = false;
        logger.warn('Redis error, caching disabled', { error: err.message });
      });
    } catch (err) {
      isRedisAvailable = false;
      logger.warn('Could not initialize Redis client', { error: (err as Error).message });
    }
  }
  return redisClient;
}

export function isRedisHealthy(): boolean {
  return isRedisAvailable;
}

export async function invalidateCacheKey(pattern: string): Promise<void> {
  const client = getRedisClient();
  if (!client || !isRedisAvailable) return;

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (err) {
    logger.warn('Failed to invalidate Redis cache keys', { pattern, error: (err as Error).message });
  }
}
