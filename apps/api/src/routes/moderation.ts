import type { FastifyInstance } from 'fastify';
import type { ReportReason, ReportStatus } from '@prisma/client';
import { requireAuth, requireModerator } from '../middleware/requireAuth';
import { runRetention } from '../services/retention';
import { env } from '../config/env';
import { setExplorerTier } from '../services/trustScore';

const REPORT_REASONS = ['SAFETY', 'HARASSMENT', 'SPAM', 'ILLEGAL_CONTENT', 'PRIVACY', 'OTHER'];
const REPORT_STATUSES = ['OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED'];

export async function moderationRoutes(app: FastifyInstance) {
  app.post('/api/reports', { preHandler: [requireAuth] }, async (req, reply) => {
    const body = req.body as {
      targetExplorerId?: string;
      spotId?: string;
      transmissionId?: string;
      forumPostId?: string;
      forumReplyId?: string;
      reason?: ReportReason;
      details?: string;
    };
    const targetCount = [
      body.targetExplorerId,
      body.spotId,
      body.transmissionId,
      body.forumPostId,
      body.forumReplyId,
    ].filter(Boolean).length;
    if (targetCount !== 1 || !body.reason || !REPORT_REASONS.includes(body.reason) || (body.details?.length ?? 0) > 1000) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR' });
    }
    if (body.targetExplorerId === req.explorerId) {
      return reply.status(400).send({ code: 'SELF_REPORT' });
    }
    const report = await app.prisma.report.create({
      data: {
        reporterId: req.explorerId,
        targetExplorerId: body.targetExplorerId,
        spotId: body.spotId,
        transmissionId: body.transmissionId,
        forumPostId: body.forumPostId,
        forumReplyId: body.forumReplyId,
        reason: body.reason,
        details: body.details?.trim(),
      },
    });
    return reply.status(201).send(report);
  });

  app.get('/api/blocks', { preHandler: [requireAuth] }, async (req) =>
    app.prisma.block.findMany({
      where: { blockerId: req.explorerId },
      include: { blocked: { select: { id: true, handle: true } } },
      orderBy: { createdAt: 'desc' },
    }));

  app.post('/api/blocks/:explorerId', { preHandler: [requireAuth] }, async (req, reply) => {
    const { explorerId } = req.params as { explorerId: string };
    if (explorerId === req.explorerId) return reply.status(400).send({ code: 'SELF_BLOCK' });
    const target = await app.prisma.explorer.findFirst({ where: { id: explorerId, deletedAt: null } });
    if (!target) return reply.status(404).send({ code: 'NOT_FOUND' });
    const block = await app.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: req.explorerId, blockedId: explorerId } },
      create: { blockerId: req.explorerId, blockedId: explorerId },
      update: {},
    });
    return reply.status(201).send(block);
  });

  app.delete('/api/blocks/:explorerId', { preHandler: [requireAuth] }, async (req, reply) => {
    const { explorerId } = req.params as { explorerId: string };
    await app.prisma.block.deleteMany({ where: { blockerId: req.explorerId, blockedId: explorerId } });
    return reply.status(204).send();
  });

  app.get('/api/admin/reports', { preHandler: [requireModerator] }, async (req) => {
    const status = (req.query as { status?: ReportStatus }).status;
    return app.prisma.report.findMany({
      where: status && REPORT_STATUSES.includes(status) ? { status } : {},
      include: {
        reporter: { select: { id: true, handle: true } },
        targetExplorer: { select: { id: true, handle: true, suspendedAt: true } },
        spot: { select: { id: true, title: true } },
        forumPost: { select: { id: true, title: true, slug: true } },
        forumReply: { select: { id: true, body: true, postId: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  });

  app.patch('/api/admin/reports/:id', { preHandler: [requireModerator] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status, resolution } = req.body as { status?: ReportStatus; resolution?: string };
    if (!status || !REPORT_STATUSES.includes(status) || (resolution?.length ?? 0) > 1000) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR' });
    }
    const report = await app.prisma.report.update({
      where: { id },
      data: {
        status,
        resolution: resolution?.trim(),
        resolvedAt: ['RESOLVED', 'DISMISSED'].includes(status) ? new Date() : null,
      },
    });
    return reply.send(report);
  });

  app.post('/api/admin/explorers/:id/suspend', { preHandler: [requireModerator] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { reason, reportId } = req.body as { reason?: string; reportId?: string };
    if (!reason?.trim() || reason.length > 1000 || id === req.explorerId) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR' });
    }
    await app.prisma.$transaction([
      app.prisma.explorer.update({
        where: { id },
        data: { suspendedAt: new Date(), suspensionReason: reason.slice(0, 500) },
      }),
      app.prisma.refreshToken.updateMany({
        where: { explorerId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      app.prisma.moderationAction.create({
        data: {
          moderatorId: req.explorerId,
          targetExplorerId: id,
          reportId,
          type: 'SUSPEND',
          reason: reason.trim(),
        },
      }),
    ]);
    return reply.status(204).send();
  });

  app.delete('/api/admin/explorers/:id/suspend', { preHandler: [requireModerator] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const reason = ((req.body as { reason?: string } | undefined)?.reason ?? 'Suspension lifted').slice(0, 1000);
    await app.prisma.$transaction([
      app.prisma.explorer.update({
        where: { id },
        data: { suspendedAt: null, suspensionReason: null },
      }),
      app.prisma.moderationAction.create({
        data: { moderatorId: req.explorerId, targetExplorerId: id, type: 'UNSUSPEND', reason },
      }),
    ]);
    return reply.status(204).send();
  });

  app.patch('/api/admin/explorers/:id/tier', { preHandler: [requireModerator] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { tier, reason, expiresAt } = req.body as {
      tier?: 'FREE' | 'PRO' | 'EXPEDITION';
      reason?: string;
      expiresAt?: string | null;
    };
    if (!tier || !['FREE', 'PRO', 'EXPEDITION'].includes(tier) || !reason?.trim()) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR' });
    }
    const parsedExpiry = expiresAt ? new Date(expiresAt) : null;
    if (parsedExpiry && Number.isNaN(parsedExpiry.getTime())) {
      return reply.status(400).send({ code: 'INVALID_EXPIRY' });
    }
    await setExplorerTier(app.prisma, id, tier, reason, parsedExpiry);
    return reply.status(204).send();
  });

  app.post('/internal/jobs/retention', async (req, reply) => {
    if (!env.jobSecret) {
      return reply.status(503).send({ code: 'JOB_SECRET_NOT_CONFIGURED' });
    }
    if (req.headers['x-job-secret'] !== env.jobSecret) {
      return reply.status(401).send({ code: 'UNAUTHORIZED' });
    }
    return reply.send(await runRetention(app.prisma));
  });

  app.get('/internal/jobs/retention/status', async (req, reply) => {
    if (!env.jobSecret) {
      return reply.status(503).send({ code: 'JOB_SECRET_NOT_CONFIGURED' });
    }
    if (req.headers['x-job-secret'] !== env.jobSecret) {
      return reply.status(401).send({ code: 'UNAUTHORIZED' });
    }
    const latest = await app.prisma.auditLog.findFirst({
      where: { action: 'RETENTION_JOB_COMPLETED' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, metadata: true },
    });
    return reply.send({
      status: latest ? 'ok' : 'never_run',
      lastCompletedAt: latest?.createdAt ?? null,
      result: latest?.metadata ?? null,
    });
  });
}
