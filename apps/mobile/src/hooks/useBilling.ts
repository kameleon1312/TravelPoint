import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Linking, Alert } from 'react-native';
import { api, ApiError } from '../lib/api';

export interface BillingStatus {
  configured: boolean;
  tier: 'FREE' | 'PRO' | 'EXPEDITION';
  tierExpiresAt: string | null;
  customer: boolean;
  subscription: {
    provider: 'STRIPE' | 'REVENUECAT';
    status: string;
    tier: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
}

export function useBillingStatus() {
  return useQuery({
    queryKey: ['billing', 'status'],
    queryFn: () => api.get<BillingStatus>('/api/billing/status'),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tier,
      billingPeriod = 'MONTHLY',
    }: {
      tier: 'PRO' | 'EXPEDITION';
      billingPeriod?: 'MONTHLY' | 'ANNUAL';
    }) => {
      const res = await api.post<{ url: string }>(
        '/api/billing/checkout',
        { tier, billingPeriod },
        false,
      );
      await Linking.openURL(res.url);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['billing', 'status'] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 503) {
        Alert.alert(
          'Płatności niedostępne',
          'System płatności jest jeszcze konfigurowany. Spróbuj ponownie za chwilę.',
        );
      } else {
        Alert.alert('Błąd', 'Nie udało się otworzyć strony płatności. Spróbuj ponownie.');
      }
    },
  });
}

export function usePortal() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<{ url: string }>('/api/billing/portal', {}, false);
      await Linking.openURL(res.url);
    },
    onError: () => {
      Alert.alert('Błąd', 'Nie udało się otworzyć portalu klienta.');
    },
  });
}
