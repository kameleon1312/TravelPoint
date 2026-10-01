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
        withSequence(withTiming(1.22, { duration: 600 }), withTiming(1, { duration: 800 })),
        -1,
      );
    }
  }, [accessLevel]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const accentColor = ACCESS_COLORS[accessLevel] ?? Colors.starFaint;
  const icon        = ACCESS_ICONS[accessLevel]  ?? '◎';
  const catStyle    = CATEGORY_STYLE[category as Category];
  const catColor    = catStyle?.color ?? Colors.starFaint;

  return (
    <Pressable onPress={() => router.push(`/spot/${spot.id}`)}>
      <GlassCard style={styles.card}>
        {/* Category strip */}
        <View style={[styles.cardStrip, { backgroundColor: catColor + '18' }]}>
          <Text style={[styles.cardCategory, { color: catColor }]}>
            {catStyle?.emoji ? `${catStyle.emoji}  ` : ''}{CATEGORY_PL[category] ?? category}
          </Text>

          {/* Access badge */}
          <View style={[styles.accessBadge, { backgroundColor: accentColor + '18', borderColor: accentColor + '50' }]}>
            <Animated.Text style={[{ fontSize: 10, color: accentColor }, animStyle]}>
              {icon}
            </Animated.Text>
            <Text style={[styles.accessBadgeText, { color: accentColor }]}>
              {accessLevel === 'CIRCLE_ONLY' ? 'CIRCLE' : accessLevel.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {/* Title + coords */}
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, isLocked && styles.titleLocked]} numberOfLines={2}>
            {'title' in spot ? (spot as { title: string }).title : '???'}
          </Text>
          <CoordLabel lat={spot.lat} lng={spot.lng} locked={isLocked} />
        </View>
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
          <View style={styles.feedIconWrap}>
            <Text style={styles.feedIcon}>{icon}</Text>
          </View>
          <View style={styles.feedMeta}>
            <Text style={styles.feedActor}>
              <Text style={styles.feedHandle}>@{item.actorHandle}</Text>
              {'  '}{label}
            </Text>
            <Text style={styles.feedTime}>{formatRelative(item.createdAt)}</Text>
          </View>
        </View>
        {(item.type === 'SPOT_CREATED' || item.type === 'JOURNEY_PUBLISHED') && (
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
  },
  heading: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h2,
    color: Colors.starlight,
    letterSpacing: -0.5,
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

  // ── Spot card ─────────────────────────────────────────────────────────────────
  card: { gap: 0, overflow: 'hidden' },
  cardStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.steel,
  },
  cardCategory: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  accessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  accessBadgeText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  cardTitle: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h4,
    color: Colors.starlight,
    lineHeight: 24,
  },
  titleLocked: { color: Colors.starGhost },

  // ── Feed card ─────────────────────────────────────────────────────────────────
  feedCard:   { gap: Spacing.sm },
  feedHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  feedIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.abyss,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.aurora + '30',
  },
  feedIcon:   { fontSize: 16 },
  feedMeta:   { flex: 1, gap: 2 },
  feedActor:  { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, flexWrap: 'wrap' },
  feedHandle: { fontFamily: 'GeneralSans-Semibold', color: Colors.starlight },
  feedTime:   { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost },
  feedTitle:  { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight, lineHeight: 24 },
  feedSpotRef:{ fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.signal, textTransform: 'uppercase', letterSpacing: 0.5 },
  feedCommentBody: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, fontStyle: 'italic', lineHeight: 20 },

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
  list: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xs, paddingBottom: Spacing.xl },
});
