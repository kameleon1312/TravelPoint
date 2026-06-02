import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
import { verifyAccessToken } from '../lib/jwt';
import { logger } from '../lib/logger';
import { fuzzCoordinates, generateSessionSeed } from '@travelpoint/geo';
import { sendPushToMany } from '../services/push';

export default fp(async (app: FastifyInstance) => {
  const io = new Server(app.server, {
    cors: {
      origin: (process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:3000').split(','),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth['token'] as string | undefined;
    if (!token) return next(new Error('UNAUTHORIZED'));
    try {
      const payload = verifyAccessToken(token);
      socket.data['explorerId'] = payload.sub;
      next();
    } catch {
      next(new Error('INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket) => {
    const explorerId = socket.data['explorerId'] as string;
    logger.info({ explorerId }, 'Socket connected');

    void socket.join(`explorer:${explorerId}`);

    // ── Presence (opt-in, coords fuzzed ≥500m) ────────────────────────────────
    socket.on('presence:enable', (data: { lat: number; lng: number }) => {
      void socket.join('presence');
      const seed = generateSessionSeed();
      const fuzzed = fuzzCoordinates(data.lat, data.lng, 500, seed);
      socket.to('presence').emit('explorer:nearby', { explorerId, lat: fuzzed.lat, lng: fuzzed.lng });
    });

    socket.on('presence:disable', () => {
      void socket.leave('presence');
    });

    // ── Circle room management ─────────────────────────────────────────────────
    socket.on('circle:join', (circleId: string) => {
      void socket.join(`circle:${circleId}`);
    });

    socket.on('circle:leave', (circleId: string) => {
      void socket.leave(`circle:${circleId}`);
    });

    // ── Circle real-time chat ─────────────────────────────────────────────────
    // Server-authoritative: validates membership, persists to DB, then broadcasts.
    socket.on('circle:message', async (data: { circleId: string; body: string }) => {
      if (!data?.circleId || !data?.body?.trim() || data.body.length > 2000) return;

      try {
        const membership = await app.prisma.circleMember.findFirst({
          where: { circleId: data.circleId, explorerId },
        });
        if (!membership) {
          socket.emit('error', { code: 'FORBIDDEN', message: 'Not a circle member' });
          return;
        }

        const msg = await app.prisma.transmission.create({
          data: {
            senderId: explorerId,
            circleId: data.circleId,
            body: data.body.trim(),
          },
          include: {
            sender: { select: { id: true, handle: true, rank: true, displayName: true } },
          },
        });

        io.to(`circle:${data.circleId}`).emit('circle:message', msg);

        // Push to offline circle members
        const [members, circle] = await Promise.all([
          app.prisma.circleMember.findMany({
            where: { circleId: data.circleId, explorerId: { not: explorerId } },
            select: { explorerId: true },
          }),
          app.prisma.circle.findUnique({
            where: { id: data.circleId }, select: { name: true },
          }),
        ]);

        void sendPushToMany(
          app.prisma,
          members.map((m) => m.explorerId),
          `◑ ${circle?.name ?? 'Circle'}`,
          `@${msg.sender?.handle ?? 'explorer'}: ${data.body.trim().slice(0, 60)}`,
          { type: 'circle_message', circleId: data.circleId, id: msg.id },
        );
      } catch (err) {
        logger.error({ err }, 'circle:message handler error');
      }
    });

    socket.on('disconnect', () => {
      logger.info({ explorerId }, 'Socket disconnected');
    });
  });

  app.decorate('io', io);

  app.addHook('onClose', async () => {
    await io.close();
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    io: Server;
  }
}
