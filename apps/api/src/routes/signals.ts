import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { requireAuth } from '../middleware/requireAuth';
import type { SignalType } from '@travelpoint/types';

export async function signalRoutes(app: FastifyInstance) {
  // GET /api/signals — signals for current explorer, newest first
  // Query params: before=<ISO datetime> for cursor pagination, limit=<1-50>
  app.get('/api/signals', { preHandler: [requireAuth] }, async (req, reply) => {
    const query = req.query as { before?: string; limit?: string };
    const limit = Math.min(Math.max(Number(query.limit ?? 50), 1), 50);
    const cursor = query.before ? new Date(query.before) : undefined;
    if (cursor && isNaN(cursor.getTime())) {
      return reply.status(400).send({ code: 'INVALID_CURSOR' });
    }
    const signals = await app.prisma.signal.findMany({
      where: {
        explorerId: req.explorerId,
        ...(cursor ? { createdAt: { lt: cursor } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });
    const hasMore = signals.length > limit;
    const items = hasMore ? signals.slice(0, limit) : signals;
    const nextCursor = hasMore ? items[items.length - 1]?.createdAt.toISOString() : null;
    return reply.send({ signals: items, nextCursor });
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
  const data = { explorerId, type, payload: payload as Prisma.InputJsonValue, dedupeKey };
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
