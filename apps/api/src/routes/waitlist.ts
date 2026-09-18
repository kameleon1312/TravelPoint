import type { FastifyInstance } from 'fastify';
import { WaitlistSchema, InviteRequestSchema } from '@travelpoint/validation';
import { sendWaitlistConfirmationEmail } from '../services/email';

const WAITLIST_RATE_LIMIT = { max: 5, timeWindow: '1 minute' };

export async function waitlistRoutes(app: FastifyInstance) {
  // POST /api/waitlist — from landing page FinalCTA
  app.post('/api/waitlist', { config: { rateLimit: WAITLIST_RATE_LIMIT } }, async (req, reply) => {
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

    await app.prisma.auditLog.create({
      data: {
        action: 'WAITLIST_JOIN',
        metadata: { email, handle: handle ?? null },
      },
    });

    // Send waitlist confirmation email — fire-and-forget
    void sendWaitlistConfirmationEmail(email);

    return reply.status(201).send({ message: 'Request received. We will reach out.' });
  });

  // POST /api/invite-request — alias used by Next.js web app route
  app.post('/api/invite-request', { config: { rateLimit: WAITLIST_RATE_LIMIT } }, async (req, reply) => {
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

    void sendWaitlistConfirmationEmail(email);

    return reply.status(201).send({ message: 'Request received.' });
  });
}
