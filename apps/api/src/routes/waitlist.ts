import type { FastifyInstance } from 'fastify';
import { WaitlistSchema, InviteRequestSchema } from '@travelpoint/validation';

export async function waitlistRoutes(app: FastifyInstance) {
  // POST /api/waitlist — from landing page FinalCTA
  app.post('/api/waitlist', async (req, reply) => {
    const parsed = WaitlistSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const { email, handle } = parsed.data;

    const existing = await app.prisma.explorer.findFirst({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return reply.status(200).send({ message: 'Already on the list.' });
    }

    // Store as invite request in AuditLog (no dedicated table needed at MVP)
    await app.prisma.auditLog.create({
      data: {
        action: 'WAITLIST_JOIN',
        metadata: { email, handle: handle ?? null },
      },
    });

    return reply.status(201).send({ message: 'Request received. We will reach out.' });
  });

  // POST /api/invite-request — alias
  app.post('/api/invite-request', async (req, reply) => {
    const parsed = InviteRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const { email, handle } = parsed.data;

    await app.prisma.auditLog.create({
      data: {
        action: 'INVITE_REQUEST',
        metadata: { email, handle: handle ?? null },
      },
    });

    return reply.status(201).send({ message: 'Request received.' });
  });
}
