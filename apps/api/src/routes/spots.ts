import type { FastifyInstance } from 'fastify';
import { CreateSpotSchema, SpotQuerySchema } from '@travelpoint/validation';
import { requireAuth } from '../middleware/requireAuth';
import { resolveSpotForViewer } from '../services/hiddenLayer';
import { fuzzCoordinates, generateSessionSeed } from '@travelpoint/geo';
import { latLngToCell } from 'h3-js';
import { addTrustPoints, TrustPoints } from '../services/trustScore';

// Haversine distance in km — replaces PostGIS ST_DWithin (no extension required)
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Deterministic daily seed per spot — prevents triangulation across requests
// but keeps positions stable within a day so map pins don't jump on reload
function dailySpotSeed(spotId: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const input = `${spotId}:${today}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = Math.imul(31, hash) + input.charCodeAt(i) | 0;
  }
  return Math.abs(hash);
}

export async function spotsRoutes(app: FastifyInstance) {
  // ── GET /api/spots/public ─────────────────────────────────────────────────
  // Public endpoint — no auth, returns fuzzed PUBLIC spots for the world map.
  // Coords fuzzed ≥500m with daily-per-spot seed (stable within day, shifts daily).
  app.get('/api/spots/public', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const query = req.query as Record<string, string>;
    const limit = Math.min(Number(query['limit'] ?? 200), 200);
    const category = query['category'] as string | undefined;

    const spots = await app.prisma.spot.findMany({
      where: {
        accessLevel: 'PUBLIC',
        deletedAt: null,
        ...(category ? { category: category as never } : {}),
      },
      select: {
        id: true,
        title: true,
        category: true,
        lat: true,
        lng: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const fuzzed = spots.map((spot: typeof spots[0]) => {
      const seed = dailySpotSeed(spot.id);
      const coords = fuzzCoordinates(spot.lat, spot.lng, 500, seed);
      return {
        id:        spot.id,
        title:     spot.title,
        category:  spot.category,
        lat:       Math.round(coords.lat * 10000) / 10000,
        lng:       Math.round(coords.lng * 10000) / 10000,
        createdAt: spot.createdAt,
        fuzzed:    true,
      };
    });

    return reply
      .header('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
      .send(fuzzed);
  });
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

    // Bounding box pre-filter in DB (fast, uses lat/lng columns)
    // Over-fetch by 3× since bbox is larger than the radius circle
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos(lat * (Math.PI / 180)));

    const candidates = await app.prisma.spot.findMany({
      where: {
        deletedAt: null,
        lat: { gte: lat - latDelta, lte: lat + latDelta },
        lng: { gte: lng - lngDelta, lte: lng + lngDelta },
        ...(category ? { category: category as never } : {}),
      },
      include: { photos: true },
      take: limit * 3,
    });

    // Exact Haversine filter — drops corners of the bounding box
    const nearby = candidates
      .filter((s: typeof candidates[0]) => haversineKm(lat, lng, s.lat, s.lng) <= radiusKm)
      .slice(0, limit);

    const sessionSeed = generateSessionSeed();
    const circleIds   = explorer.memberships.map((m: { circleId: string }) => m.circleId);

    const resolved = await Promise.all(
      nearby.map((spot: typeof nearby[0]) =>
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
      { id: explorer.id, rank: explorer.rank, circleIds: explorer.memberships.map((m: { circleId: string }) => m.circleId), tier: explorer.tier },
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
