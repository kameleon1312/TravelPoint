import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuthOptional } from '../middleware/requireAuthOptional';
import { requireModerator } from '../middleware/requireAuth';

const AnalyticsEventSchema = z.object({
  name: z.string().trim().min(2).max(80).regex(/^[a-z0-9_.:-]+$/i),
  sessionId: z.string().trim().max(120).optional(),
  source: z.string().trim().max(40).optional(),
  path: z.string().trim().max(500).optional(),
  payload: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

const ANALYTICS_RATE_LIMIT = { max: 30, timeWindow: '1 minute' };

export async function analyticsRoutes(app: FastifyInstance) {
  app.post('/api/analytics/events', {
    preHandler: [requireAuthOptional],
    config: { rateLimit: ANALYTICS_RATE_LIMIT },
  }, async (req, reply) => {
    const parsed = AnalyticsEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    await app.prisma.analyticsEvent.create({
      data: {
        explorerId: req.explorerId,
        ...parsed.data,
      },
    });
    return reply.status(204).send();
  });

  app.get('/api/admin/analytics/summary', { preHandler: [requireModerator] }, async (req, reply) => {
    const query = req.query as Record<string, string>;
    const days = Math.min(Math.max(Number(query['days'] ?? 7), 1), 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalEvents, uniqueSessions, topEvents, topPaths, newExplorers, activeExplorers] = await Promise.all([
      app.prisma.analyticsEvent.count({ where: { createdAt: { gte: since } } }),
      app.prisma.analyticsEvent.groupBy({
        by: ['sessionId'],
        where: { createdAt: { gte: since }, sessionId: { not: null } },
        _count: true,
      }).then((rows) => rows.length),
      app.prisma.analyticsEvent.groupBy({
        by: ['name'],
        where: { createdAt: { gte: since } },
        _count: { name: true },
        orderBy: { _count: { name: 'desc' } },
        take: 10,
      }),
      app.prisma.analyticsEvent.groupBy({
        by: ['path'],
        where: { createdAt: { gte: since }, path: { not: null } },
        _count: { path: true },
        orderBy: { _count: { path: 'desc' } },
        take: 10,
      }),
      app.prisma.explorer.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
      app.prisma.analyticsEvent.groupBy({
        by: ['explorerId'],
        where: { createdAt: { gte: since }, explorerId: { not: null } },
        _count: true,
      }).then((rows) => rows.length),
    ]);

    return reply.send({
      period: { days, since },
      totalEvents,
      uniqueSessions,
      activeExplorers,
      newExplorers,
      topEvents: topEvents.map((e) => ({ name: e.name, count: e._count.name })),
      topPaths: topPaths.map((e) => ({ path: e.path, count: e._count.path })),
    });
  });
}
