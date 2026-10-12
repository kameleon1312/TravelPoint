import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import type { PurchasesStoreProduct } from 'react-native-purchases';
import {
  getOfferings,
  purchasePackage,
  resolvePackage,
  restorePurchases,
  PURCHASES_ERROR_CODE,
  RC_PRODUCT_IDS,
  type RcTier,
} from '../lib/purchases';

// The explorer's tier is owned by the API (updated by the RevenueCat webhook), never by
// client-side entitlements. The webhook lands a few seconds after the store confirms,
// so billing status is refreshed now and once more after a short delay.
const WEBHOOK_SETTLE_MS = 5000;

function refreshBillingStatus(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: ['billing', 'status'] });
  setTimeout(() => void qc.invalidateQueries({ queryKey: ['billing', 'status'] }), WEBHOOK_SETTLE_MS);
}

function errorCode(err: unknown): unknown {
  return typeof err === 'object' && err !== null && 'code' in err ? (err as { code: unknown }).code : undefined;
}

export function useOfferings() {
  return useQuery({
    queryKey: ['rc', 'offerings'],
    queryFn:  getOfferings,
    staleTime: 1000 * 60 * 10,
  });
}

export function useStoreProduct(tier: RcTier, annual: boolean): PurchasesStoreProduct | null {
  const { data: offering } = useOfferings();
  const productId = RC_PRODUCT_IDS[tier][annual ? 'annual' : 'monthly'];
  return offering?.availablePackages.find((p) => p.product.identifier === productId)?.product ?? null;
}

// Store-listed, localized price, e.g. "49,00 zł"
export function useProductPrice(tier: RcTier, annual: boolean): string | null {
  return useStoreProduct(tier, annual)?.priceString ?? null;
}

// Free trials exist only when configured as an intro offer in App Store Connect / Play Console,
// so trial copy must be driven by the store, never hardcoded.
export function useFreeTrialDays(tier: RcTier, annual = false): number | null {
  const intro = useStoreProduct(tier, annual)?.introPrice;
  if (!intro || intro.price !== 0) return null;
  const perUnit: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };
  return intro.periodNumberOfUnits * (perUnit[intro.periodUnit] ?? 0) || null;
}

export function usePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tier, annual }: { tier: RcTier; annual: boolean }) => {
      const pkg = await resolvePackage(tier, annual);
      if (!pkg) throw Object.assign(new Error('PACKAGE_NOT_FOUND'), { code: 'PACKAGE_NOT_FOUND' });
      const { customerInfo } = await purchasePackage(pkg);
      return customerInfo;
    },
    onSuccess: () => refreshBillingStatus(qc),
    onError: (err: unknown) => {
      const code = errorCode(err);
      // Explorer dismissed the store sheet — not an error
      if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return;
      if (code === 'PACKAGE_NOT_FOUND') {
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
      refreshBillingStatus(qc);
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
