import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { rankAtLeast } from '@travelpoint/types';
import { useAuthStore } from '../stores/auth';

export type ReactionType = 'LIKE' | 'INSIGHTFUL' | 'HIDDEN_GEM';
export type VerificationDecision = 'CONFIRMED' | 'REJECTED';

interface SpotReactions {
  counts: Record<ReactionType, number>;
  myReaction: ReactionType | null;
}

interface SpotVerifications {
  confirmedCount: number;
  rejectedCount: number;
  myDecision: VerificationDecision | null;
}

export function useSpotReactions(spotId: string) {
  return useQuery({
    queryKey: ['spots', spotId, 'reactions'],
    queryFn: () => api.get<SpotReactions>(`/api/spots/${spotId}/reactions`),
    enabled: !!spotId,
    staleTime: 1000 * 30,
  });
}

export function useToggleReaction(spotId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type: ReactionType) =>
      api.post<{ myReaction: ReactionType | null }>(`/api/spots/${spotId}/reactions`, { type }),
    onMutate: async (type) => {
      await qc.cancelQueries({ queryKey: ['spots', spotId, 'reactions'] });
      const prev = qc.getQueryData<SpotReactions>(['spots', spotId, 'reactions']);
      if (prev) {
        const removing = prev.myReaction === type;
        const prevType = prev.myReaction;
        const counts = { ...prev.counts };
        if (removing) {
          counts[type] = Math.max(0, (counts[type] ?? 0) - 1);
        } else {
          if (prevType) counts[prevType] = Math.max(0, (counts[prevType] ?? 0) - 1);
          counts[type] = (counts[type] ?? 0) + 1;
        }
        qc.setQueryData<SpotReactions>(['spots', spotId, 'reactions'], {
          counts,
          myReaction: removing ? null : type,
        });
      }
      return { prev };
    },
    onError: (_err, _type, ctx) => {
      if (ctx?.prev) qc.setQueryData(['spots', spotId, 'reactions'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['spots', spotId, 'reactions'] }),
  });
}

export function useSpotVerifications(spotId: string) {
  return useQuery({
    queryKey: ['spots', spotId, 'verifications'],
    queryFn: () => api.get<SpotVerifications>(`/api/spots/${spotId}/verifications`),
    enabled: !!spotId,
    staleTime: 1000 * 60,
  });
}

export function useVerifySpot(spotId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { decision: VerificationDecision; note?: string }) =>
      api.post<unknown>(`/api/spots/${spotId}/verify`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spots', spotId, 'verifications'] }),
  });
}

export function useCanVerify(isOwner: boolean, isLocked: boolean) {
  const { explorer } = useAuthStore();
  if (!explorer) return false;
  if (isOwner || isLocked) return false;
  return rankAtLeast(explorer.rank, 'TRUSTED');
}
