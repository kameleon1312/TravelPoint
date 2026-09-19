import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export type ExplorerPublicProfile = {
  id: string;
  handle: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  archetype?: string | null;
  bio?: string | null;
  obsessions: string[];
  rank: string;
  isBlockedByMe: boolean;
};

export type ExplorerPublicSpot = {
  id: string;
  title: string;
  category: string;
  lat: number;
  lng: number;
  createdAt: string;
};

export function useExplorerProfile(handle: string) {
  return useQuery<ExplorerPublicProfile>({
    queryKey: ['explorer', handle],
    queryFn: () => api.get<ExplorerPublicProfile>(`/api/explorers/${encodeURIComponent(handle)}`),
    enabled: handle.length > 0,
    staleTime: 5 * 60_000,
  });
}

export function useExplorerSpots(handle: string, enabled = true) {
  return useQuery<ExplorerPublicSpot[]>({
    queryKey: ['explorer-spots', handle],
    queryFn: () => api.get<ExplorerPublicSpot[]>(`/api/explorers/${encodeURIComponent(handle)}/spots`),
    enabled: enabled && handle.length > 0,
    staleTime: 3 * 60_000,
  });
}

export function useBlockExplorer() {
  return useMutation({
    mutationFn: (explorerId: string) =>
      api.post<void>(`/api/explorers/${explorerId}/block`, {}, false),
  });
}

export function useUnblockExplorer() {
  return useMutation({
    mutationFn: (explorerId: string) =>
      api.delete<void>(`/api/explorers/${explorerId}/block`, false),
  });
}

export function useSearchExplorers() {
  return (q: string) =>
    api.get<Array<{
      id: string;
      handle: string;
      displayName?: string | null;
      rank: string;
      archetype?: string | null;
    }>>(`/api/explorers/search?q=${encodeURIComponent(q)}`);
}
