import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { CoordLabel } from '@/components/ui/CoordLabel';
import { useNearbySpots } from '@/hooks/useSpots';
import { useFeed } from '@/hooks/useFeed';
import { formatRelative } from '@travelpoint/utils';
import { pl } from '@/i18n/pl';
import type { SpotForViewer, FeedItem } from '@travelpoint/types';

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

const CATEGORIES = ['ABANDONED', 'CAFE', 'BEACH', 'ROUTE', 'UNDERGROUND', 'VIEWPOINT', 'CAMP'] as const;

const CATEGORY_PL = pl.spotCategories as Record<string, string>;

const FEED_TYPE_LABELS: Record<string, string> = {
  SPOT_CREATED:       'dodał nowy Spot',
  JOURNEY_PUBLISHED:  'opublikował Journey',
  SPOT_COMMENT:       'skomentował Spot',
  REACTION_RECEIVED:  'zareagował',
  CIRCLE_ACTIVITY:    'aktywny w Circle',
};

const FEED_TYPE_ICONS: Record<string, string> = {
  SPOT_CREATED:      '◉',
  JOURNEY_PUBLISHED: '◎',
  SPOT_COMMENT:      '◇',
  REACTION_RECEIVED: '♥',
  CIRCLE_ACTIVITY:   '◑',
};

// ── Spot card ─────────────────────────────────────────────────────────────────

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
  const icon        = ACCESS_ICONS[accessLevel]  ?? '◎';

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

        <Text style={[styles.cardTitle, isLocked && styles.titleLocked]}>
          {'title' in spot ? (spot as { title: string }).title : '???'}
        </Text>

        <CoordLabel lat={spot.lat} lng={spot.lng} locked={isLocked} />
      </GlassCard>
    </Pressable>
  );
}

// ── Feed card ─────────────────────────────────────────────────────────────────

function FeedCard({ item }: { item: FeedItem }) {
  function handlePress() {
    const p = item.payload;
    if (item.type === 'SPOT_CREATED' || item.type === 'SPOT_COMMENT') {
      router.push(`/spot/${String(p['spotId'] ?? '')}`);
    } else if (item.type === 'JOURNEY_PUBLISHED') {
      router.push(`/journey/${String(p['journeyId'] ?? '')}`);
    }
  }

  const icon  = FEED_TYPE_ICONS[item.type]  ?? '◎';
  const label = FEED_TYPE_LABELS[item.type] ?? item.type;

  return (
    <Pressable onPress={handlePress}>
      <GlassCard style={styles.feedCard}>
        <View style={styles.feedHeader}>
          <Text style={styles.feedIcon}>{icon}</Text>
          <View style={styles.feedMeta}>
            <Text style={styles.feedActor}>
              <Text style={styles.feedHandle}>@{item.actorHandle}</Text>
              {' '}{label}
            </Text>
            <Text style={styles.feedTime}>{formatRelative(item.createdAt)}</Text>
          </View>
        </View>
        {item.type === 'SPOT_CREATED' && (
          <Text style={styles.feedTitle} numberOfLines={2}>
            {String(item.payload['title'] ?? '')}
          </Text>
        )}
        {item.type === 'JOURNEY_PUBLISHED' && (
          <Text style={styles.feedTitle} numberOfLines={2}>
            {String(item.payload['title'] ?? '')}
          </Text>
        )}
        {item.type === 'SPOT_COMMENT' && (
          <>
            <Text style={styles.feedSpotRef} numberOfLines={1}>
              → {String(item.payload['spotTitle'] ?? '')}
            </Text>
            <Text style={styles.feedCommentBody} numberOfLines={2}>
              "{String(item.payload['body'] ?? '')}"
            </Text>
          </>
        )}
      </GlassCard>
    </Pressable>
  );
}

// ── No location ───────────────────────────────────────────────────────────────

function NoLocation({ onRequest }: { onRequest: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>◎</Text>
      <Text style={styles.emptyTitle}>Lokalizacja wyłączona</Text>
      <Text style={styles.emptySub}>
        Odkrywaj spoty w pobliżu — włącz lokalizację.
      </Text>
      <Pressable style={styles.enableBtn} onPress={onRequest}>
        <Text style={styles.enableBtnText}>Włącz lokalizację</Text>
      </Pressable>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

type Segment = 'feed' | 'discover';

export default function DiscoverScreen() {
  const [segment, setSegment]           = useState<Segment>('feed');
  const [coords, setCoords]             = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: feedItems, isLoading: feedLoading } = useFeed();

  const { data: spots, isLoading: spotsLoading, error: spotsError } = useNearbySpots(
    segment === 'discover' ? (coords?.lat ?? null) : null,
    segment === 'discover' ? (coords?.lng ?? null) : null,
  );

  const filteredSpots = activeCategory
    ? spots?.filter((s) => 'category' in s && (s as { category: string }).category === activeCategory)
    : spots;

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
    if (segment === 'discover' && !coords) void requestLocation();
  }, [segment]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Ukryta Warstwa</Text>
        <Text style={styles.heading}>Odkrywaj</Text>
      </View>

      {/* Segment switcher */}
      <View style={styles.segments}>
        <Pressable
          style={[styles.segBtn, segment === 'feed' && styles.segBtnActive]}
          onPress={() => setSegment('feed')}
        >
          <Text style={[styles.segLabel, segment === 'feed' && styles.segLabelActive]}>
            Aktywność
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segBtn, segment === 'discover' && styles.segBtnActive]}
          onPress={() => setSegment('discover')}
        >
          <Text style={[styles.segLabel, segment === 'discover' && styles.segLabelActive]}>
            W pobliżu
          </Text>
        </Pressable>
      </View>

      {/* FEED segment */}
      {segment === 'feed' && (
        <>
          {feedLoading && (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.aurora} size="large" />
            </View>
          )}
          {!feedLoading && (!feedItems || feedItems.length === 0) && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>◐</Text>
              <Text style={styles.emptyTitle}>Feed jest cichy</Text>
              <Text style={styles.emptySub}>
                Dołącz do circles albo odkryj spoty, żeby zobaczyć co się dzieje w Twojej sieci.
              </Text>
            </View>
          )}
          {!feedLoading && feedItems && feedItems.length > 0 && (
            <FlatList
              data={feedItems}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => <FeedCard item={item} />}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      {/* DISCOVER segment */}
      {segment === 'discover' && (
        <>
          {/* Category filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <Pressable
              style={[styles.filterChip, !activeCategory && styles.filterChipActive]}
              onPress={() => setActiveCategory(null)}
            >
              <Text style={[styles.filterChipText, !activeCategory && styles.filterChipTextActive]}>
                Wszystkie
              </Text>
            </Pressable>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[styles.filterChip, activeCategory === cat && styles.filterChipActive]}
                onPress={() => setActiveCategory(activeCategory === cat ? null : cat)}
              >
                <Text style={[styles.filterChipText, activeCategory === cat && styles.filterChipTextActive]}>
                  {CATEGORY_PL[cat] ?? cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {locationDenied && !spotsLoading && (
            <NoLocation onRequest={requestLocation} />
          )}
          {spotsLoading && (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.aurora} size="large" />
            </View>
          )}
          {spotsError && !spotsLoading && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>◈</Text>
              <Text style={styles.emptyTitle}>Błąd ładowania</Text>
              <Pressable style={styles.enableBtn} onPress={() => void requestLocation()}>
                <Text style={styles.enableBtnText}>Spróbuj ponownie</Text>
              </Pressable>
            </View>
          )}
          {!spotsLoading && !spotsError && !locationDenied && (filteredSpots?.length ?? 0) === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>◎</Text>
              <Text style={styles.emptyTitle}>Brak spotów w pobliżu</Text>
              <Text style={styles.emptySub}>Nikt jeszcze nie odkrył tego miejsca. Bądź pierwszy.</Text>
            </View>
          )}
          {!spotsLoading && !spotsError && (filteredSpots?.length ?? 0) > 0 && (
            <FlatList
              data={filteredSpots}
              keyExtractor={(s) => s.id}
              renderItem={({ item }) => <SpotCard spot={item} />}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.abyss },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
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
    fontSize: FontSize.h3,
    color: Colors.starlight,
  },
  segments: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    backgroundColor: Colors.graphite,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.steel,
    overflow: 'hidden',
  },
  segBtn: {
    flex: 1, paddingVertical: Spacing.sm, alignItems: 'center',
  },
  segBtnActive: { backgroundColor: Colors.graphiteSoft },
  segLabel: {
    fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.starFaint,
  },
  segLabelActive: { color: Colors.aurora },
  filterRow: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xs, paddingBottom: Spacing.md, gap: Spacing.sm },
  filterChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.steel,
    backgroundColor: Colors.graphite,
  },
  filterChipActive: { borderColor: Colors.aurora + '70', backgroundColor: Colors.aurora + '15' },
  filterChipText: {
    fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro,
    color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  filterChipTextActive: { color: Colors.aurora },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.xl, gap: Spacing.lg,
  },
  emptyIcon:  { fontSize: 40, color: Colors.starGhost },
  emptyTitle: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight, textAlign: 'center' },
  emptySub:   { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, textAlign: 'center', lineHeight: 22 },
  enableBtn:  { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.aurora },
  enableBtnText: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.aurora },
  list:    { padding: Spacing.xl },
  card:    { gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  category: {
    fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro,
    color: Colors.starFaint, flex: 1, textTransform: 'uppercase', letterSpacing: 1,
  },
  badge: { borderWidth: 1, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  badgeText: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTitle: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight },
  titleLocked: { color: Colors.starGhost },
  // Feed
  feedCard:   { gap: Spacing.sm },
  feedHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  feedIcon:   { fontSize: 16, color: Colors.aurora, marginTop: 2 },
  feedMeta:   { flex: 1, gap: 2 },
  feedActor:  { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, flexWrap: 'wrap' },
  feedHandle: { fontFamily: 'GeneralSans-Semibold', color: Colors.starlight },
  feedTime:   { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost },
  feedTitle:  { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight, lineHeight: 24 },
  feedSpotRef:{ fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.signal, textTransform: 'uppercase', letterSpacing: 0.5 },
  feedCommentBody: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, fontStyle: 'italic', lineHeight: 20 },
});
