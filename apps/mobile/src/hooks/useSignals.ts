import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '../lib/api';
import { socketManager } from '../lib/socket';
import type { Signal } from '@travelpoint/types';

export function useUnseenSignalsCount() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['signals'],
    queryFn: () => api.get<Signal[]>('/api/signals'),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
    select: (signals) => signals.length,
  });

  // Invalidate on new signal pushed via socket
  useEffect(() => {
    const handler = () => void qc.invalidateQueries({ queryKey: ['signals'] });
    socketManager.on('signal:new', handler);
    return () => socketManager.off('signal:new', handler);
  }, [qc]);

  return query;
}

export function useMarkSignalsSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch<void>('/api/signals/seen', {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['signals'] }),
  });
}
