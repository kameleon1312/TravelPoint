import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Circle } from '@travelpoint/types';

export function useMyCircles() {
  return useQuery({
    queryKey: ['circles', 'mine'],
    queryFn: () => api.get<(Circle & { role: string })[]>('/api/circles/mine'),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCircle(slug: string) {
  return useQuery({
    queryKey: ['circles', slug],
    queryFn: () => api.get<Circle>(`/api/circles/${slug}`),
  });
}

export function useJoinCircle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, inviteCode }: { slug: string; inviteCode?: string }) =>
      api.post(`/api/circles/${slug}/join`, { inviteCode }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['circles'] }),
  });
}
