import type { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { requireAuth } from '../middleware/requireAuth';
import { hashPassword } from '../lib/crypto';
import { auditAccess } from '../middleware/auditLog';
import { logger } from '../lib/logger';

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
        consentTerms: true, consentPrivacy: true,
        createdAt: true, updatedAt: true,
      },
    });
    if (!explorer) return reply.status(404).send({ code: 'NOT_FOUND' });
    return reply.send(explorer);
  });

  // ─── PATCH /api/explorers/me ───────────────────────────────────────────────
  app.patch('/api/explorers/me', { preHandler: [requireAuth] }, async (req, reply) => {
    const body = req.body as Record<string, unknown>;

    // Profile fields anyone can update
    const profileFields = ['displayName', 'bio', 'obsessions', 'archetype', 'territories'];

    // Consent fields — each change is audit-logged for GDPR compliance
    const consentFields = ['presenceConsent', 'locationConsent'];

    const profileData = Object.fromEntries(
      Object.entries(body).filter(([k]) => profileFields.includes(k)),
    );
    const consentData = Object.fromEntries(
      Object.entries(body).filter(([k]) => consentFields.includes(k)),
    );

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

    // Anonymize handle with entropy so the unique constraint never conflicts
    const anonHandle  = `deleted_${crypto.randomBytes(8).toString('hex')}`;
    const anonEmail   = `deleted_${explorerId}@travelpoint.deleted`;
    // Zero-out the password with a random unhashable value
    const anonPwHash  = await hashPassword(crypto.randomBytes(32).toString('hex'));

    await app.prisma.$transaction([
      // 1. Anonymize all PII fields in place — keeps relational integrity
      app.prisma.explorer.update({
        where: { id: explorerId },
        data: {
          deletedAt:      now,
          email:          anonEmail,
          handle:         anonHandle,
          displayName:    null,
          bio:            null,
          homeBaseEnc:    null,
          pushToken:      null,
          passwordHash:   anonPwHash,
          obsessions:     [],
          territories:    [],
          locationConsent:  false,
          presenceConsent:  false,
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
          emailVerified: true, createdAt: true, updatedAt: true,
          // Never exported: passwordHash, homeBaseEnc, pushToken
        },
      }),
      app.prisma.spot.findMany({
        where: { ownerId: explorerId, deletedAt: null },
        select: {
          id: true, title: true, story: true,
          category: true, accessLevel: true, createdAt: true, updatedAt: true,
          // lat/lng excluded — precise coords are PII under our privacy policy
        },
        orderBy: { createdAt: 'desc' },
      }),
      app.prisma.journey.findMany({
        where: { explorerId },
        select: {
          id: true, title: true, mood: true, soundtrack: true,
          isPrivate: true, createdAt: true, updatedAt: true,
          // routeGeoJson excluded — GPS trace is sensitive location data
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

    const exportPayload = {
      exportedAt:    new Date().toISOString(),
      exportVersion: '1.0',
      privacyNote:   [
        'GPS coordinates and route data are excluded from this export.',
        'Encrypted home base location is excluded.',
        'Auth credentials are never exported.',
      ],
      explorer,
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
