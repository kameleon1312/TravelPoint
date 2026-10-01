import type { ApiClient } from '../client';

export interface Signal {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  seenAt?: string | null;
  createdAt: string;
}

export interface SignalsPage {
  signals: Signal[];
  nextCursor: string | null;
}

export function createSignalsEndpoints(client: ApiClient) {
  return {
    // Cursor-based pagination. Pass `before` (ISO datetime) to page backwards.
    list: (params?: { before?: string; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.before) q.set('before', params.before);
      if (params?.limit)  q.set('limit', String(params.limit));
      const qs = q.toString();
      return client.get<SignalsPage>(`/api/signals${qs ? `?${qs}` : ''}`);
    },

    // Mark all unseen signals as seen (no individual-signal endpoint exists).
    markSeen: () => client.patch<void>('/api/signals/seen', {}),
  };
}
