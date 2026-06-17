import type { ContentStatus } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireModerator } from '../middleware/requireAuth';

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
  app.get('/api/journal/posts', async (req) => {
    const status = ((req.query as { status?: ContentStatus }).status ?? 'PUBLISHED') as ContentStatus;
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
