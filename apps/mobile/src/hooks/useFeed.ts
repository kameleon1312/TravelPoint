import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { FeedItem } from '@travelpoint/types';

interface FeedPage {
  items: FeedItem[];
  hasMore: boolean;
}

export function useFeed() {
  return useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '30' });
      if (pageParam) params.set('before', pageParam as string);
      return api.get<FeedPage>(`/api/feed?${params.toString()}`);
    },
    getNextPageParam: (last: FeedPage) =>
      last.hasMore && last.items.length > 0
        ? last.items[last.items.length - 1]?.createdAt
        : undefined,
    initialPageParam: undefined as string | undefined,
    staleTime: 1000 * 60 * 2,
  });
}
