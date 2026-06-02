import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/requireAuth';

export async function transmissionRoutes(app: FastifyInstance) {
  // GET /api/transmissions — DM inbox (received messages, grouped by sender on client)
  app.get('/api/transmissions', { preHandler: [requireAuth] }, async (req, reply) => {
    const messages = await app.prisma.transmission.findMany({
      where: { recipientId: req.explorerId, circleId: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        sender: { select: { id: true, handle: true, rank: true, displayName: true } },
      },
    });
    return reply.send(messages);
  });

  // GET /api/transmissions/thread/:explorerId — full bidirectional conversation
  app.get('/api/transmissions/thread/:explorerId', { preHandler: [requireAuth] }, async (req, reply) => {
    const { explorerId: otherId } = req.params as { explorerId: string };

    const [messages, other] = await Promise.all([
      app.prisma.transmission.findMany({
        where: {
          OR: [
            { senderId: req.explorerId, recipientId: otherId },
            { senderId: otherId, recipientId: req.explorerId },
          ],
          circleId: null,
        },
        orderBy: { createdAt: 'asc' },
        take: 200,
        include: {
          sender: { select: { id: true, handle: true, rank: true, displayName: true } },
        },
      }),
      app.prisma.explorer.findUnique({
        where: { id: otherId },
        select: { id: true, handle: true, rank: true, displayName: true },
      }),
    ]);

    // Mark received messages as read
    await app.prisma.transmission.updateMany({
      where: { senderId: otherId, recipientId: req.explorerId, readAt: null },
      data: { readAt: new Date() },
    });

    return reply.send({ messages, other });
  });

  // POST /api/transmissions — send DM or circle message
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

    if (circleId) {
      const membership = await app.prisma.circleMember.findFirst({
        where: { circleId, explorerId: req.explorerId },
      });
      if (!membership) return reply.status(403).send({ code: 'FORBIDDEN' });
    }

    const msg = await app.prisma.transmission.create({
      data: {
        senderId: req.explorerId,
        recipientId: recipientId ?? null,
        circleId: circleId ?? null,
        body: body.trim(),
      },
      include: {
        sender: { select: { id: true, handle: true, rank: true, displayName: true } },
      },
    });

    // Real-time delivery
    if (recipientId) {
      app.io.to(`explorer:${recipientId}`).emit('transmission:new', msg);
    }
    if (circleId) {
      app.io.to(`circle:${circleId}`).emit('circle:message', msg);
    }

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

  // GET /api/transmissions/circle/:circleId — circle chat history
  app.get('/api/transmissions/circle/:circleId', { preHandler: [requireAuth] }, async (req, reply) => {
    const { circleId } = req.params as { circleId: string };

    const membership = await app.prisma.circleMember.findFirst({
      where: { circleId, explorerId: req.explorerId },
    });
    if (!membership) return reply.status(403).send({ code: 'FORBIDDEN' });

    const messages = await app.prisma.transmission.findMany({
      where: { circleId },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: {
        sender: { select: { id: true, handle: true, rank: true, displayName: true } },
      },
    });
    return reply.send(messages);
  });
}
