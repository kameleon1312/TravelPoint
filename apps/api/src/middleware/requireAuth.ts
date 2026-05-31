import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../lib/jwt';

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) {
    return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Missing token' });
  }
  try {
    const payload = verifyAccessToken(auth.slice(7));
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
