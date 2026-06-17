import type { FastifyInstance } from 'fastify';
import { CreateCircleSchema } from '@travelpoint/validation';
import { requireAuth } from '../middleware/requireAuth';
import { inviteErrorMessage, validateInvite } from '../services/inviteCodes';
import crypto from 'crypto';
import { pushSignal } from './signals';
import { addTrustPoints, TrustPoints } from '../services/trustScore';

export async function circleRoutes(app: FastifyInstance) {
  // GET /api/circles — list public circles
  app.get('/api/circles', { preHandler: [requireAuth] }, async (req, reply) => {
    const circles = await app.prisma.circle.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return reply.send(circles);
  });

  // GET /api/circles/mine — circles I'm member of
  app.get('/api/circles/mine', { preHandler: [requireAuth] }, async (req, reply) => {
    const memberships = await app.prisma.circleMember.findMany({
      where: { explorerId: req.explorerId },
      include: {
        circle: { include: { _count: { select: { members: true } } } },
      },
    });
    return reply.send(memberships.map((m: typeof memberships[0]) => ({ ...m.circle, role: m.role })));
  });

  // GET /api/circles/:slug
  app.get('/api/circles/:slug', { preHandler: [requireAuth] }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const circleSummary = await app.prisma.circle.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!circleSummary) return reply.status(404).send({ code: 'NOT_FOUND' });

    const membership = await app.prisma.circleMember.findUnique({
      where: {
        circleId_explorerId: {
          circleId: circleSummary.id,
          explorerId: req.explorerId,
        },
      },
      select: { role: true },
    });
    const circle = await app.prisma.circle.findUnique({
      where: { slug },
      include: {
        members: {
          where: membership ? undefined : { explorerId: req.explorerId },
          include: { explorer: { select: { id: true, handle: true, rank: true, displayName: true } } },
        },
        _count: { select: { members: true } },
      },
    });
    if (!circle) return reply.status(404).send({ code: 'NOT_FOUND' });
    return reply.send({ ...circle, viewerRole: membership?.role ?? null });
  });

  // POST /api/circles — create (EXPEDITION tier required)
  app.post('/api/circles', { preHandler: [requireAuth] }, async (req, reply) => {
    const parsed = CreateCircleSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }

    const explorer = await app.prisma.explorer.findUnique({ where: { id: req.explorerId } });
    if (!explorer) return reply.status(404).send({ code: 'NOT_FOUND' });
    if (explorer.tier !== 'EXPEDITION') {
      return reply.status(403).send({ code: 'TIER_REQUIRED', message: 'EXPEDITION tier required to create circles' });
    }

    const existing = await app.prisma.circle.findUnique({ where: { slug: parsed.data.slug } });
    if (existing) return reply.status(409).send({ code: 'CONFLICT', message: 'Slug already taken' });

    const circle = await app.prisma.circle.create({
      data: {
        ...parsed.data,
        createdById: req.explorerId,
        members: {
          create: { explorerId: req.explorerId, role: 'FOUNDER' },
        },
      },
    });
    return reply.status(201).send(circle);
  });

  // POST /api/circles/:slug/join
  app.post('/api/circles/:slug/join', { preHandler: [requireAuth] }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const inviteCode = typeof (req.body as { inviteCode?: unknown } | null)?.inviteCode === 'string'
      ? (req.body as { inviteCode: string }).inviteCode.trim()
      : '';

    const circle = await app.prisma.circle.findUnique({ where: { slug } });
    if (!circle) return reply.status(404).send({ code: 'NOT_FOUND' });

    if (circle.isInviteOnly && !inviteCode) {
      return reply.status(403).send({ code: 'INVITE_REQUIRED', message: 'This circle requires an invite code' });
    }

    const alreadyMember = await app.prisma.circleMember.findUnique({
      where: { circleId_explorerId: { circleId: circle.id, explorerId: req.explorerId } },
    });
    if (alreadyMember) return reply.status(409).send({ code: 'ALREADY_MEMBER' });

    const now = new Date();
    const invite = circle.isInviteOnly
      ? await app.prisma.inviteCode.findUnique({ where: { code: inviteCode } })
      : null;
    if (circle.isInviteOnly) {
      const inviteError = validateInvite(invite, 'CIRCLE', circle.id, now);
      if (inviteError) {
        return reply.status(403).send({ code: inviteError, message: inviteErrorMessage(inviteError) });
      }
    }

    try {
      await app.prisma.$transaction(async (tx) => {
        if (invite) {
          const consumed = await tx.inviteCode.updateMany({
            where: {
              id: invite.id,
              purpose: 'CIRCLE',
              circleId: circle.id,
              expiresAt: { gt: now },
              useCount: invite.useCount,
            },
            data: {
              useCount: { increment: 1 },
              usedById: req.explorerId,
              usedAt: now,
            },
          });
          if (consumed.count !== 1) throw new Error('INVITE_CONSUMPTION_CONFLICT');
          await tx.inviteUse.create({
            data: { inviteId: invite.id, explorerId: req.explorerId },
          });
        }

        await tx.circleMember.create({
          data: { circleId: circle.id, explorerId: req.explorerId, role: 'MEMBER' },
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'INVITE_CONSUMPTION_CONFLICT') {
        return reply.status(409).send({ code: 'INVITE_EXHAUSTED', message: 'Invite code was already used' });
      }
      throw error;
    }
    if (invite?.createdById) {
      void addTrustPoints(
        app.prisma,
        invite.createdById,
        TrustPoints.INVITE_JOINED,
        'INVITE_JOINED',
        `${invite.id}:${req.explorerId}`,
      );
    }
    return reply.status(201).send({ message: 'Joined circle' });
  });

  // DELETE /api/circles/:slug/leave
  app.delete('/api/circles/:slug/leave', { preHandler: [requireAuth] }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const circle = await app.prisma.circle.findUnique({ where: { slug } });
    if (!circle) return reply.status(404).send({ code: 'NOT_FOUND' });

    await app.prisma.circleMember.deleteMany({
      where: { circleId: circle.id, explorerId: req.explorerId },
    });
    return reply.status(204).send();
  });

  // GET /api/circles/:slug/invite-codes — GUIDE+ lists generated codes
  app.get('/api/circles/:slug/invite-codes', { preHandler: [requireAuth] }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const circle = await app.prisma.circle.findUnique({ where: { slug } });
    if (!circle) return reply.status(404).send({ code: 'NOT_FOUND' });

    const membership = await app.prisma.circleMember.findUnique({
      where: { circleId_explorerId: { circleId: circle.id, explorerId: req.explorerId } },
    });
    if (!membership || !['GUIDE', 'FOUNDER'].includes(membership.role)) {
      return reply.status(403).send({ code: 'FORBIDDEN' });
    }

    const codes = await app.prisma.inviteCode.findMany({
      where: {
        purpose: 'CIRCLE',
        circleId: circle.id,
        expiresAt: { gt: new Date() },
        useCount: { lt: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return reply.send(codes);
  });

  // POST /api/circles/:slug/invite — GUIDE+ generates invite code
  app.post('/api/circles/:slug/invite', { preHandler: [requireAuth] }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const circle = await app.prisma.circle.findUnique({ where: { slug } });
    if (!circle) return reply.status(404).send({ code: 'NOT_FOUND' });

    const membership = await app.prisma.circleMember.findUnique({
      where: { circleId_explorerId: { circleId: circle.id, explorerId: req.explorerId } },
    });
    if (!membership || !['GUIDE', 'FOUNDER'].includes(membership.role)) {
      return reply.status(403).send({ code: 'FORBIDDEN', message: 'GUIDE or FOUNDER role required' });
    }

    const { recipientId } = (req.body as { recipientId?: string } | undefined) ?? {};
    if (recipientId) {
      const recipient = await app.prisma.explorer.findFirst({
        where: { id: recipientId, deletedAt: null },
        select: { id: true },
      });
      if (!recipient) return reply.status(404).send({ code: 'RECIPIENT_NOT_FOUND' });
    }
    const code = crypto.randomBytes(12).toString('hex');
    await app.prisma.inviteCode.create({
      data: {
        code,
        purpose: 'CIRCLE',
        circleId: circle.id,
        createdById: req.explorerId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxUses: 1,
      },
    });
    if (recipientId) {
      void pushSignal(
        app,
        recipientId,
        'CIRCLE_INVITE',
        { circleId: circle.id, circleName: circle.name, code },
        `circle-invite:${circle.id}:${recipientId}:${code}`,
      );
    }
    return reply.status(201).send({ code });
  });
}
