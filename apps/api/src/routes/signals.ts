import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/requireAuth';

export async function signalRoutes(app: FastifyInstance) {
  // GET /api/signals — unseen signals for current explorer
  app.get('/api/signals', { preHandler: [requireAuth] }, async (req, reply) => {
    const signals = await app.prisma.signal.findMany({
      where: { explorerId: req.explorerId, seenAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return reply.send(signals);
  });

  // PATCH /api/signals/seen — mark all signals as seen
  app.patch('/api/signals/seen', { preHandler: [requireAuth] }, async (req, reply) => {
    await app.prisma.signal.updateMany({
      where: { explorerId: req.explorerId, seenAt: null },
      data: { seenAt: new Date() },
    });
    return reply.status(204).send();
  });
}
