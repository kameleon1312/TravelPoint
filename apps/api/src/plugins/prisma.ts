import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { createPool, createPrismaClient } from '../lib/db';
import { closeRedis } from '../lib/redis';

const pool = createPool();
const prisma = createPrismaClient(pool);

export default fp(async (app: FastifyInstance) => {
  app.decorate('prisma', prisma);
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
    await pool.end();
    await closeRedis();
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    prisma: ReturnType<typeof createPrismaClient>;
  }
}
