import type { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { requireAuth } from '../middleware/requireAuth';
import { auditAccess } from '../middleware/auditLog';
import { logger } from '../lib/logger';
import { env } from '../config/env';
import { decrypt, encrypt } from '@travelpoint/utils';
import { HomeBaseSchema, ProfileUpdateSchema } from '@travelpoint/validation';
import { createPhotoUpload, finalizePhoto, validatePhoto } from '../services/storage';

function decryptHomeBase(value: string | null): { lat: number; lng: number } | null {
  if (!value) return null;
  try {
    return HomeBaseSchema.parse(JSON.parse(decrypt(value)));
  } catch (error) {
    logger.error({ err: error }, 'Failed to decrypt explorer home base');
    return null;
  }
}

export async function explorerRoutes(app: FastifyInstance) {
  // ─── GET /api/explorers/me ─────────────────────────────────────────────────
  app.get('/api/explorers/me', { preHandler: [requireAuth] }, async (req, reply) => {
    const explorer = await app.prisma.explorer.findUnique({
      where: { id: req.explorerId },
      select: {
        id: true, handle: true, displayName: true, avatarUrl: true, archetype: true,
        bio: true, obsessions: true, territories: true, trustScore: true,
        rank: true, role: true, tier: true, tierExpiresAt: true, emailVerified: true,
        locationConsent: true, presenceConsent: true,
        homeBaseEnc: true,
        consentTerms: true, consentPrivacy: true,
        createdAt: true, updatedAt: true,
      },
    });
    if (!explorer) return reply.status(404).send({ code: 'NOT_FOUND' });
    const { homeBaseEnc, ...publicExplorer } = explorer;
    return reply.send({ ...publicExplorer, homeBase: decryptHomeBase(homeBaseEnc) });
  });

  app.put('/api/explorers/me/home-base', { preHandler: [requireAuth] }, async (req, reply) => {
    const parsed = HomeBaseSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten(),
      });
    }

    await app.prisma.explorer.update({
      where: { id: req.explorerId },
      data: { homeBaseEnc: encrypt(JSON.stringify(parsed.data)) },
    });
    await auditAccess(app.prisma, req.explorerId, 'HOME_BASE_UPDATED');
    return reply.send(parsed.data);
  });

  app.delete('/api/explorers/me/home-base', { preHandler: [requireAuth] }, async (req, reply) => {
    await app.prisma.explorer.update({
      where: { id: req.explorerId },
      data: { homeBaseEnc: null },
    });
    await auditAccess(app.prisma, req.explorerId, 'HOME_BASE_REMOVED');
    return reply.status(204).send();
  });

  // ─── POST /api/explorers/me/avatar/upload-url ────────────────────────────
  app.post('/api/explorers/me/avatar/upload-url', { preHandler: [requireAuth] }, async (req, reply) => {
    const { mimeType, sizeBytes } = req.body as { mimeType?: string; sizeBytes?: number };
    try {
      validatePhoto(mimeType ?? '', sizeBytes ?? 0);
      const upload = await createPhotoUpload(req.explorerId, mimeType!, sizeBytes!);
      return reply.send(upload);
    } catch (error) {
      const code = error instanceof Error ? error.message : 'UPLOAD_FAILED';
      const status = code === 'STORAGE_NOT_CONFIGURED' ? 503
        : code === 'UNSUPPORTED_MEDIA_TYPE' ? 415
          : code === 'PHOTO_TOO_LARGE' ? 413 : 400;
      return reply.status(status).send({ code });
    }
  });

  // ─── POST /api/explorers/me/avatar/complete ───────────────────────────────
  app.post('/api/explorers/me/avatar/complete', { preHandler: [requireAuth] }, async (req, reply) => {
    const { objectKey, mimeType, sizeBytes } = req.body as {
      objectKey?: string; mimeType?: string; sizeBytes?: number;
    };
    if (!objectKey?.startsWith(`photos/${req.explorerId}/`)) {
      return reply.status(400).send({ code: 'INVALID_OBJECT_KEY' });
    }
    let stored;
    try {
      stored = await finalizePhoto(objectKey, mimeType ?? '', sizeBytes ?? 0);
    } catch (error) {
      const code = error instanceof Error ? error.message : 'UPLOAD_FAILED';
      return reply.status(code === 'STORAGE_NOT_CONFIGURED' ? 503 : 400).send({ code });
    }
    const updated = await app.prisma.explorer.update({
      where: { id: req.explorerId },
      data: { avatarUrl: stored.url },
      select: { avatarUrl: true },
    });
    await auditAccess(app.prisma, req.explorerId, 'AVATAR_UPDATED');
    return reply.send({ avatarUrl: updated.avatarUrl });
  });

  // ─── PATCH /api/explorers/me ───────────────────────────────────────────────
  app.patch('/api/explorers/me', { preHandler: [requireAuth] }, async (req, reply) => {
    const parsed = ProfileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }

    const { locationConsent, presenceConsent, ...profileData } = parsed.data;

    const consentData: Record<string, boolean> = {};
    if (locationConsent !== undefined) consentData['locationConsent'] = locationConsent;
    if (presenceConsent !== undefined) consentData['presenceConsent'] = presenceConsent;

    const data = { ...profileData, ...consentData };
    if (Object.keys(data).length === 0) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', message: 'No updatable fields provided' });
    }

    const explorer = await app.prisma.explorer.update({
      where: { id: req.explorerId },
      data,
      select: {
        id: true, handle: true, displayName: true, bio: true,
        obsessions: true, archetype: true, territories: true,
        locationConsent: true, presenceConsent: true,
      },
    });

    // Log consent changes to audit trail (GDPR Art. 7 — proof of consent)
    if (Object.keys(consentData).length > 0) {
      await auditAccess(app.prisma, req.explorerId, 'CONSENT_UPDATED', {
        changes: consentData,
        timestamp: new Date().toISOString(),
        ipHint: req.headers['x-forwarded-for'] ?? 'unknown',
      });
    }

    return reply.send(explorer);
  });

  // ─── DELETE /api/explorers/me — GDPR Art. 17 right to erasure ─────────────
  app.delete('/api/explorers/me', { preHandler: [requireAuth] }, async (req, reply) => {
    const now = new Date();
    const explorerId = req.explorerId;

    const explorerRecord = await app.prisma.explorer.findUnique({
      where: { id: explorerId },
      select: { supabaseId: true },
    });

    const anonHandle = `deleted_${crypto.randomBytes(8).toString('hex')}`;
    const anonEmail  = `deleted_${explorerId}@travelpoint.deleted`;

    await app.prisma.$transaction([
      // 1. Anonymize all PII fields in place — keeps relational integrity
      app.prisma.explorer.update({
        where: { id: explorerId },
        data: {
          deletedAt:       now,
          purgeAt:         new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          supabaseId:      null,
          email:           anonEmail,
          handle:          anonHandle,
          displayName:     null,
          bio:             null,
          homeBaseEnc:     null,
          pushToken:       null,
          passwordHash:    null,
          obsessions:      [],
          territories:     [],
          locationConsent: false,
          presenceConsent: false,
        },
      }),

      // 2. Revoke all refresh tokens immediately
      app.prisma.refreshToken.updateMany({
        where: { explorerId },
        data:  { revokedAt: now },
      }),

      // 3. Audit log — retained for legal compliance (Art. 5(1)(e) storage limitation)
      app.prisma.auditLog.create({
        data: {
          explorerId,
          action:   'ACCOUNT_DELETED',
          metadata: {
            requestedAt: now.toISOString(),
            method:      'GDPR_ERASURE_REQUEST',
            purgeAfter:  new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      }),
    ]);

    // Delete from Supabase Auth so the account cannot be reused (GDPR Art.17)
    if (explorerRecord?.supabaseId && env.supabaseUrl && env.supabaseServiceRoleKey) {
      try {
        const supabaseResp = await fetch(`${env.supabaseUrl}/auth/v1/admin/users/${explorerRecord.supabaseId}`, {
          method: 'DELETE',
          headers: {
            apikey: env.supabaseServiceRoleKey,
            Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
          },
        });
        if (!supabaseResp.ok) {
          logger.error(
            { status: supabaseResp.status, explorerId },
            'Supabase Auth user deletion returned non-2xx — account may persist in Supabase Auth, manual cleanup required',
          );
        }
      } catch (err) {
        logger.error(
          { err, explorerId },
          'Supabase Auth user deletion failed (network error) — account may persist in Supabase Auth, manual cleanup required',
        );
      }
    }

    logger.info({ explorerId }, 'GDPR: account anonymized and tokens revoked');
    return reply.status(204).send();
  });

  // ─── GET /api/explorers/me/export — GDPR Art. 20 data portability ─────────
  app.get('/api/explorers/me/export', { preHandler: [requireAuth] }, async (req, reply) => {
    const explorerId = req.explorerId;

    const [explorer, spots, journeys, memberships, signals] = await Promise.all([
      app.prisma.explorer.findUnique({
        where: { id: explorerId },
        select: {
          id: true, handle: true, displayName: true, email: true,
          archetype: true, bio: true, obsessions: true, territories: true,
          trustScore: true, rank: true, tier: true,
          locationConsent: true, presenceConsent: true,
          consentTerms: true, consentPrivacy: true,
          emailVerified: true, homeBaseEnc: true, createdAt: true, updatedAt: true,
          // Never exported: passwordHash and pushToken
        },
      }),
      app.prisma.spot.findMany({
        where: { ownerId: explorerId, deletedAt: null },
        select: {
          id: true, title: true, story: true,
          category: true, accessLevel: true, createdAt: true, updatedAt: true,
          lat: true, lng: true, circleId: true, dropExpiresAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      app.prisma.journey.findMany({
        where: { explorerId },
        select: {
          id: true, title: true, mood: true, soundtrack: true,
          isPrivate: true, createdAt: true, updatedAt: true,
          routeGeoJson: true, routeExpiresAt: true, retainRoute: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      app.prisma.circleMember.findMany({
        where: { explorerId },
        select: {
          role: true, joinedAt: true,
          circle: { select: { name: true, slug: true, description: true } },
        },
        orderBy: { joinedAt: 'desc' },
      }),
      app.prisma.signal.findMany({
        where: { explorerId },
        select: { type: true, createdAt: true, seenAt: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    ]);

    // Audit log — record that a data export was requested (GDPR accountability)
    await auditAccess(app.prisma, explorerId, 'DATA_EXPORTED', {
      requestedAt:  new Date().toISOString(),
      recordCounts: {
        spots:     spots.length,
        journeys:  journeys.length,
        circles:   memberships.length,
        signals:   signals.length,
      },
    });

    const exportExplorer = explorer
      ? {
          ...explorer,
          homeBase: decryptHomeBase(explorer.homeBaseEnc),
          homeBaseEnc: undefined,
        }
      : null;
    const exportPayload = {
      exportedAt:    new Date().toISOString(),
      exportVersion: '2.0',
      privacyNote:   [
        'The export contains precise spot coordinates and retained journey routes.',
        'Home base is decrypted for this authenticated export.',
        'Auth credentials are never exported.',
      ],
      explorer: exportExplorer,
      content: { spots, journeys, circles: memberships, signals },
    };

    const filename = `travelpoint-export-${Date.now()}.json`;
    reply.header('Content-Type', 'application/json; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return reply.send(exportPayload);
  });

  // ─── POST /api/explorers/me/push-token ────────────────────────────────────
  app.post('/api/explorers/me/push-token', { preHandler: [requireAuth] }, async (req, reply) => {
    const { token } = req.body as { token?: string };
    if (!token || typeof token !== 'string') {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', message: 'token required' });
    }
    await app.prisma.explorer.update({
      where: { id: req.explorerId },
      data:  { pushToken: token },
    });
    return reply.status(204).send();
  });

  // ─── GET /api/explorers/search?q= — find explorers by handle/displayName ──
  app.get('/api/explorers/search', { preHandler: [requireAuth] }, async (req, reply) => {
    const { q } = req.query as { q?: string };
    const term = (q ?? '').trim();
    if (term.length < 2) return reply.send([]);

    const explorers = await app.prisma.explorer.findMany({
      where: {
        deletedAt: null,
        OR: [
          { handle: { contains: term, mode: 'insensitive' } },
          { displayName: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: { id: true, handle: true, displayName: true, rank: true, archetype: true },
      take: 20,
      orderBy: { trustScore: 'desc' },
    });

    return reply.send(explorers);
  });

  // ─── POST /api/explorers/:id/block ────────────────────────────────────────
  app.post('/api/explorers/:id/block', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (id === req.explorerId) {
      return reply.status(400).send({ code: 'CANNOT_BLOCK_SELF' });
    }
    const target = await app.prisma.explorer.findFirst({ where: { id, deletedAt: null } });
    if (!target) return reply.status(404).send({ code: 'NOT_FOUND' });

    await app.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: req.explorerId, blockedId: id } },
      create: { blockerId: req.explorerId, blockedId: id },
      update: {},
    });
    return reply.status(204).send();
  });

  // ─── DELETE /api/explorers/:id/block ─────────────────────────────────────
  app.delete('/api/explorers/:id/block', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await app.prisma.block.deleteMany({
      where: { blockerId: req.explorerId, blockedId: id },
    });
    return reply.status(204).send();
  });

  // ─── GET /api/explorers/:handle — public profile ──────────────────────────
  // IMPORTANT: must come after /search and /me/... routes to avoid collisions
  app.get('/api/explorers/:handle', async (req, reply) => {
    const { handle } = req.params as { handle: string };
    const explorer = await app.prisma.explorer.findFirst({
      where: { handle, deletedAt: null },
      select: {
        id: true, handle: true, displayName: true, avatarUrl: true,
        archetype: true, bio: true, obsessions: true, rank: true,
      },
    });
    if (!explorer) return reply.status(404).send({ code: 'NOT_FOUND' });
    return reply.send(explorer);
  });

  // ─── GET /api/explorers/:handle/spots — public spots of an explorer ────────
  // Returns only PUBLIC spots, with coords fuzzed ≥500m (same as /spots/public).
  // Rate-limited — no auth required.
  app.get('/api/explorers/:handle/spots', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const { handle } = req.params as { handle: string };
    const query = req.query as Record<string, string>;
    const limit = Math.min(Number(query['limit'] ?? 30), 50);

    const explorer = await app.prisma.explorer.findFirst({
      where: { handle, deletedAt: null },
      select: { id: true },
    });
    if (!explorer) return reply.status(404).send({ code: 'NOT_FOUND' });

    const now = new Date();
    const spots = await app.prisma.spot.findMany({
      where: {
        ownerId:     explorer.id,
        accessLevel: 'PUBLIC',
        deletedAt:   null,
        OR: [
          { dropExpiresAt: null },
          { dropExpiresAt: { gt: now } },
        ],
      },
      select: {
        id: true, title: true, category: true,
        lat: true, lng: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Fuzz coords with a stable daily seed (consistent within a day, shifts daily)
    const today = Math.floor(Date.now() / 86_400_000);
    const { fuzzCoordinates } = await import('@travelpoint/geo');
    const fuzzed = spots.map((s) => {
      const seed = today ^ s.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const { lat, lng } = fuzzCoordinates(s.lat, s.lng, 500, seed);
      return { ...s, lat, lng };
    });

    return reply.send(fuzzed);
  });
}
