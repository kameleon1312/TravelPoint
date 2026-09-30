import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { SearchResults } from '@travelpoint/types';

export type SearchType = 'all' | 'spots' | 'explorers' | 'journeys';

export function useSearch(query: string, type: SearchType = 'all') {
  const q = query.trim();
  return useQuery({
    queryKey: ['search', q, type],
    queryFn:  () =>
      api.get<SearchResults>(`/api/search?q=${encodeURIComponent(q)}&type=${type}&limit=8`),
    enabled:   q.length >= 2,
    staleTime: 1000 * 30,
    retry:     false,
  });
}
