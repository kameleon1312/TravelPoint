import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useMemo } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { SignalButton } from '@/components/ui/SignalButton';
import { useForumPosts, type ForumPost, type ForumCategory } from '@/hooks/useForum';
import { pl } from '@/i18n/pl';

const CATEGORIES: { key: ForumCategory | 'ALL'; label: string }[] = [
  { key: 'ALL',         label: 'Wszystko' },
  { key: 'FIELD_NOTES', label: 'Field Notes' },
  { key: 'GEAR',        label: 'Gear' },
  { key: 'SAFETY',      label: 'Safety' },
  { key: 'REQUESTS',    label: 'Requests' },
  { key: 'STORIES',     label: 'Stories' },
];

const CATEGORY_COLORS: Record<ForumCategory, string> = {
  FIELD_NOTES: Colors.aurora,
  GEAR:        Colors.signal,
  SAFETY:      Colors.ember,
  REQUESTS:    Colors.sand,
  STORIES:     Colors.violet,
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}

function PostCard({ item, index }: { item: ForumPost; index: number }) {
  const accent = CATEGORY_COLORS[item.category] ?? Colors.signal;
  return (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <Pressable onPress={() => router.push(`/forum/${item.slug}`)}>
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.categoryDot, { backgroundColor: accent }]} />
            <Text style={[styles.categoryLabel, { color: accent }]}>
              {item.category.replace('_', ' ')}
            </Text>
            {item.isPinned && <Text style={styles.pinnedBadge}>📌</Text>}
            {item.lockedAt && <Text style={styles.lockedBadge}>🔒</Text>}
          </View>

          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

          <Text style={styles.body} numberOfLines={2}>{item.body}</Text>

          <View style={styles.cardFooter}>
            <Text style={styles.meta}>
              {item.author.handle} · {formatDate(item.createdAt)}
            </Text>
            <Text style={styles.replyCount}>
              {item._count.replies} {item._count.replies === 1 ? 'odpowiedź' : 'odpowiedzi'}
            </Text>
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

export default function ForumScreen() {
  const [activeCategory, setActiveCategory] = useState<ForumCategory | 'ALL'>('ALL');
  const category = activeCategory === 'ALL' ? undefined : activeCategory;

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, refetch } =
    useForumPosts(category);

  const posts = useMemo(
    () => data?.pages.flatMap((p) => p.posts) ?? [],
    [data],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.heading}>{pl.forum?.title ?? 'Forum'}</Text>
        <SignalButton
          label="+ Post"
          onPress={() => router.push('/forum/new')}
          variant="aurora"
          size="sm"
          haptic="light"
        />
      </View>

      <FlatList
        data={CATEGORIES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(c) => c.key}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => {
          const active = item.key === activeCategory;
          return (
            <Pressable
              onPress={() => setActiveCategory(item.key)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
        style={styles.filterBar}
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.aurora} size="large" />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Brak wątków</Text>
          <Text style={styles.emptyBody}>Bądź pierwszy — napisz post.</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={({ item, index }) => <PostCard item={item} index={index} />}
          contentContainerStyle={styles.list}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) void fetchNextPage(); }}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => void refetch()}
              tintColor={Colors.aurora}
            />
          }
          ListFooterComponent={
            isFetchingNextPage
              ? <ActivityIndicator color={Colors.aurora} style={{ paddingVertical: 16 }} />
              : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.abyss },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  backBtn:  { padding: 4 },
  backText: { fontSize: 22, color: Colors.starlight },
  heading: {
    flex: 1,
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h3,
    color: Colors.starlight,
    letterSpacing: -0.4,
  },
  filterBar: { flexGrow: 0, marginBottom: Spacing.sm },
  filterRow: { paddingHorizontal: Spacing.lg, gap: Spacing.xs },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.steel,
    backgroundColor: Colors.graphite,
  },
  filterChipActive: { borderColor: Colors.aurora, backgroundColor: Colors.aurora + '20' },
  filterLabel:      { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.starFaint },
  filterLabelActive: { color: Colors.aurora, fontFamily: 'GeneralSans-Semibold' },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.sm },
  card: { gap: Spacing.xs },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryDot: { width: 6, height: 6, borderRadius: 3 },
  categoryLabel: { fontFamily: 'SpaceMono-Regular', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
  pinnedBadge:   { fontSize: 11, marginLeft: 4 },
  lockedBadge:   { fontSize: 11 },
  title: {
    fontFamily: 'ClashDisplay-Semibold',
    fontSize: FontSize.body,
    color: Colors.starlight,
    lineHeight: 20,
  },
  body: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.star,
    lineHeight: 18,
  },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  meta:        { fontFamily: 'SpaceMono-Regular', fontSize: 10, color: Colors.starFaint },
  replyCount:  { fontFamily: 'SpaceMono-Regular', fontSize: 10, color: Colors.starGhost },

  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  emptyTitle: { fontFamily: 'ClashDisplay-Semibold', fontSize: FontSize.h3, color: Colors.starlight },
  emptyBody:  { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starFaint },
});
