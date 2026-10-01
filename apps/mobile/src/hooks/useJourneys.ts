import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Journey } from '@travelpoint/types';
import type { UpdateJourneyInput } from '@travelpoint/validation';

interface JourneysPage {
  journeys: Journey[];
  hasMore: boolean;
  nextCursor: string | null;
}

export function useMyJourneys() {
  return useInfiniteQuery({
    queryKey: ['journeys', 'mine'],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' });
      if (pageParam) params.set('after', pageParam as string);
      return api.get<JourneysPage>(`/api/journeys/me?${params.toString()}`);
    },
    getNextPageParam: (last: JourneysPage) => last.hasMore ? last.nextCursor ?? undefined : undefined,
    initialPageParam: undefined as string | undefined,
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

export function useLikeJourney() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<unknown>(`/api/journeys/${id}/like`, {}),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['journeys', id] });
      const prev = qc.getQueryData<Journey>(['journeys', id]);
      if (prev) {
        qc.setQueryData<Journey>(['journeys', id], {
          ...prev,
          liked: true,
          likeCount: (prev.likeCount ?? 0) + 1,
        });
      }
      return { prev };
    },
    onError: (_err, id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['journeys', id], ctx.prev);
    },
    onSettled: (_data, _err, id) => qc.invalidateQueries({ queryKey: ['journeys', id] }),
  });
}

export function useUnlikeJourney() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/journeys/${id}/like`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['journeys', id] });
      const prev = qc.getQueryData<Journey>(['journeys', id]);
      if (prev) {
        qc.setQueryData<Journey>(['journeys', id], {
          ...prev,
          liked: false,
          likeCount: Math.max(0, (prev.likeCount ?? 0) - 1),
        });
      }
      return { prev };
    },
    onError: (_err, id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['journeys', id], ctx.prev);
    },
    onSettled: (_data, _err, id) => qc.invalidateQueries({ queryKey: ['journeys', id] }),
  });
}
