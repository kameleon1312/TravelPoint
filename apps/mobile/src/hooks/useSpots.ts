import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { SpotForViewer } from '@travelpoint/types';
import type { CreateSpotInput, UpdateSpotInput } from '@travelpoint/validation';

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
    mutationFn: (body: CreateSpotInput) => api.post<SpotForViewer>('/api/spots', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spots'] }),
  });
}

export function useSavedSpots() {
  return useQuery({
    queryKey: ['spots', 'saved'],
    queryFn:  () => api.get<SpotForViewer[]>('/api/spots/saved'),
    staleTime: 1000 * 60 * 5,
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
    mutationFn: async ({
      spotId,
      uri,
      mimeType,
      caption,
    }: {
      spotId: string;
      uri: string;
      mimeType: string;
      caption?: string;
    }) => {
      const blob = await (await fetch(uri)).blob();
      const signed = await api.post<{ objectKey: string; uploadUrl: string }>(
        `/api/spots/${spotId}/photos/upload-url`,
        { mimeType, sizeBytes: blob.size },
      );
      const uploaded = await fetch(signed.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: blob,
      });
      if (!uploaded.ok) throw new Error(`Storage upload failed: ${uploaded.status}`);
      return api.post<Photo>(`/api/spots/${spotId}/photos/complete`, {
        objectKey: signed.objectKey,
        mimeType,
        sizeBytes: blob.size,
        caption,
      });
    },
    onSuccess: (_data, { spotId }) => {
      qc.invalidateQueries({ queryKey: ['spots', spotId, 'photos'] });
    },
  });
}

export function useUpdateSpot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & UpdateSpotInput) =>
      api.patch<SpotForViewer>(`/api/spots/${id}`, body),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['spots', id] });
    },
  });
}

export function useDeleteSpot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/spots/${id}`),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: ['spots', id] });
      qc.invalidateQueries({ queryKey: ['spots', 'nearby'] });
    },
  });
}

export function useDeleteSpotPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ photoId }: { photoId: string; spotId: string }) =>
      api.delete<void>(`/api/photos/${photoId}`),
    onSuccess: (_data, { spotId }) => {
      qc.invalidateQueries({ queryKey: ['spots', spotId, 'photos'] });
    },
  });
}
