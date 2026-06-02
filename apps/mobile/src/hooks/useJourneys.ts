import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Journey } from '@travelpoint/types';
import type { UpdateJourneyInput } from '@travelpoint/validation';

export function useMyJourneys() {
  return useQuery({
    queryKey: ['journeys', 'mine'],
    queryFn:  () => api.get<Journey[]>('/api/journeys/me'),
    staleTime: 1000 * 60 * 5,
  });
}

export function useJourney(id: string) {
  return useQuery({
    queryKey: ['journeys', id],
    queryFn:  () => api.get<Journey>(`/api/journeys/${id}`),
    enabled:  !!id,
  });
}

export function useCreateJourney() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => api.post<Journey>('/api/journeys', body),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['journeys'] }),
  });
}

export function useUpdateJourney() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJourneyInput }) =>
      api.patch<Journey>(`/api/journeys/${id}`, data),
    onSuccess: (_result, { id }) => {
      // Invalidate both the specific journey and the list so replay map updates.
      qc.invalidateQueries({ queryKey: ['journeys', id] });
      qc.invalidateQueries({ queryKey: ['journeys', 'mine'] });
    },
  });
}

export function useDeleteJourney() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/journeys/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['journeys'] }),
  });
}
