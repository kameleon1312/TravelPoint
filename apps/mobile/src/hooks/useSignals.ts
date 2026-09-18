import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '../lib/api';
import { socketManager } from '../lib/socket';
import type { Signal, SignalType } from '@travelpoint/types';
import { pl } from '../i18n/pl';

type SignalsResponse = { signals: Signal[]; nextCursor: string | null };

export const SIGNAL_LABELS = pl.signalLabels as Record<SignalType, string>;
export const SIGNAL_ICONS  = pl.signalIcons  as Record<SignalType, string>;

// ─── Raw list ────────────────────────────────────────────────────────────────
function useSignalsQuery() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['signals'],
    queryFn: () => api.get<SignalsResponse>('/api/signals'),
    select: (data) => data.signals,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });

  useEffect(() => {
    const handler = () => void qc.invalidateQueries({ queryKey: ['signals'] });
    socketManager.on('signal:new', handler);
    return () => socketManager.off('signal:new', handler);
  }, [qc]);

  return query;
}

// ─── Count of unseen signals (for badge) ─────────────────────────────────────
export function useUnseenSignalsCount() {
  return useQuery({
    queryKey: ['signals'],
    queryFn: () => api.get<SignalsResponse>('/api/signals'),
    select: (data) => data.signals.filter((s) => !s.seenAt).length,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}

// ─── Infinite scroll feed (for Identity) ─────────────────────────────────────
export function useInfiniteSignals() {
  const qc = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['signals', 'infinite'],
    queryFn: ({ pageParam }) =>
      api.get<SignalsResponse>(
        `/api/signals?limit=20${pageParam ? `&before=${encodeURIComponent(pageParam as string)}` : ''}`,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    const handler = () => void qc.invalidateQueries({ queryKey: ['signals', 'infinite'] });
    socketManager.on('signal:new', handler);
    return () => socketManager.off('signal:new', handler);
  }, [qc]);

  return query;
}

// ─── Full signal list (for feed in Identity) ─────────────────────────────────
export function useSignals() {
  return useSignalsQuery();
}

export function useMarkSignalsSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch<void>('/api/signals/seen', {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['signals'] }),
  });
}
