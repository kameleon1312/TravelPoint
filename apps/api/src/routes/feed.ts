import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/requireAuth';
import { rankAtLeast, type FeedItem } from '@travelpoint/types';
import { fuzzSpotCoordinates } from '../services/geoPrivacy';

export async function feedRoutes(app: FastifyInstance) {
  // GET /api/feed — aggregated activity for explorer's circles + own activity
  // Supports cursor pagination: ?before=<ISO>&limit=<n>
  app.get('/api/feed', { preHandler: [requireAuth] }, async (req, reply) => {
    const { before, limit: limitStr } = req.query as { before?: string; limit?: string };
    const limit = Math.min(parseInt(limitStr ?? '30', 10) || 30, 50);
    const beforeDate = before ? new Date(before) : new Date();
    const explorerId = req.explorerId;

    const [memberships, viewer] = await Promise.all([
      app.prisma.circleMember.findMany({
        where: { explorerId },
        select: { circleId: true },
      }),
      app.prisma.explorer.findUnique({ where: { id: explorerId }, select: { rank: true } }),
    ]);
    // Mirrors services/hiddenLayer: TRUSTED spots are visible only from TRUSTED rank up.
    const visibleAccessLevels: Array<'PUBLIC' | 'TRUSTED'> =
      viewer && rankAtLeast(viewer.rank, 'TRUSTED') ? ['PUBLIC', 'TRUSTED'] : ['PUBLIC'];
    const circleIds = memberships.map((m) => m.circleId);

    // Explorer IDs that share a circle with current explorer
    const circlemates = circleIds.length > 0
      ? await app.prisma.circleMember.findMany({
          where: { circleId: { in: circleIds }, explorerId: { not: explorerId } },
          distinct: ['explorerId'],
          select: { explorerId: true },
        })
      : [];
    const circlematIds = circlemates.map((m) => m.explorerId);

    const blockedRows = await app.prisma.block.findMany({
      where: { blockerId: explorerId },
      select: { blockedId: true },
    });
    const blockedIds = blockedRows.map((b) => b.blockedId);
    const visibleIds = circlematIds.filter((id) => !blockedIds.includes(id));

    // 1. New spots by circlemates (last 7 days, before cursor)
    const since = new Date(Math.min(
      beforeDate.getTime() - 1,
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ));

    const [spots, journeys, comments] = await Promise.all([
      app.prisma.spot.findMany({
        where: {
          ownerId: { in: visibleIds },
          deletedAt: null,
          accessLevel: { in: visibleAccessLevels },
          createdAt: { gte: since, lt: beforeDate },
        },
        include: { owner: { select: { handle: true, avatarUrl: true, rank: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      app.prisma.journey.findMany({
        where: {
          explorerId: { in: visibleIds },
          isPrivate: false,
          createdAt: { gte: since, lt: beforeDate },
        },
        include: { explorer: { select: { handle: true, avatarUrl: true, rank: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      app.prisma.spotComment.findMany({
        where: {
          spot: { ownerId: explorerId, deletedAt: null },
          explorerId: blockedIds.length > 0
            ? { notIn: [explorerId, ...blockedIds] }
            : { not: explorerId },
          createdAt: { gte: since, lt: beforeDate },
        },
        include: {
          explorer: { select: { handle: true, avatarUrl: true, rank: true } },
          spot: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    const items: FeedItem[] = [
      ...spots.map((s) => {
        const { lat, lng } = fuzzSpotCoordinates(s, 500);
        return {
          id:            `spot:${s.id}`,
          type:          'SPOT_CREATED' as const,
          actorHandle:   s.owner.handle,
          actorAvatarUrl: s.owner.avatarUrl ?? undefined,
          actorRank:     s.owner.rank,
          payload: {
            spotId:   s.id,
            title:    s.title,
            category: s.category,
            lat,
            lng,
          },
          createdAt: s.createdAt.toISOString(),
        };
      }),
      ...journeys.map((j) => ({
        id:            `journey:${j.id}`,
        type:          'JOURNEY_PUBLISHED' as const,
        actorHandle:   j.explorer.handle,
        actorAvatarUrl: j.explorer.avatarUrl ?? undefined,
        actorRank:     j.explorer.rank,
        payload: {
          journeyId: j.id,
          title:     j.title,
          mood:      j.mood,
        },
        createdAt: j.createdAt.toISOString(),
      })),
      ...comments.map((c) => ({
        id:            `comment:${c.id}`,
        type:          'SPOT_COMMENT' as const,
        actorHandle:   c.explorer.handle,
        actorAvatarUrl: c.explorer.avatarUrl ?? undefined,
        actorRank:     c.explorer.rank,
        payload: {
          commentId: c.id,
          spotId:    c.spotId,
          spotTitle: c.spot.title,
          body:      c.body.slice(0, 120),
        },
        createdAt: c.createdAt.toISOString(),
      })),
    ];

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const page = items.slice(0, limit);
    return reply.send({ items: page, hasMore: items.length > limit });
  });
}
