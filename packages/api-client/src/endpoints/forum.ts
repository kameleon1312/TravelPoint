import type { ApiClient } from '../client';

export interface ForumPost {
  id: string;
  slug: string;
  title: string;
  body: string;
  category?: string | null;
  isPinned: boolean;
  createdAt: string;
  author: { id: string; handle: string; rank: string };
  _count?: { replies: number; reactions: number };
}

export interface ForumReply {
  id: string;
  body: string;
  postId: string;
  createdAt: string;
  author: { id: string; handle: string; rank: string };
}

export function createForumEndpoints(client: ApiClient) {
  return {
    listPosts: (params?: { category?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.category) q.set('category', params.category);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      const qs = q.toString();
      return client.get<{ posts: ForumPost[]; total: number; page: number; pages: number }>(
        `/api/forum/posts${qs ? `?${qs}` : ''}`,
      );
    },
    getPost: (slug: string) => client.get<ForumPost>(`/api/forum/posts/${slug}`),
    createPost: (body: { title: string; body: string; category?: string }) =>
      client.post<ForumPost>('/api/forum/posts', body),
    updatePost: (slug: string, body: Partial<{ title: string; body: string; category: string; isPinned: boolean }>) =>
      client.patch<ForumPost>(`/api/forum/posts/${slug}`, body),
    deletePost: (slug: string) => client.delete<void>(`/api/forum/posts/${slug}`),
    getReplies: (slug: string) => client.get<ForumReply[]>(`/api/forum/posts/${slug}/replies`),
    createReply: (slug: string, body: { body: string }) =>
      client.post<ForumReply>(`/api/forum/posts/${slug}/replies`, body),
    deleteReply: (replyId: string) => client.delete<void>(`/api/forum/replies/${replyId}`),
    react: (postId: string, type: string) =>
      client.post<void>(`/api/forum/posts/${postId}/reactions`, { type }),
  };
}
