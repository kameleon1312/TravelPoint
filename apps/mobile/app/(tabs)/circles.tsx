import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { SignalButton } from '@/components/ui/SignalButton';
import { useMyCircles } from '@/hooks/useCircles';
import { useAuthStore } from '@/stores/auth';
import { pl } from '@/i18n/pl';

const SCREEN_W = Dimensions.get('window').width;
const H_PAD    = 16;
const CARD_GAP = 10;
const CARD_W   = Math.floor((SCREEN_W - H_PAD * 2 - CARD_GAP) / 2);
const CARD_H   = Math.round(CARD_W * 1.25);

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

const ROLE_LABELS = pl.roles as Record<string, string>;

export default function CirclesScreen() {
  const insets = useSafeAreaInsets();
  const { data: circles, isLoading, refetch, isRefetching } = useMyCircles();
  const { explorer } = useAuthStore();
  const canCreate = explorer?.tier === 'EXPEDITION';
  const fabBottom = insets.bottom + Spacing.lg;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.eyebrow}>Twoja sieć</Text>
          <Text style={styles.heading}>Circles</Text>
        </View>
        {canCreate && (
          <Pressable
            style={styles.createBtn}
            onPress={() => router.push('/modals/new-circle')}
          >
            <Text style={styles.createBtnText}>+ Stwórz</Text>
          </Pressable>
        )}
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
          numColumns={2}
          columnWrapperStyle={styles.row}
          renderItem={({ item, index }) => {
            const roleColor   = ROLE_COLORS[item.role] ?? Colors.signal;
            const memberCount = (item as unknown as { _count?: { members: number } })._count?.members;
            const initial     = item.name[0]?.toUpperCase() ?? '◎';
            return (
              <Animated.View entering={FadeInDown.delay(index * 40).duration(320)} style={{ width: CARD_W }}>
                <Pressable onPress={() => router.push(`/circle/${item.slug ?? item.id}`)}>
                  <LinearGradient
                    colors={[Colors.graphite, Colors.void, roleColor + '33']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.card}
                  >
                    {/* Role badge top-left */}
                    <View style={styles.cardTop}>
                      <View style={[styles.roleBadge, { borderColor: roleColor + '55', backgroundColor: roleColor + '18' }]}>
                        <Text style={[styles.roleIcon, { color: roleColor }]}>
                          {ROLE_ICONS[item.role] ?? '◎'}
                        </Text>
                        <Text style={[styles.roleText, { color: roleColor }]}>
                          {ROLE_LABELS[item.role] ?? item.role}
                        </Text>
                      </View>
                      {item.isInviteOnly && (
                        <View style={styles.lockPill}>
                          <Text style={styles.lockPillText}>◑</Text>
                        </View>
                      )}
                    </View>

                    {/* Center: large initial */}
                    <Text style={[styles.cardInitial, { color: roleColor + '35' }]}>{initial}</Text>

                    {/* Bottom: name + meta */}
                    <View style={styles.cardBottom}>
                      <Text style={styles.circleName} numberOfLines={2}>{item.name}</Text>
                      {item.slug ? (
                        <Text style={styles.circleSlug}>@{item.slug}</Text>
                      ) : null}
                      {memberCount !== undefined ? (
                        <Text style={styles.memberCount}>{memberCount} explorers</Text>
                      ) : null}
                    </View>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            );
          }}
          contentContainerStyle={[styles.list, { paddingBottom: fabBottom + 72 }]}
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
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerLeft: { gap: 2 },
  eyebrow: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.aurora,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  heading: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h1, color: Colors.starlight },

  createBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.aurora + '60',
    backgroundColor: Colors.aurora + '14',
    marginBottom: 4,
  },
  createBtnText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: FontSize.caption,
    color: Colors.aurora,
  },

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

  list: { paddingHorizontal: H_PAD, paddingTop: Spacing.xs },
  row:  { gap: CARD_GAP, marginBottom: CARD_GAP },

  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    overflow: 'hidden',
    padding: Spacing.md,
    justifyContent: 'space-between',
  },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },

  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleIcon: { fontFamily: 'SpaceMono-Regular', fontSize: 10 },
  roleText: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, textTransform: 'uppercase', letterSpacing: 0.5 },

  lockPill: {
    borderWidth: 1,
    borderColor: Colors.starGhost + '40',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  lockPillText: { fontFamily: 'SpaceMono-Regular', fontSize: 10, color: Colors.starGhost },

  cardInitial: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: 72,
    textAlign: 'center',
    lineHeight: 80,
  },

  cardBottom: { gap: 3 },
  circleName: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.body, color: Colors.starlight, lineHeight: 20 },
  circleSlug: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint },
  memberCount: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost, marginTop: 2 },

  fabRow: {
    position: 'absolute', right: Spacing.xl,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
});
