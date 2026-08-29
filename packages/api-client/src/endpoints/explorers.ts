import type { ApiClient } from '../client';

export interface Explorer {
  id: string;
  handle: string;
  displayName?: string | null;
  bio?: string | null;
  rank: string;
  tier: string;
  trustScore: number;
  createdAt: string;
}

export function createExplorersEndpoints(client: ApiClient) {
  return {
    me: () => client.get<Explorer>('/api/explorers/me'),
    updateMe: (body: Partial<{ displayName: string; bio: string; handle: string; avatarUrl: string }>) =>
      client.patch<Explorer>('/api/explorers/me', body),
    getByHandle: (handle: string) => client.get<Explorer>(`/api/explorers/${handle}`),
    search: (query: string) =>
      client.get<Explorer[]>(`/api/explorers/search?q=${encodeURIComponent(query)}`),
    deleteAccount: () => client.delete<void>('/api/explorers/me'),
  };
}
