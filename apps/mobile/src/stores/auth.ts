import { create } from 'zustand';
import type { Explorer } from '@travelpoint/types';
import { tokenStorage } from '../lib/secureStorage';
import { socketManager } from '../lib/socket';
import { api, ApiError } from '../lib/api';

interface AuthState {
  explorer: Explorer | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setExplorer: (explorer: Explorer | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  rehydrate: () => Promise<void>;
}

async function connectSocketWithToken(): Promise<void> {
  const token = await tokenStorage.getAccessToken();
  if (token) socketManager.connect(token);
}

export const useAuthStore = create<AuthState>((set, get) => ({
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

  rehydrate: async () => {
    set({ isLoading: true });
    try {
      const token = await tokenStorage.getAccessToken();
      if (!token) return set({ isLoading: false });
      const explorer = await api.get<Explorer>('/api/explorers/me');
      await connectSocketWithToken();
      set({ explorer, isAuthenticated: true, isLoading: false });
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
