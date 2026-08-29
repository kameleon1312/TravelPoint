import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import type { SignalType as PrismaSignalType } from '@prisma/client';
import { requireAuth } from '../middleware/requireAuth';
import type { SignalType } from '@travelpoint/types';

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

// Helper used by other routes to push a signal and notify via socket
export async function pushSignal(
  app: FastifyInstance,
  explorerId: string,
  type: SignalType,
  payload: Record<string, unknown>,
  dedupeKey?: string,
): Promise<void> {
  // Cast needed: packages/types includes FORUM_REPLY which is pending migration on DB
  const data = { explorerId, type: type as PrismaSignalType, payload: payload as Prisma.InputJsonValue, dedupeKey };
  const signal = dedupeKey
    ? await app.prisma.signal.upsert({
        where: { dedupeKey },
        create: data,
        update: {},
      })
    : await app.prisma.signal.create({ data });
  // Notify the explorer's personal socket room in real-time
  app.io.to(`explorer:${explorerId}`).emit('signal:new', signal);
}
