import type { ApiClient } from '../client';
import type { SpotForViewer } from '@travelpoint/types';

export function createSpotsEndpoints(client: ApiClient) {
  return {
    getNearby: (params: { lat: number; lng: number; radiusKm?: number }) => {
      const q = new URLSearchParams({
        lat: String(params.lat),
        lng: String(params.lng),
        ...(params.radiusKm && { radiusKm: String(params.radiusKm) }),
      });
      return client.get<SpotForViewer[]>(`/api/spots?${q}`);
    },
    getById: (id: string) => client.get<SpotForViewer>(`/api/spots/${id}`),
    create: (body: unknown) => client.post<SpotForViewer>('/api/spots', body),
    update: (id: string, body: unknown) =>
      client.patch<SpotForViewer>(`/api/spots/${id}`, body),
    delete: (id: string) => client.delete<void>(`/api/spots/${id}`),
  };
}
