import type { FastifyInstance } from 'fastify';
import { CreateSpotSchema, SpotQuerySchema } from '@travelpoint/validation';
import { requireAuth } from '../middleware/requireAuth';
import { resolveSpotForViewer } from '../services/hiddenLayer';
import { generateSessionSeed } from '@travelpoint/geo';

export async function spotsRoutes(app: FastifyInstance) {
  // GET /api/spots?lat=&lng=&radiusKm=
  app.get('/api/spots', { preHandler: [requireAuth] }, async (req, reply) => {
    const parsed = SpotQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const { lat, lng, radiusKm, category, limit } = parsed.data;

    const explorer = await app.prisma.explorer.findUnique({
      where: { id: req.explorerId },
      include: { memberships: { select: { circleId: true } } },
    });
    if (!explorer) return reply.status(404).send({ code: 'NOT_FOUND' });

    // PostGIS ST_DWithin query via raw for geo radius search
    const spots = await app.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Spot"
      WHERE "deletedAt" IS NULL
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radiusKm * 1000}
        )
        ${category ? app.prisma.$queryRaw`AND category = ${category}::"SpotCategory"` : app.prisma.$queryRaw``}
      LIMIT ${limit}
    `;

    const fullSpots = await app.prisma.spot.findMany({
      where: { id: { in: spots.map((s) => s.id) } },
      include: { photos: true },
    });

    const sessionSeed = generateSessionSeed();
    const circleIds = explorer.memberships.map((m) => m.circleId);

    const resolved = await Promise.all(
      fullSpots.map((spot) =>
        resolveSpotForViewer(
          spot,
          { id: explorer.id, rank: explorer.rank, circleIds, tier: explorer.tier },
          sessionSeed,
          async (eId, sId) => {
            await app.prisma.auditLog.create({ data: { explorerId: eId, spotId: sId, action: 'SPOT_ACCESS' } });
          },
        ),
      ),
    );

    return reply.send(resolved);
  });

  // GET /api/spots/:id
  app.get('/api/spots/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const spot = await app.prisma.spot.findUnique({ where: { id }, include: { photos: true } });
    if (!spot || spot.deletedAt) return reply.status(404).send({ code: 'NOT_FOUND' });

    const explorer = await app.prisma.explorer.findUnique({
      where: { id: req.explorerId },
      include: { memberships: { select: { circleId: true } } },
    });
    if (!explorer) return reply.status(404).send({ code: 'NOT_FOUND' });

    const sessionSeed = generateSessionSeed();
    const resolved = await resolveSpotForViewer(
      spot,
      { id: explorer.id, rank: explorer.rank, circleIds: explorer.memberships.map((m) => m.circleId), tier: explorer.tier },
      sessionSeed,
      async (eId, sId) => {
        await app.prisma.auditLog.create({ data: { explorerId: eId, spotId: sId, action: 'SPOT_ACCESS' } });
      },
    );

    return reply.send(resolved);
  });

  // POST /api/spots
  app.post('/api/spots', { preHandler: [requireAuth] }, async (req, reply) => {
    const parsed = CreateSpotSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const { lat, lng, ...rest } = parsed.data;

    // h3Index placeholder — in production use h3-js
    const h3Index = `${Math.floor(lat * 10)}_${Math.floor(lng * 10)}`;

    const spot = await app.prisma.spot.create({
      data: { ...rest, lat, lng, h3Index, ownerId: req.explorerId },
    });

    return reply.status(201).send({ ...spot, locked: false });
  });

  // DELETE /api/spots/:id
  app.delete('/api/spots/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const spot = await app.prisma.spot.findUnique({ where: { id } });
    if (!spot || spot.ownerId !== req.explorerId) {
      return reply.status(403).send({ code: 'FORBIDDEN' });
    }
    await app.prisma.spot.update({ where: { id }, data: { deletedAt: new Date() } });
    return reply.status(204).send();
  });
}
