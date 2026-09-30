import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export type ForumCategory = 'FIELD_NOTES' | 'GEAR' | 'SAFETY' | 'REQUESTS' | 'STORIES';

export interface ForumAuthor {
  id: string;
  handle: string;
  displayName: string;
  rank: string;
}

export interface ForumPost {
  id: string;
  slug: string;
  title: string;
  body: string;
  category: ForumCategory;
  isPinned: boolean;
  lockedAt: string | null;
  createdAt: string;
  author: ForumAuthor;
  _count: { replies: number };
}

export interface ForumReply {
  id: string;
  body: string;
  createdAt: string;
  author: ForumAuthor;
}

export interface ForumPostDetail extends ForumPost {
  replies: ForumReply[];
}

interface PostsPage {
  posts: ForumPost[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function useForumPosts(category?: ForumCategory) {
  return useInfiniteQuery({
    queryKey: ['forum', 'posts', category ?? 'all'],
    queryFn: ({ pageParam = 1 }) => {
      const params = new URLSearchParams({ page: String(pageParam), limit: '30' });
      if (category) params.set('category', category);
      return api.get<PostsPage>(`/api/forum/posts?${params.toString()}`);
    },
    getNextPageParam: (last: PostsPage) =>
      last.page < last.pages ? last.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 1000 * 60 * 2,
  });
}

export function useForumPost(slug: string) {
  return useQuery({
    queryKey: ['forum', 'posts', slug],
    queryFn:  () => api.get<ForumPostDetail>(`/api/forum/posts/${slug}`),
    enabled:  !!slug,
    staleTime: 1000 * 30,
  });
}

export function useAddForumPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; body: string; category: ForumCategory }) =>
      api.post<ForumPost>('/api/forum/posts', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forum', 'posts'] }),
  });
}

export function useAddForumReply(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api.post<ForumReply>(`/api/forum/posts/${slug}/replies`, { body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forum', 'posts', slug] }),
  });
}
