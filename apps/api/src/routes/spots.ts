import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { CreateSpotSchema, SpotQuerySchema, UpdateSpotSchema } from '@travelpoint/validation';
import { requireAuth } from '../middleware/requireAuth';
import { resolveSpotForViewer } from '../services/hiddenLayer';
import { fuzzCoordinates, generateSessionSeed } from '@travelpoint/geo';
import { latLngToCell } from 'h3-js';
import { addTrustPoints, TrustPoints } from '../services/trustScore';
import {
  createPhotoUpload,
  deleteStoredPhotos,
  finalizePhoto,
  validatePhoto,
} from '../services/storage';
import { pushSignal } from './signals';
import { sendPushToExplorer } from '../services/push';
import { pushStrings } from '../lib/pushStrings';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

const PhotoUploadUrlSchema = z.object({
  mimeType:  z.enum(ALLOWED_MIME_TYPES),
  sizeBytes: z.number().int().min(1).max(MAX_PHOTO_BYTES),
});

const PhotoCompleteSchema = z.object({
  objectKey:    z.string().min(1).max(500),
  mimeType:     z.string().max(100).optional(),
  sizeBytes:    z.number().int().min(0).optional(),
  caption:      z.string().max(300).optional(),
});

const ReactionSchema = z.object({
  type: z.enum(['LIKE', 'INSIGHTFUL', 'HIDDEN_GEM']),
});

const VerifySchema = z.object({
  decision: z.enum(['CONFIRMED', 'REJECTED']),
  note:     z.string().max(500).optional(),
});

const STATS_RATE_LIMIT = { max: 60, timeWindow: '1 minute' };

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

async function findNearbySpotCandidates(
  app: FastifyInstance,
  input: {
    lat: number;
    lng: number;
    radiusKm: number;
    category?: string;
    limit: number;
  },
) {
  try {
    const rows = await app.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "Spot"
      WHERE "deletedAt" IS NULL
        AND "location" IS NOT NULL
        ${input.category ? Prisma.sql`AND "category"::text = ${input.category}` : Prisma.empty}
        AND ST_DWithin(
          "location",
          ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography,
          ${input.radiusKm * 1000}
        )
      ORDER BY ST_Distance(
        "location",
        ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography
      ) ASC
      LIMIT ${input.limit}
    `);
    if (rows.length === 0) return [];
    const order = new Map(rows.map((row, index) => [row.id, index]));
    const spots = await app.prisma.spot.findMany({
      where: { id: { in: rows.map((row) => row.id) } },
      include: { photos: true },
    });
    return spots.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  } catch {
    // Local/dev databases may not have PostGIS migrated yet. Keep the old path as
    // a deterministic fallback so tests and non-geo deployments still function.
    return findNearbySpotCandidatesFallback(app, input);
  }
}

async function findNearbySpotCandidatesFallback(
  app: FastifyInstance,
  input: {
    lat: number;
    lng: number;
    radiusKm: number;
    category?: string;
    limit: number;
  },
) {
  const latDelta = input.radiusKm / 111;
  const lngDelta = input.radiusKm / (111 * Math.cos(input.lat * (Math.PI / 180)));
  const candidates = await app.prisma.spot.findMany({
    where: {
      deletedAt: null,
      lat: { gte: input.lat - latDelta, lte: input.lat + latDelta },
      lng: { gte: input.lng - lngDelta, lte: input.lng + lngDelta },
      ...(input.category ? { category: input.category as never } : {}),
    },
    include: { photos: true },
    take: input.limit * 3,
  });
  return candidates
    .filter((spot) => haversineKm(input.lat, input.lng, spot.lat, spot.lng) <= input.radiusKm)
    .slice(0, input.limit);
}

async function syncSpotLocation(app: FastifyInstance, spotId: string, lat: number, lng: number): Promise<void> {
  try {
    await app.prisma.$executeRaw(Prisma.sql`
      UPDATE "Spot"
      SET "location" = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      WHERE "id" = ${spotId}
    `);
  } catch {
    // PostGIS is an optional Sprint 3 capability until the migration reaches all
    // environments. The lat/lng columns remain the source of truth.
  }
}

export async function spotsRoutes(app: FastifyInstance) {
  // Public: live spot count for social proof on the landing page — no auth required.
  app.get('/api/stats/spots', { config: { rateLimit: STATS_RATE_LIMIT } }, async (_req, reply) => {
    const count = await app.prisma.spot.count({ where: { deletedAt: null } });
    return reply.send({ count });
  });

  async function resolveForExplorer(
    spot: Parameters<typeof resolveSpotForViewer>[0],
    explorerId: string,
  ) {
    const explorer = await app.prisma.explorer.findUnique({
      where: { id: explorerId },
      include: { memberships: { select: { circleId: true } } },
    });
    if (!explorer) return null;

    return resolveSpotForViewer(
      spot,
      {
        id: explorer.id,
        rank: explorer.rank,
        circleIds: explorer.memberships.map((membership) => membership.circleId),
        tier: explorer.tier,
      },
      generateSessionSeed(),
      async (viewerId, spotId) => {
        await app.prisma.auditLog.create({
          data: { explorerId: viewerId, spotId, action: 'SPOT_ACCESS' },
        });
      },
    );
  }

  async function requireExactSpotAccess(
    spot: Parameters<typeof resolveSpotForViewer>[0],
    explorerId: string,
  ) {
    const resolved = await resolveForExplorer(spot, explorerId);
    return resolved && !resolved.locked ? resolved : null;
  }

  // GET /api/spots/saved — saved worlds for current explorer
  app.get('/api/spots/saved', { preHandler: [requireAuth] }, async (req, reply) => {
    const saves = await app.prisma.spotSave.findMany({
      where: { explorerId: req.explorerId },
      include: { spot: { include: { photos: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const explorer = await app.prisma.explorer.findUnique({
      where: { id: req.explorerId },
      include: { memberships: { select: { circleId: true } } },
    });
    if (!explorer) return reply.status(404).send({ code: 'NOT_FOUND' });

    const sessionSeed = generateSessionSeed();
    const circleIds   = explorer.memberships.map((m: { circleId: string }) => m.circleId);

    const resolved = await Promise.all(
      saves.map(({ spot }) =>
        resolveSpotForViewer(
          spot,
          { id: explorer.id, rank: explorer.rank, circleIds, tier: explorer.tier },
          sessionSeed,
          async () => {},
        ),
      ),
    );

    return reply.send(resolved.filter((s): s is NonNullable<typeof s> => s !== null));
  });

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

    const nearby = await findNearbySpotCandidates(app, { lat, lng, radiusKm, category, limit });

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

    return reply.send(resolved.filter((spot): spot is NonNullable<typeof spot> => spot !== null));
  });

  // GET /api/spots/:id
  app.get('/api/spots/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const spot = await app.prisma.spot.findUnique({ where: { id }, include: { photos: true } });
    if (!spot || spot.deletedAt) return reply.status(404).send({ code: 'NOT_FOUND' });

    const resolved = await resolveForExplorer(spot, req.explorerId);
    if (!resolved) return reply.status(404).send({ code: 'NOT_FOUND' });

    return reply.send(resolved);
  });

  // PATCH /api/spots/:id — owner edits title, story, accessLevel, dropExpiresAt
  app.patch('/api/spots/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const spot = await app.prisma.spot.findUnique({ where: { id } });
    if (!spot || spot.deletedAt) return reply.status(404).send({ code: 'NOT_FOUND' });
    if (spot.ownerId !== req.explorerId) return reply.status(403).send({ code: 'FORBIDDEN' });

    const parsed = UpdateSpotSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }

    const { title, story, accessLevel, dropExpiresAt } = parsed.data;
    const data: Record<string, unknown> = {};
    if (title !== undefined) data['title'] = title.trim();
    if (story !== undefined) data['story'] = story.trim() || null;
    if (accessLevel !== undefined) data['accessLevel'] = accessLevel;
    if (dropExpiresAt !== undefined) data['dropExpiresAt'] = dropExpiresAt ? new Date(dropExpiresAt) : null;

    if (Object.keys(data).length === 0) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', message: 'No updatable fields' });
    }

    const updated = await app.prisma.spot.update({ where: { id }, data });
    const resolved = await resolveForExplorer({ ...updated, photos: [] }, req.explorerId);
    return reply.send(resolved ?? updated);
  });

  // POST /api/spots
  app.post('/api/spots', { preHandler: [requireAuth], config: { rateLimit: { max: 20, timeWindow: '1 hour' } } }, async (req, reply) => {
    const parsed = CreateSpotSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const { lat, lng, ...rest } = parsed.data;

    const h3Index = latLngToCell(lat, lng, 8);

    const spot = await app.prisma.spot.create({
      data: { ...rest, lat, lng, h3Index, ownerId: req.explorerId },
    });
    await syncSpotLocation(app, spot.id, lat, lng);

    void addTrustPoints(app.prisma, req.explorerId, TrustPoints.SPOT_CREATED, 'SPOT_CREATED', spot.id);
    if (spot.accessLevel === 'SECRET_DROP') {
      const memberships = await app.prisma.circleMember.findMany({
        where: { explorerId: req.explorerId },
        select: { circleId: true },
      });
      const recipients = await app.prisma.circleMember.findMany({
        where: {
          circleId: { in: memberships.map((membership) => membership.circleId) },
          explorerId: { not: req.explorerId },
        },
        distinct: ['explorerId'],
        select: { explorerId: true },
      });
      for (const recipient of recipients) {
        void pushSignal(
          app,
          recipient.explorerId,
          'SECRET_DROP',
          { spotId: spot.id, title: spot.title },
          `secret-drop:${spot.id}:${recipient.explorerId}`,
        );
      }
    }

    // Push NEARBY_SPOT signal to circle members of the spot owner
    void (async () => {
      try {
        const ownerCircles = await app.prisma.circleMember.findMany({
          where: { explorerId: req.explorerId },
          select: { circleId: true },
        });
        if (ownerCircles.length === 0) return;
        const recipients = await app.prisma.circleMember.findMany({
          where: {
            circleId:   { in: ownerCircles.map((m) => m.circleId) },
            explorerId: { not: req.explorerId },
          },
          distinct: ['explorerId'],
          select: { explorerId: true },
        });
        for (const r of recipients) {
          if (spot.accessLevel === 'SECRET_DROP') continue; // already handled above
          void pushSignal(
            app,
            r.explorerId,
            'NEARBY_SPOT',
            { spotId: spot.id, title: spot.title, category: spot.category },
            `nearby-spot:${spot.id}:${r.explorerId}`,
          );
          void sendPushToExplorer(
            app.prisma,
            r.explorerId,
            pushStrings.nearbySpot.title,
            pushStrings.nearbySpot.body(spot.title),
            { type: 'nearby_spot', id: spot.id },
          );
        }
      } catch {
        // Never block spot creation for notification errors
      }
    })();

    return reply.status(201).send({ ...spot, locked: false });
  });

  // POST /api/spots/:id/save
  app.post('/api/spots/:id/save', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const spot = await app.prisma.spot.findUnique({ where: { id } });
    if (!spot || spot.deletedAt) return reply.status(404).send({ code: 'NOT_FOUND' });
    if (!await requireExactSpotAccess(spot, req.explorerId)) {
      return reply.status(404).send({ code: 'NOT_FOUND' });
    }

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
    if (!await requireExactSpotAccess(spot, req.explorerId)) {
      return reply.status(404).send({ code: 'NOT_FOUND' });
    }

    const photos = await app.prisma.photo.findMany({
      where: { spotId: id },
      orderBy: { createdAt: 'asc' },
      include: { uploader: { select: { id: true, handle: true } } },
    });
    return reply.send(photos);
  });

  // POST /api/spots/:id/photos — accepts { url, caption? }
  // url can be a data URI (base64) for mobile uploads or a remote https URL
  app.post('/api/spots/:id/photos/upload-url', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = PhotoUploadUrlSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const { mimeType, sizeBytes } = parsed.data;
    const spot = await app.prisma.spot.findUnique({ where: { id } });
    if (!spot || spot.deletedAt) return reply.status(404).send({ code: 'NOT_FOUND' });
    if (!await requireExactSpotAccess(spot, req.explorerId)) {
      return reply.status(404).send({ code: 'NOT_FOUND' });
    }
    try {
      validatePhoto(mimeType, sizeBytes);
      return reply.send(await createPhotoUpload(req.explorerId, mimeType, sizeBytes));
    } catch (error) {
      const code = error instanceof Error ? error.message : 'UPLOAD_FAILED';
      const status = code === 'STORAGE_NOT_CONFIGURED' ? 503
        : code === 'UNSUPPORTED_MEDIA_TYPE' ? 415
          : code === 'PHOTO_TOO_LARGE' ? 413 : 400;
      return reply.status(status).send({ code });
    }
  });

  app.post('/api/spots/:id/photos/complete', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = PhotoCompleteSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const { objectKey, mimeType, sizeBytes, caption } = parsed.data;
    if (!objectKey.startsWith(`photos/${req.explorerId}/`)) {
      return reply.status(400).send({ code: 'INVALID_OBJECT_KEY' });
    }
    const spot = await app.prisma.spot.findUnique({ where: { id } });
    if (!spot || spot.deletedAt) return reply.status(404).send({ code: 'NOT_FOUND' });
    if (!await requireExactSpotAccess(spot, req.explorerId)) {
      return reply.status(404).send({ code: 'NOT_FOUND' });
    }
    let stored;
    try {
      stored = await finalizePhoto(objectKey, mimeType ?? '', sizeBytes ?? 0);
    } catch (error) {
      const code = error instanceof Error ? error.message : 'UPLOAD_FAILED';
      return reply.status(code === 'STORAGE_NOT_CONFIGURED' ? 503 : 400).send({ code });
    }

    const photo = await app.prisma.photo.create({
      data: {
        spotId: id,
        uploaderId: req.explorerId,
        objectKey,
        url: stored.url,
        thumbnailUrl: stored.thumbnailUrl,
        thumbnailKey: stored.thumbnailKey,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        caption: caption?.trim() ?? null,
      },
    });

    void addTrustPoints(app.prisma, req.explorerId, TrustPoints.PHOTO_ADDED, 'PHOTO_ADDED', photo.id);

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
    await deleteStoredPhotos([photo.objectKey, photo.thumbnailKey]);
    await app.prisma.photo.delete({ where: { id: photoId } });
    return reply.status(204).send();
  });

  // GET /api/spots/:id/reactions
  app.get('/api/spots/:id/reactions', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const spot = await app.prisma.spot.findFirst({ where: { id, deletedAt: null } });
    if (!spot) return reply.status(404).send({ code: 'NOT_FOUND' });
    if (!await requireExactSpotAccess(spot, req.explorerId)) {
      return reply.status(404).send({ code: 'NOT_FOUND' });
    }
    const reactions = await app.prisma.reaction.groupBy({
      by: ['type'],
      where: { spotId: id },
      _count: { type: true },
    });
    const counts: Record<string, number> = { LIKE: 0, INSIGHTFUL: 0, HIDDEN_GEM: 0 };
    for (const row of reactions) counts[row.type] = row._count.type;

    const mine = await app.prisma.reaction.findUnique({
      where: { spotId_explorerId: { spotId: id, explorerId: req.explorerId } },
    });
    return reply.send({ counts, myReaction: mine?.type ?? null });
  });

  // POST /api/spots/:id/reactions — toggles: same type removes, different type switches
  app.post('/api/spots/:id/reactions', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = ReactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const { type } = parsed.data;
    const spot = await app.prisma.spot.findFirst({ where: { id, deletedAt: null } });
    if (!spot) return reply.status(404).send({ code: 'NOT_FOUND' });
    if (!await requireExactSpotAccess(spot, req.explorerId)) {
      return reply.status(404).send({ code: 'NOT_FOUND' });
    }
    const existing = await app.prisma.reaction.findUnique({
      where: { spotId_explorerId: { spotId: id, explorerId: req.explorerId } },
    });
    if (existing?.type === type) {
      // Same type tapped again — remove reaction
      await app.prisma.reaction.delete({
        where: { spotId_explorerId: { spotId: id, explorerId: req.explorerId } },
      });
      return reply.status(200).send({ myReaction: null });
    }
    const reaction = await app.prisma.reaction.upsert({
      where: { spotId_explorerId: { spotId: id, explorerId: req.explorerId } },
      create: { spotId: id, explorerId: req.explorerId, type },
      update: { type },
    });
    if (!existing && spot.ownerId !== req.explorerId) {
      void addTrustPoints(
        app.prisma,
        spot.ownerId,
        TrustPoints.CIRCLE_REACTION,
        'REACTION_RECEIVED',
        reaction.id,
      );
    }
    return reply.status(existing ? 200 : 201).send({ myReaction: type });
  });

  // GET /api/spots/:id/verifications
  app.get('/api/spots/:id/verifications', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const spot = await app.prisma.spot.findFirst({ where: { id, deletedAt: null } });
    if (!spot) return reply.status(404).send({ code: 'NOT_FOUND' });
    if (!await requireExactSpotAccess(spot, req.explorerId)) {
      return reply.status(404).send({ code: 'NOT_FOUND' });
    }
    const [confirmedCount, rejectedCount, mine] = await Promise.all([
      app.prisma.spotVerification.count({ where: { spotId: id, decision: 'CONFIRMED' } }),
      app.prisma.spotVerification.count({ where: { spotId: id, decision: 'REJECTED' } }),
      app.prisma.spotVerification.findUnique({
        where: { spotId_explorerId: { spotId: id, explorerId: req.explorerId } },
      }),
    ]);
    return reply.send({ confirmedCount, rejectedCount, myDecision: mine?.decision ?? null });
  });

  app.post('/api/spots/:id/verify', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = VerifySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const { decision, note } = parsed.data;
    const spot = await app.prisma.spot.findFirst({ where: { id, deletedAt: null } });
    if (!spot) return reply.status(404).send({ code: 'NOT_FOUND' });
    if (!await requireExactSpotAccess(spot, req.explorerId)) {
      return reply.status(404).send({ code: 'NOT_FOUND' });
    }
    if (spot.ownerId === req.explorerId) return reply.status(403).send({ code: 'SELF_VERIFICATION' });
    const verification = await app.prisma.spotVerification.upsert({
      where: { spotId_explorerId: { spotId: id, explorerId: req.explorerId } },
      create: { spotId: id, explorerId: req.explorerId, decision, note: note?.trim() },
      update: { decision, note: note?.trim() },
    });
    if (decision === 'CONFIRMED') {
      void addTrustPoints(
        app.prisma,
        spot.ownerId,
        TrustPoints.SPOT_VERIFIED,
        'SPOT_VERIFIED',
        verification.id,
      );
    }
    return reply.send(verification);
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

  // GET /api/spots/:id/comments
  app.get('/api/spots/:id/comments', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const spot = await app.prisma.spot.findFirst({ where: { id, deletedAt: null } });
    if (!spot) return reply.status(404).send({ code: 'NOT_FOUND' });
    if (!await requireExactSpotAccess(spot, req.explorerId)) {
      return reply.status(404).send({ code: 'NOT_FOUND' });
    }
    const comments = await app.prisma.spotComment.findMany({
      where: { spotId: id },
      orderBy: { createdAt: 'asc' },
      include: { explorer: { select: { handle: true, avatarUrl: true, rank: true } } },
      take: 100,
    });
    return reply.send(
      comments.map((c) => ({
        id:               c.id,
        spotId:           c.spotId,
        explorerId:       c.explorerId,
        explorerHandle:   c.explorer.handle,
        explorerAvatarUrl: c.explorer.avatarUrl ?? undefined,
        body:             c.body,
        createdAt:        c.createdAt.toISOString(),
      })),
    );
  });

  // POST /api/spots/:id/comments
  app.post('/api/spots/:id/comments', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { body } = req.body as { body?: string };
    if (!body || body.trim().length === 0 || body.trim().length > 500) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', message: 'body must be 1-500 chars' });
    }
    const spot = await app.prisma.spot.findFirst({ where: { id, deletedAt: null } });
    if (!spot) return reply.status(404).send({ code: 'NOT_FOUND' });
    if (!await requireExactSpotAccess(spot, req.explorerId)) {
      return reply.status(404).send({ code: 'NOT_FOUND' });
    }

    // NEWCOMER rate limit: max 3 comments per 24h
    const explorer = await app.prisma.explorer.findUnique({
      where: { id: req.explorerId },
      select: { rank: true, handle: true, avatarUrl: true },
    });
    if (explorer?.rank === 'NEWCOMER') {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentCount = await app.prisma.spotComment.count({
        where: { explorerId: req.explorerId, createdAt: { gte: oneDayAgo } },
      });
      if (recentCount >= 3) {
        return reply.status(429).send({ code: 'RATE_LIMITED', message: 'NEWCOMER: max 3 comments per 24h' });
      }
    }

    const comment = await app.prisma.spotComment.create({
      data: { spotId: id, explorerId: req.explorerId, body: body.trim() },
    });

    // Signal to spot owner (not self-comment)
    if (spot.ownerId !== req.explorerId) {
      void pushSignal(
        app,
        spot.ownerId,
        'SPOT_COMMENT',
        { commentId: comment.id, spotId: id, spotTitle: spot.title, authorHandle: explorer?.handle ?? '' },
        `spot-comment:${comment.id}`,
      );
    }

    return reply.status(201).send({
      id:               comment.id,
      spotId:           comment.spotId,
      explorerId:       comment.explorerId,
      explorerHandle:   explorer?.handle ?? '',
      explorerAvatarUrl: explorer?.avatarUrl ?? undefined,
      body:             comment.body,
      createdAt:        comment.createdAt.toISOString(),
    });
  });
}
