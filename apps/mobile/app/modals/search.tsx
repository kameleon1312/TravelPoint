import {
  View, Text, TextInput, Pressable, StyleSheet,
  FlatList, ActivityIndicator, Image, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { useSearch } from '@/hooks/useSearch';
import { pl } from '@/i18n/pl';
import type { SpotSearchResult, ExplorerSearchResult, JourneySearchResult } from '@travelpoint/types';
import { RANK_LABELS } from '@travelpoint/types';
import { formatRelative } from '@travelpoint/utils';

const RECENT_KEY = 'tp_search_recent';
const MAX_RECENT  = 8;

// ── Category visual config ────────────────────────────────────────────────────
const CATEGORY_EMOJI: Record<string, string> = {
  ABANDONED:   '🏚', CAFE: '☕', BEACH: '🏖',
  ROUTE: '🗺', UNDERGROUND: '🕳', VIEWPOINT: '🔭', CAMP: '⛺',
};

const ACCESS_COLOR: Record<string, string> = {
  PUBLIC:      Colors.aurora,
  TRUSTED:     Colors.signal,
  SECRET_DROP: Colors.ember,
  CIRCLE_ONLY: Colors.violet,
};

const RANK_DOT_COLOR: Record<string, string> = {
  NEWCOMER: Colors.starGhost,
  EXPLORER: Colors.star,
  TRUSTED:  Colors.signal,
  INSIDER:  Colors.aurora,
  LEGEND:   Colors.ember,
};

// ── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonIcon} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={[styles.skeletonLine, { width: '60%' }]} />
        <View style={[styles.skeletonLine, { width: '35%', height: 10 }]} />
      </View>
    </View>
  );
}

// ── Spot result row ───────────────────────────────────────────────────────────
function SpotRow({ item }: { item: SpotSearchResult }) {
  const cats = pl.spotCategories as Record<string, string>;
  const accColor = ACCESS_COLOR[item.accessLevel] ?? Colors.aurora;

  return (
    <Pressable
      style={styles.resultRow}
      onPress={() => router.push(`/spot/${item.id}`)}
      android_ripple={{ color: Colors.steel }}
    >
      <View style={[styles.resultIconBox, { backgroundColor: accColor + '14' }]}>
        <Text style={styles.resultEmoji}>{CATEGORY_EMOJI[item.category] ?? '◉'}</Text>
      </View>
      <View style={styles.resultBody}>
        <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.resultMeta}>
          <Text style={[styles.resultChip, { color: accColor }]}>
            {item.locked ? '🔒 ' : ''}{cats[item.category] ?? item.category}
          </Text>
          {item.locked && (
            <Text style={styles.resultLocked}>{pl.search.lockedSpot}</Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={14} color={Colors.starGhost} />
    </Pressable>
  );
}

// ── Explorer result row ───────────────────────────────────────────────────────
function ExplorerRow({ item }: { item: ExplorerSearchResult }) {
  const dotColor = RANK_DOT_COLOR[item.rank] ?? Colors.starGhost;
  return (
    <Pressable
      style={styles.resultRow}
      onPress={() => router.push(`/explorer/${item.handle}`)}
      android_ripple={{ color: Colors.steel }}
    >
      <View style={styles.avatarBox}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatarImg} />
        ) : (
          <View style={[styles.avatarImg, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>
              {(item.displayName ?? item.handle).charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.resultBody}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.displayName ? `${item.displayName} ` : ''}
          <Text style={styles.resultHandle}>@{item.handle}</Text>
        </Text>
        <View style={styles.resultMeta}>
          <View style={[styles.rankDot, { backgroundColor: dotColor }]} />
          <Text style={[styles.resultChip, { color: dotColor }]}>
            {RANK_LABELS[item.rank]}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={14} color={Colors.starGhost} />
    </Pressable>
  );
}

// ── Journey result row ────────────────────────────────────────────────────────
function JourneyRow({ item }: { item: JourneySearchResult }) {
  return (
    <Pressable
      style={styles.resultRow}
      onPress={() => router.push(`/journey/${item.id}`)}
      android_ripple={{ color: Colors.steel }}
    >
      <View style={[styles.resultIconBox, { backgroundColor: Colors.signal + '14' }]}>
        <Text style={styles.resultEmoji}>◎</Text>
      </View>
      <View style={styles.resultBody}>
        <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.resultMeta}>
          <Text style={styles.resultChip}>@{item.explorer.handle}</Text>
          <Text style={styles.resultDot}>·</Text>
          <Text style={styles.resultChip}>{formatRelative(item.createdAt)}</Text>
          {item.isPrivate && (
            <Text style={[styles.resultChip, { color: Colors.starFaint }]}>
              {' '}· {pl.search.privateJourney}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={14} color={Colors.starGhost} />
    </Pressable>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionCount}>{count}</Text>
    </View>
  );
}

// ── Recent searches ───────────────────────────────────────────────────────────
function RecentSearches({
  items,
  onSelect,
  onClear,
}: {
  items: string[];
  onSelect: (q: string) => void;
  onClear: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <Animated.View entering={FadeIn.duration(180)} style={styles.recentSection}>
      <View style={styles.recentHeader}>
        <Text style={styles.sectionLabel}>{pl.search.recentLabel}</Text>
        <Pressable onPress={onClear} hitSlop={8}>
          <Text style={styles.clearBtn}>{pl.search.clearRecent}</Text>
        </Pressable>
      </View>
      <View style={styles.recentChips}>
        {items.map((item) => (
          <Pressable key={item} style={styles.recentChip} onPress={() => onSelect(item)}>
            <Ionicons name="time-outline" size={12} color={Colors.starFaint} />
            <Text style={styles.recentChipText} numberOfLines={1}>{item}</Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function SearchModal() {
  const [inputValue, setInputValue]   = useState('');
  const [debouncedQ, setDebouncedQ]   = useState('');
  const [recent, setRecent]           = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);

  const { data, isFetching, isError } = useSearch(debouncedQ);

  // Load recent searches on mount
  useEffect(() => {
    SecureStore.getItemAsync(RECENT_KEY)
      .then((v: string | null) => { if (v) setRecent(JSON.parse(v) as string[]); })
      .catch(() => {});
    // Autofocus after a short delay so the keyboard animation is smooth
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  // Debounce input → query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(inputValue), 300);
    return () => clearTimeout(t);
  }, [inputValue]);

  // Save to recent when results arrive
  useEffect(() => {
    if (debouncedQ.length < 2 || !data) return;
    const hasResults =
      (data.spots?.length ?? 0) +
      (data.explorers?.length ?? 0) +
      (data.journeys?.length ?? 0) > 0;
    if (!hasResults) return;

    const next = [debouncedQ, ...recent.filter((r) => r !== debouncedQ)].slice(0, MAX_RECENT);
    setRecent(next);
    SecureStore.setItemAsync(RECENT_KEY, JSON.stringify(next)).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const handleClearRecent = useCallback(async () => {
    setRecent([]);
    await SecureStore.deleteItemAsync(RECENT_KEY).catch(() => {});
  }, []);

  const hasQuery   = debouncedQ.length >= 2;
  const hasResults = hasQuery && data && (
    (data.spots?.length ?? 0) + (data.explorers?.length ?? 0) + (data.journeys?.length ?? 0) > 0
  );
  const isEmpty    = hasQuery && !isFetching && !hasResults && !isError;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        {/* Search input */}
        <View style={styles.inputRow}>
          <View style={styles.inputWrap}>
            <Ionicons name="search" size={16} color={Colors.starFaint} style={styles.searchIcon} />
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={pl.search.placeholder}
              placeholderTextColor={Colors.starGhost}
              value={inputValue}
              onChangeText={setInputValue}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {inputValue.length > 0 && (
              <Pressable onPress={() => { setInputValue(''); setDebouncedQ(''); }} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={Colors.starGhost} />
              </Pressable>
            )}
          </View>
          <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelText}>Zamknij</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Recent searches */}
        {!hasQuery && (
          <RecentSearches
            items={recent}
            onSelect={(q) => setInputValue(q)}
            onClear={handleClearRecent}
          />
        )}

        {/* Minimum chars hint */}
        {inputValue.length > 0 && inputValue.length < 2 && (
          <Animated.View entering={FadeIn} style={styles.hintRow}>
            <Text style={styles.hintText}>{pl.search.minChars}</Text>
          </Animated.View>
        )}

        {/* Loading skeletons */}
        {isFetching && hasQuery && (
          <Animated.View entering={FadeIn}>
            {[0, 1, 2, 3].map((i) => <SkeletonRow key={i} />)}
          </Animated.View>
        )}

        {/* Empty state */}
        {isEmpty && (
          <Animated.View entering={FadeIn} style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>◎</Text>
            <Text style={styles.emptyTitle}>{pl.search.noResults}</Text>
            <Text style={styles.emptyQuery}>„{debouncedQ}"</Text>
          </Animated.View>
        )}

        {/* Results */}
        {hasResults && !isFetching && (
          <Animated.View entering={SlideInDown.duration(220).springify()}>

            {/* Spoty */}
            {(data!.spots?.length ?? 0) > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  label={pl.search.spotsSection}
                  count={data!.spots.length}
                />
                {data!.spots.map((item) => (
                  <SpotRow key={item.id} item={item} />
                ))}
              </View>
            )}

            {/* Eksploratorzy */}
            {(data!.explorers?.length ?? 0) > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  label={pl.search.explorersSection}
                  count={data!.explorers.length}
                />
                {data!.explorers.map((item) => (
                  <ExplorerRow key={item.id} item={item} />
                ))}
              </View>
            )}

            {/* Journeys */}
            {(data!.journeys?.length ?? 0) > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  label={pl.search.journeysSection}
                  count={data!.journeys.length}
                />
                {data!.journeys.map((item) => (
                  <JourneyRow key={item.id} item={item} />
                ))}
              </View>
            )}

          </Animated.View>
        )}

        {/* Error */}
        {isError && (
          <View style={styles.hintRow}>
            <Text style={[styles.hintText, { color: Colors.danger }]}>
              {pl.common.error} — {pl.common.retry}
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.graphite },

  // ── Header ───────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: Colors.graphite,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.steel,
    paddingBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, gap: Spacing.sm,
  },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.abyss,
    borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.steel,
    paddingHorizontal: Spacing.md,
    height: 42, gap: Spacing.sm,
  },
  searchIcon: { flexShrink: 0 },
  input: {
    flex: 1,
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.body,
    color: Colors.starlight,
    paddingVertical: 0,
  },
  cancelBtn: { paddingVertical: Spacing.sm, paddingLeft: Spacing.xs },
  cancelText: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: FontSize.body,
    color: Colors.aurora,
  },

  // ── Body ─────────────────────────────────────────────────────────────────────
  body: { flex: 1 },

  // ── Section ──────────────────────────────────────────────────────────────────
  section: { marginBottom: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
  },
  sectionLabel: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: FontSize.bodySm,
    color: Colors.starFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionCount: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 10, color: Colors.starGhost,
  },

  // ── Result row ────────────────────────────────────────────────────────────────
  resultRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    gap: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.steel,
  },
  resultIconBox: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  resultEmoji:  { fontSize: 18 },
  resultBody:   { flex: 1, gap: 3, minWidth: 0 },
  resultTitle:  {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: FontSize.body,
    color: Colors.starlight,
  },
  resultHandle: { color: Colors.starFaint, fontFamily: 'GeneralSans-Regular' },
  resultMeta:   { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  resultChip:   {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm, color: Colors.star,
  },
  resultLocked: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 10, color: Colors.starFaint,
  },
  resultDot:    { color: Colors.starGhost, fontSize: 10 },

  // ── Avatar ────────────────────────────────────────────────────────────────────
  avatarBox:     { flexShrink: 0 },
  avatarImg:     { width: 40, height: 40, borderRadius: 20 },
  avatarFallback:{
    backgroundColor: Colors.abyss,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.steel,
  },
  avatarInitial: {
    fontFamily: 'ClashDisplay-Semibold',
    fontSize: 16, color: Colors.aurora,
  },
  rankDot: { width: 6, height: 6, borderRadius: 3 },

  // ── Recent ────────────────────────────────────────────────────────────────────
  recentSection: { paddingTop: Spacing.xl, paddingHorizontal: Spacing.xl },
  recentHeader:  {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.md,
  },
  clearBtn: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: FontSize.bodySm, color: Colors.aurora,
  },
  recentChips: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
  },
  recentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.abyss, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.steel,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
  },
  recentChipText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm, color: Colors.star,
    maxWidth: 160,
  },

  // ── States ────────────────────────────────────────────────────────────────────
  hintRow: {
    paddingVertical: Spacing.xl, alignItems: 'center',
  },
  hintText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.body, color: Colors.starFaint,
  },
  emptyState: {
    paddingTop: 60, alignItems: 'center', gap: Spacing.sm,
  },
  emptyEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  emptyTitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.body, color: Colors.starFaint,
  },
  emptyQuery: {
    fontFamily: 'ClashDisplay-Medium',
    fontSize: FontSize.h4, color: Colors.starlight,
  },

  // ── Skeleton ──────────────────────────────────────────────────────────────────
  skeletonRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, gap: Spacing.md,
  },
  skeletonIcon: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    backgroundColor: Colors.steel,
  },
  skeletonLine: {
    height: 13, borderRadius: 6, backgroundColor: Colors.steel,
  },
});
