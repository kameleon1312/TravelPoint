import type { ApiClient } from '../client';

export type BillingTier = 'FREE' | 'PRO' | 'EXPEDITION';
export type SubscriptionStatus = 'INCOMPLETE' | 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID';

export interface BillingStatus {
  configured: boolean;
  tier: BillingTier;
  tierExpiresAt: string | null;
  customer: boolean;
  subscription: {
    id: string;
    status: SubscriptionStatus;
    tier: BillingTier;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
}

export function createBillingEndpoints(client: ApiClient) {
  return {
    getStatus: () =>
      client.get<BillingStatus>('/api/billing/status'),
    createCheckout: (body: { tier: 'PRO' | 'EXPEDITION'; billingPeriod: 'MONTHLY' | 'ANNUAL' }) =>
      client.post<{ url: string }>('/api/billing/checkout', body),
    createPortal: () =>
      client.post<{ url: string }>('/api/billing/portal', {}),
  };
}
