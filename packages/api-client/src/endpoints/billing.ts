import type { ApiClient } from '../client';

export interface Subscription {
  id: string;
  status: string;
  tier: string;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
}

export function createBillingEndpoints(client: ApiClient) {
  return {
    getSubscription: () => client.get<Subscription | null>('/api/billing/subscription'),
    createCheckout: (body: { priceId: string; successUrl: string; cancelUrl: string }) =>
      client.post<{ url: string }>('/api/billing/checkout', body),
    createPortal: (body: { returnUrl: string }) =>
      client.post<{ url: string }>('/api/billing/portal', body),
    cancelSubscription: () => client.post<void>('/api/billing/cancel', {}),
  };
}
