import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { SignalButton } from '@/components/ui/SignalButton';
import { useOnboardingStore } from '@/stores/onboarding';

const CONTINENTS = [
  { id: 'EU', label: 'Europa', icon: '🌍' },
  { id: 'AS', label: 'Azja', icon: '🌏' },
  { id: 'AM', label: 'Ameryki', icon: '🌎' },
  { id: 'AF', label: 'Afryka', icon: '🌍' },
  { id: 'OC', label: 'Oceania', icon: '🌏' },
  { id: 'AN', label: 'Antarktyda', icon: '❄️' },
];

export default function TerritoriesStep() {
  const [selected, setSelected] = useState<string[]>([]);
  const { setTerritories } = useOnboardingStore();

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleNext() {
    setTerritories(selected);
    router.push('/(onboarding)/step-3-obsession');
  }

  return (
    <LinearGradient colors={[Colors.void, Colors.abyss]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.step}>2 / 3</Text>
          <Text style={styles.eyebrow}>Twoje terytoria</Text>
          <Text style={styles.title}>Gdzie eksplorujesz?</Text>
          <Text style={styles.subtitle}>
            Wybierz kontynenty które znasz lub chcesz odkryć. Możesz zaznaczyć kilka.
          </Text>

          <View style={styles.grid}>
            {CONTINENTS.map((c) => {
              const active = selected.includes(c.id);
              return (
                <Pressable
                  key={c.id}
                  style={[styles.card, active && styles.cardActive]}
                  onPress={() => toggle(c.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                >
                  <Text style={styles.icon}>{c.icon}</Text>
                  <Text style={[styles.label, active && { color: Colors.aurora }]}>
                    {c.label}
                  </Text>
                  {active && <View style={styles.checkDot} />}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actions}>
            <SignalButton
              label="Dalej"
              onPress={handleNext}
              variant="signal"
              size="lg"
              fullWidth
              haptic="light"
            />
            <Text style={styles.skip} onPress={handleNext}>
              Pomiń
            </Text>
          </View>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  card: {
    width: '47%',
    backgroundColor: Colors.graphite,
    borderWidth: 1,
    borderColor: Colors.steel,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    position: 'relative',
  },
  cardActive: { borderColor: Colors.aurora, backgroundColor: Colors.graphiteSoft },
  icon: { fontSize: 32 },
  label: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.star },
  checkDot: {
    position: 'absolute', top: 10, right: 10,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.aurora,
  },
  actions: { gap: Spacing.md, marginTop: Spacing.lg },
  skip: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starGhost, textAlign: 'center' },
});
