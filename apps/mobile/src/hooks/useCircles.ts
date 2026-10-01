import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { socketManager } from '../lib/socket';
import type { Circle } from '@travelpoint/types';

interface ExplorerMini {
  id: string;
  handle: string;
  rank: string;
  displayName?: string;
}

interface TransmissionWithSender {
  id: string;
  senderId: string;
  recipientId?: string | null;
  circleId?: string | null;
  body: string;
  createdAt: string;
  readAt?: string | null;
  sender?: ExplorerMini;
}

// ── My circles ────────────────────────────────────────────────────────────────
export function useMyCircles() {
  return useQuery({
    queryKey: ['circles', 'mine'],
    queryFn: () => api.get<(Circle & { role: string })[]>('/api/circles/mine'),
    staleTime: 1000 * 60 * 5,
  });
}

// ── Public circles (browse) ───────────────────────────────────────────────────
export function useAllCircles() {
  return useQuery({
    queryKey: ['circles', 'all'],
    queryFn: () => api.get<(Circle & { _count?: { members: number } })[]>('/api/circles'),
    staleTime: 1000 * 60 * 3,
  });
}

// ── Single circle by slug ─────────────────────────────────────────────────────
export function useCircle(slug: string) {
  return useQuery({
    queryKey: ['circles', slug],
    queryFn: () => api.get<Circle>(`/api/circles/${slug}`),
  });
}

type CircleMessagesPage = { messages: TransmissionWithSender[]; hasMore: boolean; oldestCursor: string | null };

// ── Circle chat messages — real-time via socket + cursor pagination ────────────
export function useCircleMessages(circleId: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['transmissions', 'circle', circleId],
    queryFn: () => api.get<CircleMessagesPage>(`/api/transmissions/circle/${circleId}?limit=50`),
    enabled: !!circleId,
    staleTime: 0,
    select: (d) => d,
  });

  const loadMore = useCallback(async () => {
    const current = qc.getQueryData<CircleMessagesPage>(['transmissions', 'circle', circleId]);
    if (!current?.hasMore || !current.oldestCursor) return;
    const older = await api.get<CircleMessagesPage>(
      `/api/transmissions/circle/${circleId}?limit=50&before=${encodeURIComponent(current.oldestCursor)}`,
    );
    qc.setQueryData<CircleMessagesPage>(['transmissions', 'circle', circleId], (prev) => {
      if (!prev) return older;
      const merged = [...older.messages.filter((m) => !prev.messages.some((p) => p.id === m.id)), ...prev.messages];
      return { messages: merged, hasMore: older.hasMore, oldestCursor: older.oldestCursor };
    });
  }, [circleId, qc]);

  useEffect(() => {
    if (!circleId) return;

    socketManager.emit('circle:join', circleId);

    const handler = (msg: unknown) => {
      const m = msg as TransmissionWithSender;
      if (m.circleId !== circleId) return;
      qc.setQueryData<CircleMessagesPage>(
        ['transmissions', 'circle', circleId],
        (prev) => {
          if (!prev) return { messages: [m], hasMore: false, oldestCursor: null };
          if (prev.messages.some((x) => x.id === m.id)) return prev;
          return { ...prev, messages: [...prev.messages, m] };
        },
      );
    };

    socketManager.on('circle:message', handler);

    return () => {
      socketManager.emit('circle:leave', circleId);
      socketManager.off('circle:message', handler);
    };
  }, [circleId, qc]);

  return { ...query, data: query.data, loadMore };
}

// ── Global circle unread count (for tab badge) ────────────────────────────────
export function useCircleUnreadCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const handler = () => setCount((n) => n + 1);
    socketManager.on('circle:message', handler);
    return () => socketManager.off('circle:message', handler);
  }, []);

  const reset = useCallback(() => setCount(0), []);
  return { count, reset };
}

// ── Send a circle message ─────────────────────────────────────────────────────
export function useSendCircleMessage(circleId: string) {
  return useMutation({
    mutationFn: (body: string) =>
      api.post<TransmissionWithSender>('/api/transmissions', { circleId, body }),
    // Server broadcasts via socket — no manual cache update needed
  });
}

// ── DM inbox ──────────────────────────────────────────────────────────────────
export function useInbox() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['transmissions', 'inbox'],
    queryFn: () => api.get<TransmissionWithSender[]>('/api/transmissions'),
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    const handler = (msg: unknown) => {
      const m = msg as TransmissionWithSender;
      qc.setQueryData<TransmissionWithSender[]>(
        ['transmissions', 'inbox'],
        (prev) => {
          if (!prev) return [m];
          if (prev.some((x) => x.id === m.id)) return prev;
          return [m, ...prev];
        },
      );
    };
    socketManager.on('transmission:new', handler);
    return () => socketManager.off('transmission:new', handler);
  }, [qc]);

  return query;
}

// ── DM thread ─────────────────────────────────────────────────────────────────
export function useThread(explorerId: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['transmissions', 'thread', explorerId],
    queryFn: () =>
      api.get<{ messages: TransmissionWithSender[]; other: ExplorerMini | null }>(
        `/api/transmissions/thread/${explorerId}`,
      ),
    enabled: !!explorerId,
    staleTime: 0,
  });

  useEffect(() => {
    if (!explorerId) return;

    const handler = (msg: unknown) => {
      const m = msg as TransmissionWithSender;
      if (m.senderId !== explorerId) return;
      qc.setQueryData<{ messages: TransmissionWithSender[]; other: ExplorerMini | null }>(
        ['transmissions', 'thread', explorerId],
        (prev) => {
          if (!prev) return prev;
          if (prev.messages.some((x) => x.id === m.id)) return prev;
          return { ...prev, messages: [...prev.messages, m] };
        },
      );
    };
    socketManager.on('transmission:new', handler);
    return () => socketManager.off('transmission:new', handler);
  }, [explorerId, qc]);

  return query;
}

// ── Send DM ───────────────────────────────────────────────────────────────────
export function useSendDM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recipientId, body }: { recipientId: string; body: string }) =>
      api.post<TransmissionWithSender>('/api/transmissions', { recipientId, body }),
    onSuccess: (msg, { recipientId }) => {
      qc.setQueryData<{ messages: TransmissionWithSender[]; other: ExplorerMini | null }>(
        ['transmissions', 'thread', recipientId],
        (prev) => {
          if (!prev) return prev;
          if (prev.messages.some((x) => x.id === msg.id)) return prev;
          return { ...prev, messages: [...prev.messages, msg] };
        },
      );
      void qc.invalidateQueries({ queryKey: ['transmissions', 'inbox'] });
    },
  });
}

// ── Join / Leave / Create / Invite ────────────────────────────────────────────
export function useJoinCircle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, inviteCode }: { slug: string; inviteCode?: string }) =>
      api.post(`/api/circles/${slug}/join`, { inviteCode }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['circles'] }),
  });
}

export function useCreateCircle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slug: string; description?: string; isInviteOnly: boolean }) =>
      api.post<Circle>('/api/circles', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['circles'] }),
  });
}

export function useLeaveCircle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => api.delete<void>(`/api/circles/${slug}/leave`),
    onSuccess: (_data, slug) => {
      qc.invalidateQueries({ queryKey: ['circles'] });
      qc.removeQueries({ queryKey: ['circles', slug] });
    },
  });
}

export function useGenerateInviteCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => api.post<{ code: string }>(`/api/circles/${slug}/invite`, {}),
    onSuccess: (_data, slug) =>
      qc.invalidateQueries({ queryKey: ['circles', slug, 'inviteCodes'] }),
  });
}

export function useUpdateCircle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, data }: { slug: string; data: { name?: string; description?: string; isInviteOnly?: boolean } }) =>
      api.patch<Circle>(`/api/circles/${slug}`, data),
    onSuccess: (_data, { slug }) => {
      qc.invalidateQueries({ queryKey: ['circles', slug] });
      qc.invalidateQueries({ queryKey: ['circles', 'mine'] });
    },
  });
}

export function useDeleteCircle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => api.delete<void>(`/api/circles/${slug}`),
    onSuccess: (_data, slug) => {
      qc.invalidateQueries({ queryKey: ['circles'] });
      qc.removeQueries({ queryKey: ['circles', slug] });
    },
  });
}

export function usePromoteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, explorerId }: { slug: string; explorerId: string }) =>
      api.post<void>(`/api/circles/${slug}/members/${explorerId}/promote`, {}),
    onSuccess: (_data, { slug }) => qc.invalidateQueries({ queryKey: ['circles', slug] }),
  });
}

export function useKickMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, explorerId }: { slug: string; explorerId: string }) =>
      api.delete<void>(`/api/circles/${slug}/members/${explorerId}`),
    onSuccess: (_data, { slug }) => qc.invalidateQueries({ queryKey: ['circles', slug] }),
  });
}

export function useInviteCodes(slug: string) {
  return useQuery({
    queryKey: ['circles', slug, 'inviteCodes'],
    queryFn: () => api.get<{ code: string; expiresAt: string }[]>(`/api/circles/${slug}/invite-codes`),
    staleTime: 1000 * 60,
    enabled: !!slug,
  });
}
