import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="step-1-archetype" />
      <Stack.Screen name="step-2-territories" />
      <Stack.Screen name="step-3-obsession" />
    </Stack>
  );
}
