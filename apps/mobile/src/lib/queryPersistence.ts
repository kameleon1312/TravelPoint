import * as FileSystem from 'expo-file-system/legacy';
import * as Updates from 'expo-updates';
import type { QueryClient } from '@tanstack/react-query';

const CACHE_FILE = `${FileSystem.documentDirectory ?? ''}travelpoint-query-cache.json`;
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24;
const WRITE_DEBOUNCE_MS = 1500;

// Changes after every OTA update — used to invalidate stale cache automatically.
const BUNDLE_ID: string = Updates.updateId ?? '__dev__';

interface PersistedQuery {
  queryKey: readonly unknown[];
  data: unknown;
  dataUpdatedAt: number;
}

interface PersistedCache {
  version: 1;
  bundleId: string;
  savedAt: number;
  queries: PersistedQuery[];
}

let writeTimer: ReturnType<typeof setTimeout> | null = null;

export async function hydrateQueryCache(queryClient: QueryClient): Promise<void> {
  if (!FileSystem.documentDirectory) return;
  try {
    const info = await FileSystem.getInfoAsync(CACHE_FILE);
    if (!info.exists) return;
    const raw = await FileSystem.readAsStringAsync(CACHE_FILE);
    const cache = JSON.parse(raw) as PersistedCache;
    if (
      cache.version !== 1 ||
      cache.bundleId !== BUNDLE_ID ||
      Date.now() - cache.savedAt > CACHE_MAX_AGE_MS
    ) {
      await FileSystem.deleteAsync(CACHE_FILE, { idempotent: true }).catch(() => undefined);
      return;
    }
    for (const query of cache.queries) {
      queryClient.setQueryData(query.queryKey, query.data, {
        updatedAt: query.dataUpdatedAt,
      });
    }
  } catch {
    await FileSystem.deleteAsync(CACHE_FILE, { idempotent: true }).catch(() => undefined);
  }
}

export function subscribeQueryPersistence(queryClient: QueryClient): () => void {
  return queryClient.getQueryCache().subscribe(() => {
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(() => {
      void persistQueryCache(queryClient);
    }, WRITE_DEBOUNCE_MS);
  });
}

async function persistQueryCache(queryClient: QueryClient): Promise<void> {
  if (!FileSystem.documentDirectory) return;
  const queries = queryClient
    .getQueryCache()
    .getAll()
    .filter((query) => query.state.status === 'success' && query.state.data !== undefined)
    .map((query) => ({
      queryKey: query.queryKey,
      data: query.state.data,
      dataUpdatedAt: query.state.dataUpdatedAt,
    }));
  const payload: PersistedCache = {
    version: 1,
    bundleId: BUNDLE_ID,
    savedAt: Date.now(),
    queries,
  };
  await FileSystem.writeAsStringAsync(CACHE_FILE, JSON.stringify(payload));
}
