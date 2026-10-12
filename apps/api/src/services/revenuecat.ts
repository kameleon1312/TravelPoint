import crypto from 'crypto';
import type { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { setExplorerTier } from './trustScore';

type PaidTier = 'PRO' | 'EXPEDITION';

// Must match entitlement identifiers configured in the RevenueCat dashboard.
const ENTITLEMENT_TO_TIER: Record<string, PaidTier> = {
  pro:        'PRO',
  expedition: 'EXPEDITION',
};

export interface RcWebhookBody {
  event?: {
    type?: string;
    app_user_id?: string;
    entitlement_ids?: string[] | null;
    expiration_at_ms?: number | null;
    environment?: 'SANDBOX' | 'PRODUCTION';
  };
  api_version?: string;
}

export type RcDecision =
  | { kind: 'grant'; explorerId: string; tier: PaidTier; expiresAt: Date | null }
  | { kind: 'auto_renew_off'; explorerId: string }
  | { kind: 'billing_issue'; explorerId: string }
  | { kind: 'revoke'; explorerId: string }
  | { kind: 'ignore'; reason: string };

export function verifyRevenueCatRequest(authHeader: string | undefined): boolean {
  const secret = env.revenueCatWebhookSecret;
  if (!secret || !authHeader) return false;
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function highestTier(entitlementIds: readonly string[] | null | undefined): PaidTier | null {
  const tiers = (entitlementIds ?? []).map((id) => ENTITLEMENT_TO_TIER[id]).filter(Boolean);
  if (tiers.includes('EXPEDITION')) return 'EXPEDITION';
  if (tiers.includes('PRO')) return 'PRO';
  return null;
}

// Pure mapping from a RevenueCat event to the action we take. Kept free of I/O so the
// subscription lifecycle rules are unit-testable.
export function decideRevenueCatAction(body: RcWebhookBody, isProduction: boolean): RcDecision {
  const event = body.event;
  if (!event?.type) return { kind: 'ignore', reason: 'missing_event' };
  if (isProduction && event.environment === 'SANDBOX') return { kind: 'ignore', reason: 'sandbox_in_production' };

  const explorerId = event.app_user_id;
  // Purchases are configured with explorerId only after sign-in; anonymous RC ids never map to an explorer.
  if (!explorerId || explorerId.startsWith('$RCAnonymousID')) return { kind: 'ignore', reason: 'no_explorer_id' };

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'NON_RENEWING_PURCHASE': {
      const tier = highestTier(event.entitlement_ids);
      if (!tier) return { kind: 'ignore', reason: 'no_known_entitlement' };
      const expiresAt = typeof event.expiration_at_ms === 'number' ? new Date(event.expiration_at_ms) : null;
      return { kind: 'grant', explorerId, tier, expiresAt };
    }
    // Auto-renew turned off: access continues until EXPIRATION.
    case 'CANCELLATION':
      return { kind: 'auto_renew_off', explorerId };
    // Store grace period: keep access, EXPIRATION follows if payment never recovers.
    case 'BILLING_ISSUE':
      return { kind: 'billing_issue', explorerId };
    case 'EXPIRATION':
      return { kind: 'revoke', explorerId };
    // TRANSFER carries transferred_from/transferred_to instead of a single owner, and
    // PRODUCT_CHANGE is followed by a RENEWAL for the new product — both handled elsewhere.
    default:
      return { kind: 'ignore', reason: `unhandled_${event.type.toLowerCase()}` };
  }
}

const RC_SUBSCRIPTION_ID = (explorerId: string) => `rc:${explorerId}`;

export async function applyRevenueCatEvent(prisma: PrismaClient, body: RcWebhookBody): Promise<RcDecision> {
  const decision = decideRevenueCatAction(body, env.isProduction);
  if (decision.kind === 'ignore') return decision;

  const explorer = await prisma.explorer.findUnique({
    where: { id: decision.explorerId },
    select: { id: true },
  });
  if (!explorer) return { kind: 'ignore', reason: 'explorer_not_found' };

  const subscriptionId = RC_SUBSCRIPTION_ID(decision.explorerId);

  if (decision.kind === 'grant') {
    const write = {
      status: 'ACTIVE' as const,
      tier: decision.tier,
      currentPeriodEnd: decision.expiresAt,
      cancelAtPeriodEnd: false,
    };
    await prisma.subscription.upsert({
      where: { providerSubscriptionId: subscriptionId },
      create: {
        ...write,
        explorerId: decision.explorerId,
        provider: 'REVENUECAT',
        providerCustomerId: decision.explorerId,
        providerSubscriptionId: subscriptionId,
      },
      update: write,
    });
    await setExplorerTier(prisma, decision.explorerId, decision.tier, 'revenuecat_grant', decision.expiresAt);
    return decision;
  }

  if (decision.kind === 'auto_renew_off') {
    await prisma.subscription.updateMany({
      where: { providerSubscriptionId: subscriptionId },
      data: { cancelAtPeriodEnd: true },
    });
    return decision;
  }

  if (decision.kind === 'billing_issue') {
    await prisma.subscription.updateMany({
      where: { providerSubscriptionId: subscriptionId },
      data: { status: 'PAST_DUE' },
    });
    return decision;
  }

  await prisma.subscription.updateMany({
    where: { providerSubscriptionId: subscriptionId },
    data: { status: 'CANCELED' },
  });

  // An explorer may also hold a web (Stripe) subscription — don't downgrade over it.
  const stripeActive = await prisma.subscription.findFirst({
    where: {
      explorerId: decision.explorerId,
      provider: 'STRIPE',
      status: { in: ['ACTIVE', 'TRIALING'] },
      OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: new Date() } }],
    },
    orderBy: { updatedAt: 'desc' },
    select: { tier: true, currentPeriodEnd: true },
  });
  if (stripeActive && stripeActive.tier !== 'FREE') {
    await setExplorerTier(prisma, decision.explorerId, stripeActive.tier, 'revenuecat_expired_stripe_active', stripeActive.currentPeriodEnd);
  } else {
    await setExplorerTier(prisma, decision.explorerId, 'FREE', 'revenuecat_expiration', null);
  }
  return decision;
}
