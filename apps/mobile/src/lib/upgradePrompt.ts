import { Alert } from 'react-native';
import { router } from 'expo-router';
import { ApiError } from './api';
import { pl } from '@/i18n/pl';

// Plan limits are enforced by the API; turn its 403 into an upgrade prompt instead of
// a generic failure. Returns true when the error was a plan limit and has been handled.
export function promptUpgradeOnTierError(err: unknown, message?: string): boolean {
  if (!(err instanceof ApiError) || err.status !== 403) return false;
  if (err.code !== 'TIER_LIMIT' && err.code !== 'TIER_REQUIRED') return false;
  Alert.alert(pl.upgrade.title, message ?? pl.upgrade.generic, [
    { text: pl.upgrade.later, style: 'cancel' },
    { text: pl.upgrade.seePlans, onPress: () => router.push('/plans') },
  ]);
  return true;
}
