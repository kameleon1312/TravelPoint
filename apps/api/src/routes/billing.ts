import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';
import {
  applyStripeEvent,
  createCheckoutSession,
  createCustomerPortalSession,
  isBillingConfigured,
  verifyStripeSignature,
  type StripeEvent,
} from '../services/billing';

const CheckoutSchema = z.object({
  tier: z.enum(['PRO', 'EXPEDITION']),
  billingPeriod: z.enum(['MONTHLY', 'ANNUAL']).default('MONTHLY'),
});

export async function billingRoutes(app: FastifyInstance) {
  app.get('/api/billing/status', { preHandler: [requireAuth] }, async (req) => {
    const [explorer, subscription] = await Promise.all([
      app.prisma.explorer.findUnique({
        where: { id: req.explorerId },
        select: { tier: true, tierExpiresAt: true, stripeCustomerId: true },
      }),
      app.prisma.subscription.findFirst({
        where: { explorerId: req.explorerId },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    return {
      configured: isBillingConfigured(),
      tier: explorer?.tier ?? 'FREE',
      tierExpiresAt: explorer?.tierExpiresAt ?? null,
      customer: Boolean(explorer?.stripeCustomerId),
      subscription,
    };
  });

  app.post('/api/billing/checkout', { preHandler: [requireAuth] }, async (req, reply) => {
    const parsed = CheckoutSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ code: 'VALIDATION_ERROR' });
    try {
      return reply.status(201).send(
        await createCheckoutSession(app.prisma, req.explorerId, parsed.data.tier, parsed.data.billingPeriod),
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'BILLING_NOT_CONFIGURED') {
        return reply.status(503).send({ code: 'BILLING_NOT_CONFIGURED' });
      }
      throw error;
    }
  });

  app.post('/api/billing/portal', { preHandler: [requireAuth] }, async (req, reply) => {
    try {
      return reply.status(201).send(await createCustomerPortalSession(app.prisma, req.explorerId));
    } catch (error) {
      if (error instanceof Error && ['BILLING_NOT_CONFIGURED', 'CUSTOMER_NOT_FOUND'].includes(error.message)) {
        return reply.status(503).send({ code: error.message });
      }
      throw error;
    }
  });

  // Stripe requires the exact original raw bytes for signature verification.
  // Registering the webhook in an isolated plugin scope gives it its own
  // content-type parser that hands us a string instead of a parsed object.
  await app.register(async (raw) => {
    raw.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
      done(null, body);
    });

    raw.post('/api/billing/webhook', async (req, reply) => {
      const rawBody = req.body as string;
      if (!verifyStripeSignature(rawBody, req.headers['stripe-signature'] as string | undefined)) {
        return reply.status(401).send({ code: 'INVALID_SIGNATURE' });
      }
      try {
        await applyStripeEvent(app.prisma, JSON.parse(rawBody) as StripeEvent);
      } catch {
        // Ack to Stripe regardless — retry storms do more harm than a failed handler
      }
      return reply.status(204).send();
    });
  });
}
