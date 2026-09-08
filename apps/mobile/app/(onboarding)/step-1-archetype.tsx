import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { SignalButton } from '@/components/ui/SignalButton';
import type { Archetype } from '@travelpoint/types';
import { useOnboardingStore } from '@/stores/onboarding';

const ARCHETYPES: Array<{ value: Archetype; label: string; desc: string; icon: string }> = [
  { value: 'WANDERER', label: 'Wanderer', desc: 'Żyjesz bez planu. Mapy to tylko sugestie.', icon: '◎' },
  { value: 'URBEXER', label: 'Urbexer', desc: 'Zapomniane miejsca, opuszczone budynki, zakazane strefy.', icon: '◈' },
  { value: 'NOMAD', label: 'Nomad', desc: 'Dom to van, plecak lub dowolny kraj z Wi-Fi.', icon: '◑' },
  { value: 'HUNTER', label: 'Hunter', desc: 'Tropiciel ukrytych klejnotów. Secret spots to twoja obsesja.', icon: '◐' },
  { value: 'PILGRIM', label: 'Pilgrim', desc: 'Szukasz sensu w podróży. Każde miejsce ma swoją energię.', icon: '◉' },
];

export default function ArchetypeStep() {
  const [selected, setSelected] = useState<Archetype | null>(null);
  const { setArchetype } = useOnboardingStore();

  function handleNext() {
    if (!selected) return;
    setArchetype(selected);
    router.push('/(onboarding)/step-2-territories');
  }

  return (
    <LinearGradient colors={[Colors.void, Colors.abyss]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.container}>
          {/* Progress indicator */}
          <View style={styles.progressRow}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressLine} />
            <View style={styles.progressDot} />
            <View style={styles.progressLine} />
            <View style={styles.progressDot} />
          </View>

          <View style={styles.headingBlock}>
            <Text style={styles.step}>1 / 3</Text>
            <Text style={styles.eyebrow}>Explorer Archetype</Text>
            <Text style={styles.title}>Kim jesteś jako podróżnik?</Text>
            <Text style={styles.subtitle}>Wybierz swój archetyp. Możesz to zmienić w Tożsamości.</Text>
          </View>

          <View style={styles.grid}>
            {ARCHETYPES.map((a) => (
              <Pressable
                key={a.value}
                style={[
                  styles.card,
                  selected === a.value && styles.cardSelected,
                ]}
                onPress={() => setSelected(a.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected === a.value }}
              >
                <Text style={[styles.cardIcon, selected === a.value && { color: Colors.aurora }]}>
                  {a.icon}
                </Text>
                <Text style={styles.cardLabel}>{a.label}</Text>
                <Text style={styles.cardDesc}>{a.desc}</Text>
              </Pressable>
            ))}
          </View>

          <SignalButton
            label="Dalej"
            onPress={handleNext}
            variant="signal"
            size="lg"
            fullWidth
            disabled={!selected}
            haptic="light"
          />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.huge },
  progressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 0, marginBottom: Spacing.sm,
  },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.steel },
  progressDotActive: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.signal },
  progressLine: { flex: 1, height: 1, backgroundColor: Colors.steel, marginHorizontal: Spacing.xs },
  headingBlock: { gap: Spacing.sm },
  step: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.starGhost,
    letterSpacing: 2,
  },
  eyebrow: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.starFaint,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h1,
    color: Colors.starlight,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.star,
    lineHeight: 22,
  },
  grid: { gap: Spacing.md },
  card: {
    backgroundColor: Colors.graphite,
    borderWidth: 1,
    borderColor: Colors.steel,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  cardSelected: {
    borderColor: Colors.aurora,
    backgroundColor: Colors.graphiteSoft,
  },
  cardIcon: {
    fontSize: 24,
    color: Colors.starFaint,
  },
  cardLabel: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h4,
    color: Colors.starlight,
  },
  cardDesc: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.star,
    lineHeight: 20,
  },
});
