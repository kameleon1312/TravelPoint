import crypto from 'crypto';
import type { PrismaClient, Tier } from '@prisma/client';
import { env } from '../config/env';
import { setExplorerTier } from './trustScore';

type PaidTier = Exclude<Tier, 'FREE'>;

const STRIPE_API = 'https://api.stripe.com/v1';
const ACTIVE_STATUSES = new Set(['active', 'trialing']);
const DOWNGRADE_STATUSES = new Set(['canceled', 'unpaid', 'incomplete_expired']);

export function isBillingConfigured(): boolean {
  return Boolean(
    env.stripe.secretKey &&
    env.stripe.proPriceId &&
    env.stripe.expeditionPriceId,
  );
}

export function priceIdForTier(tier: PaidTier, period: 'MONTHLY' | 'ANNUAL' = 'MONTHLY'): string | undefined {
  if (period === 'ANNUAL') {
    const annual = tier === 'PRO' ? env.stripe.proAnnualPriceId : env.stripe.expeditionAnnualPriceId;
    if (annual) return annual;
  }
  return tier === 'PRO' ? env.stripe.proPriceId : env.stripe.expeditionPriceId;
}

export async function createCheckoutSession(
  prisma: PrismaClient,
  explorerId: string,
  tier: PaidTier,
  billingPeriod: 'MONTHLY' | 'ANNUAL' = 'MONTHLY',
): Promise<{ url: string }> {
  if (!isBillingConfigured()) throw new Error('BILLING_NOT_CONFIGURED');

  const explorer = await prisma.explorer.findUnique({
    where: { id: explorerId },
    select: { id: true, email: true, stripeCustomerId: true },
  });
  if (!explorer) throw new Error('EXPLORER_NOT_FOUND');

  const priceId = priceIdForTier(tier, billingPeriod);
  if (!priceId) throw new Error('PRICE_NOT_CONFIGURED');

  const isNewCustomer = !explorer.stripeCustomerId;

  const params = new URLSearchParams({
    mode: 'subscription',
    client_reference_id: explorer.id,
    success_url: env.stripe.successUrl,
    cancel_url: env.stripe.cancelUrl,
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'metadata[explorerId]': explorer.id,
    'metadata[tier]': tier,
    'subscription_data[metadata][explorerId]': explorer.id,
    'subscription_data[metadata][tier]': tier,
    allow_promotion_codes: 'true',
  });

  // 7-day free trial for first-time subscribers
  if (isNewCustomer) {
    params.set('subscription_data[trial_period_days]', '7');
  }
  if (explorer.stripeCustomerId) {
    params.set('customer', explorer.stripeCustomerId);
  } else {
    params.set('customer_email', explorer.email);
  }

  const session = await stripeRequest<{ url?: string; customer?: string }>(
    '/checkout/sessions',
    params,
  );
  if (session.customer && !explorer.stripeCustomerId) {
    await prisma.explorer.update({
      where: { id: explorer.id },
      data: { stripeCustomerId: String(session.customer) },
    });
  }
  if (!session.url) throw new Error('CHECKOUT_URL_MISSING');
  return { url: session.url };
}

export async function createCustomerPortalSession(
  prisma: PrismaClient,
  explorerId: string,
): Promise<{ url: string }> {
  if (!env.stripe.secretKey) throw new Error('BILLING_NOT_CONFIGURED');
  const explorer = await prisma.explorer.findUnique({
    where: { id: explorerId },
    select: { stripeCustomerId: true },
  });
  if (!explorer?.stripeCustomerId) throw new Error('CUSTOMER_NOT_FOUND');
  const session = await stripeRequest<{ url?: string }>(
    '/billing_portal/sessions',
    new URLSearchParams({
      customer: explorer.stripeCustomerId,
      return_url: env.appUrl,
    }),
  );
  if (!session.url) throw new Error('PORTAL_URL_MISSING');
  return { url: session.url };
}

export function verifyStripeSignature(rawBody: string, header: string | undefined): boolean {
  if (!env.stripe.webhookSecret || !header) return false;
  const parts = Object.fromEntries(
    header.split(',').map((part) => {
      const [key, value] = part.split('=');
      return [key, value];
    }),
  );
  const timestamp = parts['t'];
  const signature = parts['v1'];
  if (!timestamp || !signature) return false;
  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac('sha256', env.stripe.webhookSecret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function applyStripeEvent(prisma: PrismaClient, event: StripeEvent): Promise<void> {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const explorerId = session.metadata?.explorerId ?? session.client_reference_id;
    const tier = parseTier(session.metadata?.tier);
    const customerId = stringValue(session.customer);
    if (!explorerId || !tier || !customerId) return;
    await prisma.explorer.update({
      where: { id: explorerId },
      data: { stripeCustomerId: customerId },
    });
    await upsertSubscription(prisma, {
      explorerId,
      customerId,
      subscriptionId: stringValue(session.subscription),
      status: 'ACTIVE',
      tier,
    });
    await setExplorerTier(prisma, explorerId, tier, 'stripe_checkout_completed', null);
    return;
  }

  if (event.type.startsWith('customer.subscription.')) {
    const subscription = event.data.object;
    const explorerId = subscription.metadata?.explorerId;
    const tier = parseTier(subscription.metadata?.tier);
    const customerId = stringValue(subscription.customer);
    const stripeStatus = subscription.status ?? 'incomplete';
    if (!explorerId || !tier || !customerId) return;
    const status = mapStripeStatus(stripeStatus);
    const periodEnd = typeof subscription.current_period_end === 'number'
      ? new Date(subscription.current_period_end * 1000)
      : null;
    await upsertSubscription(prisma, {
      explorerId,
      customerId,
      subscriptionId: subscription.id,
      status,
      tier,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    });
    if (ACTIVE_STATUSES.has(stripeStatus)) {
      await setExplorerTier(prisma, explorerId, tier, `stripe_subscription_${stripeStatus}`, periodEnd);
    } else if (DOWNGRADE_STATUSES.has(stripeStatus)) {
      await setExplorerTier(prisma, explorerId, 'FREE', `stripe_subscription_${stripeStatus}`, null);
    }
  }
}

async function upsertSubscription(
  prisma: PrismaClient,
  data: {
    explorerId: string;
    customerId: string;
    subscriptionId?: string;
    status: 'INCOMPLETE' | 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID';
    tier: PaidTier;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean;
  },
): Promise<void> {
  const write = {
    explorerId: data.explorerId,
    providerCustomerId: data.customerId,
    providerSubscriptionId: data.subscriptionId,
    status: data.status,
    tier: data.tier,
    currentPeriodEnd: data.currentPeriodEnd,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
  };
  if (data.subscriptionId) {
    await prisma.subscription.upsert({
      where: { providerSubscriptionId: data.subscriptionId },
      create: write,
      update: write,
    });
  } else {
    await prisma.subscription.create({ data: write });
  }
}

function mapStripeStatus(status: string): 'INCOMPLETE' | 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' {
  if (status === 'trialing') return 'TRIALING';
  if (status === 'active') return 'ACTIVE';
  if (status === 'past_due') return 'PAST_DUE';
  if (status === 'canceled') return 'CANCELED';
  if (status === 'unpaid') return 'UNPAID';
  return 'INCOMPLETE';
}

async function stripeRequest<T>(path: string, body: URLSearchParams): Promise<T> {
  const response = await fetch(`${STRIPE_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.stripe.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const payload = await response.json().catch(() => ({})) as {
    error?: { message?: unknown };
  };
  if (!response.ok) {
    throw new Error(typeof payload.error?.message === 'string' ? payload.error.message : 'STRIPE_REQUEST_FAILED');
  }
  return payload as T;
}

function parseTier(value: unknown): PaidTier | null {
  return value === 'PRO' || value === 'EXPEDITION' ? value : null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export interface StripeEvent {
  type: string;
  data: {
    object: {
      id?: string;
      customer?: unknown;
      subscription?: unknown;
      client_reference_id?: string;
      status?: string;
      current_period_end?: number;
      cancel_at_period_end?: boolean;
      metadata?: Record<string, string | undefined>;
    };
  };
}
