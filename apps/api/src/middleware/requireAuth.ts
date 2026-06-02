import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../lib/jwt';

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) {
    return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Missing token' });
  }
  try {
    const payload = verifyAccessToken(auth.slice(7));

    // Block deleted accounts — every authenticated request checks DB.
    // Access tokens are 15 min so the exposure window is minimal anyway,
    // but GDPR requires immediate invalidation on erasure.
    const active = await req.server.prisma.explorer.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true },
    });
    if (!active) {
      return reply.status(401).send({ code: 'ACCOUNT_DELETED', message: 'Account no longer exists' });
    }

    req.explorerId = payload.sub;
  } catch {
    return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    explorerId: string;
  }
}
