import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useMemo } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { SignalButton } from '@/components/ui/SignalButton';
import { BackButton } from '@/components/ui/BackButton';
import { useAllCircles, useJoinCircle } from '@/hooks/useCircles';
import { useAuthStore } from '@/stores/auth';
import type { Circle } from '@travelpoint/types';

function pluralMembers(n: number): string {
  if (n === 1) return '1 członek';
  if (n >= 2 && n <= 4) return `${n} członków`;
  return `${n} członków`;
}

function CircleCard({
  item,
  index,
  isJoining,
  onJoin,
}: {
  item: Circle & { _count?: { members: number } };
  index: number;
  isJoining: boolean;
  onJoin: (slug: string) => void;
}) {
  const memberCount = (item as { _count?: { members: number }; memberCount?: number })._count?.members
    ?? (item as { memberCount?: number }).memberCount
    ?? 0;

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(350)}>
      <Pressable onPress={() => router.push(`/circle/${item.slug ?? item.id}`)}>
        <GlassCard style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.cardLeft}>
              <View style={styles.circleIcon}>
                <Text style={styles.circleIconText}>◑</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                {item.slug && (
                  <Text style={styles.slug}>@{item.slug}</Text>
                )}
              </View>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.memberCount}>{pluralMembers(memberCount)}</Text>
              {item.isInviteOnly && (
                <View style={styles.inviteBadge}>
                  <Text style={styles.inviteBadgeText}>🔒 ZAPROSZENIE</Text>
                </View>
              )}
            </View>
          </View>

          {item.description && (
            <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
          )}

          {!item.isInviteOnly && (
            <SignalButton
              label="Dołącz do circle"
              onPress={() => onJoin(item.slug ?? item.id)}
              variant="signal"
              size="sm"
              fullWidth
              loading={isJoining}
              haptic="medium"
            />
          )}
          {item.isInviteOnly && (
            <Pressable
              style={styles.detailBtn}
              onPress={() => router.push(`/circle/${item.slug ?? item.id}`)}
            >
              <Text style={styles.detailBtnText}>Szczegóły →</Text>
            </Pressable>
          )}
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

export default function BrowseCirclesScreen() {
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAllCircles();

  const circles = data?.pages.flatMap((p) => p.circles) ?? [];
  const { mutateAsync: joinCircle, isPending: isJoining } = useJoinCircle();
  const { explorer } = useAuthStore();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!circles) return [];
    const q = query.trim().toLowerCase();
    if (!q) return circles;
    return circles.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q),
    );
  }, [circles, query]);

  async function handleJoin(slug: string) {
    try {
      await joinCircle({ slug });
    } catch {
      // navigation handled by circle detail error state
    }
  }

  const canCreate = explorer?.tier === 'EXPEDITION';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <BackButton />
          {canCreate && (
            <Pressable
              onPress={() => router.push('/modals/new-circle')}
              style={styles.createBtn}
              hitSlop={8}
            >
              <Text style={styles.createBtnText}>+ Stwórz</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.eyebrow}>Odkryj</Text>
        <Text style={styles.heading}>Circles</Text>
        <Text style={styles.sub}>
          Prywatne kręgi odkrywców — wspólne mapy, rozmowy i tajne dropy.
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>◎</Text>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Szukaj circles..."
            placeholderTextColor={Colors.starGhost}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Text style={styles.searchClear}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.aurora} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>◑</Text>
          {query.trim() ? (
            <>
              <Text style={styles.emptyTitle}>Brak wyników</Text>
              <Text style={styles.emptySub}>Spróbuj innych słów kluczowych.</Text>
            </>
          ) : (
            <>
              <Text style={styles.emptyTitle}>Brak publicznych circles</Text>
              <Text style={styles.emptySub}>
                Pojawią się tu otwarte circles.
                {canCreate ? ' Możesz założyć własny.' : ''}
              </Text>
              {canCreate && (
                <SignalButton
                  label="+ Stwórz circle"
                  onPress={() => router.push('/modals/new-circle')}
                  variant="aurora"
                  size="md"
                  haptic="medium"
                />
              )}
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          showsVerticalScrollIndicator={false}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) void fetchNextPage(); }}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isLoading}
              onRefresh={() => void refetch()}
              tintColor={Colors.aurora}
            />
          }
          ListFooterComponent={
            isFetchingNextPage
              ? <ActivityIndicator color={Colors.aurora} style={{ paddingVertical: 16 }} />
              : null
          }
          ListHeaderComponent={
            circles && circles.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={styles.listCount}>
                  {filtered.length} {filtered.length === 1 ? 'circle' : 'circles'}
                  {query.trim() ? ` dla "${query}"` : ''}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => (
            <CircleCard
              item={item}
              index={index}
              isJoining={isJoining}
              onJoin={handleJoin}
            />
          )}
        />
      )}

      {/* Non-EXPEDITION tier notice */}
      {!canCreate && !isLoading && (
        <View style={styles.tierNotice}>
          <Text style={styles.tierNoticeText}>
            Tier EXPEDITION wymagany do tworzenia circles
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.abyss },

  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  createBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.aurora + '60',
  },
  createBtnText: {
    fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption, color: Colors.aurora,
  },
  eyebrow: {
    fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro,
    color: Colors.starFaint, letterSpacing: 3, textTransform: 'uppercase',
  },
  heading: {
    fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h2, color: Colors.starlight,
  },
  sub: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, lineHeight: 20,
  },

  searchWrapper: {
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.steel,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.graphite, borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: Colors.steel,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  searchIcon: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.body, color: Colors.starGhost },
  searchInput: {
    flex: 1, fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body,
    color: Colors.starlight, paddingVertical: 4,
  },
  searchClear: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.starGhost },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg },
  emptyIcon: { fontSize: 40, color: Colors.starGhost },
  emptyTitle: {
    fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight, textAlign: 'center',
  },
  emptySub: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm,
    color: Colors.star, textAlign: 'center', lineHeight: 22,
  },

  listHeader: { marginBottom: Spacing.md },
  listCount: {
    fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost, textTransform: 'uppercase',
  },
  list: { padding: Spacing.xl, paddingBottom: Spacing.huge + Spacing.lg },

  card: { gap: Spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  circleIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.violet + '20',
    borderWidth: 1, borderColor: Colors.violet + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  circleIconText: { fontFamily: 'SpaceMono-Regular', fontSize: 16, color: Colors.violet },
  cardInfo: { flex: 1, gap: 2 },
  name: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight },
  slug: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint },
  cardRight: { alignItems: 'flex-end', gap: Spacing.xs },
  memberCount: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost },
  inviteBadge: {
    borderWidth: 1, borderColor: Colors.ember + '60',
    borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 2,
  },
  inviteBadgeText: {
    fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.ember, textTransform: 'uppercase',
  },
  desc: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, lineHeight: 20 },
  detailBtn: { alignSelf: 'flex-end', paddingVertical: Spacing.xs },
  detailBtnText: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.signal,
  },

  tierNotice: {
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.steel,
  },
  tierNoticeText: {
    fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro,
    color: Colors.starGhost, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1,
  },
});
