import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { verifySupabaseJwt } from '../middleware/requireAuth';
import { logger } from '../lib/logger';
import { fuzzCoordinates, generateSessionSeed } from '@travelpoint/geo';
import { sendPushToMany } from '../services/push';
import { hasCircleMembership } from '../services/circleAccess';
import { env } from '../config/env';
import { getRedisPub, getRedisSub } from '../lib/redis';
import {
  getAllowedCircleRecipientIds,
  getBlockedExplorerIds,
} from '../services/blockAccess';

interface CircleRoomSocket {
  join(room: string): Promise<void> | void;
  emit(event: 'error', payload: { code: string; message: string }): void;
}

export async function joinCircleRoom(
  prisma: FastifyInstance['prisma'],
  socket: CircleRoomSocket,
  explorerId: string,
  circleId: unknown,
): Promise<boolean> {
  if (typeof circleId !== 'string' || !circleId) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Circle id required' });
    return false;
  }
  if (!await hasCircleMembership(prisma, circleId, explorerId)) {
    socket.emit('error', { code: 'FORBIDDEN', message: 'Not a circle member' });
    return false;
  }
  await socket.join(`circle:${circleId}`);
  return true;
}

export default fp(async (app: FastifyInstance) => {
  const io = new Server(app.server, {
    cors: {
      origin: env.allowedOrigins,
      credentials: true,
    },
  });

  const pub = getRedisPub();
  const sub = getRedisSub();
  if (pub && sub) {
    io.adapter(createAdapter(pub, sub));
    logger.info('Socket.IO using Redis adapter');
  } else {
    logger.info('Socket.IO using in-memory adapter (no REDIS_URL)');
  }

  io.use(async (socket, next) => {
    const token = socket.handshake.auth['token'] as string | undefined;
    if (!token) return next(new Error('UNAUTHORIZED'));
    try {
      const { sub: supabaseUserId } = verifySupabaseJwt(token);
      const explorer = await app.prisma.explorer.findFirst({
        where: { supabaseId: supabaseUserId, deletedAt: null },
        select: { id: true },
      });
      if (!explorer) return next(new Error('ACCOUNT_NOT_FOUND'));
      socket.data['explorerId'] = explorer.id;
      next();
    } catch {
      next(new Error('INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket) => {
    const explorerId = socket.data['explorerId'] as string;
    logger.info({ explorerId }, 'Socket connected');

    void socket.join(`explorer:${explorerId}`);

    let lastPresenceEnable = 0;
    const PRESENCE_THROTTLE_MS = 30_000;

    // ── Presence (opt-in, coords fuzzed ≥500m) ────────────────────────────────
    socket.on('presence:enable', async (data: { lat?: unknown; lng?: unknown }) => {
      const now = Date.now();
      if (now - lastPresenceEnable < PRESENCE_THROTTLE_MS) return;
      lastPresenceEnable = now;
      if (
        typeof data?.lat !== 'number' ||
        typeof data.lng !== 'number' ||
        data.lat < -90 || data.lat > 90 ||
        data.lng < -180 || data.lng > 180
      ) {
        socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Invalid coordinates' });
        return;
      }

      const explorer = await app.prisma.explorer.findFirst({
        where: { id: explorerId, deletedAt: null, presenceConsent: true, locationConsent: true },
        select: { id: true },
      });
      if (!explorer) {
        socket.emit('error', { code: 'CONSENT_REQUIRED', message: 'Presence consent required' });
        return;
      }

      await socket.join('presence');
      const seed = generateSessionSeed();
      const fuzzed = fuzzCoordinates(data.lat, data.lng, 500, seed);
      const nearbySockets = await io.in('presence').fetchSockets();
      const blockedIds = new Set(await getBlockedExplorerIds(app.prisma, explorerId));
      const day = new Date().toISOString().slice(0, 10);
      for (const nearbySocket of nearbySockets) {
        const nearbyId = nearbySocket.data['explorerId'] as string | undefined;
        if (!nearbyId || nearbyId === explorerId || blockedIds.has(nearbyId)) continue;
        io.to(nearbySocket.id).emit('explorer:nearby', {
          explorerId,
          lat: fuzzed.lat,
          lng: fuzzed.lng,
        });
        const pair = [explorerId, nearbyId].sort().join(':');
        await Promise.all([
          app.prisma.signal.upsert({
            where: { dedupeKey: `nearby:${pair}:${day}:${explorerId}` },
            create: {
              explorerId,
              type: 'NEARBY_EXPLORER',
              dedupeKey: `nearby:${pair}:${day}:${explorerId}`,
              payload: { explorerId: nearbyId },
            },
            update: {},
          }),
          app.prisma.signal.upsert({
            where: { dedupeKey: `nearby:${pair}:${day}:${nearbyId}` },
            create: {
              explorerId: nearbyId,
              type: 'NEARBY_EXPLORER',
              dedupeKey: `nearby:${pair}:${day}:${nearbyId}`,
              payload: { explorerId },
            },
            update: {},
          }),
        ]);
      }
    });

    socket.on('presence:disable', () => {
      void socket.leave('presence');
    });

    // ── Circle room management ─────────────────────────────────────────────────
    socket.on('circle:join', async (circleId: unknown) => {
      await joinCircleRoom(app.prisma, socket, explorerId, circleId);
    });

    socket.on('circle:leave', (circleId: string) => {
      void socket.leave(`circle:${circleId}`);
    });

    // ── Circle real-time chat ─────────────────────────────────────────────────
    // Server-authoritative: validates membership, persists to DB, then broadcasts.
    socket.on('circle:message', async (data: { circleId: string; body: string }) => {
      if (!data?.circleId || !data?.body?.trim() || data.body.length > 2000) return;

      try {
        if (!await hasCircleMembership(app.prisma, data.circleId, explorerId)) {
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

        const [recipientIds, circle] = await Promise.all([
          getAllowedCircleRecipientIds(app.prisma, data.circleId, explorerId),
          app.prisma.circle.findUnique({
            where: { id: data.circleId }, select: { name: true },
          }),
        ]);
        io.to(`explorer:${explorerId}`).emit('circle:message', msg);
        for (const recipientId of recipientIds) {
          io.to(`explorer:${recipientId}`).emit('circle:message', msg);
        }

        void sendPushToMany(
          app.prisma,
          recipientIds,
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
