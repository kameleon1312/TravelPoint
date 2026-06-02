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
import { logger } from './lib/logger';

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

  // Health check — used by Railway / uptime monitors
  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  // Sentry error handler — must be registered after all routes
  app.setErrorHandler((error, _request, reply) => {
    Sentry.captureException(error);
    logger.error(error, 'Unhandled request error');
    void reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  });

  const port = Number(process.env['PORT'] ?? 4000);
  await app.listen({ port, host: '0.0.0.0' });
  logger.info(`TravelPoint ENGINE running on :${port}`);
}

bootstrap().catch((err) => {
  Sentry.captureException(err);
  logger.error(err, 'Failed to start server');
  process.exit(1);
});
