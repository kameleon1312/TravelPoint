import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
import { verifyAccessToken } from '../lib/jwt';
import { logger } from '../lib/logger';
import { fuzzCoordinates, generateSessionSeed } from '@travelpoint/geo';

export default fp(async (app: FastifyInstance) => {
  const io = new Server(app.server, {
    cors: {
      origin: (process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:3000').split(','),
      credentials: true,
    },
  });

  // Auth middleware — verify JWT on connection
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

    // Join personal room for targeted signals
    void socket.join(`explorer:${explorerId}`);

    // Opt-in to presence broadcasting — coords fuzzed ≥500m before broadcast
    socket.on('presence:enable', (data: { lat: number; lng: number }) => {
      void socket.join('presence');
      const seed = generateSessionSeed();
      const fuzzed = fuzzCoordinates(data.lat, data.lng, 500, seed);
      socket.to('presence').emit('explorer:nearby', {
        explorerId,
        lat: fuzzed.lat,
        lng: fuzzed.lng,
      });
    });

    socket.on('presence:disable', () => {
      void socket.leave('presence');
    });

    // Join a circle room for real-time chat
    socket.on('circle:join', (circleId: string) => {
      void socket.join(`circle:${circleId}`);
    });

    socket.on('circle:leave', (circleId: string) => {
      void socket.leave(`circle:${circleId}`);
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
