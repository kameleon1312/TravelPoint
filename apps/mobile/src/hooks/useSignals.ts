import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '../lib/api';
import { socketManager } from '../lib/socket';
import type { Signal, SignalType } from '@travelpoint/types';

const SIGNAL_LABELS: Record<SignalType, string> = {
  NEARBY_EXPLORER: 'Explorer w pobliżu',
  NEARBY_SPOT:     'Nowy spot w pobliżu',
  SPOT_UNLOCKED:   'Spot odblokowany',
  SPOT_COMMENT:    'Komentarz do spotu',
  CIRCLE_INVITE:   'Zaproszenie do circle',
  SECRET_DROP:     'Secret drop aktywny',
  JOURNEY_LIKE:    'Reakcja na journey',
  TRANSMISSION:    'Nowa transmisja',
  FORUM_REPLY:     'Odpowiedź na forum',
};

const SIGNAL_ICONS: Record<SignalType, string> = {
  NEARBY_EXPLORER: '◎',
  NEARBY_SPOT:     '◉',
  SPOT_UNLOCKED:   '◈',
  SPOT_COMMENT:    '◇',
  CIRCLE_INVITE:   '◑',
  SECRET_DROP:     '◉',
  JOURNEY_LIKE:    '◎',
  TRANSMISSION:    '◐',
  FORUM_REPLY:     '◇',
};

export { SIGNAL_LABELS, SIGNAL_ICONS };

// ─── Raw list ────────────────────────────────────────────────────────────────
function useSignalsQuery() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['signals'],
    queryFn: () => api.get<Signal[]>('/api/signals'),
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
    queryFn: () => api.get<Signal[]>('/api/signals'),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
    select: (signals) => signals.filter((s) => !s.seenAt).length,
  });
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
