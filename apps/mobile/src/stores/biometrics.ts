import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const STORE_KEY = 'tp_biometric_enabled';

interface BiometricState {
  isEnabled:   boolean;
  isLocked:    boolean;
  isSupported: boolean;
  load:         () => Promise<void>;
  setEnabled:   (enabled: boolean) => Promise<void>;
  authenticate: () => Promise<boolean>;
  lock:         () => void;
}

export const useBiometricStore = create<BiometricState>((set, get) => ({
  isEnabled:   false,
  isLocked:    false,
  isSupported: false,

  load: async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled  = await LocalAuthentication.isEnrolledAsync();
      const supported   = hasHardware && isEnrolled;
      const stored      = supported
        ? await SecureStore.getItemAsync(STORE_KEY)
        : null;
      set({ isSupported: supported, isEnabled: stored === 'true' });
    } catch {
      set({ isSupported: false, isEnabled: false });
    }
  },

  setEnabled: async (enabled) => {
    try {
      await SecureStore.setItemAsync(STORE_KEY, enabled ? 'true' : 'false');
      set({ isEnabled: enabled, isLocked: false });
    } catch {
      // SecureStore write failure — setting not persisted
    }
  },

  authenticate: async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:         'Potwierdź swoją tożsamość',
        cancelLabel:           'Anuluj',
        disableDeviceFallback: false,
      });
      if (result.success) set({ isLocked: false });
      return result.success;
    } catch {
      return false;
    }
  },

  lock: () => {
    if (get().isEnabled) set({ isLocked: true });
  },
}));
