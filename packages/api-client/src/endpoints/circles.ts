import type { ApiClient } from '../client';

export interface Circle {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isInviteOnly: boolean;
  createdAt: string;
  _count?: { members: number };
}

export function createCirclesEndpoints(client: ApiClient) {
  return {
    list: () => client.get<Circle[]>('/api/circles'),
    mine: () => client.get<Circle[]>('/api/circles/mine'),
    getBySlug: (slug: string) => client.get<Circle>(`/api/circles/${slug}`),
    create: (body: { name: string; slug: string; description?: string; isInviteOnly?: boolean }) =>
      client.post<Circle>('/api/circles', body),
    join: (slug: string, inviteCode?: string) =>
      client.post<{ message: string }>(`/api/circles/${slug}/join`, { inviteCode }),
    leave: (slug: string) => client.delete<void>(`/api/circles/${slug}/leave`),
    getInviteCodes: (slug: string) =>
      client.get<{ code: string; expiresAt: string }[]>(`/api/circles/${slug}/invite-codes`),
    invite: (slug: string, recipientId?: string) =>
      client.post<{ code: string }>(`/api/circles/${slug}/invite`, { recipientId }),
  };
}
