import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useJourney } from '@/hooks/useJourneys';
import { Colors, FontSize, Spacing } from '@travelpoint/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatRelative } from '@travelpoint/utils';

export default function JourneyReplayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: journey, isLoading } = useJourney(id ?? '');

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.aurora} size="large" />
      </View>
    );
  }

  if (!journey) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Journey nie znalezione.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← Journeys</Text>
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Journey Replay</Text>
          <Text style={styles.title}>{journey.title}</Text>
          {journey.mood && <Text style={styles.mood}>"{journey.mood}"</Text>}
          <Text style={styles.date}>{formatRelative(journey.createdAt)}</Text>
        </View>

        {/* Route visualization placeholder */}
        <GlassCard style={styles.routeCard}>
          <Text style={styles.routeLabel}>Trasa</Text>
          {journey.routeGeoJson ? (
            <View style={styles.routeMap}>
              {/* TODO: Replace with Mapbox route replay */}
              <Text style={styles.routePlaceholder}>◎ Mapa trasy</Text>
              <Text style={styles.routeCoords}>
                {JSON.stringify(journey.routeGeoJson).slice(0, 60)}...
              </Text>
            </View>
          ) : (
            <View style={styles.routeEmpty}>
              <Text style={styles.routeEmptyText}>Brak zapisanej trasy GPS</Text>
            </View>
          )}
        </GlassCard>

        {/* Soundtrack */}
        {journey.soundtrack && (
          <GlassCard style={styles.soundtrackCard}>
            <Text style={styles.soundtrackLabel}>♪ Soundtrack</Text>
            <Text style={styles.soundtrackUrl} numberOfLines={1}>{journey.soundtrack}</Text>
          </GlassCard>
        )}

        {/* Privacy status */}
        <GlassCard style={styles.metaCard}>
          <Text style={styles.metaLabel}>Widoczność</Text>
          <Text style={[styles.metaValue, { color: journey.isPrivate ? Colors.ember : Colors.aurora }]}>
            {journey.isPrivate ? '🔒 Prywatne' : '◎ Publiczne'}
          </Text>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.abyss },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.abyss },
  scroll: { padding: Spacing.xl, gap: Spacing.xl },
  back: { alignSelf: 'flex-start' },
  backText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starFaint },
  header: { gap: Spacing.sm },
  eyebrow: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint, letterSpacing: 3, textTransform: 'uppercase' },
  title: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h2, color: Colors.starlight, letterSpacing: -0.5 },
  mood: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.star, fontStyle: 'italic' },
  date: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost },
  routeCard: { gap: Spacing.md },
  routeLabel: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption, color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 1 },
  routeMap: { backgroundColor: Colors.midnight, borderRadius: 12, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm },
  routePlaceholder: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.h3, color: Colors.aurora },
  routeCoords: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost },
  routeEmpty: { height: 80, alignItems: 'center', justifyContent: 'center' },
  routeEmptyText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starGhost },
  soundtrackCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  soundtrackLabel: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.aurora },
  soundtrackUrl: { flex: 1, fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint },
  metaCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starFaint },
  metaValue: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.caption },
  errorText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.danger },
});
