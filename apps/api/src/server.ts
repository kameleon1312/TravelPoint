// Sentry MUST be initialised before any other import so it can instrument them.
import { initSentry, Sentry } from './lib/sentry';
initSentry();

import 'dotenv/config';
import Fastify from 'fastify';
import { registerSecurity } from './plugins/security';
import prismaPlugin from './plugins/prisma';
import socketPlugin from './plugins/socket';
import { authRoutes } from './routes/auth';
import { spotsRoutes } from './routes/spots';
import { explorerRoutes } from './routes/explorers';
import { journeyRoutes } from './routes/journeys';
import { circleRoutes } from './routes/circles';
import { transmissionRoutes } from './routes/transmissions';
import { signalRoutes } from './routes/signals';
import { waitlistRoutes } from './routes/waitlist';
import { rodoRoutes } from './routes/rodo';
import { moderationRoutes } from './routes/moderation';
import { billingRoutes } from './routes/billing';
import { forumRoutes } from './routes/forum';
import { analyticsRoutes } from './routes/analytics';
import { journalRoutes } from './routes/journal';
import { feedRoutes } from './routes/feed';
import { searchRoutes } from './routes/search';
import { logger } from './lib/logger';
import { env } from './config/env';
import { getRedis } from './lib/redis';
import { checkPushReceipts } from './services/pushReceipts';

const app = Fastify({ logger: false });

async function bootstrap() {
  await registerSecurity(app);
  await app.register(prismaPlugin);
  await app.register(socketPlugin);

  // Routes
  await app.register(authRoutes);
  await app.register(spotsRoutes);
  await app.register(explorerRoutes);
  await app.register(journeyRoutes);
  await app.register(circleRoutes);
  await app.register(transmissionRoutes);
  await app.register(signalRoutes);
  await app.register(waitlistRoutes);
  await app.register(rodoRoutes);
  await app.register(moderationRoutes);
  await app.register(billingRoutes);
  await app.register(forumRoutes);
  await app.register(analyticsRoutes);
  await app.register(journalRoutes);
  await app.register(feedRoutes);
  await app.register(searchRoutes);

  // Health check — used by Railway / uptime monitors
  app.get('/health', async (_request, reply) => {
    try {
      const [database, postgis, redis] = await Promise.all([
        app.prisma.$queryRaw`SELECT 1`,
        app.prisma.$queryRaw<Array<{ installed: boolean }>>`SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') AS installed`,
        checkRedis(),
      ]);
      void database;
      return {
        status: 'ok',
        ts: new Date().toISOString(),
        checks: {
          database: 'ok',
          postgis: postgis[0]?.installed ? 'ok' : 'missing',
          redis,
        },
        version: env.appVersion,
      };
    } catch (error) {
      logger.error({ err: error }, 'Database health check failed');
      return reply.status(503).send({
        status: 'unavailable',
        ts: new Date().toISOString(),
      });
    }
  });

  // Sentry error handler — must be registered after all routes
  app.setErrorHandler((error, _request, reply) => {
    Sentry.captureException(error);
    logger.error({ err: error }, 'Unhandled request error');
    void reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  });

  await app.listen({ port: env.port, host: '0.0.0.0' });
  logger.info(`TravelPoint ENGINE running on :${env.port}`);

  // Check Expo push receipts every 30 minutes to clean up invalid tokens
  const RECEIPT_INTERVAL_MS = 30 * 60 * 1000;
  setInterval(() => {
    void checkPushReceipts(app.prisma);
  }, RECEIPT_INTERVAL_MS);

  // Self-ping every 4 minutes to prevent Railway from sleeping the container.
  // Railway (Hobby plan) puts services to sleep after a period of no incoming traffic.
  // RAILWAY_PUBLIC_DOMAIN is automatically injected by Railway in production.
  const railwayDomain = process.env['RAILWAY_PUBLIC_DOMAIN'];
  if (railwayDomain) {
    const keepAliveUrl = `https://${railwayDomain}/health`;
    const KEEP_ALIVE_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes < Railway's ~5 min sleep threshold
    setInterval(() => {
      fetch(keepAliveUrl).catch(() => { /* ignore — server might be restarting */ });
    }, KEEP_ALIVE_INTERVAL_MS);
    logger.info(`Keep-alive: pinging ${keepAliveUrl} every 4 minutes`);
  }

  // Graceful shutdown on SIGTERM (sent by Railway when stopping/sleeping the container)
  const shutdown = async () => {
    logger.info('SIGTERM received — shutting down gracefully');
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => { void shutdown(); });
}

async function checkRedis(): Promise<'ok' | 'disabled' | 'unavailable'> {
  const redis = getRedis();
  if (!redis) return 'disabled';
  try {
    await redis.ping();
    return 'ok';
  } catch {
    return 'unavailable';
  }
}

bootstrap().catch((err) => {
  Sentry.captureException(err);
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
