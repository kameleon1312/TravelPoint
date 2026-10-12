import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import { Platform } from 'react-native';

// Expo public env vars — injected at build time via EAS
const RC_KEYS = {
  ios:     process.env['EXPO_PUBLIC_REVENUECAT_IOS_KEY']     ?? '',
  android: process.env['EXPO_PUBLIC_REVENUECAT_ANDROID_KEY'] ?? '',
};

export type RcTier = 'PRO' | 'EXPEDITION';

// Product identifiers must match App Store Connect + Google Play Console exactly.
// Pattern: travelpoint_{tier}_{period}
export const RC_PRODUCT_IDS: Record<RcTier, { monthly: string; annual: string }> = {
  PRO:        { monthly: 'travelpoint_pro_monthly',        annual: 'travelpoint_pro_annual' },
  EXPEDITION: { monthly: 'travelpoint_expedition_monthly', annual: 'travelpoint_expedition_annual' },
};

export { PURCHASES_ERROR_CODE };

export function initPurchases(explorerId: string): void {
  const apiKey = Platform.OS === 'ios' ? RC_KEYS.ios : RC_KEYS.android;
  if (!apiKey) return;

  Purchases.setLogLevel(
    process.env['NODE_ENV'] === 'production' ? LOG_LEVEL.ERROR : LOG_LEVEL.DEBUG,
  );
  Purchases.configure({ apiKey, appUserID: explorerId });
}

export function logOutPurchases(): void {
  try { void Purchases.logOut(); } catch { /* noop if not configured */ }
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch {
    return null;
  }
}

export async function purchasePackage(pkg: PurchasesPackage) {
  return Purchases.purchasePackage(pkg);
}

export async function restorePurchases() {
  return Purchases.restorePurchases();
}

// Resolves a PurchasesPackage from the current offering for a given tier + period.
// Falls back to the first available package for that tier if the exact ID isn't found.
export async function resolvePackage(
  tier: RcTier,
  annual: boolean,
): Promise<PurchasesPackage | null> {
  const offering = await getOfferings();
  if (!offering) return null;

  const productId = RC_PRODUCT_IDS[tier][annual ? 'annual' : 'monthly'];
  return (
    offering.availablePackages.find((p) => p.product.identifier === productId) ??
    offering.availablePackages.find((p) => p.product.identifier.includes(tier.toLowerCase())) ??
    null
  );
}
