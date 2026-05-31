import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { SpotForViewer } from '@travelpoint/types';

export function useNearbySpots(lat: number | null, lng: number | null) {
  return useQuery({
    queryKey: ['spots', 'nearby', lat, lng],
    queryFn: () =>
      api.get<SpotForViewer[]>(`/api/spots?lat=${lat}&lng=${lng}&radiusKm=10`),
    enabled: lat !== null && lng !== null,
    staleTime: 1000 * 60 * 2,
  });
}

export function useSpot(id: string) {
  return useQuery({
    queryKey: ['spots', id],
    queryFn: () => api.get<SpotForViewer>(`/api/spots/${id}`),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateSpot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => api.post<SpotForViewer>('/api/spots', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spots'] }),
  });
}
