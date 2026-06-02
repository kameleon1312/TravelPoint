import type { FastifyInstance } from 'fastify';
import { CreateSpotSchema, SpotQuerySchema } from '@travelpoint/validation';
import { requireAuth } from '../middleware/requireAuth';
import { resolveSpotForViewer } from '../services/hiddenLayer';
import { generateSessionSeed } from '@travelpoint/geo';
import { latLngToCell } from 'h3-js';
import { addTrustPoints, TrustPoints } from '../services/trustScore';

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

    const h3Index = latLngToCell(lat, lng, 8);

    const spot = await app.prisma.spot.create({
      data: { ...rest, lat, lng, h3Index, ownerId: req.explorerId },
    });

    void addTrustPoints(app.prisma, req.explorerId, TrustPoints.SPOT_CREATED);

    return reply.status(201).send({ ...spot, locked: false });
  });

  // POST /api/spots/:id/save
  app.post('/api/spots/:id/save', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const spot = await app.prisma.spot.findUnique({ where: { id } });
    if (!spot || spot.deletedAt) return reply.status(404).send({ code: 'NOT_FOUND' });

    const existing = await app.prisma.spotSave.findUnique({
      where: { spotId_explorerId: { spotId: id, explorerId: req.explorerId } },
    });
    if (existing) return reply.status(409).send({ code: 'ALREADY_SAVED' });

    await app.prisma.spotSave.create({ data: { spotId: id, explorerId: req.explorerId } });
    return reply.status(201).send({ saved: true });
  });

  // DELETE /api/spots/:id/save
  app.delete('/api/spots/:id/save', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await app.prisma.spotSave.deleteMany({
      where: { spotId: id, explorerId: req.explorerId },
    });
    return reply.status(204).send();
  });

  // GET /api/spots/:id/photos
  app.get('/api/spots/:id/photos', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const spot = await app.prisma.spot.findUnique({ where: { id } });
    if (!spot || spot.deletedAt) return reply.status(404).send({ code: 'NOT_FOUND' });

    const photos = await app.prisma.photo.findMany({
      where: { spotId: id },
      orderBy: { createdAt: 'asc' },
      include: { uploader: { select: { id: true, handle: true } } },
    });
    return reply.send(photos);
  });

  // POST /api/spots/:id/photos — accepts { url, caption? }
  // url can be a data URI (base64) for mobile uploads or a remote https URL
  app.post('/api/spots/:id/photos', {
    preHandler: [requireAuth],
    bodyLimit: 6 * 1024 * 1024,
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { url, caption } = req.body as { url?: string; caption?: string };

    if (!url?.trim()) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', message: 'url required' });
    }
    if (url.length > 5_000_000) {
      return reply.status(413).send({ code: 'PAYLOAD_TOO_LARGE', message: 'Image too large (max ~3.5 MB)' });
    }

    const spot = await app.prisma.spot.findUnique({ where: { id } });
    if (!spot || spot.deletedAt) return reply.status(404).send({ code: 'NOT_FOUND' });

    const photo = await app.prisma.photo.create({
      data: {
        spotId: id,
        uploaderId: req.explorerId,
        url: url.trim(),
        caption: caption?.trim() ?? null,
      },
    });

    void addTrustPoints(app.prisma, req.explorerId, 5);

    return reply.status(201).send(photo);
  });

  // DELETE /api/photos/:photoId
  app.delete('/api/photos/:photoId', { preHandler: [requireAuth] }, async (req, reply) => {
    const { photoId } = req.params as { photoId: string };
    const photo = await app.prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo) return reply.status(404).send({ code: 'NOT_FOUND' });
    if (photo.uploaderId !== req.explorerId) {
      return reply.status(403).send({ code: 'FORBIDDEN' });
    }
    await app.prisma.photo.delete({ where: { id: photoId } });
    return reply.status(204).send();
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
