import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';

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
