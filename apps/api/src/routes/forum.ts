import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireModerator } from '../middleware/requireAuth';
import { pushSignal } from './signals';

const CATEGORIES = ['FIELD_NOTES', 'GEAR', 'SAFETY', 'REQUESTS', 'STORIES'] as const;

const CreatePostSchema = z.object({
  title: z.string().trim().min(6).max(120),
  body: z.string().trim().min(20).max(5000),
  category: z.enum(CATEGORIES),
});

const UpdatePostSchema = z.object({
  title: z.string().trim().min(6).max(120).optional(),
  body: z.string().trim().min(20).max(5000).optional(),
  category: z.enum(CATEGORIES).optional(),
});

const CreateReplySchema = z.object({
  body: z.string().trim().min(2).max(3000),
});

const EDIT_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

export async function forumRoutes(app: FastifyInstance) {
  // GET /api/forum/posts — paginated listing
  app.get('/api/forum/posts', async (req) => {
    const query = req.query as { category?: string; page?: string; limit?: string };
    const category = CATEGORIES.includes(query.category as typeof CATEGORIES[number])
      ? (query.category as typeof CATEGORIES[number])
      : undefined;
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(Math.max(Number(query.limit ?? 30), 1), 50);
    const skip = (page - 1) * limit;

    const where = category ? { category } : {};
    const [posts, total] = await Promise.all([
      app.prisma.forumPost.findMany({
        where,
        include: {
          author: { select: { id: true, handle: true, displayName: true, rank: true } },
          _count: { select: { replies: true } },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      app.prisma.forumPost.count({ where }),
    ]);

    return { posts, total, page, limit, pages: Math.ceil(total / limit) };
  });

  // GET /api/forum/posts/:slug
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

  // POST /api/forum/posts
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

  // PATCH /api/forum/posts/:slug — author edit within 30 min window
  app.patch('/api/forum/posts/:slug', { preHandler: [requireAuth] }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const parsed = UpdatePostSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const post = await app.prisma.forumPost.findUnique({ where: { slug } });
    if (!post) return reply.status(404).send({ code: 'NOT_FOUND' });
    if (post.authorId !== req.explorerId) return reply.status(403).send({ code: 'FORBIDDEN' });
    if (Date.now() - post.createdAt.getTime() > EDIT_WINDOW_MS) {
      return reply.status(403).send({ code: 'EDIT_WINDOW_EXPIRED' });
    }
    const updated = await app.prisma.forumPost.update({
      where: { slug },
      data: parsed.data,
      include: { author: { select: { id: true, handle: true, displayName: true, rank: true } } },
    });
    return reply.send(updated);
  });

  // DELETE /api/forum/posts/:slug — author or moderator
  app.delete('/api/forum/posts/:slug', { preHandler: [requireAuth] }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const post = await app.prisma.forumPost.findUnique({ where: { slug }, select: { id: true, authorId: true } });
    if (!post) return reply.status(404).send({ code: 'NOT_FOUND' });

    const isModerator = await checkModerator(app, req.explorerId);
    if (post.authorId !== req.explorerId && !isModerator) {
      return reply.status(403).send({ code: 'FORBIDDEN' });
    }

    await app.prisma.forumPost.delete({ where: { slug } });
    return reply.status(204).send();
  });

  // POST /api/forum/posts/:slug/replies
  app.post('/api/forum/posts/:slug/replies', { preHandler: [requireAuth] }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const parsed = CreateReplySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const post = await app.prisma.forumPost.findUnique({
      where: { slug },
      select: { id: true, lockedAt: true, authorId: true, title: true },
    });
    if (!post) return reply.status(404).send({ code: 'NOT_FOUND' });
    if (post.lockedAt) return reply.status(423).send({ code: 'POST_LOCKED' });

    const replyRecord = await app.prisma.forumReply.create({
      data: { postId: post.id, authorId: req.explorerId, body: parsed.data.body },
      include: { author: { select: { id: true, handle: true, displayName: true, rank: true } } },
    });

    // Signal to post author (skip self-reply)
    if (post.authorId !== req.explorerId) {
      void pushSignal(
        app,
        post.authorId,
        'FORUM_REPLY',
        { postSlug: slug, postTitle: post.title, replyId: replyRecord.id },
        `forum-reply:${replyRecord.id}`,
      );
    }

    return reply.status(201).send(replyRecord);
  });

  // DELETE /api/forum/replies/:replyId — author or moderator
  app.delete('/api/forum/replies/:replyId', { preHandler: [requireAuth] }, async (req, reply) => {
    const { replyId } = req.params as { replyId: string };
    const reply_ = await app.prisma.forumReply.findUnique({
      where: { id: replyId },
      select: { id: true, authorId: true },
    });
    if (!reply_) return reply.status(404).send({ code: 'NOT_FOUND' });

    const isModerator = await checkModerator(app, req.explorerId);
    if (reply_.authorId !== req.explorerId && !isModerator) {
      return reply.status(403).send({ code: 'FORBIDDEN' });
    }

    await app.prisma.forumReply.delete({ where: { id: replyId } });
    return reply.status(204).send();
  });

  // POST /api/admin/forum/posts/:slug/lock — moderator lock/unlock
  app.patch('/api/admin/forum/posts/:slug/lock', { preHandler: [requireModerator] }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const { locked } = (req.body as { locked?: boolean } | undefined) ?? {};
    const post = await app.prisma.forumPost.findUnique({ where: { slug } });
    if (!post) return reply.status(404).send({ code: 'NOT_FOUND' });
    await app.prisma.forumPost.update({
      where: { slug },
      data: { lockedAt: locked ? new Date() : null },
    });
    return reply.status(204).send();
  });

  // PATCH /api/admin/forum/posts/:slug/pin — moderator pin/unpin
  app.patch('/api/admin/forum/posts/:slug/pin', { preHandler: [requireModerator] }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const { pinned } = (req.body as { pinned?: boolean } | undefined) ?? {};
    const post = await app.prisma.forumPost.findUnique({ where: { slug } });
    if (!post) return reply.status(404).send({ code: 'NOT_FOUND' });
    await app.prisma.forumPost.update({ where: { slug }, data: { isPinned: pinned ?? false } });
    return reply.status(204).send();
  });
}

async function checkModerator(app: FastifyInstance, explorerId: string): Promise<boolean> {
  const explorer = await app.prisma.explorer.findUnique({
    where: { id: explorerId },
    select: { role: true },
  });
  return explorer?.role === 'MODERATOR' || explorer?.role === 'ADMIN';
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'forum-post';
}
