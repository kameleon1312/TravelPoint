import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!env.redisUrl) return null;
  if (!redis) {
    redis = new Redis(env.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
    redis.on('error', (error) => {
      logger.warn({ err: error }, 'Redis connection error');
    });
  }
  return redis;
}

export async function closeRedis(): Promise<void> {
  if (!redis) return;
  await redis.quit().catch(() => redis?.disconnect());
  redis = null;
}
