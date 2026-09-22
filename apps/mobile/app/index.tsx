import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@travelpoint/theme';

export default function RootIndex() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.void }}>
        <ActivityIndicator color={Colors.aurora} size="large" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
