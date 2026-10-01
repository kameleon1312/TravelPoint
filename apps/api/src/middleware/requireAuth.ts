import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  role?: string;
}

export function verifySupabaseJwt(token: string): SupabaseJwtPayload {
  const payload = jwt.verify(token, env.supabaseJwtSecret) as SupabaseJwtPayload;
  if (payload.role !== 'authenticated') throw new Error('Unauthorized role');
  return payload;
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) {
    return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Missing token' });
  }

  let supabaseUserId: string;
  try {
    const payload = verifySupabaseJwt(auth.slice(7));
    supabaseUserId = payload.sub;
  } catch {
    return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }

  const explorer = await req.server.prisma.explorer.findFirst({
    where: { supabaseId: supabaseUserId, deletedAt: null },
    select: { id: true, suspendedAt: true },
  });

  if (!explorer) {
    return reply.status(401).send({ code: 'ACCOUNT_NOT_FOUND', message: 'Explorer profile not found. Complete signup first.' });
  }
  if (explorer.suspendedAt) {
    return reply.status(403).send({ code: 'ACCOUNT_SUSPENDED', message: 'Account is suspended' });
  }

  req.explorerId = explorer.id;

  // Throttled write: update lastSeenAt at most every 5 min to avoid write storm.
  // Optional chaining lets test mocks omit updateMany without crashing.
  void req.server.prisma.explorer.updateMany?.({
    where: {
      id: explorer.id,
      OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } }],
    },
    data: { lastSeenAt: new Date() },
  })?.catch(() => {});
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
