import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/requireAuth';

export async function transmissionRoutes(app: FastifyInstance) {
  // GET /api/transmissions — inbox (received messages)
  app.get('/api/transmissions', { preHandler: [requireAuth] }, async (req, reply) => {
    const messages = await app.prisma.transmission.findMany({
      where: { recipientId: req.explorerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        sender: { select: { id: true, handle: true, rank: true, displayName: true } },
      },
    });
    return reply.send(messages);
  });

  // POST /api/transmissions — send message
  app.post('/api/transmissions', { preHandler: [requireAuth] }, async (req, reply) => {
    const { recipientId, circleId, body } = req.body as {
      recipientId?: string;
      circleId?: string;
      body: string;
    };

    if (!recipientId && !circleId) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', message: 'recipientId or circleId required' });
    }
    if (!body?.trim() || body.length > 2000) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', message: 'body required, max 2000 chars' });
    }

    const msg = await app.prisma.transmission.create({
      data: {
        senderId: req.explorerId,
        recipientId: recipientId ?? null,
        circleId: circleId ?? null,
        body: body.trim(),
      },
    });
    return reply.status(201).send(msg);
  });

  // PATCH /api/transmissions/:id/read
  app.patch('/api/transmissions/:id/read', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await app.prisma.transmission.updateMany({
      where: { id, recipientId: req.explorerId },
      data: { readAt: new Date() },
    });
    return reply.status(204).send();
  });

  // GET /api/transmissions/circle/:circleId — circle chat
  app.get('/api/transmissions/circle/:circleId', { preHandler: [requireAuth] }, async (req, reply) => {
    const { circleId } = req.params as { circleId: string };

    const membership = await app.prisma.circleMember.findFirst({
      where: { circleId, explorerId: req.explorerId },
    });
    if (!membership) return reply.status(403).send({ code: 'FORBIDDEN' });

    const messages = await app.prisma.transmission.findMany({
      where: { circleId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        sender: { select: { id: true, handle: true, rank: true, displayName: true } },
      },
    });
    return reply.send(messages.reverse());
  });
}
