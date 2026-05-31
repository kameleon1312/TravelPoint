import { useEffect, useCallback } from 'react';
import { Stack, router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
import { useAuthStore } from '@/stores/auth';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 1000 * 60 * 5 },
  },
});

function AuthGate() {
  const { rehydrate, isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    void rehydrate();
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/join');
    }
  }, [isLoading, isAuthenticated]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'ClashDisplay-Regular': require('../assets/fonts/ClashDisplay-Regular.ttf'),
    'ClashDisplay-Medium': require('../assets/fonts/ClashDisplay-Medium.ttf'),
    'ClashDisplay-Semibold': require('../assets/fonts/ClashDisplay-Semibold.ttf'),
    'ClashDisplay-Bold': require('../assets/fonts/ClashDisplay-Bold.ttf'),
    'GeneralSans-Regular': require('../assets/fonts/GeneralSans-Regular.ttf'),
    'GeneralSans-Medium': require('../assets/fonts/GeneralSans-Medium.ttf'),
    'GeneralSans-Semibold': require('../assets/fonts/GeneralSans-Semibold.ttf'),
    'GeneralSans-Bold': require('../assets/fonts/GeneralSans-Bold.ttf'),
    'SpaceMono-Regular': require('../assets/fonts/SpaceMono-Regular.ttf'),
    'SpaceMono-Bold': require('../assets/fonts/SpaceMono-Bold.ttf'),
  });

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
          <AuthGate />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="spot/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="journey/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="circle/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="circle/browse" options={{ presentation: 'card' }} />
            <Stack.Screen name="modals/new-spot" options={{ presentation: 'modal' }} />
            <Stack.Screen name="modals/new-journey" options={{ presentation: 'modal' }} />
            <Stack.Screen name="modals/transmissions" options={{ presentation: 'modal' }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
