import Fastify from 'fastify';
import { registerSecurity } from './plugins/security';
import prismaPlugin from './plugins/prisma';
import { authRoutes } from './routes/auth';
import { spotsRoutes } from './routes/spots';
import { explorerRoutes } from './routes/explorers';
import { logger } from './lib/logger';

const app = Fastify({ logger: false });

async function bootstrap() {
  await registerSecurity(app);
  await app.register(prismaPlugin);

  // Routes
  await app.register(authRoutes);
  await app.register(spotsRoutes);
  await app.register(explorerRoutes);

  // Health check
  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  const port = Number(process.env['PORT'] ?? 4000);
  await app.listen({ port, host: '0.0.0.0' });
  logger.info(`TravelPoint ENGINE running on :${port}`);
}

bootstrap().catch((err) => {
  logger.error(err, 'Failed to start server');
  process.exit(1);
});
