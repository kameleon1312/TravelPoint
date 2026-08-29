import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

let redis: Redis | null = null;
let pubClient: Redis | null = null;
let subClient: Redis | null = null;

function makeClient(url: string): Redis {
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
  });
  client.on('error', (error) => {
    logger.warn({ err: error }, 'Redis connection error');
  });
  return client;
}

export function getRedis(): Redis | null {
  if (!env.redisUrl) return null;
  if (!redis) redis = makeClient(env.redisUrl);
  return redis;
}

export function getRedisPub(): Redis | null {
  if (!env.redisUrl) return null;
  if (!pubClient) pubClient = makeClient(env.redisUrl);
  return pubClient;
}

export function getRedisSub(): Redis | null {
  if (!env.redisUrl) return null;
  if (!subClient) subClient = makeClient(env.redisUrl);
  return subClient;
}

export async function closeRedis(): Promise<void> {
  await Promise.all([
    redis?.quit().catch(() => redis?.disconnect()),
    pubClient?.quit().catch(() => pubClient?.disconnect()),
    subClient?.quit().catch(() => subClient?.disconnect()),
  ]);
  redis = null;
  pubClient = null;
  subClient = null;
}
