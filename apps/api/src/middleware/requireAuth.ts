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
      select: { id: true, suspendedAt: true },
    });
    if (!active) {
      return reply.status(401).send({ code: 'ACCOUNT_DELETED', message: 'Account no longer exists' });
    }
    if (active.suspendedAt) {
      return reply.status(403).send({ code: 'ACCOUNT_SUSPENDED', message: 'Account is suspended' });
    }

    req.explorerId = payload.sub;
  } catch {
    return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }
}

export async function requireModerator(req: FastifyRequest, reply: FastifyReply) {
  await requireAuth(req, reply);
  if (reply.sent) return;
  const explorer = await req.server.prisma.explorer.findUnique({
    where: { id: req.explorerId },
    select: { role: true },
  });
  if (!explorer || !['MODERATOR', 'ADMIN'].includes(explorer.role)) {
    return reply.status(403).send({ code: 'MODERATOR_REQUIRED' });
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    explorerId: string;
  }
}
