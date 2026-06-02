import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { SpotForViewer } from '@travelpoint/types';

interface Photo {
  id: string;
  spotId: string | null;
  uploaderId: string;
  url: string;
  caption?: string | null;
  createdAt: string;
  uploader?: { id: string; handle: string };
}

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

export function useSaveSpot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ saved: boolean }>(`/api/spots/${id}/save`, {}),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['spots', id] });
      qc.invalidateQueries({ queryKey: ['spots', 'saved'] });
    },
  });
}

export function useUnsaveSpot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/spots/${id}/save`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['spots', id] });
      qc.invalidateQueries({ queryKey: ['spots', 'saved'] });
    },
  });
}

export function useSpotPhotos(id: string) {
  return useQuery({
    queryKey: ['spots', id, 'photos'],
    queryFn: () => api.get<Photo[]>(`/api/spots/${id}/photos`),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUploadSpotPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ spotId, url, caption }: { spotId: string; url: string; caption?: string }) =>
      api.post<Photo>(`/api/spots/${spotId}/photos`, { url, caption }),
    onSuccess: (_data, { spotId }) => {
      qc.invalidateQueries({ queryKey: ['spots', spotId, 'photos'] });
    },
  });
}

export function useDeleteSpotPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ photoId, spotId }: { photoId: string; spotId: string }) =>
      api.delete<void>(`/api/photos/${photoId}`),
    onSuccess: (_data, { spotId }) => {
      qc.invalidateQueries({ queryKey: ['spots', spotId, 'photos'] });
    },
  });
}
