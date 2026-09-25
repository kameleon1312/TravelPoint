import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Initialise Sentry before the app renders so crashes during startup are caught.
const sentryDsn =
  (Constants.expoConfig?.extra as { sentryDsn?: string } | undefined)?.sentryDsn ??
  process.env['EXPO_PUBLIC_SENTRY_DSN'];

if (sentryDsn && !__DEV__) {
  Sentry.init({
    dsn: sentryDsn,
    environment:         process.env.NODE_ENV ?? 'production',
    tracesSampleRate:    0.2,
    enableNativeFramesTracking: true,
    // Do not track personally identifiable data
    attachStacktrace:    true,
    normalizeDepth:      5,
  });
}

import { useEffect, useCallback, useRef } from 'react';
import { Stack, router } from 'expo-router';
import { Platform, AppState } from 'react-native';
import { replayOfflineQueue } from '@/stores/offlineQueue';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import { Colors } from '@travelpoint/theme';
import { useAuthStore } from '@/stores/auth';
import { useRecordingStore } from '@/stores/recording';
import { api } from '@/lib/api';
import { hydrateQueryCache, subscribeQueryPersistence } from '@/lib/queryPersistence';

SplashScreen.preventAutoHideAsync();

// Show notifications as banners when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
    shouldShowList:   true,
  }),
});

// Android: create a notification channel so system can route our alerts.
if (Platform.OS === 'android') {
  void Notifications.setNotificationChannelAsync('travelpoint', {
    name:             'TravelPoint',
    description:      'Sygnały, transmisje i secret dropy',
    importance:       Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor:       Colors.aurora,
    enableVibrate:    true,
    showBadge:        true,
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 1000 * 60 * 5 },
  },
});

async function registerPushToken() {
  if (Platform.OS === 'web') return;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    const finalStatus =
      existing === 'granted'
        ? existing
        : (await Notifications.requestPermissionsAsync()).status;
    if (finalStatus !== 'granted') return;
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await api.post('/api/explorers/me/push-token', { token });
  } catch {
    // Non-fatal — push unavailable in Expo Go dev mode without projectId
  }
}

function AuthGate() {
  const { rehydrate, initialize, isLoading, isAuthenticated } = useAuthStore();
  const recoverRecording = useRecordingStore((state) => state.recoverRecording);
  const appState = useRef(AppState.currentState);

  // Download OTA updates silently in the background.
  // The new bundle is applied on the next cold start to avoid interrupting navigation.
  useEffect(() => {
    if (__DEV__) return;
    void (async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
        }
      } catch {
        // Non-fatal — app continues with current bundle
      }
    })();
  }, []);

  // Wire up deep-link handler: notification tap → navigate to correct screen.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (!data) return;

      const type = data['type'] as string | undefined;

      if (type === 'transmission' && data['id']) {
        router.push('/modals/transmissions');
      } else if (type === 'circle_message' && data['circleId']) {
        router.push(
          `/modals/transmissions?circleId=${String(data['circleId'])}&circleName=${encodeURIComponent(String(data['circleName'] ?? ''))}`,
        );
      } else if (type === 'spot_unlocked' && data['id']) {
        router.push(`/spot/${String(data['id'])}`);
      } else if (type === 'secret_drop' && data['id']) {
        router.push(`/spot/${String(data['id'])}`);
      } else if (type === 'nearby_spot' && data['id']) {
        router.push(`/spot/${String(data['id'])}`);
      }
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    void rehydrate();
    void recoverRecording();
    void hydrateQueryCache(queryClient);
    const unsubscribeQuery = subscribeQueryPersistence(queryClient);
    const unsubscribeAuth = initialize();

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        void replayOfflineQueue();
        void recoverRecording();
      }
      appState.current = nextState;
    });

    return () => {
      unsubscribeQuery();
      unsubscribeAuth();
      appStateSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
    if (!isLoading && isAuthenticated) {
      void registerPushToken();
    }
  }, [isLoading, isAuthenticated]);

  return null;
}

export default function RootLayout() {
  /* Expo's asset registry requires static CommonJS calls for bundled fonts. */
  /* eslint-disable @typescript-eslint/no-require-imports */
  const [fontsLoaded, fontError] = useFonts({
    'ClashDisplay-Regular':  require('../assets/fonts/ClashDisplay-Regular.ttf'),
    'ClashDisplay-Medium':   require('../assets/fonts/ClashDisplay-Medium.ttf'),
    'ClashDisplay-Semibold': require('../assets/fonts/ClashDisplay-Semibold.ttf'),
    'ClashDisplay-Bold':     require('../assets/fonts/ClashDisplay-Bold.ttf'),
    'GeneralSans-Regular':   require('../assets/fonts/GeneralSans-Regular.ttf'),
    'GeneralSans-Medium':    require('../assets/fonts/GeneralSans-Medium.ttf'),
    'GeneralSans-Semibold':  require('../assets/fonts/GeneralSans-Semibold.ttf'),
    'GeneralSans-Bold':      require('../assets/fonts/GeneralSans-Bold.ttf'),
    'SpaceMono-Regular':     require('../assets/fonts/SpaceMono-Regular.ttf'),
    'SpaceMono-Bold':        require('../assets/fonts/SpaceMono-Bold.ttf'),
  });
  /* eslint-enable @typescript-eslint/no-require-imports */

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <AuthGate />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="spot/[id]"               options={{ presentation: 'modal' }} />
            <Stack.Screen name="journey/[id]"            options={{ presentation: 'card' }} />
            <Stack.Screen name="circle/[id]"             options={{ presentation: 'card' }} />
            <Stack.Screen name="circle/browse"           options={{ presentation: 'card' }} />
            <Stack.Screen name="modals/new-spot"         options={{ presentation: 'modal' }} />
            <Stack.Screen name="modals/new-journey"      options={{ presentation: 'modal' }} />
            <Stack.Screen name="modals/transmissions"    options={{ presentation: 'modal' }} />
            <Stack.Screen name="modals/new-circle"       options={{ presentation: 'modal' }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
