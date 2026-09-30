import { create } from 'zustand';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import type { Explorer, Rank } from '@travelpoint/types';
import { RANK_ORDER } from '@travelpoint/types';
import { supabase } from '../lib/supabase';
import { socketManager } from '../lib/socket';
import { api, ApiError } from '../lib/api';

async function registerPushToken(): Promise<void> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)
      ?.eas?.projectId;

  const { data: token } = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );

  await api.post('/api/explorers/me/push-token', { token }).catch(() => {});
}

interface AuthState {
  explorer: Explorer | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  pendingRankUp: Rank | null;
  setExplorer: (explorer: Explorer | null) => void;
  clearPendingRankUp: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  rehydrate: () => Promise<void>;
  initialize: () => () => void;
  deleteAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  explorer: null,
  isLoading: true,
  isAuthenticated: false,
  pendingRankUp: null,

  setExplorer: (explorer) => {
    const prev = get().explorer;
    const rankUp =
      explorer !== null &&
      prev !== null &&
      RANK_ORDER[explorer.rank] > RANK_ORDER[prev.rank];
    set({
      explorer,
      isLoading: false,
      isAuthenticated: !!explorer,
      ...(rankUp ? { pendingRankUp: explorer.rank } : {}),
    });
  },

  clearPendingRankUp: () => set({ pendingRankUp: null }),

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new ApiError('INVALID_CREDENTIALS', error.message, 401);
    if (!data.session) throw new ApiError('NO_SESSION', 'Brak sesji po logowaniu', 401);

    const explorer = await api.get<Explorer>('/api/explorers/me');
    socketManager.connect(data.session.access_token);
    set({ explorer, isAuthenticated: true, isLoading: false });
    void registerPushToken();
  },

  logout: async () => {
    socketManager.disconnect();
    set({ explorer: null, isAuthenticated: false, isLoading: false });
    await supabase.auth.signOut();
  },

  rehydrate: async () => {
    set({ isLoading: true });

    const TIMEOUT_MS = 8000;
    function makeTimeout() {
      return new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('REHYDRATE_TIMEOUT')), TIMEOUT_MS),
      );
    }

    try {
      const { data: { session } } = await Promise.race([
        supabase.auth.getSession(),
        makeTimeout(),
      ]);
      if (!session) return set({ isLoading: false });

      const explorer = await Promise.race([
        api.get<Explorer>('/api/explorers/me'),
        makeTimeout(),
      ]);
      socketManager.connect(session.access_token);
      set({ explorer, isAuthenticated: true, isLoading: false });
      void registerPushToken();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.code === 'ACCOUNT_NOT_FOUND')) {
        socketManager.disconnect();
        await supabase.auth.signOut();
      }
      set({ explorer: null, isAuthenticated: false, isLoading: false });
    }
  },

  initialize: () => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED' && session) {
        socketManager.connect(session.access_token);
      }
      if (event === 'SIGNED_OUT') {
        socketManager.disconnect();
        useAuthStore.setState({ explorer: null, isAuthenticated: false, isLoading: false });
      }
    });
    return () => subscription.unsubscribe();
  },

  deleteAccount: async () => {
    try {
      await api.delete('/api/explorers/me');
    } catch (err) {
      // Jeśli konto już usunięte server-side, wyczyść lokalnie
      if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
        socketManager.disconnect();
        await supabase.auth.signOut();
        set({ explorer: null, isAuthenticated: false, isLoading: false });
        return;
      }
      throw err;
    }
    socketManager.disconnect();
    await supabase.auth.signOut();
    set({ explorer: null, isAuthenticated: false, isLoading: false });
  },
}));
