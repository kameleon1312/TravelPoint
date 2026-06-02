import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { CoordLabel } from '@/components/ui/CoordLabel';
import { useNearbySpots } from '@/hooks/useSpots';
import type { SpotForViewer } from '@travelpoint/types';

const ACCESS_COLORS: Record<string, string> = {
  PUBLIC:      Colors.aurora,
  TRUSTED:     Colors.signal,
  SECRET_DROP: Colors.ember,
  CIRCLE_ONLY: Colors.violet,
};

const ACCESS_ICONS: Record<string, string> = {
  PUBLIC:      '◎',
  TRUSTED:     '◈',
  SECRET_DROP: '◉',
  CIRCLE_ONLY: '◑',
};

function SpotCard({ spot }: { spot: SpotForViewer }) {
  const pulse = useSharedValue(1);
  const isLocked = 'locked' in spot && spot.locked;
  const accessLevel = 'accessLevel' in spot
    ? (spot as { accessLevel: string }).accessLevel
    : 'PUBLIC';

  useEffect(() => {
    if (accessLevel === 'SECRET_DROP') {
      pulse.value = withRepeat(
        withSequence(withTiming(1.2, { duration: 600 }), withTiming(1, { duration: 800 })),
        -1,
      );
    }
  }, [accessLevel]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const accentColor = ACCESS_COLORS[accessLevel] ?? Colors.starFaint;
  const icon = ACCESS_ICONS[accessLevel] ?? '◎';

  return (
    <Pressable onPress={() => router.push(`/spot/${spot.id}`)}>
      <GlassCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Animated.Text style={[{ color: accentColor, fontSize: 14 }, animStyle]}>
            {icon}
          </Animated.Text>
          <Text style={styles.category}>
            {'category' in spot ? (spot as { category: string }).category : ''}
          </Text>
          {isLocked && (
            <View style={[styles.badge, { borderColor: accentColor + '60' }]}>
              <Text style={[styles.badgeText, { color: accentColor }]}>
                {accessLevel === 'CIRCLE_ONLY' ? 'CIRCLE' : accessLevel.replace('_', ' ')}
              </Text>
            </View>
          )}
          {accessLevel === 'SECRET_DROP' && !isLocked && (
            <View style={[styles.badge, { borderColor: Colors.ember + '60' }]}>
              <Text style={[styles.badgeText, { color: Colors.ember }]}>DROP</Text>
            </View>
          )}
        </View>

        <Text style={[styles.title, isLocked && styles.titleLocked]}>
          {'title' in spot ? (spot as { title: string }).title : '???'}
        </Text>

        <CoordLabel lat={spot.lat} lng={spot.lng} locked={isLocked} />
      </GlassCard>
    </Pressable>
  );
}

function NoLocation({ onRequest }: { onRequest: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>◎</Text>
      <Text style={styles.emptyTitle}>Lokalizacja wyłączona</Text>
      <Text style={styles.emptySub}>
        Odkrywaj spoty w pobliżu — włącz lokalizację żeby zobaczyć ukryte miejsca.
      </Text>
      <Pressable style={styles.enableBtn} onPress={onRequest}>
        <Text style={styles.enableBtnText}>Włącz lokalizację</Text>
      </Pressable>
    </View>
  );
}

export default function DiscoverScreen() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  const { data: spots, isLoading, error } = useNearbySpots(
    coords?.lat ?? null,
    coords?.lng ?? null,
  );

  async function requestLocation() {
    setLocationDenied(false);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationDenied(true);
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
  }

  useEffect(() => {
    void requestLocation();
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Hidden Layer</Text>
        <Text style={styles.heading}>Odkrywaj</Text>
        <Text style={styles.sub}>Spoty w pobliżu, posortowane według Twojego ranku.</Text>
      </View>

      {/* Location denied */}
      {locationDenied && !isLoading && (
        <NoLocation onRequest={requestLocation} />
      )}

      {/* Loading */}
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.aurora} size="large" />
        </View>
      )}

      {/* Error */}
      {error && !isLoading && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>◈</Text>
          <Text style={styles.emptyTitle}>Błąd ładowania</Text>
          <Text style={styles.emptySub}>
            {error instanceof Error ? error.message : 'Sprawdź połączenie z siecią i spróbuj ponownie.'}
          </Text>
          <Pressable
            style={styles.enableBtn}
            onPress={() => void requestLocation()}
          >
            <Text style={styles.enableBtnText}>Spróbuj ponownie</Text>
          </Pressable>
        </View>
      )}

      {/* Empty state */}
      {!isLoading && !error && !locationDenied && spots?.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>◎</Text>
          <Text style={styles.emptyTitle}>Brak spotów w pobliżu</Text>
          <Text style={styles.emptySub}>Nikt jeszcze nie odkrył tego miejsca. Bądź pierwszy.</Text>
        </View>
      )}

      {/* Spots list */}
      {!isLoading && !error && (spots?.length ?? 0) > 0 && (
        <FlatList
          data={spots}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <SpotCard spot={item} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.abyss },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  eyebrow: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.starFaint,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  heading: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h2,
    color: Colors.starlight,
  },
  sub: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.star,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  emptyIcon: { fontSize: 40, color: Colors.starGhost },
  emptyTitle: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h4,
    color: Colors.starlight,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.star,
    textAlign: 'center',
    lineHeight: 22,
  },
  enableBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.aurora,
  },
  enableBtnText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: FontSize.bodySm,
    color: Colors.aurora,
  },
  list: { padding: Spacing.xl },
  card: { gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  category: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.starFaint,
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  badge: {
    borderWidth: 1,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h4,
    color: Colors.starlight,
  },
  titleLocked: { color: Colors.starGhost },
});
