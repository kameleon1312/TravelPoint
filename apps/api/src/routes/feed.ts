import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/requireAuth';
import type { FeedItem } from '@travelpoint/types';

export async function feedRoutes(app: FastifyInstance) {
  // GET /api/feed — aggregated activity for explorer's circles + own activity
  // Returns last 40 items sorted by createdAt desc
  app.get('/api/feed', { preHandler: [requireAuth] }, async (req, reply) => {
    const explorerId = req.explorerId;

    const memberships = await app.prisma.circleMember.findMany({
      where: { explorerId },
      select: { circleId: true },
    });
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

    // 1. New spots by circlemates (last 7 days)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [spots, journeys, comments] = await Promise.all([
      app.prisma.spot.findMany({
        where: {
          ownerId: { in: circlematIds },
          deletedAt: null,
          accessLevel: { in: ['PUBLIC', 'TRUSTED'] },
          createdAt: { gte: since },
        },
        include: { owner: { select: { handle: true, avatarUrl: true, rank: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      // 2. Public journeys by circlemates
      app.prisma.journey.findMany({
        where: {
          explorerId: { in: circlematIds },
          isPrivate: false,
          createdAt: { gte: since },
        },
        include: { explorer: { select: { handle: true, avatarUrl: true, rank: true } } },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
      // 3. Comments on own spots
      app.prisma.spotComment.findMany({
        where: {
          spot: { ownerId: explorerId, deletedAt: null },
          explorerId: { not: explorerId },
          createdAt: { gte: since },
        },
        include: {
          explorer: { select: { handle: true, avatarUrl: true, rank: true } },
          spot: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ]);

    const items: FeedItem[] = [
      ...spots.map((s) => ({
        id:            `spot:${s.id}`,
        type:          'SPOT_CREATED' as const,
        actorHandle:   s.owner.handle,
        actorAvatarUrl: s.owner.avatarUrl ?? undefined,
        actorRank:     s.owner.rank,
        payload: {
          spotId:   s.id,
          title:    s.title,
          category: s.category,
          lat:      s.lat,
          lng:      s.lng,
        },
        createdAt: s.createdAt.toISOString(),
      })),
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

    return reply.send(items.slice(0, 40));
  });
}
