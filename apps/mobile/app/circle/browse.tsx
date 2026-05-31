import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { SignalButton } from '@/components/ui/SignalButton';
import { useJoinCircle } from '@/hooks/useCircles';
import { api } from '@/lib/api';
import type { Circle } from '@travelpoint/types';

export default function BrowseCirclesScreen() {
  const { data: circles, isLoading } = useQuery({
    queryKey: ['circles', 'public'],
    queryFn: () => api.get<(Circle & { _count?: { members: number } })[]>('/api/circles'),
    staleTime: 1000 * 60 * 3,
  });

  const { mutateAsync: joinCircle, isPending: isJoining } = useJoinCircle();

  async function handleJoin(slug: string) {
    try {
      await joinCircle({ slug });
      router.back();
    } catch {
      // error handled by mutation / shown by toast in future
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Wróć</Text>
        </Pressable>
        <Text style={styles.eyebrow}>Odkryj</Text>
        <Text style={styles.heading}>Circles</Text>
        <Text style={styles.sub}>
          Prywatne kręgi eksploratorów z mapami, chatami i secret dropami.
        </Text>
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.aurora} size="large" />
        </View>
      )}

      {!isLoading && (!circles || circles.length === 0) && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>◑</Text>
          <Text style={styles.emptyTitle}>Brak publicznych circles</Text>
          <Text style={styles.emptySub}>
            Pojawią się tu otwarte circles. Możesz też założyć własny.
          </Text>
        </View>
      )}

      <FlatList
        data={circles ?? []}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const memberCount = item._count?.members ?? item.memberCount ?? 0;
          return (
            <Pressable onPress={() => router.push(`/circle/${item.slug ?? item.id}`)}>
              <GlassCard style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.name}>{item.name}</Text>
                    {item.slug && (
                      <Text style={styles.slug}>@{item.slug}</Text>
                    )}
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.memberCount}>
                      {memberCount} {memberCount === 1 ? 'member' : 'members'}
                    </Text>
                    {item.isInviteOnly && (
                      <View style={styles.inviteBadge}>
                        <Text style={styles.inviteBadgeText}>INVITE</Text>
                      </View>
                    )}
                  </View>
                </View>

                {item.description && (
                  <Text style={styles.desc} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}

                {!item.isInviteOnly && (
                  <SignalButton
                    label="Dołącz do circle"
                    onPress={() => handleJoin(item.slug ?? item.id)}
                    variant="signal"
                    size="sm"
                    fullWidth
                    loading={isJoining}
                    haptic="medium"
                  />
                )}
              </GlassCard>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.abyss },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  backBtn: { alignSelf: 'flex-start', marginBottom: Spacing.sm },
  backText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.starFaint,
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
    lineHeight: 20,
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
  list: { padding: Spacing.xl, paddingBottom: Spacing.huge },
  card: { gap: Spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1, gap: 2 },
  name: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h4,
    color: Colors.starlight,
  },
  slug: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.starFaint,
  },
  metaCol: { alignItems: 'flex-end', gap: Spacing.xs },
  memberCount: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.starGhost,
  },
  inviteBadge: {
    borderWidth: 1,
    borderColor: Colors.ember + '60',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  inviteBadgeText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.ember,
    textTransform: 'uppercase',
  },
  desc: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.star,
    lineHeight: 20,
  },
});
