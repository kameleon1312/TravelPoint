import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import {
  getOfferings,
  getCustomerInfo,
  purchasePackage,
  resolvePackage,
  restorePurchases,
  PURCHASES_ERROR_CODE,
  RC_ENTITLEMENTS,
  type RcTier,
} from '../lib/purchases';
import type { PurchasesStoreProduct } from 'react-native-purchases';

// ── Queries ───────────────────────────────────────────────────────────────────

export function useOfferings() {
  return useQuery({
    queryKey: ['rc', 'offerings'],
    queryFn:  getOfferings,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCustomerInfo() {
  return useQuery({
    queryKey: ['rc', 'customerInfo'],
    queryFn:  getCustomerInfo,
    staleTime: 1000 * 60 * 2,
  });
}

// Returns the active entitlements (tier identifiers) for the current user
export function useActiveEntitlements(): Set<string> {
  const { data } = useCustomerInfo();
  if (!data?.entitlements?.active) return new Set();
  return new Set(Object.keys(data.entitlements.active));
}

// Returns the store-listed price string for a given tier + period, e.g. "49,00 zł"
export function useProductPrice(tier: RcTier, annual: boolean): string | null {
  const { data: offering } = useOfferings();
  if (!offering) return null;
  const productId =
    tier === 'PRO'
      ? annual ? 'travelpoint_pro_annual'        : 'travelpoint_pro_monthly'
      : annual ? 'travelpoint_expedition_annual' : 'travelpoint_expedition_monthly';
  const pkg = offering.availablePackages.find((p) => p.product.identifier === productId);
  return (pkg?.product as PurchasesStoreProduct | undefined)?.priceString ?? null;
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function usePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tier, annual }: { tier: RcTier; annual: boolean }) => {
      const pkg = await resolvePackage(tier, annual);
      if (!pkg) throw Object.assign(new Error('PACKAGE_NOT_FOUND'), { code: 'PACKAGE_NOT_FOUND' });
      const { customerInfo } = await purchasePackage(pkg);
      return customerInfo;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rc', 'customerInfo'] });
      void qc.invalidateQueries({ queryKey: ['billing', 'status'] });
    },
    onError: (err: unknown) => {
      // User pressed cancel — silent
      if (
        typeof err === 'object' && err !== null &&
        'code' in err &&
        (err as { code: unknown }).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED
      ) return;

      if (
        typeof err === 'object' && err !== null &&
        'code' in err &&
        (err as { code: unknown }).code === 'PACKAGE_NOT_FOUND'
      ) {
        Alert.alert(
          'Produkt niedostępny',
          'Ten plan nie jest jeszcze dostępny w sklepie. Spróbuj ponownie za chwilę.',
        );
        return;
      }

      Alert.alert('Błąd zakupu', 'Nie udało się przetworzyć zakupu. Spróbuj ponownie.');
    },
  });
}

export function useRestorePurchases() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: restorePurchases,
    onSuccess: (customerInfo) => {
      void qc.invalidateQueries({ queryKey: ['rc', 'customerInfo'] });
      void qc.invalidateQueries({ queryKey: ['billing', 'status'] });
      const hasActive = Object.keys(customerInfo.entitlements.active ?? {}).length > 0;
      Alert.alert(
        'Zakupy przywrócone',
        hasActive
          ? 'Twoja subskrypcja została odświeżona.'
          : 'Nie znaleziono aktywnej subskrypcji powiązanej z tym kontem.',
      );
    },
    onError: () => {
      Alert.alert('Błąd', 'Nie udało się przywrócić zakupów. Spróbuj ponownie.');
    },
  });
}

// Checks whether the user has a given entitlement active
export function hasEntitlement(
  entitlements: Set<string>,
  tier: RcTier,
): boolean {
  if (tier === 'PRO') {
    return (
      entitlements.has(RC_ENTITLEMENTS.PRO) ||
      entitlements.has(RC_ENTITLEMENTS.EXPEDITION)
    );
  }
  return entitlements.has(RC_ENTITLEMENTS.EXPEDITION);
}
