import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken } from '../lib/jwt';

export async function requireAuthOptional(req: FastifyRequest, _reply: FastifyReply) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return;
  try {
    const token = header.slice('Bearer '.length);
    const payload = verifyAccessToken(token);
    req.explorerId = payload.sub;
  } catch {
    // Optional auth: malformed tokens simply produce anonymous analytics.
  }
}
