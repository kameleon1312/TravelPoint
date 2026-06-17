import type { FastifyInstance } from 'fastify';
import type { Explorer } from '@prisma/client';
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  EmailSchema,
  AuthTokenSchema,
  ResetPasswordSchema,
} from '@travelpoint/validation';
import { hashPassword, verifyPassword } from '../lib/crypto';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from '../lib/jwt';
import { logger } from '../lib/logger';
import {
  sendWelcomeEmail,
  sendInviteEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../services/email';
import { hashAuthToken, issueAuthToken } from '../services/authTokens';
import { inviteErrorMessage, validateInvite } from '../services/inviteCodes';
import { requireAuth } from '../middleware/requireAuth';
import crypto from 'crypto';
import { addTrustPoints, TrustPoints } from '../services/trustScore';

const AUTH_RATE_LIMIT = { max: 5, timeWindow: '15 minutes' };

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/join
  app.post('/api/auth/join', { config: { rateLimit: AUTH_RATE_LIMIT } }, async (req, reply) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const { email, handle, password, inviteCode } = parsed.data;

    const existing = await app.prisma.explorer.findFirst({
      where: { OR: [{ email }, { handle }] },
    });
    if (existing) {
      return reply.status(409).send({ code: 'CONFLICT', message: 'Email or handle already taken' });
    }

    let invitedById: string | undefined;
    let invite: Awaited<ReturnType<typeof app.prisma.inviteCode.findUnique>> = null;
    if (inviteCode) {
      invite = await app.prisma.inviteCode.findUnique({ where: { code: inviteCode } });
      if (!invite) {
        return reply.status(400).send({ code: 'INVALID_INVITE', message: 'Invite code is invalid' });
      }
      const inviteError = validateInvite(invite, 'ACCOUNT', null);
      if (inviteError) {
        return reply.status(400).send({ code: inviteError, message: inviteErrorMessage(inviteError) });
      }
      invitedById = invite.createdById;
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();
    let explorer: Explorer;
    try {
      explorer = await app.prisma.$transaction(async (tx) => {
        const created = await tx.explorer.create({
          data: {
            email,
            handle,
            passwordHash,
            invitedById,
            consentTerms: now,
            consentPrivacy: now,
            auditLogs: {
              create: { action: 'REGISTER', metadata: { handle } },
            },
          },
        });

        if (invite) {
          const consumed = await tx.inviteCode.updateMany({
            where: {
              id: invite.id,
              purpose: 'ACCOUNT',
              circleId: null,
              expiresAt: { gt: now },
              useCount: invite.useCount,
            },
            data: {
              useCount: { increment: 1 },
              usedById: created.id,
              usedAt: now,
            },
          });
          if (consumed.count !== 1) throw new Error('INVITE_CONSUMPTION_CONFLICT');
          await tx.inviteUse.create({
            data: { inviteId: invite.id, explorerId: created.id },
          });
        }

        return created;
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'INVITE_CONSUMPTION_CONFLICT') {
        return reply.status(409).send({
          code: 'INVITE_EXHAUSTED',
          message: 'Invite code was already used',
        });
      }
      throw error;
    }

    const accessToken = signAccessToken(explorer.id);
    const refreshToken = signRefreshToken(explorer.id);
    await app.prisma.refreshToken.create({
      data: {
        explorerId: explorer.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    logger.info({ handle }, 'Explorer registered');

    // Welcome email — fire-and-forget, never blocks registration response
    const verificationToken = await issueAuthToken(
      app.prisma,
      explorer.id,
      'EMAIL_VERIFICATION',
      24 * 60 * 60 * 1000,
    );
    void sendWelcomeEmail(email, handle);
    void sendVerificationEmail(email, verificationToken);
    if (invite?.createdById) {
      void addTrustPoints(
        app.prisma,
        invite.createdById,
        TrustPoints.INVITE_JOINED,
        'INVITE_JOINED',
        `${invite.id}:${explorer.id}`,
      );
    }

    return reply.status(201).send({
      accessToken,
      refreshToken,
      explorer: {
        id: explorer.id,
        handle: explorer.handle,
        rank: explorer.rank,
        emailVerified: explorer.emailVerified,
      },
    });
  });

  // POST /api/auth/login
  app.post('/api/auth/login', { config: { rateLimit: AUTH_RATE_LIMIT } }, async (req, reply) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;

    const explorer = await app.prisma.explorer.findUnique({ where: { email } });
    if (!explorer || explorer.deletedAt || explorer.suspendedAt) {
      // Constant-time response to prevent enumeration
      await hashPassword('dummy-prevent-timing-attack');
      return reply.status(401).send({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    const valid = await verifyPassword(explorer.passwordHash, password);
    if (!valid) {
      return reply.status(401).send({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    const accessToken = signAccessToken(explorer.id);
    const refreshToken = signRefreshToken(explorer.id);
    const tokenHash = hashToken(refreshToken);

    await app.prisma.refreshToken.create({
      data: {
        explorerId: explorer.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await app.prisma.explorer.update({ where: { id: explorer.id }, data: { lastSeenAt: new Date() } });
    await app.prisma.auditLog.create({ data: { explorerId: explorer.id, action: 'LOGIN' } });

    return reply.send({ accessToken, refreshToken, explorer: { id: explorer.id, handle: explorer.handle, rank: explorer.rank } });
  });

  app.post('/api/auth/verify-email', { config: { rateLimit: AUTH_RATE_LIMIT } }, async (req, reply) => {
    const parsed = AuthTokenSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ code: 'VALIDATION_ERROR' });
    const now = new Date();
    const token = await app.prisma.authToken.findUnique({
      where: { tokenHash: hashAuthToken(parsed.data.token) },
    });
    if (!token || token.type !== 'EMAIL_VERIFICATION' || token.usedAt || token.expiresAt <= now) {
      return reply.status(400).send({ code: 'INVALID_OR_EXPIRED_TOKEN' });
    }
    await app.prisma.$transaction([
      app.prisma.authToken.update({ where: { id: token.id }, data: { usedAt: now } }),
      app.prisma.explorer.update({
        where: { id: token.explorerId },
        data: { emailVerified: true },
      }),
    ]);
    return reply.status(204).send();
  });

  app.post('/api/auth/resend-verification', {
    preHandler: [requireAuth],
    config: { rateLimit: { max: 3, timeWindow: '1 hour' } },
  }, async (req, reply) => {
    const explorer = await app.prisma.explorer.findUnique({ where: { id: req.explorerId } });
    if (!explorer || explorer.emailVerified) return reply.status(204).send();
    const token = await issueAuthToken(app.prisma, explorer.id, 'EMAIL_VERIFICATION', 24 * 60 * 60 * 1000);
    void sendVerificationEmail(explorer.email, token);
    return reply.status(204).send();
  });

  app.post('/api/auth/forgot-password', {
    config: { rateLimit: { max: 3, timeWindow: '1 hour' } },
  }, async (req, reply) => {
    const parsed = EmailSchema.safeParse(req.body);
    if (parsed.success) {
      const explorer = await app.prisma.explorer.findUnique({ where: { email: parsed.data.email } });
      if (explorer && !explorer.deletedAt && !explorer.suspendedAt) {
        const token = await issueAuthToken(app.prisma, explorer.id, 'PASSWORD_RESET', 60 * 60 * 1000);
        void sendPasswordResetEmail(explorer.email, token);
      }
    }
    return reply.status(204).send();
  });

  app.post('/api/auth/reset-password', {
    config: { rateLimit: AUTH_RATE_LIMIT },
  }, async (req, reply) => {
    const parsed = ResetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const now = new Date();
    const token = await app.prisma.authToken.findUnique({
      where: { tokenHash: hashAuthToken(parsed.data.token) },
    });
    if (!token || token.type !== 'PASSWORD_RESET' || token.usedAt || token.expiresAt <= now) {
      return reply.status(400).send({ code: 'INVALID_OR_EXPIRED_TOKEN' });
    }
    const passwordHash = await hashPassword(parsed.data.password);
    await app.prisma.$transaction([
      app.prisma.authToken.update({ where: { id: token.id }, data: { usedAt: now } }),
      app.prisma.explorer.update({ where: { id: token.explorerId }, data: { passwordHash } }),
      app.prisma.refreshToken.updateMany({
        where: { explorerId: token.explorerId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    return reply.status(204).send();
  });

  // POST /api/auth/refresh
  app.post('/api/auth/refresh', async (req, reply) => {
    const parsed = RefreshTokenSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ code: 'VALIDATION_ERROR' });

    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(parsed.data.refreshToken);
    } catch {
      return reply.status(401).send({ code: 'INVALID_TOKEN' });
    }

    const tokenHash = hashToken(parsed.data.refreshToken);
    const stored = await app.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return reply.status(401).send({ code: 'TOKEN_REVOKED' });
    }

    // Rotate
    await app.prisma.refreshToken.update({ where: { tokenHash }, data: { revokedAt: new Date() } });

    const newAccess = signAccessToken(payload.sub);
    const newRefresh = signRefreshToken(payload.sub);
    await app.prisma.refreshToken.create({
      data: {
        explorerId: payload.sub,
        tokenHash: hashToken(newRefresh),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return reply.send({ accessToken: newAccess, refreshToken: newRefresh });
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', async (req, reply) => {
    const parsed = RefreshTokenSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ code: 'VALIDATION_ERROR' });

    const tokenHash = hashToken(parsed.data.refreshToken);
    await app.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
    return reply.status(204).send();
  });

  // POST /api/auth/invite — INSIDER+ generates invite code, optionally sends to email
  app.post('/api/auth/invite', { preHandler: [requireAuth] }, async (req, reply) => {
    const explorer = await app.prisma.explorer.findUnique({ where: { id: req.explorerId } });
    if (!explorer || !['INSIDER', 'LEGEND'].includes(explorer.rank)) {
      return reply.status(403).send({ code: 'FORBIDDEN', message: 'INSIDER rank required to generate invites' });
    }

    const { recipientEmail } = req.body as { recipientEmail?: string };

    const code = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await app.prisma.inviteCode.create({
      data: {
        code,
        purpose: 'ACCOUNT',
        createdById: explorer.id,
        expiresAt,
        maxUses: 1,
      },
    });

    // Deliver code via email if recipient email was provided
    if (recipientEmail) {
      void sendInviteEmail(recipientEmail, explorer.handle, code);
    }

    return reply.status(201).send({ code, expiresAt });
  });
}
