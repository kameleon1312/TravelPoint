import type { ApiClient } from '../client';

export interface Journey {
  id: string;
  title: string;
  mood?: string | null;
  soundtrack?: string | null;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export function createJourneysEndpoints(client: ApiClient) {
  return {
    mine: () => client.get<Journey[]>('/api/journeys/me'),
    getById: (id: string) => client.get<Journey>(`/api/journeys/${id}`),
    byHandle: (handle: string) =>
      client.get<Pick<Journey, 'id' | 'title' | 'mood' | 'soundtrack' | 'createdAt'>[]>(
        `/api/explorers/${handle}/journeys`,
      ),
    create: (body: {
      title: string;
      mood?: string;
      soundtrack?: string;
      isPrivate?: boolean;
      routeGeoJson?: unknown;
    }) => client.post<Journey>('/api/journeys', body),
    update: (id: string, body: Partial<{
      title: string;
      mood: string;
      soundtrack: string;
      isPrivate: boolean;
      routeGeoJson: unknown;
      retainRoute: boolean;
    }>) => client.patch<Journey>(`/api/journeys/${id}`, body),
    delete: (id: string) => client.delete<void>(`/api/journeys/${id}`),
    like: (id: string) => client.post<{ id: string }>(`/api/journeys/${id}/like`, {}),
  };
}
