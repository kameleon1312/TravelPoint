import type { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from '../config/env';
import { getRedis } from '../lib/redis';

export async function registerSecurity(app: FastifyInstance) {
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:', env.r2.publicUrl ?? 'https://media.travelpoint.app'],
        connectSrc: ["'self'", ...env.allowedOrigins],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  });

  await app.register(cors, {
    origin: env.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  const redis = getRedis();
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
    ...(redis ? { redis, nameSpace: 'travelpoint:rate-limit:' } : {}),
  });
}
