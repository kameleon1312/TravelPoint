import type { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { setExplorerTier } from './trustScore';

// RevenueCat event types that grant tier access
const GRANT_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'TRANSFER',
  'PRODUCT_CHANGE',
]);

// RevenueCat event types that revoke tier access
const REVOKE_EVENTS = new Set([
  'CANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
]);

// Maps RevenueCat entitlement identifiers to our internal tier values.
// These must match exactly what's configured in the RevenueCat dashboard.
const ENTITLEMENT_TO_TIER: Record<string, 'PRO' | 'EXPEDITION'> = {
  pro:        'PRO',
  expedition: 'EXPEDITION',
};

export interface RcWebhookBody {
  event: {
    type: string;
    app_user_id: string;
    aliases?: string[];
    product_id?: string;
    entitlement_ids?: string[];
    expiration_at_ms?: number | null;
    environment?: 'SANDBOX' | 'PRODUCTION';
    original_app_user_id?: string;
    store?: string;
  };
  api_version?: string;
}

export function isRevenueCatConfigured(): boolean {
  return Boolean(env.revenueCatWebhookSecret);
}

// RevenueCat sends the webhook secret as the Authorization header (Bearer <secret>)
export function verifyRevenueCatRequest(authHeader: string | undefined): boolean {
  const secret = env.revenueCatWebhookSecret;
  if (!secret || !authHeader) return false;
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  return token === secret;
}

export async function applyRevenueCatEvent(
  prisma: PrismaClient,
  body: RcWebhookBody,
): Promise<void> {
  const { event } = body;
  if (!event?.type || !event.app_user_id) return;

  // In production, skip sandbox test events to avoid poisoning tier state
  if (
    process.env['NODE_ENV'] === 'production' &&
    event.environment === 'SANDBOX'
  ) return;

  // app_user_id is our explorerId (set during Purchases.configure)
  const explorerId = event.app_user_id;
  const explorer = await prisma.explorer.findUnique({
    where: { id: explorerId },
    select: { id: true },
  });
  if (!explorer) return;

  if (GRANT_EVENTS.has(event.type)) {
    // Derive tier from entitlement_ids array — highest tier wins
    const tier = (event.entitlement_ids ?? [])
      .map((e) => ENTITLEMENT_TO_TIER[e])
      .find(Boolean);
    if (!tier) return;

    const expiresAt = typeof event.expiration_at_ms === 'number'
      ? new Date(event.expiration_at_ms)
      : null;

    await setExplorerTier(prisma, explorerId, tier, `rc_${event.type.toLowerCase()}`, expiresAt);

    await prisma.subscription.upsert({
      where: {
        providerSubscriptionId: `rc:${explorerId}`,
      },
      create: {
        explorerId,
        provider:               'REVENUECAT',
        providerCustomerId:     explorerId,
        providerSubscriptionId: `rc:${explorerId}`,
        status:                 'ACTIVE',
        tier,
        currentPeriodEnd:       expiresAt,
        cancelAtPeriodEnd:      false,
      },
      update: {
        status:           'ACTIVE',
        tier,
        currentPeriodEnd: expiresAt,
        cancelAtPeriodEnd: false,
        updatedAt:        new Date(),
      },
    });

  } else if (REVOKE_EVENTS.has(event.type)) {
    await setExplorerTier(prisma, explorerId, 'FREE', `rc_${event.type.toLowerCase()}`, null);

    await prisma.subscription.updateMany({
      where:  { explorerId, provider: 'REVENUECAT' },
      data:   { status: 'CANCELED', cancelAtPeriodEnd: true, updatedAt: new Date() },
    });
  }
}
