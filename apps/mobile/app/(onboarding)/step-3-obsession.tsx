import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { SignalButton } from '@/components/ui/SignalButton';
import { useAuthStore } from '@/stores/auth';
import { useOnboardingStore } from '@/stores/onboarding';
import { api } from '@/lib/api';

const OBSESSIONS = [
  'urbex', 'vanlife', 'backpacking', 'hidden cafés', 'abandoned places',
  'rooftops', 'underground', 'solo travel', 'mountains', 'coasts',
  'forests', 'deserts', 'lost villages', 'cold places', 'night photography',
];

export default function ObsessionStep() {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { rehydrate } = useAuthStore();
  const { archetype, territories, reset } = useOnboardingStore();

  function toggle(obs: string) {
    setSelected((prev) =>
      prev.includes(obs)
        ? prev.filter((x) => x !== obs)
        : prev.length < 5
          ? [...prev, obs]
          : prev,
    );
  }

  async function finish() {
    setLoading(true);
    try {
      await api.patch('/api/explorers/me', {
        ...(archetype ? { archetype } : {}),
        ...(territories.length > 0 ? { territories } : {}),
        obsessions: selected,
      });
      reset();
      await rehydrate();
      router.replace('/(tabs)');
    } catch {
      reset();
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={[Colors.void, Colors.abyss]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.step}>3 / 3</Text>
          <Text style={styles.eyebrow}>Twoje obsesje</Text>
          <Text style={styles.title}>Czym żyjesz?</Text>
          <Text style={styles.subtitle}>
            Wybierz do 5 rzeczy które definiują Twój styl eksploracji.
          </Text>

          <View style={styles.tags}>
            {OBSESSIONS.map((obs) => {
              const active = selected.includes(obs);
              return (
                <Pressable
                  key={obs}
                  style={[styles.tag, active && styles.tagActive]}
                  onPress={() => toggle(obs)}
                >
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>
                    {obs}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.counter}>{selected.length}/5 wybranych</Text>

          <SignalButton
            label="Wchodzę do sieci"
            onPress={finish}
            variant="ember"
            size="lg"
            loading={loading}
            fullWidth
            haptic="heavy"
          />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: Spacing.xl, gap: Spacing.lg },
  step: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost, letterSpacing: 2 },
  eyebrow: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint, letterSpacing: 3, textTransform: 'uppercase' },
  title: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h1, color: Colors.starlight, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: {
    backgroundColor: Colors.graphite,
    borderWidth: 1,
    borderColor: Colors.steel,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  tagActive: { borderColor: Colors.aurora, backgroundColor: Colors.graphiteSoft },
  tagText: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.caption, color: Colors.starFaint },
  tagTextActive: { color: Colors.aurora },
  counter: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.starGhost, textAlign: 'center' },
});
