import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { SpotComment } from '@travelpoint/types';

export function useSpotComments(spotId: string) {
  return useQuery({
    queryKey: ['spots', spotId, 'comments'],
    queryFn:  () => api.get<SpotComment[]>(`/api/spots/${spotId}/comments`),
    enabled:  !!spotId,
    staleTime: 1000 * 30,
  });
}

export function useAddComment(spotId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api.post<SpotComment>(`/api/spots/${spotId}/comments`, { body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spots', spotId, 'comments'] }),
  });
}
