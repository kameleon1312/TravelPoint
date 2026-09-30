import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Colors, FontSize } from '@travelpoint/theme';
import { useAuthStore } from '@/stores/auth';

// Hard fallback: if AuthGate hasn't redirected after 10 s (network down, Supabase timeout)
// send the user to login so they're not stuck on the spinner forever.
const FALLBACK_MS = 10_000;

export default function RootIndex() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), FALLBACK_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      router.replace(isAuthenticated ? '/(tabs)' : '/(auth)/login');
    }
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (timedOut) {
      router.replace('/(auth)/login');
    }
  }, [timedOut]);

  return (
    <View style={styles.root}>
      <ActivityIndicator color={Colors.aurora} size="large" />
      {timedOut && (
        <Text style={styles.hint}>Przekierowanie…</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.void,
    gap: 16,
  },
  hint: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.starFaint,
  },
});
