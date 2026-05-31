import { create } from 'zustand';
import type { Explorer } from '@travelpoint/types';
import { tokenStorage } from '../lib/secureStorage';

interface AuthState {
  explorer: Explorer | null;
  isLoading: boolean;
  setExplorer: (explorer: Explorer | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  explorer: null,
  isLoading: true,

  setExplorer: (explorer) => set({ explorer, isLoading: false }),

  logout: async () => {
    await tokenStorage.clear();
    set({ explorer: null, isLoading: false });
  },
}));
