import type { ApiClient } from '../client';

export interface Signal {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  readAt?: string | null;
  createdAt: string;
}

export function createSignalsEndpoints(client: ApiClient) {
  return {
    list: (params?: { unreadOnly?: boolean; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.unreadOnly) q.set('unreadOnly', 'true');
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      const qs = q.toString();
      return client.get<{ signals: Signal[]; total: number; unread: number }>(
        `/api/signals${qs ? `?${qs}` : ''}`,
      );
    },
    markRead: (id: string) => client.patch<Signal>(`/api/signals/${id}/read`, {}),
    markAllRead: () => client.post<void>('/api/signals/read-all', {}),
  };
}
