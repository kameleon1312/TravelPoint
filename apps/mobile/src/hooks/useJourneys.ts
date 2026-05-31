import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Journey } from '@travelpoint/types';

export function useMyJourneys() {
  return useQuery({
    queryKey: ['journeys', 'mine'],
    queryFn: () => api.get<Journey[]>('/api/journeys/me'),
    staleTime: 1000 * 60 * 5,
  });
}

export function useJourney(id: string) {
  return useQuery({
    queryKey: ['journeys', id],
    queryFn: () => api.get<Journey>(`/api/journeys/${id}`),
  });
}

export function useCreateJourney() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => api.post<Journey>('/api/journeys', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journeys'] }),
  });
}
