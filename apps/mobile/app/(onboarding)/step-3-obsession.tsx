import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring,
} from 'react-native-reanimated';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { SignalButton } from '@/components/ui/SignalButton';
import { useAuthStore } from '@/stores/auth';
import { useOnboardingStore } from '@/stores/onboarding';
import { api } from '@/lib/api';

const MAX_OBSESSIONS = 5;

const OBSESSIONS = [
  'urbex',
  'vanlife',
  'backpacking',
  'ukryte kawiarnie',
  'opuszczone miejsca',
  'dachy',
  'podziemia',
  'solo',
  'góry',
  'wybrzeże',
  'lasy',
  'pustynie',
  'zapomniane wsie',
  'zimne miejsca',
  'nocna fotografia',
  'lokalna kuchnia',
  'ruiny',
  'jaskinie',
];

function ObsessionTag({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePress() {
    if (disabled && !active) return;
    scale.value = withSpring(0.9, { damping: 8 }, () => {
      scale.value = withSpring(1, { damping: 10 });
    });
    onPress();
  }

  return (
    <Animated.View style={animStyle}>
      <Pressable
        style={[
          styles.tag,
          active && styles.tagActive,
          disabled && !active && styles.tagDisabled,
        ]}
        onPress={handlePress}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: active }}
      >
        {active && <Text style={styles.tagCheck}>◉ </Text>}
        <Text style={[styles.tagText, active && styles.tagTextActive, disabled && !active && styles.tagTextDisabled]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function ObsessionStep() {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { rehydrate } = useAuthStore();
  const { archetype, territories, reset } = useOnboardingStore();

  const isFull = selected.length >= MAX_OBSESSIONS;

  function toggle(obs: string) {
    setSelected((prev) => {
      if (prev.includes(obs)) return prev.filter((x) => x !== obs);
      if (prev.length >= MAX_OBSESSIONS) return prev;
      return [...prev, obs];
    });
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Błąd połączenia z serwerem';
      Alert.alert(
        'Nie udało się zapisać profilu',
        `${msg}\n\nMożesz uzupełnić profil później w Tożsamości.`,
        [
          { text: 'Spróbuj ponownie', onPress: () => setLoading(false) },
          {
            text: 'Pomiń',
            style: 'destructive',
            onPress: () => {
              reset();
              router.replace('/(tabs)');
            },
          },
        ],
      );
    } finally {
      setLoading(false);
    }
  }

  function skipAll() {
    reset();
    router.replace('/(tabs)');
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
            <View style={[styles.progressLine, styles.progressLineDone]} />
            <View style={[styles.progressDot, styles.progressDotDone]} />
            <View style={[styles.progressLine, styles.progressLineDone]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
          </View>

          <View style={styles.headingBlock}>
            <Text style={styles.step}>3 / 3</Text>
            <Text style={styles.eyebrow}>Twoje obsesje</Text>
            <Text style={styles.title}>Czym żyjesz?</Text>
            <Text style={styles.subtitle}>
              Wybierz do {MAX_OBSESSIONS} rzeczy które definiują Twój styl eksploracji.
              To personalizuje Twoją mapę i circle.
            </Text>
          </View>

          {/* Counter chip */}
          <View style={styles.counterRow}>
            <View style={[
              styles.counterChip,
              isFull && styles.counterChipFull,
            ]}>
              <Text style={[styles.counterText, isFull && styles.counterTextFull]}>
                {selected.length} / {MAX_OBSESSIONS}
              </Text>
            </View>
            {isFull && (
              <Text style={styles.counterHint}>Maksimum osiągnięte</Text>
            )}
          </View>

          <View style={styles.tags}>
            {OBSESSIONS.map((obs) => (
              <ObsessionTag
                key={obs}
                label={obs}
                active={selected.includes(obs)}
                disabled={isFull}
                onPress={() => toggle(obs)}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <SignalButton
              label="Wchodzę do sieci →"
              onPress={finish}
              variant="ember"
              size="lg"
              loading={loading}
              fullWidth
              haptic="heavy"
              disabled={selected.length === 0}
            />
            <Pressable onPress={skipAll} accessibilityRole="button">
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

  // Progress bar
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: Colors.ember,
  },
  progressLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.steel,
    marginHorizontal: Spacing.xs,
  },
  progressLineDone: {
    backgroundColor: Colors.aurora,
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
    color: Colors.ember,
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

  // Counter
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  counterChip: {
    backgroundColor: Colors.graphite,
    borderWidth: 1,
    borderColor: Colors.steel,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  counterChipFull: {
    borderColor: Colors.ember + '60',
    backgroundColor: Colors.ember + '12',
  },
  counterText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.caption,
    color: Colors.starFaint,
  },
  counterTextFull: {
    color: Colors.ember,
  },
  counterHint: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.caption,
    color: Colors.starGhost,
  },

  // Tags
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.graphite,
    borderWidth: 1,
    borderColor: Colors.steel,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  tagActive: {
    borderColor: Colors.aurora,
    backgroundColor: Colors.aurora + '14',
  },
  tagDisabled: {
    opacity: 0.4,
  },
  tagCheck: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.aurora,
  },
  tagText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.caption,
    color: Colors.starFaint,
  },
  tagTextActive: {
    color: Colors.aurora,
  },
  tagTextDisabled: {
    color: Colors.starGhost,
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
