import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, ScrollView, RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

// ── Access level config ───────────────────────────────────────────────────────

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

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORIES = ['ABANDONED', 'CAFE', 'BEACH', 'ROUTE', 'UNDERGROUND', 'VIEWPOINT', 'CAMP'] as const;

const CATEGORY_PL = pl.spotCategories as Record<string, string>;

type Category = typeof CATEGORIES[number];

const CATEGORY_STYLE: Record<Category, { emoji: string; color: string }> = {
  ABANDONED:   { emoji: '🏚', color: '#9E7148' },
  CAFE:        { emoji: '☕', color: '#B07840' },
  BEACH:       { emoji: '🏖', color: Colors.cosmicBlue },
  ROUTE:       { emoji: '🗺', color: Colors.aurora },
  UNDERGROUND: { emoji: '🕳', color: Colors.starFaint },
  VIEWPOINT:   { emoji: '🔭', color: Colors.signal },
  CAMP:        { emoji: '⛺', color: Colors.moss },
};

const FEED_TYPE_LABELS = pl.feedTypes as Record<string, string>;
const FEED_TYPE_ICONS  = pl.feedIcons  as Record<string, string>;

const H_PAD    = 16;
const CARD_GAP = 10;
const SCREEN_W = Dimensions.get('window').width;
const CARD_W   = Math.floor((SCREEN_W - H_PAD * 2 - CARD_GAP) / 2);
const CARD_VIS = Math.round(CARD_W * 1.15);

// ── Category chip ─────────────────────────────────────────────────────────────

function CategoryChip({
  category,
  active,
  onPress,
}: {
  category: Category | null;
  active: boolean;
  onPress: () => void;
}) {
  const isAll = category === null;
  const emoji = isAll ? '🧭' : CATEGORY_STYLE[category].emoji;
  const color = isAll ? Colors.aurora : CATEGORY_STYLE[category].color;
  const label = isAll ? 'Wszystkie' : (CATEGORY_PL[category] ?? category);

  return (
    <Pressable
      style={[
        styles.chip,
        active
          ? { backgroundColor: color, borderColor: color }
          : { backgroundColor: color + '14', borderColor: color + '45' },
      ]}
      onPress={onPress}
      hitSlop={4}
    >
      <Text style={styles.chipEmoji}>{emoji}</Text>
      <Text
        style={[
          styles.chipLabel,
          { color: active ? '#FFFFFF' : color },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ── Spot card ─────────────────────────────────────────────────────────────────

function SpotCard({ spot }: { spot: SpotForViewer }) {
  const pulse = useSharedValue(1);
  const isLocked = 'locked' in spot && spot.locked;
  const accessLevel = 'accessLevel' in spot
    ? (spot as { accessLevel: string }).accessLevel
    : 'PUBLIC';
  const category: string = 'category' in spot ? (spot as { category: string }).category : '';

  useEffect(() => {
    if (accessLevel === 'SECRET_DROP') {
      pulse.value = withRepeat(
        withSequence(withTiming(1.4, { duration: 600 }), withTiming(1, { duration: 800 })),
        -1,
      );
    }
  }, [accessLevel]);

  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const accentColor = ACCESS_COLORS[accessLevel] ?? Colors.starFaint;
  const catStyle    = CATEGORY_STYLE[category as Category];
  const catColor    = catStyle?.color ?? Colors.signal;

  const coordText = `${Math.abs(spot.lat).toFixed(3)}° ${spot.lat >= 0 ? 'N' : 'S'}`;

  return (
    <Pressable style={styles.spotCard} onPress={() => router.push(`/spot/${spot.id}`)}>
      <LinearGradient
        colors={[Colors.void, catColor + '55']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.spotCardVisual}
      >
        <Text style={[styles.spotCardCoord, { color: catColor + '70' }]}>{coordText}</Text>
        <Text style={styles.spotCardEmoji}>{catStyle?.emoji ?? '◈'}</Text>
        <Animated.View style={[styles.spotCardDot, { backgroundColor: accentColor }, dotStyle]} />
        {isLocked && (
          <View style={styles.spotCardLockBadge}>
            <Text style={styles.spotCardLockText}>◑</Text>
          </View>
        )}
      </LinearGradient>
      <View style={styles.spotCardBody}>
        <Text style={[styles.spotCardCat, { color: catColor }]} numberOfLines={1}>
          {CATEGORY_PL[category] ?? category}
        </Text>
        <Text style={[styles.spotCardTitle, isLocked && { color: Colors.starGhost }]} numberOfLines={2}>
          {isLocked ? pl.spots.lockedSpot : ('title' in spot ? (spot as { title: string }).title : '???')}
        </Text>
        <CoordLabel lat={spot.lat} lng={spot.lng} locked={isLocked} />
      </View>
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
  const initial = item.actorHandle[0]?.toUpperCase() ?? '?';

  return (
    <Pressable onPress={handlePress}>
      <View style={styles.feedCard}>
        <View style={styles.feedHeader}>
          <View style={styles.feedAvatar}>
            <Text style={styles.feedAvatarText}>{initial}</Text>
          </View>
          <View style={styles.feedMeta}>
            <Text style={styles.feedHandle}>@{item.actorHandle}</Text>
            <Text style={styles.feedAction}>{label}</Text>
          </View>
          <Text style={styles.feedTime}>{formatRelative(item.createdAt)}</Text>
        </View>

        {(item.type === 'SPOT_CREATED' || item.type === 'JOURNEY_PUBLISHED') && (
          <Text style={styles.feedTitle} numberOfLines={2}>
            {String(item.payload['title'] ?? '')}
          </Text>
        )}
        {item.type === 'SPOT_COMMENT' && (
          <View style={styles.feedCommentBlock}>
            <Text style={styles.feedSpotRef} numberOfLines={1}>
              → {String(item.payload['spotTitle'] ?? '')}
            </Text>
            <Text style={styles.feedCommentBody} numberOfLines={2}>
              "{String(item.payload['body'] ?? '')}"
            </Text>
          </View>
        )}

        <View style={styles.feedTag}>
          <Text style={styles.feedTagIcon}>{icon}</Text>
          <Text style={styles.feedTagLabel}>{label}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  subtitle,
  action,
  actionLabel,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
      {action && actionLabel ? (
        <Pressable style={styles.actionBtn} onPress={action}>
          <Text style={styles.actionBtnText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

type Segment = 'feed' | 'discover';

export default function DiscoverScreen() {
  const [segment, setSegment]               = useState<Segment>('feed');
  const [coords, setCoords]                 = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  const {
    data: feedData,
    isLoading: feedLoading,
    isRefetching: feedRefetching,
    fetchNextPage: feedFetchNext,
    hasNextPage: feedHasNext,
    isFetchingNextPage: feedFetchingNext,
    refetch: feedRefetch,
  } = useFeed();

  const feedItems = feedData?.pages.flatMap((p) => p.items) ?? [];

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
    if (status !== 'granted') { setLocationDenied(true); return; }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
  }

  useEffect(() => {
    if (segment === 'discover' && !coords) void requestLocation();
  }, [segment]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.eyebrow}>Ukryta Warstwa</Text>
          <Text style={styles.heading}>Odkrywaj</Text>
        </View>
        <Pressable style={styles.forumBtn} onPress={() => router.push('/forum')}>
          <Text style={styles.forumBtnIcon}>◈</Text>
          <Text style={styles.forumBtnLabel}>Forum</Text>
        </Pressable>
      </View>

      {/* ── Segment switcher ── */}
      <View style={styles.segmentWrap}>
        <View style={styles.segmentTrack}>
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
      </View>

      {/* ── FEED ── */}
      {segment === 'feed' && (
        <>
          {feedLoading && (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.aurora} size="large" />
            </View>
          )}
          {!feedLoading && (!feedItems || feedItems.length === 0) && (
            <EmptyState
              icon="🌿"
              title="Feed jest cichy"
              subtitle="Dołącz do circles albo odkryj spoty, żeby zobaczyć co się dzieje w Twojej sieci."
            />
          )}
          {!feedLoading && feedItems.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEyebrow}>Sieć</Text>
                <Text style={styles.sectionTitle}>Dla ciebie</Text>
              </View>
              <FlatList
                data={feedItems}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => <FeedCard item={item} />}
              contentContainerStyle={styles.feedList}
              ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
              showsVerticalScrollIndicator={false}
              onEndReached={() => { if (feedHasNext && !feedFetchingNext) void feedFetchNext(); }}
              onEndReachedThreshold={0.3}
              refreshControl={
                <RefreshControl
                  refreshing={feedRefetching && !feedLoading}
                  onRefresh={() => void feedRefetch()}
                  tintColor={Colors.aurora}
                />
              }
              ListFooterComponent={
                feedFetchingNext
                  ? <ActivityIndicator color={Colors.aurora} style={{ paddingVertical: 16 }} />
                  : null
              }
            />
            </>
          )}
        </>
      )}

      {/* ── DISCOVER ── */}
      {segment === 'discover' && (
        <>
          {/* Category chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            <CategoryChip
              category={null}
              active={activeCategory === null}
              onPress={() => setActiveCategory(null)}
            />
            {CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat}
                category={cat}
                active={activeCategory === cat}
                onPress={() => setActiveCategory(activeCategory === cat ? null : cat)}
              />
            ))}
          </ScrollView>

          {locationDenied && !spotsLoading && (
            <EmptyState
              icon="📍"
              title="Lokalizacja wyłączona"
              subtitle="Odkrywaj spoty w pobliżu — włącz lokalizację."
              action={requestLocation}
              actionLabel="Włącz lokalizację"
            />
          )}
          {spotsLoading && (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.aurora} size="large" />
            </View>
          )}
          {spotsError && !spotsLoading && (
            <EmptyState
              icon="◈"
              title="Błąd ładowania"
              action={() => void requestLocation()}
              actionLabel="Spróbuj ponownie"
            />
          )}
          {!spotsLoading && !spotsError && !locationDenied && (filteredSpots?.length ?? 0) === 0 && (
            <EmptyState
              icon="🧭"
              title="Brak spotów w pobliżu"
              subtitle="Nikt jeszcze nie odkrył tego miejsca. Bądź pierwszy."
            />
          )}
          {!spotsLoading && !spotsError && (filteredSpots?.length ?? 0) > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEyebrow}>Ukryta warstwa</Text>
                <Text style={styles.sectionTitle}>W pobliżu</Text>
              </View>
              <FlatList
                data={filteredSpots}
                keyExtractor={(s) => s.id}
                renderItem={({ item }) => <SpotCard spot={item} />}
                numColumns={2}
                columnWrapperStyle={styles.spotGridRow}
                contentContainerStyle={styles.spotGridList}
                showsVerticalScrollIndicator={false}
              />
            </>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void },

  // ── Header ───────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerLeft: {
    flex: 1,
    gap: Spacing.xs,
  },
  eyebrow: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.aurora,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  heading: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h1,
    color: Colors.starlight,
    letterSpacing: -1,
  },
  forumBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.signal + '50',
    backgroundColor: Colors.signal + '12',
    marginBottom: 2,
  },
  forumBtnIcon: {
    fontSize: 13,
    color: Colors.signal,
  },
  forumBtnLabel: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: FontSize.caption,
    color: Colors.signal,
    letterSpacing: 0.3,
  },

  // ── Segment switcher ─────────────────────────────────────────────────────────
  segmentWrap: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: Colors.graphite,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.steel,
    padding: 3,
  },
  segBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  segBtnActive: {
    backgroundColor: Colors.aurora,
    shadowColor: Colors.aurora,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  segLabel: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: FontSize.bodySm,
    color: Colors.star,
  },
  segLabelActive: {
    color: '#FFFFFF',
  },

  // ── Category chips ────────────────────────────────────────────────────────────
  chipRow: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  chipEmoji: {
    fontSize: 15,
    lineHeight: 18,
  },
  chipLabel: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: FontSize.bodySm,
  },

  // ── Spot card (2-col grid) ────────────────────────────────────────────────────
  spotGridList: {
    paddingHorizontal: H_PAD,
    paddingTop: Spacing.xs,
    paddingBottom: 110,
  },
  spotGridRow: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  spotCard: {
    width: CARD_W,
    backgroundColor: Colors.graphite,
    borderRadius: 20,
    overflow: 'hidden',
  },
  spotCardVisual: {
    height: CARD_VIS,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  spotCardCoord: {
    position: 'absolute',
    top: 10,
    left: 10,
    fontFamily: 'SpaceMono-Regular',
    fontSize: 8,
    letterSpacing: 0.5,
  },
  spotCardEmoji: {
    fontSize: 42,
  },
  spotCardDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  spotCardLockBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  spotCardLockText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 10,
    color: Colors.starGhost,
  },
  spotCardBody: {
    padding: 12,
    gap: 3,
  },
  spotCardCat: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  spotCardTitle: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.body,
    color: Colors.starlight,
    lineHeight: 20,
  },

  // ── Feed card ─────────────────────────────────────────────────────────────────
  feedCard: {
    backgroundColor: Colors.graphite,
    borderRadius: 20,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginHorizontal: H_PAD,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  feedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.signal + '28',
    borderWidth: 1,
    borderColor: Colors.signal + '50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedAvatarText: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: 16,
    color: Colors.signalGlow,
  },
  feedMeta:   { flex: 1, gap: 1 },
  feedHandle: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.starlight },
  feedAction: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.star },
  feedTime:   { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost },
  feedTitle:  { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h3, color: Colors.starlight, lineHeight: 28 },
  feedCommentBlock: { gap: 4 },
  feedSpotRef:{ fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.signal, textTransform: 'uppercase', letterSpacing: 0.5 },
  feedCommentBody: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, fontStyle: 'italic', lineHeight: 20 },
  feedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.aurora + '35',
    backgroundColor: Colors.aurora + '0D',
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
  },
  feedTagIcon: { fontSize: 11, color: Colors.aurora },
  feedTagLabel: { fontFamily: 'SpaceMono-Regular', fontSize: 9, color: Colors.aurora, textTransform: 'uppercase', letterSpacing: 0.5 },

  // ── Empty / center ────────────────────────────────────────────────────────────
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  emptyEmoji: { fontSize: 44 },
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
  actionBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.abyss,
    borderWidth: 1,
    borderColor: Colors.aurora + '60',
  },
  actionBtnText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: FontSize.bodySm,
    color: Colors.aurora,
  },

  // ── List ──────────────────────────────────────────────────────────────────────
  feedList: { paddingTop: Spacing.xs, paddingBottom: 110 },

  // ── Section header ────────────────────────────────────────────────────────────
  sectionHeader: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: 2,
  },
  sectionEyebrow: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.aurora,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h2,
    color: Colors.starlight,
    letterSpacing: -0.5,
  },
});
