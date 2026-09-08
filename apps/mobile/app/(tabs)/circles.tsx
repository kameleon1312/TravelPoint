import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { SignalButton } from '@/components/ui/SignalButton';
import { useMyCircles } from '@/hooks/useCircles';
import { useAuthStore } from '@/stores/auth';

const ROLE_COLORS: Record<string, string> = {
  FOUNDER: Colors.ember,
  GUIDE:   Colors.aurora,
  MEMBER:  Colors.signal,
};

const ROLE_ICONS: Record<string, string> = {
  FOUNDER: '◉',
  GUIDE:   '◈',
  MEMBER:  '◎',
};

const ROLE_LABELS: Record<string, string> = {
  FOUNDER: 'Założyciel',
  GUIDE:   'Przewodnik',
  MEMBER:  'Członek',
};

export default function CirclesScreen() {
  const insets = useSafeAreaInsets();
  const { data: circles, isLoading, refetch, isRefetching } = useMyCircles();
  const { explorer } = useAuthStore();
  const canCreate = explorer?.tier === 'EXPEDITION';
  const fabBottom = insets.bottom + Spacing.lg;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Twoje kręgi</Text>
        <Text style={styles.heading}>Circles</Text>
      </View>

      {isLoading && !circles ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.aurora} size="large" />
        </View>
      ) : !circles || circles.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>◑</Text>
          <Text style={styles.emptyTitle}>Jeszcze bez kręgów</Text>
          <Text style={styles.emptySub}>
            Circles to zamknięte kręgi odkrywców ze wspólnymi mapami, rozmowami i tajnymi dropami.
          </Text>
          <View style={styles.emptyActions}>
            <SignalButton
              label="Przeglądaj circles"
              onPress={() => router.push('/circle/browse')}
              variant="signal"
              size="md"
              haptic="light"
            />
            {canCreate && (
              <SignalButton
                label="+ Stwórz circle"
                onPress={() => router.push('/modals/new-circle')}
                variant="aurora"
                size="md"
                haptic="medium"
              />
            )}
          </View>
        </View>
      ) : (
        <FlatList
          data={circles}
          keyExtractor={(c) => c.id}
          renderItem={({ item, index }) => {
            const roleColor = ROLE_COLORS[item.role] ?? Colors.signal;
            return (
              <Animated.View entering={FadeInDown.delay(index * 50).duration(350)}>
                <Pressable onPress={() => router.push(`/circle/${item.slug ?? item.id}`)}>
                  <GlassCard style={styles.card}>
                    <View style={styles.cardTop}>
                      <View style={styles.cardLeft}>
                        <View style={[styles.circleAvatar, { borderColor: roleColor + '60' }]}>
                          <Text style={[styles.circleAvatarText, { color: roleColor }]}>
                            {ROLE_ICONS[item.role] ?? '◎'}
                          </Text>
                        </View>
                        <View style={styles.cardInfo}>
                          <Text style={styles.circleName} numberOfLines={1}>{item.name}</Text>
                          {item.slug && (
                            <Text style={styles.circleSlug}>@{item.slug}</Text>
                          )}
                        </View>
                      </View>
                      <View style={[styles.roleBadge, { borderColor: roleColor + '50' }]}>
                        <Text style={[styles.roleText, { color: roleColor }]}>
                          {ROLE_LABELS[item.role] ?? item.role}
                        </Text>
                      </View>
                    </View>

                    {item.description ? (
                      <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
                    ) : null}

                    <View style={styles.cardMeta}>
                      {item.isInviteOnly && (
                        <View style={styles.metaTag}>
                          <Text style={styles.metaTagText}>◑ Invite only</Text>
                        </View>
                      )}
                      {(item as unknown as { _count?: { members: number } })._count?.members !== undefined && (
                        <Text style={styles.memberCount}>
                          {(item as unknown as { _count: { members: number } })._count.members} członków
                        </Text>
                      )}
                    </View>
                  </GlassCard>
                </Pressable>
              </Animated.View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          contentContainerStyle={[styles.list, { paddingBottom: fabBottom + Spacing.xl + 48 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={Colors.aurora}
            />
          }
        />
      )}

      {/* FAB row */}
      <View style={[styles.fabRow, { bottom: fabBottom }]}>
        {canCreate && (
          <Pressable
            style={styles.fabSecondary}
            onPress={() => router.push('/modals/new-circle')}
            hitSlop={8}
          >
            <Text style={styles.fabSecondaryText}>+ Stwórz</Text>
          </Pressable>
        )}
        <SignalButton
          label="◎ Dołącz"
          onPress={() => router.push('/circle/browse')}
          variant="signal"
          size="sm"
          haptic="light"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.abyss },
  header: {
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.xs,
  },
  eyebrow: {
    fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro,
    color: Colors.starFaint, letterSpacing: 3, textTransform: 'uppercase',
  },
  heading: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h2, color: Colors.starlight },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.xl, gap: Spacing.lg,
  },
  emptyIcon: { fontSize: 52, color: Colors.starGhost },
  emptyTitle: {
    fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight, textAlign: 'center',
  },
  emptySub: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm,
    color: Colors.star, textAlign: 'center', lineHeight: 22, maxWidth: 280,
  },
  emptyActions: { gap: Spacing.sm, alignItems: 'stretch', width: '100%', maxWidth: 280 },

  list: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm },

  card: { gap: Spacing.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  circleAvatar: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1.5, backgroundColor: Colors.graphiteSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  circleAvatarText: { fontFamily: 'SpaceMono-Regular', fontSize: 16 },
  cardInfo: { flex: 1, gap: 2 },
  circleName: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight },
  circleSlug: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint },
  roleBadge: { borderWidth: 1, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: 3 },
  roleText: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, textTransform: 'uppercase' },
  desc: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, lineHeight: 20 },
  cardMeta: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  metaTag: {
    borderWidth: 1, borderColor: Colors.steel, borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
  },
  metaTagText: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost },
  memberCount: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost },

  fabRow: {
    position: 'absolute', right: Spacing.xl,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
  fabSecondary: {
    height: 36, borderRadius: BorderRadius.pill,
    borderWidth: 1, borderColor: Colors.aurora + '60',
    paddingHorizontal: Spacing.lg,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.abyss,
  },
  fabSecondaryText: {
    fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption, color: Colors.aurora,
  },
});
