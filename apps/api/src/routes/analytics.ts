import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuthOptional } from '../middleware/requireAuthOptional';

const AnalyticsEventSchema = z.object({
  name: z.string().trim().min(2).max(80).regex(/^[a-z0-9_.:-]+$/i),
  sessionId: z.string().trim().max(120).optional(),
  source: z.string().trim().max(40).optional(),
  path: z.string().trim().max(500).optional(),
  payload: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export async function analyticsRoutes(app: FastifyInstance) {
  app.post('/api/analytics/events', { preHandler: [requireAuthOptional] }, async (req, reply) => {
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
}
