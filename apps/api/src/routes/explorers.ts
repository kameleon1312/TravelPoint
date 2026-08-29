import type { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { requireAuth } from '../middleware/requireAuth';
import { auditAccess } from '../middleware/auditLog';
import { logger } from '../lib/logger';
import { env } from '../config/env';
import { decrypt, encrypt } from '@travelpoint/utils';
import { HomeBaseSchema, ProfileUpdateSchema } from '@travelpoint/validation';

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
        id: true, handle: true, displayName: true, archetype: true,
        bio: true, obsessions: true, territories: true, trustScore: true,
        rank: true, tier: true, tierExpiresAt: true, emailVerified: true,
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

    // Delete from Supabase Auth so the account cannot be reused
    if (explorerRecord?.supabaseId && env.supabaseUrl && env.supabaseServiceRoleKey) {
      void fetch(`${env.supabaseUrl}/auth/v1/admin/users/${explorerRecord.supabaseId}`, {
        method: 'DELETE',
        headers: {
          apikey: env.supabaseServiceRoleKey,
          Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
        },
      }).catch((err) => logger.warn({ err }, 'Failed to delete Supabase Auth user — will be purged later'));
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

  // ─── GET /api/explorers/:handle — public profile ──────────────────────────
  app.get('/api/explorers/:handle', async (req, reply) => {
    const { handle } = req.params as { handle: string };
    const explorer = await app.prisma.explorer.findFirst({
      where: { handle, deletedAt: null },
      select: {
        id: true, handle: true, displayName: true,
        archetype: true, bio: true, obsessions: true, rank: true,
      },
    });
    if (!explorer) return reply.status(404).send({ code: 'NOT_FOUND' });
    return reply.send(explorer);
  });
}
