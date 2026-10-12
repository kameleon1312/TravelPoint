import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { CreateJourneySchema, UpdateJourneySchema } from '@travelpoint/validation';
import { requireAuth } from '../middleware/requireAuth';
import { TierLimits } from '@travelpoint/types';
import { trimRouteForViewer } from '../services/geoPrivacy';
import { addTrustPoints, TrustPoints } from '../services/trustScore';
import { sendPushToExplorer } from '../services/push';
import { pushStrings } from '../lib/pushStrings';

export async function journeyRoutes(app: FastifyInstance) {
  // GET /api/journeys/me — own journeys (cursor pagination: ?after=<id>&limit=<n>)
  app.get('/api/journeys/me', { preHandler: [requireAuth] }, async (req, reply) => {
    const { after, limit: limitStr } = req.query as { after?: string; limit?: string };
    const limit = Math.min(parseInt(limitStr ?? '20', 10) || 20, 50);
    const rows = await app.prisma.journey.findMany({
      where: { explorerId: req.explorerId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(after ? { cursor: { id: after }, skip: 1 } : {}),
      select: {
        id: true, title: true, mood: true, soundtrack: true,
        isPrivate: true, createdAt: true, updatedAt: true,
      },
    });
    const hasMore = rows.length > limit;
    const journeys = rows.slice(0, limit);
    return reply.send({ journeys, hasMore, nextCursor: hasMore ? (journeys[journeys.length - 1]?.id ?? null) : null });
  });

  // GET /api/journeys/:id
  app.get('/api/journeys/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const journey = await app.prisma.journey.findUnique({
      where: { id },
      include: { _count: { select: { likes: true } } },
    });
    if (!journey) return reply.status(404).send({ code: 'NOT_FOUND' });

    const isOwner = journey.explorerId === req.explorerId;
    if (journey.isPrivate && !isOwner) {
      return reply.status(403).send({ code: 'FORBIDDEN' });
    }
    if (!isOwner) {
      const blocked = await app.prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: req.explorerId, blockedId: journey.explorerId },
            { blockerId: journey.explorerId, blockedId: req.explorerId },
          ],
        },
        select: { blockerId: true },
      });
      if (blocked) return reply.status(404).send({ code: 'NOT_FOUND' });
    }

    const liked = await app.prisma.journeyLike.findUnique({
      where: { journeyId_explorerId: { journeyId: id, explorerId: req.explorerId } },
    });

    return reply.send({
      ...journey,
      routeGeoJson: isOwner ? journey.routeGeoJson : trimRouteForViewer(journey.routeGeoJson),
      likeCount: journey._count.likes,
      liked: !!liked,
    });
  });

  // DELETE /api/journeys/:id/like — unlike
  app.delete('/api/journeys/:id/like', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await app.prisma.journeyLike.deleteMany({
      where: { journeyId: id, explorerId: req.explorerId },
    });
    return reply.status(204).send();
  });

  // POST /api/journeys
  app.post('/api/journeys', { preHandler: [requireAuth] }, async (req, reply) => {
    const parsed = CreateJourneySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const explorer = await app.prisma.explorer.findUnique({ where: { id: req.explorerId }, select: { tier: true } });
    const journeyLimit = TierLimits[explorer?.tier ?? 'FREE'].journeys;
    if (Number.isFinite(journeyLimit)) {
      const owned = await app.prisma.journey.count({ where: { explorerId: req.explorerId } });
      if (owned >= journeyLimit) {
        return reply.status(403).send({ code: 'TIER_LIMIT', requiredTier: 'PRO', limit: journeyLimit });
      }
    }
    const journey = await app.prisma.journey.create({
      data: { ...parsed.data, explorerId: req.explorerId },
    });

    await app.prisma.auditLog.create({
      data: { explorerId: req.explorerId, action: 'JOURNEY_CREATED', metadata: { journeyId: journey.id } },
    });

    if (!parsed.data.isPrivate) {
      void addTrustPoints(
        app.prisma,
        req.explorerId,
        TrustPoints.JOURNEY_PUBLISHED,
        'JOURNEY_PUBLISHED',
        journey.id,
      );
    }

    return reply.status(201).send(journey);
  });

  // PATCH /api/journeys/:id — bodyLimit raised for routeGeoJson (GPS traces can be large)
  app.patch('/api/journeys/:id', { preHandler: [requireAuth], bodyLimit: 2 * 1024 * 1024 }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = UpdateJourneySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }

    const existing = await app.prisma.journey.findUnique({ where: { id } });
    if (!existing || existing.explorerId !== req.explorerId) {
      return reply.status(403).send({ code: 'FORBIDDEN' });
    }

    // Prisma Json fields require InputJsonValue — routeGeoJson is typed GeoJSON,
    // so we cast it explicitly while keeping other fields strongly typed.
    const { routeGeoJson, retainRoute, ...rest } = parsed.data;
    const journey = await app.prisma.journey.update({
      where: { id },
      data: {
        ...rest,
        ...(retainRoute !== undefined ? { retainRoute } : {}),
        ...(routeGeoJson !== undefined
          ? {
              routeGeoJson: routeGeoJson as Prisma.InputJsonValue,
              routeExpiresAt: retainRoute || existing.retainRoute
                ? null
                : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            }
          : {}),
      },
    });
    return reply.send(journey);
  });

  app.post('/api/journeys/:id/like', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const journey = await app.prisma.journey.findUnique({ where: { id } });
    if (!journey || journey.isPrivate) return reply.status(404).send({ code: 'NOT_FOUND' });
    if (journey.explorerId === req.explorerId) return reply.status(403).send({ code: 'SELF_LIKE' });
    const like = await app.prisma.journeyLike.upsert({
      where: { journeyId_explorerId: { journeyId: id, explorerId: req.explorerId } },
      create: {
        journeyId: id,
        explorerId: req.explorerId,
        authorId: journey.explorerId,
      },
      update: {},
    });
    await app.prisma.signal.upsert({
      where: { dedupeKey: `journey-like:${like.id}` },
      create: {
        explorerId: journey.explorerId,
        type: 'JOURNEY_LIKE',
        dedupeKey: `journey-like:${like.id}`,
        payload: { journeyId: id, explorerId: req.explorerId },
      },
      update: {},
    });
    void sendPushToExplorer(
      app.prisma,
      journey.explorerId,
      pushStrings.journeyLike.title,
      pushStrings.journeyLike.body,
      { type: 'journey_like', journeyId: id, explorerId: req.explorerId },
    );
    return reply.status(201).send(like);
  });

  // DELETE /api/journeys/:id
  app.delete('/api/journeys/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await app.prisma.journey.findUnique({ where: { id } });
    if (!existing || existing.explorerId !== req.explorerId) {
      return reply.status(403).send({ code: 'FORBIDDEN' });
    }
    await app.prisma.journey.delete({ where: { id } });
    return reply.status(204).send();
  });

  // GET /api/explorers/:handle/journeys — public journeys of an explorer
  app.get('/api/explorers/:handle/journeys', { preHandler: [requireAuth] }, async (req, reply) => {
    const { handle } = req.params as { handle: string };
    const explorer = await app.prisma.explorer.findUnique({
      where: { handle },
      select: { id: true },
    });
    if (!explorer) return reply.status(404).send({ code: 'NOT_FOUND' });

    const journeys = await app.prisma.journey.findMany({
      where: { explorerId: explorer.id, isPrivate: false },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, mood: true, soundtrack: true, createdAt: true },
    });
    return reply.send(journeys);
  });
}
