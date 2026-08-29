import type { ApiClient } from '../client';

export interface Transmission {
  id: string;
  body: string;
  senderId: string;
  recipientId?: string | null;
  circleId?: string | null;
  createdAt: string;
}

export function createTransmissionsEndpoints(client: ApiClient) {
  return {
    list: (params?: { circleId?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.circleId) q.set('circleId', params.circleId);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      const qs = q.toString();
      return client.get<Transmission[]>(`/api/transmissions${qs ? `?${qs}` : ''}`);
    },
    send: (body: { body: string; recipientId?: string; circleId?: string }) =>
      client.post<Transmission>('/api/transmissions', body),
    delete: (id: string) => client.delete<void>(`/api/transmissions/${id}`),
  };
}
