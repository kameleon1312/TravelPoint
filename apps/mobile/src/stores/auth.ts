import { create } from 'zustand';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import type { Explorer } from '@travelpoint/types';
import { tokenStorage } from '../lib/secureStorage';
import { socketManager } from '../lib/socket';
import { api, ApiError } from '../lib/api';

async function registerPushToken(): Promise<void> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  // projectId is required for production Expo Push Notifications.
  // It comes from app.json → extra.eas.projectId.
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
  setExplorer: (explorer: Explorer | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  rehydrate: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

async function connectSocketWithToken(): Promise<void> {
  const token = await tokenStorage.getAccessToken();
  if (token) socketManager.connect(token);
}

export const useAuthStore = create<AuthState>((set) => ({
  explorer: null,
  isLoading: true,
  isAuthenticated: false,

  setExplorer: (explorer) =>
    set({ explorer, isLoading: false, isAuthenticated: !!explorer }),

  login: async (email, password) => {
    const data = await api.post<{
      accessToken: string;
      refreshToken: string;
      explorer: Explorer;
    }>('/api/auth/login', { email, password });

    await tokenStorage.setTokens(data.accessToken, data.refreshToken);
    socketManager.connect(data.accessToken);
    set({ explorer: data.explorer, isAuthenticated: true, isLoading: false });
    // Register push token after successful login (best-effort, no throw)
    void registerPushToken();
  },

  logout: async () => {
    const refresh = await tokenStorage.getRefreshToken();
    if (refresh) {
      await api.post('/api/auth/logout', { refreshToken: refresh }).catch(() => {});
    }
    socketManager.disconnect();
    await tokenStorage.clear();
    set({ explorer: null, isAuthenticated: false, isLoading: false });
  },

  deleteAccount: async () => {
    await api.delete('/api/explorers/me');
    socketManager.disconnect();
    await tokenStorage.clear();
    set({ explorer: null, isAuthenticated: false, isLoading: false });
  },

  rehydrate: async () => {
    set({ isLoading: true });
    try {
      const token = await tokenStorage.getAccessToken();
      if (!token) return set({ isLoading: false });
      const explorer = await api.get<Explorer>('/api/explorers/me');
      await connectSocketWithToken();
      set({ explorer, isAuthenticated: true, isLoading: false });
      void registerPushToken();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Token refresh already attempted in api.ts — if still 401, session expired
        socketManager.disconnect();
        await tokenStorage.clear();
      }
      set({ explorer: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
