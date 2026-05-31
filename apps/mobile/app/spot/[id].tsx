import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '@travelpoint/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { CoordLabel } from '@/components/ui/CoordLabel';
import { SignalButton } from '@/components/ui/SignalButton';
import { useSpot } from '@/hooks/useSpots';

const CATEGORY_ICONS: Record<string, string> = {
  ABANDONED: '◈', CAFE: '◎', BEACH: '◎',
  ROUTE: '◉', UNDERGROUND: '◈', VIEWPOINT: '◎', CAMP: '◉',
};

const ACCESS_LABELS: Record<string, string> = {
  PUBLIC: 'Publiczne',
  TRUSTED: 'Wymaga ranku TRUSTED',
  CIRCLE_ONLY: 'Tylko dla circle',
  SECRET_DROP: 'Secret Drop',
};

function LockedOverlay({ requiredAccess }: { requiredAccess: string }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.1, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1,
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <GlassCard style={styles.lockedCard}>
      <Animated.Text style={[styles.lockIcon, style]}>◈</Animated.Text>
      <Text style={styles.lockTitle}>Zablokowane</Text>
      <Text style={styles.lockDesc}>{ACCESS_LABELS[requiredAccess] ?? requiredAccess}</Text>
      <Text style={styles.lockHint}>
        Zwiększ swój rank lub dołącz do odpowiedniego circle żeby odblokować ten spot.
      </Text>
    </GlassCard>
  );
}

export default function SpotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: spot, isLoading, error } = useSpot(id ?? '');

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.aurora} size="large" />
      </View>
    );
  }

  if (error || !spot) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Nie znaleziono spotu.</Text>
        <SignalButton label="Wróć" onPress={() => router.back()} variant="ghost" size="sm" />
      </View>
    );
  }

  const isLocked = 'locked' in spot && spot.locked;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Back */}
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← Wróć</Text>
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.category}>
            {CATEGORY_ICONS['category' in spot ? (spot as { category: string }).category : 'ABANDONED']}
            {'  '}
            {'category' in spot ? (spot as { category: string }).category : ''}
          </Text>
          <Text style={[styles.title, isLocked && styles.titleLocked]}>
            {'title' in spot ? (spot as { title: string }).title : '???'}
          </Text>
          <CoordLabel lat={spot.lat} lng={spot.lng} locked={isLocked} />
        </View>

        {/* Lock overlay or content */}
        {isLocked ? (
          <LockedOverlay requiredAccess={(spot as { requiredAccess: string }).requiredAccess} />
        ) : (
          <View style={styles.content}>
            {'story' in spot && (spot as { story?: string }).story && (
              <GlassCard style={styles.storyCard}>
                <Text style={styles.storyLabel}>Historia miejsca</Text>
                <Text style={styles.storyText}>{(spot as { story: string }).story}</Text>
              </GlassCard>
            )}

            <GlassCard style={styles.metaCard}>
              <Text style={styles.metaLabel}>Dostęp</Text>
              <Text style={styles.metaValue}>
                {'accessLevel' in spot ? ACCESS_LABELS[(spot as { accessLevel: string }).accessLevel] ?? '' : ''}
              </Text>
            </GlassCard>

            <SignalButton
              label="Zapisz w Saved Worlds"
              onPress={() => {}}
              variant="signal"
              size="md"
              fullWidth
              haptic="medium"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.abyss },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, backgroundColor: Colors.abyss },
  scroll: { padding: Spacing.xl, gap: Spacing.xl },
  back: { alignSelf: 'flex-start' },
  backText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starFaint },
  header: { gap: Spacing.sm },
  category: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.caption, color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h2, color: Colors.starlight, letterSpacing: -0.5 },
  titleLocked: { color: Colors.starGhost },
  lockedCard: { alignItems: 'center', gap: Spacing.md, padding: Spacing.xxl },
  lockIcon: { fontSize: 48 },
  lockTitle: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h3, color: Colors.starlight },
  lockDesc: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.caption, color: Colors.ember, textTransform: 'uppercase', letterSpacing: 1 },
  lockHint: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, textAlign: 'center', lineHeight: 22 },
  content: { gap: Spacing.lg },
  storyCard: { gap: Spacing.sm },
  storyLabel: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption, color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 1 },
  storyText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.star, lineHeight: 26 },
  metaCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starFaint },
  metaValue: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.caption, color: Colors.aurora },
  errorText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.danger },
});
