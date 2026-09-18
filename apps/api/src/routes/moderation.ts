import type { FastifyInstance } from 'fastify';
import type { ReportStatus } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, requireModerator } from '../middleware/requireAuth';
import { runRetention } from '../services/retention';
import { env } from '../config/env';
import { setExplorerTier } from '../services/trustScore';

const ReportReasonEnum = z.enum(['SAFETY', 'HARASSMENT', 'SPAM', 'ILLEGAL_CONTENT', 'PRIVACY', 'OTHER']);
const ReportStatusEnum = z.enum(['OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED']);
const TierEnum         = z.enum(['FREE', 'PRO', 'EXPEDITION']);

const CreateReportSchema = z.object({
  targetExplorerId: z.string().cuid().optional(),
  spotId:           z.string().cuid().optional(),
  transmissionId:   z.string().cuid().optional(),
  forumPostId:      z.string().cuid().optional(),
  forumReplyId:     z.string().cuid().optional(),
  reason:           ReportReasonEnum,
  details:          z.string().max(1000).optional(),
}).refine(
  (d) => [d.targetExplorerId, d.spotId, d.transmissionId, d.forumPostId, d.forumReplyId].filter(Boolean).length === 1,
  { message: 'Exactly one target required' },
);

const UpdateReportSchema = z.object({
  status:     ReportStatusEnum,
  resolution: z.string().max(1000).optional(),
});

const SuspendSchema = z.object({
  reason:   z.string().trim().min(1).max(1000),
  reportId: z.string().cuid().optional(),
});

const AdminTierSchema = z.object({
  tier:      TierEnum,
  reason:    z.string().trim().min(1).max(1000),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function moderationRoutes(app: FastifyInstance) {
  app.post('/api/reports', { preHandler: [requireAuth] }, async (req, reply) => {
    const parsed = CreateReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const { targetExplorerId, spotId, transmissionId, forumPostId, forumReplyId, reason, details } = parsed.data;
    if (targetExplorerId === req.explorerId) {
      return reply.status(400).send({ code: 'SELF_REPORT' });
    }
    const report = await app.prisma.report.create({
      data: {
        reporterId: req.explorerId,
        targetExplorerId,
        spotId,
        transmissionId,
        forumPostId,
        forumReplyId,
        reason,
        details: details?.trim(),
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

  app.get('/api/admin/reports', { preHandler: [requireModerator] }, async (req, reply) => {
    const query = req.query as { status?: ReportStatus; type?: string; page?: string; limit?: string };
    const status = query.status;
    const type = query.type;
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(Math.max(Number(query.limit ?? 50), 1), 100);
    const skip = (page - 1) * limit;

    const typeFilter = type === 'explorer' ? { targetExplorerId: { not: null } }
      : type === 'spot' ? { spotId: { not: null } }
      : type === 'forum' ? { forumPostId: { not: null } }
      : type === 'transmission' ? { transmissionId: { not: null } }
      : {};

    const where = {
      ...(status && ReportStatusEnum.safeParse(status).success ? { status } : {}),
      ...typeFilter,
    };

    const [reports, total] = await Promise.all([
      app.prisma.report.findMany({
        where,
        include: {
          reporter: { select: { id: true, handle: true } },
          targetExplorer: { select: { id: true, handle: true, suspendedAt: true } },
          spot: { select: { id: true, title: true } },
          forumPost: { select: { id: true, title: true, slug: true } },
          forumReply: { select: { id: true, body: true, postId: true } },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      app.prisma.report.count({ where }),
    ]);

    return reply.send({ reports, total, page, limit, pages: Math.ceil(total / limit) });
  });

  app.patch('/api/admin/reports/:id', { preHandler: [requireModerator] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = UpdateReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const { status, resolution } = parsed.data;
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
    const parsed = SuspendSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    if (id === req.explorerId) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR' });
    }
    const { reason, reportId } = parsed.data;
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
    const parsed = AdminTierSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const { tier, reason, expiresAt } = parsed.data;
    const parsedExpiry = expiresAt ? new Date(expiresAt) : null;
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
