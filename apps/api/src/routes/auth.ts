import type { FastifyInstance } from 'fastify';
import { RegisterSchema, LoginSchema, RefreshTokenSchema } from '@travelpoint/validation';
import { hashPassword, verifyPassword } from '../lib/crypto';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from '../lib/jwt';
import { logger } from '../lib/logger';
import crypto from 'crypto';

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
    if (inviteCode) {
      const invite = await app.prisma.inviteCode.findUnique({ where: { code: inviteCode } });
      if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
        return reply.status(400).send({ code: 'INVALID_INVITE', message: 'Invite code invalid or expired' });
      }
      invitedById = invite.createdById;
      await app.prisma.inviteCode.update({ where: { code: inviteCode }, data: { usedById: 'pending', usedAt: new Date() } });
    }

    const passwordHash = await hashPassword(password);
    const explorer = await app.prisma.explorer.create({
      data: {
        email,
        handle,
        passwordHash,
        invitedById,
        consentTerms: new Date(),
        consentPrivacy: new Date(),
        auditLogs: {
          create: { action: 'REGISTER', metadata: { handle } },
        },
      },
    });

    if (inviteCode && invitedById) {
      await app.prisma.inviteCode.update({
        where: { code: inviteCode },
        data: { usedById: explorer.id },
      });
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
    return reply.status(201).send({
      accessToken,
      refreshToken,
      explorer: { id: explorer.id, handle: explorer.handle, rank: explorer.rank },
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
    if (!explorer || explorer.deletedAt) {
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

  // POST /api/auth/invite — INSIDER+ generates invite code
  app.post('/api/auth/invite', async (req, reply) => {
    // requireAuth inline check
    const auth = req.headers['authorization'];
    if (!auth?.startsWith('Bearer ')) return reply.status(401).send({ code: 'UNAUTHORIZED' });

    const { verifyAccessToken } = await import('../lib/jwt');
    let sub: string;
    try {
      sub = verifyAccessToken(auth.slice(7)).sub;
    } catch {
      return reply.status(401).send({ code: 'UNAUTHORIZED' });
    }

    const explorer = await app.prisma.explorer.findUnique({ where: { id: sub } });
    if (!explorer || !['INSIDER', 'LEGEND'].includes(explorer.rank)) {
      return reply.status(403).send({ code: 'FORBIDDEN', message: 'INSIDER rank required to generate invites' });
    }

    const code = crypto.randomBytes(16).toString('hex');
    await app.prisma.inviteCode.create({
      data: {
        code,
        createdById: explorer.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return reply.status(201).send({ code, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
  });
}
