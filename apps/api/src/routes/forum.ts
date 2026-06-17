import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';

const CATEGORIES = ['FIELD_NOTES', 'GEAR', 'SAFETY', 'REQUESTS', 'STORIES'] as const;

const CreatePostSchema = z.object({
  title: z.string().trim().min(6).max(120),
  body: z.string().trim().min(20).max(5000),
  category: z.enum(CATEGORIES),
});

const CreateReplySchema = z.object({
  body: z.string().trim().min(2).max(3000),
});

export async function forumRoutes(app: FastifyInstance) {
  app.get('/api/forum/posts', async (req) => {
    const query = req.query as { category?: string; limit?: string };
    const category = CATEGORIES.includes(query.category as typeof CATEGORIES[number])
      ? query.category as typeof CATEGORIES[number]
      : undefined;
    const limit = Math.min(Number(query.limit ?? 30), 50);
    return app.prisma.forumPost.findMany({
      where: { ...(category ? { category } : {}) },
      include: {
        author: { select: { id: true, handle: true, displayName: true, rank: true } },
        _count: { select: { replies: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
  });

  app.get('/api/forum/posts/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const post = await app.prisma.forumPost.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, handle: true, displayName: true, rank: true } },
        replies: {
          include: { author: { select: { id: true, handle: true, displayName: true, rank: true } } },
          orderBy: { createdAt: 'asc' },
          take: 200,
        },
      },
    });
    if (!post) return reply.status(404).send({ code: 'NOT_FOUND' });
    return reply.send(post);
  });

  app.post('/api/forum/posts', { preHandler: [requireAuth] }, async (req, reply) => {
    const parsed = CreatePostSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const baseSlug = slugify(parsed.data.title);
    const suffix = Math.random().toString(36).slice(2, 8);
    const post = await app.prisma.forumPost.create({
      data: {
        ...parsed.data,
        slug: `${baseSlug}-${suffix}`,
        authorId: req.explorerId,
      },
      include: { author: { select: { id: true, handle: true, displayName: true, rank: true } } },
    });
    return reply.status(201).send(post);
  });

  app.post('/api/forum/posts/:slug/replies', { preHandler: [requireAuth] }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const parsed = CreateReplySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const post = await app.prisma.forumPost.findUnique({ where: { slug }, select: { id: true, lockedAt: true } });
    if (!post) return reply.status(404).send({ code: 'NOT_FOUND' });
    if (post.lockedAt) return reply.status(423).send({ code: 'POST_LOCKED' });
    const replyPost = await app.prisma.forumReply.create({
      data: { postId: post.id, authorId: req.explorerId, body: parsed.data.body },
      include: { author: { select: { id: true, handle: true, displayName: true, rank: true } } },
    });
    return reply.status(201).send(replyPost);
  });
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'forum-post';
}
