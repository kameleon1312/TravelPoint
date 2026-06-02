import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/requireAuth';
import { pushSignal } from './signals';
import { sendPushToExplorer, sendPushToMany } from '../services/push';

export async function transmissionRoutes(app: FastifyInstance) {
  // GET /api/transmissions — DM inbox (received, no circle messages)
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

  // GET /api/transmissions/thread/:explorerId — bidirectional conversation
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

    // Mark all received messages in this thread as read
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

    const [sender, msg] = await Promise.all([
      app.prisma.explorer.findUnique({
        where: { id: req.explorerId },
        select: { handle: true },
      }),
      app.prisma.transmission.create({
        data: {
          senderId: req.explorerId,
          recipientId: recipientId ?? null,
          circleId: circleId ?? null,
          body: body.trim(),
        },
        include: {
          sender: { select: { id: true, handle: true, rank: true, displayName: true } },
        },
      }),
    ]);

    const senderHandle = sender?.handle ?? 'explorer';

    // ── DM: socket + signal + push ─────────────────────────────────────────
    if (recipientId) {
      app.io.to(`explorer:${recipientId}`).emit('transmission:new', msg);

      // Create in-app signal for the recipient
      void pushSignal(app, recipientId, 'TRANSMISSION', {
        senderId:      req.explorerId,
        senderHandle,
        preview:       body.trim().slice(0, 80),
        transmissionId: msg.id,
      });

      // Push notification — truncate body to avoid long notification text
      void sendPushToExplorer(
        app.prisma,
        recipientId,
        `◎ @${senderHandle}`,
        body.trim().length > 80 ? body.trim().slice(0, 77) + '…' : body.trim(),
        { type: 'transmission', id: msg.id, senderId: req.explorerId },
      );
    }

    // ── Circle: socket + push to offline members ───────────────────────────
    if (circleId) {
      app.io.to(`circle:${circleId}`).emit('circle:message', msg);

      // Push to circle members who are NOT currently in the socket room
      // (best-effort: push to all members except sender, socket handles online ones)
      const members = await app.prisma.circleMember.findMany({
        where: { circleId, explorerId: { not: req.explorerId } },
        select: { explorerId: true },
      });
      const circle = await app.prisma.circle.findUnique({
        where: { id: circleId }, select: { name: true },
      });

      void sendPushToMany(
        app.prisma,
        members.map((m: { explorerId: string }) => m.explorerId),
        `◑ ${circle?.name ?? 'Circle'}`,
        `@${senderHandle}: ${body.trim().slice(0, 60)}`,
        { type: 'circle_message', circleId, id: msg.id },
      );
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
