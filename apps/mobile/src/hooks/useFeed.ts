import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { FeedItem } from '@travelpoint/types';

export function useFeed() {
  return useQuery({
    queryKey: ['feed'],
    queryFn:  () => api.get<FeedItem[]>('/api/feed'),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 3,
  });
}
