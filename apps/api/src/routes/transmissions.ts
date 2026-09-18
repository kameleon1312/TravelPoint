import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';
import { pushSignal } from './signals';
import { sendPushToExplorer, sendPushToMany } from '../services/push';
import {
  getAllowedCircleRecipientIds,
  getBlockedExplorerIds,
} from '../services/blockAccess';

const CreateTransmissionSchema = z.object({
  recipientId: z.string().cuid().optional(),
  circleId:    z.string().cuid().optional(),
  body:        z.string().trim().min(1).max(2000),
}).refine(
  (d) => !!(d.recipientId ?? d.circleId) && !(d.recipientId && d.circleId),
  { message: 'Provide exactly one target: recipientId or circleId' },
);

export async function transmissionRoutes(app: FastifyInstance) {
  // GET /api/transmissions — DM inbox (received, no circle messages)
  app.get('/api/transmissions', { preHandler: [requireAuth] }, async (req, reply) => {
    const blockedIds = await getBlockedExplorerIds(app.prisma, req.explorerId);
    const messages = await app.prisma.transmission.findMany({
      where: {
        recipientId: req.explorerId,
        circleId: null,
        senderId: { notIn: blockedIds },
      },
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
    const blocked = await app.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: req.explorerId, blockedId: otherId },
          { blockerId: otherId, blockedId: req.explorerId },
        ],
      },
    });
    if (blocked) return reply.status(403).send({ code: 'BLOCKED' });

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
    const parsed = CreateTransmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const { recipientId, circleId, body } = parsed.data;

    if (circleId) {
      const membership = await app.prisma.circleMember.findFirst({
        where: { circleId, explorerId: req.explorerId },
      });
      if (!membership) return reply.status(403).send({ code: 'FORBIDDEN' });
    }
    if (recipientId) {
      const blocked = await app.prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: req.explorerId, blockedId: recipientId },
            { blockerId: recipientId, blockedId: req.explorerId },
          ],
        },
      });
      if (blocked) return reply.status(403).send({ code: 'BLOCKED' });
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
      const recipientIds = await getAllowedCircleRecipientIds(
        app.prisma,
        circleId,
        req.explorerId,
      );
      app.io.to(`explorer:${req.explorerId}`).emit('circle:message', msg);
      for (const recipientId of recipientIds) {
        app.io.to(`explorer:${recipientId}`).emit('circle:message', msg);
      }
      const circle = await app.prisma.circle.findUnique({
        where: { id: circleId }, select: { name: true },
      });

      void sendPushToMany(
        app.prisma,
        recipientIds,
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

  // GET /api/transmissions/circle/:circleId?before=<iso>&limit=<n>
  app.get('/api/transmissions/circle/:circleId', { preHandler: [requireAuth] }, async (req, reply) => {
    const { circleId } = req.params as { circleId: string };
    const { before, limit } = req.query as { before?: string; limit?: string };

    const membership = await app.prisma.circleMember.findFirst({
      where: { circleId, explorerId: req.explorerId },
    });
    if (!membership) return reply.status(403).send({ code: 'FORBIDDEN' });
    const blockedIds = await getBlockedExplorerIds(app.prisma, req.explorerId);

    const take = Math.min(Number(limit) || 50, 100);
    const beforeDate = before ? new Date(before) : undefined;

    const messages = await app.prisma.transmission.findMany({
      where: {
        circleId,
        senderId: { notIn: blockedIds },
        ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        sender: { select: { id: true, handle: true, rank: true, displayName: true } },
      },
    });
    const sorted = messages.reverse();
    const hasMore = messages.length === take;
    return reply.send({ messages: sorted, hasMore, oldestCursor: sorted[0]?.createdAt ?? null });
  });
}
