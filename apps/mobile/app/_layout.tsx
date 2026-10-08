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

import { useEffect, useCallback, useRef, useState } from 'react';
import { Stack, router } from 'expo-router';
import { Platform, AppState, View, Text, Pressable, StyleSheet } from 'react-native';
import { replayOfflineQueue } from '@/stores/offlineQueue';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import { Colors } from '@travelpoint/theme';
import { useAuthStore } from '@/stores/auth';
import { useRecordingStore } from '@/stores/recording';
import { useBiometricStore } from '@/stores/biometrics';
import { api } from '@/lib/api';
import { hydrateQueryCache, subscribeQueryPersistence } from '@/lib/queryPersistence';
import { pl } from '@/i18n/pl';
import { initPurchases, logOutPurchases } from '@/lib/purchases';

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

// ── Biometric lock overlay ────────────────────────────────────────────────────
function BiometricLockScreen() {
  const { authenticate, setEnabled } = useBiometricStore();
  const logout = useAuthStore((s) => s.logout);
  const [failCount, setFailCount] = useState(0);

  useEffect(() => {
    void tryAuth();
  }, []);

  async function tryAuth() {
    const ok = await authenticate();
    if (!ok) setFailCount((c) => c + 1);
  }

  async function handleRelogin() {
    await setEnabled(false);
    await logout();
    router.replace('/(auth)/login');
  }

  return (
    <View style={lockStyles.overlay}>
      <SafeAreaView style={lockStyles.inner}>
        <Text style={lockStyles.logo}>TravelPoint</Text>
        <Text style={lockStyles.subtitle}>{pl.biometrics.lockSubtitle}</Text>
        <Pressable style={lockStyles.btn} onPress={() => void tryAuth()}>
          <Text style={lockStyles.btnText}>{pl.biometrics.unlockBtn}</Text>
        </Pressable>
        {failCount > 0 && (
          <Pressable style={lockStyles.fallbackBtn} onPress={() => void handleRelogin()}>
            <Text style={lockStyles.fallbackText}>Zaloguj się ponownie</Text>
          </Pressable>
        )}
      </SafeAreaView>
    </View>
  );
}

const lockStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.void,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner:    { alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  logo:     { fontFamily: 'ClashDisplay-Bold', fontSize: 28, color: Colors.starlight, marginBottom: 8 },
  subtitle: { fontFamily: 'GeneralSans-Regular', fontSize: 15, color: Colors.starFaint, textAlign: 'center' },
  btn: {
    marginTop: 24, backgroundColor: Colors.aurora,
    borderRadius: 999, paddingHorizontal: 36, paddingVertical: 14,
  },
  btnText:     { fontFamily: 'GeneralSans-Semibold', fontSize: 15, color: Colors.textOnDark },
  fallbackBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 24 },
  fallbackText: { fontFamily: 'GeneralSans-Regular', fontSize: 13, color: Colors.starFaint, textDecorationLine: 'underline' },
});

type OtaStatus = 'downloading' | 'restarting' | null;

function OtaBanner({ status }: { status: OtaStatus }) {
  if (!status) return null;
  const label = status === 'downloading' ? 'Pobieranie aktualizacji…' : 'Restartowanie aplikacji…';
  return (
    <View style={otaStyles.bar} pointerEvents="none">
      <View style={otaStyles.dot} />
      <Text style={otaStyles.text}>{label}</Text>
    </View>
  );
}

const otaStyles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: Colors.deepBlue + 'EE',
    zIndex: 10000,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.aurora,
  },
  text: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    color: Colors.starlight,
  },
});

function AuthGate({ otaStatus: _otaStatus, setOtaStatus }: { otaStatus: OtaStatus; setOtaStatus: (s: OtaStatus) => void }) {
  const { rehydrate, initialize, isLoading, isAuthenticated } = useAuthStore();
  const recoverRecording = useRecordingStore((state) => state.recoverRecording);
  const { load: loadBiometrics, lock, isLocked } = useBiometricStore();
  const appState = useRef(AppState.currentState);

  // OTA update — check on startup, show banner, auto-restart immediately after download.
  useEffect(() => {
    if (__DEV__) return;
    void (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return;

        setOtaStatus('downloading');
        await Updates.fetchUpdateAsync();
        setOtaStatus('restarting');
        // Brief pause so user sees the "Restarting…" message.
        await new Promise((r) => setTimeout(r, 900));
        await Updates.reloadAsync();
      } catch {
        setOtaStatus(null);
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
      } else if (type === 'nearby_explorer' && data['handle']) {
        router.push(`/explorer/${String(data['handle'])}`);
      } else if (type === 'spot_comment' && data['spotId']) {
        router.push(`/spot/${String(data['spotId'])}`);
      } else if (type === 'circle_invite' && data['circleSlug']) {
        router.push(`/circle/${String(data['circleSlug'])}`);
      } else if (type === 'journey_like' && data['journeyId']) {
        router.push(`/journey/${String(data['journeyId'])}`);
      } else if (type === 'rank_up') {
        router.push('/(tabs)/identity');
      } else if (type === 'forum_reply' && data['postSlug']) {
        router.push(`/forum/${String(data['postSlug'])}`);
      }
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    void rehydrate();
    void recoverRecording();
    void loadBiometrics();
    void hydrateQueryCache(queryClient);
    const unsubscribeQuery = subscribeQueryPersistence(queryClient);
    const unsubscribeAuth = initialize();

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        void replayOfflineQueue();
        void recoverRecording();
        // Re-validate session on resume; Supabase auto-refreshes token but
        // if the refresh window expired the user needs a clean re-login.
        void rehydrate();
        lock();
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
      logOutPurchases();
      router.replace('/(auth)/login');
    }
    if (!isLoading && isAuthenticated) {
      void registerPushToken();
      const explorerId = useAuthStore.getState().explorer?.id;
      if (explorerId) initPurchases(explorerId);
    }
  }, [isLoading, isAuthenticated]);

  return isLocked ? <BiometricLockScreen /> : null;
}

function UpdateBanner() {
  const [otaStatus, setOtaStatus] = useState<OtaStatus>(null);
  return (
    <>
      <AuthGate otaStatus={otaStatus} setOtaStatus={setOtaStatus} />
      <OtaBanner status={otaStatus} />
    </>
  );
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
          <StatusBar style="light" />
          <UpdateBanner />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.abyss } }}>
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
            <Stack.Screen name="modals/search"           options={{ presentation: 'fullScreenModal', animation: 'fade', headerShown: false }} />
            <Stack.Screen name="forum"                    options={{ headerShown: false }} />
            <Stack.Screen name="explorer/[handle]"       options={{ presentation: 'card', headerShown: false }} />
            <Stack.Screen name="saved"                   options={{ presentation: 'card', headerShown: false }} />
            <Stack.Screen name="plans"                   options={{ presentation: 'card', headerShown: false }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
