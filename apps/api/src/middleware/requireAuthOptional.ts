import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifySupabaseJwt } from './requireAuth';

export async function requireAuthOptional(req: FastifyRequest, _reply: FastifyReply) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return;
  try {
    const token = header.slice('Bearer '.length);
    const { sub: supabaseUserId } = verifySupabaseJwt(token);
    const explorer = await req.server.prisma.explorer.findFirst({
      where: { supabaseId: supabaseUserId, deletedAt: null },
      select: { id: true },
    });
    if (explorer) req.explorerId = explorer.id;
  } catch {
    // Optional auth: invalid tokens produce anonymous requests.
  }
}
