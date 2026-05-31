import * as SecureStore from 'expo-secure-store';

export const tokenStorage = {
  async setTokens(access: string, refresh: string) {
    await SecureStore.setItemAsync('tp_access', access, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await SecureStore.setItemAsync('tp_refresh', refresh, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  getAccessToken: () => SecureStore.getItemAsync('tp_access'),
  getRefreshToken: () => SecureStore.getItemAsync('tp_refresh'),

  async clear() {
    await SecureStore.deleteItemAsync('tp_access');
    await SecureStore.deleteItemAsync('tp_refresh');
  },
};
