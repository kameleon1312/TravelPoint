import type { ContentStatus } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireModerator, verifySupabaseJwt } from '../middleware/requireAuth';

const JournalPostSchema = z.object({
  slug: z.string().trim().min(3).max(140).regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(4).max(160),
  excerpt: z.string().trim().min(20).max(400),
  bodyMdx: z.string().trim().min(20),
  coverImage: z.string().url().optional(),
  authorName: z.string().trim().min(2).max(80),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});

export async function journalRoutes(app: FastifyInstance) {
  app.get('/api/journal/posts', async (req, reply) => {
    const requested = (req.query as { status?: string }).status ?? 'PUBLISHED';
    // Non-published status requires moderator — guard against DRAFT/ARCHIVED leak
    if (requested !== 'PUBLISHED') {
      const auth = req.headers['authorization'];
      if (!auth?.startsWith('Bearer ')) return reply.status(403).send({ code: 'FORBIDDEN' });
      try {
        const { sub: supabaseUserId } = verifySupabaseJwt(auth.slice(7));
        const explorer = await app.prisma.explorer.findFirst({
          where: { supabaseId: supabaseUserId, deletedAt: null },
          select: { role: true },
        });
        if (!explorer || !['MODERATOR', 'ADMIN'].includes(explorer.role)) {
          return reply.status(403).send({ code: 'FORBIDDEN' });
        }
      } catch {
        return reply.status(403).send({ code: 'FORBIDDEN' });
      }
    }
    const status = requested as ContentStatus;
    return app.prisma.journalPost.findMany({
      where: { status, ...(status === 'PUBLISHED' ? { publishedAt: { not: null } } : {}) },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });
  });

  app.get('/api/journal/posts/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const post = await app.prisma.journalPost.findUnique({ where: { slug } });
    if (!post || post.status !== 'PUBLISHED') return reply.status(404).send({ code: 'NOT_FOUND' });
    return reply.send(post);
  });

  app.post('/api/admin/journal/posts', { preHandler: [requireModerator] }, async (req, reply) => {
    const parsed = JournalPostSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const post = await app.prisma.journalPost.create({
      data: {
        ...parsed.data,
        status: parsed.data.status ?? 'DRAFT',
        publishedAt: parsed.data.status === 'PUBLISHED' ? new Date() : null,
      },
    });
    return reply.status(201).send(post);
  });

  app.patch('/api/admin/journal/posts/:slug', { preHandler: [requireModerator] }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const parsed = JournalPostSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const post = await app.prisma.journalPost.update({
      where: { slug },
      data: {
        ...parsed.data,
        publishedAt: parsed.data.status === 'PUBLISHED' ? new Date() : undefined,
      },
    });
    return reply.send(post);
  });
}
