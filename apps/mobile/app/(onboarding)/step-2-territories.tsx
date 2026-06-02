import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring,
} from 'react-native-reanimated';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { SignalButton } from '@/components/ui/SignalButton';
import { useOnboardingStore } from '@/stores/onboarding';

const TERRITORIES = [
  {
    id: 'EU',
    label: 'Europa',
    sub: 'Stary Kontynent',
    symbol: '◉',
    accentColor: Colors.signal,
  },
  {
    id: 'AS',
    label: 'Azja',
    sub: 'Wschód Słońca',
    symbol: '◈',
    accentColor: Colors.aurora,
  },
  {
    id: 'AM',
    label: 'Ameryki',
    sub: 'Nowy Świat',
    symbol: '◎',
    accentColor: Colors.violet,
  },
  {
    id: 'AF',
    label: 'Afryka',
    sub: 'Rdzeń Planety',
    symbol: '◑',
    accentColor: Colors.sand,
  },
  {
    id: 'OC',
    label: 'Oceania',
    sub: 'Błękit Południa',
    symbol: '◐',
    accentColor: Colors.moss,
  },
  {
    id: 'AN',
    label: 'Antarktyda',
    sub: 'Ostatnie Krańce',
    symbol: '◌',
    accentColor: Colors.starFaint,
  },
];

function TerritoryCard({
  territory,
  active,
  onPress,
}: {
  territory: typeof TERRITORIES[0];
  active: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePress() {
    scale.value = withSpring(0.95, { damping: 10 }, () => {
      scale.value = withSpring(1, { damping: 12 });
    });
    onPress();
  }

  return (
    <Animated.View style={[styles.cardWrap, animStyle]}>
      <Pressable
        style={[
          styles.card,
          active && { borderColor: territory.accentColor, backgroundColor: Colors.graphiteSoft },
        ]}
        onPress={handlePress}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: active }}
      >
        {/* Glow dot top-right */}
        {active && (
          <View style={[styles.activeDot, { backgroundColor: territory.accentColor }]} />
        )}

        <Text style={[styles.symbol, active && { color: territory.accentColor }]}>
          {territory.symbol}
        </Text>
        <Text style={[styles.cardLabel, active && { color: territory.accentColor }]}>
          {territory.label}
        </Text>
        <Text style={styles.cardSub}>{territory.sub}</Text>
      </Pressable>
    </Animated.View>
  );
}

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
    <LinearGradient
      colors={[Colors.void, Colors.abyss, Colors.midnight]}
      locations={[0, 0.4, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress indicator */}
          <View style={styles.progressRow}>
            <View style={[styles.progressDot, styles.progressDotDone]} />
            <View style={styles.progressLine} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressLine} />
            <View style={styles.progressDot} />
          </View>

          <View style={styles.headingBlock}>
            <Text style={styles.step}>2 / 3</Text>
            <Text style={styles.eyebrow}>Twoje terytoria</Text>
            <Text style={styles.title}>Gdzie eksplorujesz?</Text>
            <Text style={styles.subtitle}>
              Zaznacz kontynenty które znasz lub chcesz odkryć.
              Możesz wybrać kilka — im więcej, tym lepsza mapa dla Ciebie.
            </Text>
          </View>

          <View style={styles.grid}>
            {TERRITORIES.map((t) => (
              <TerritoryCard
                key={t.id}
                territory={t}
                active={selected.includes(t.id)}
                onPress={() => toggle(t.id)}
              />
            ))}
          </View>

          {selected.length > 0 && (
            <View style={styles.selectedChip}>
              <Text style={styles.selectedChipText}>
                {selected.length} {selected.length === 1 ? 'terytorium' : 'terytoria'} wybrane
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <SignalButton
              label="Dalej →"
              onPress={handleNext}
              variant="signal"
              size="lg"
              fullWidth
              haptic="light"
            />
            <Pressable onPress={handleNext} accessibilityRole="button">
              <Text style={styles.skip}>Pomiń — uzupełnię później</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: Spacing.xl,
    gap: Spacing.lg,
    paddingBottom: Spacing.huge,
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    marginBottom: Spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.steel,
  },
  progressDotDone: {
    backgroundColor: Colors.aurora,
  },
  progressDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.signal,
  },
  progressLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.steel,
    marginHorizontal: Spacing.xs,
  },

  // Heading
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
    color: Colors.signal,
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

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  cardWrap: {
    width: '47%',
  },
  card: {
    backgroundColor: Colors.graphite,
    borderWidth: 1,
    borderColor: Colors.steel,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 120,
    justifyContent: 'center',
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  symbol: {
    fontSize: 28,
    color: Colors.starFaint,
    fontFamily: 'GeneralSans-Regular',
  },
  cardLabel: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: FontSize.bodySm,
    color: Colors.star,
    textAlign: 'center',
  },
  cardSub: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.starGhost,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // Selection chip
  selectedChip: {
    alignSelf: 'center',
    backgroundColor: Colors.signal + '18',
    borderWidth: 1,
    borderColor: Colors.signal + '40',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  selectedChipText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.signal,
    letterSpacing: 1,
  },

  // Actions
  actions: { gap: Spacing.md, marginTop: Spacing.sm },
  skip: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.starGhost,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
});
