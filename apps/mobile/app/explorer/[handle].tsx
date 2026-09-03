import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { CoordLabel } from '@/components/ui/CoordLabel';
import { SignalButton } from '@/components/ui/SignalButton';
import { useAuthStore } from '@/stores/auth';
import {
  useExplorerProfile,
  useExplorerSpots,
  useBlockExplorer,
  useUnblockExplorer,
  type ExplorerPublicSpot,
} from '@/hooks/useExplorers';

const RANK_COLORS: Record<string, string> = {
  NEWCOMER: Colors.starGhost,
  EXPLORER: Colors.star,
  TRUSTED:  Colors.signal,
  INSIDER:  Colors.aurora,
  LEGEND:   Colors.ember,
};

const RANK_ICONS: Record<string, string> = {
  NEWCOMER: '◌',
  EXPLORER: '◎',
  TRUSTED:  '◈',
  INSIDER:  '◉',
  LEGEND:   '★',
};

const ARCHETYPE_LABELS: Record<string, string> = {
  WANDERER: 'Wędrownik',
  URBEXER:  'Urbexer',
  NOMAD:    'Nomad',
  HUNTER:   'Łowca',
  PILGRIM:  'Pielgrzym',
};

const CATEGORY_ICONS: Record<string, string> = {
  ABANDONED: '◈', CAFE: '◎', BEACH: '◎',
  ROUTE: '◉', UNDERGROUND: '◈', VIEWPOINT: '◎', CAMP: '◉',
};

function SpotCard({ spot }: { spot: ExplorerPublicSpot }) {
  return (
    <Pressable
      style={styles.spotCard}
      onPress={() => router.push(`/spot/${spot.id}`)}
    >
      <Text style={styles.spotIcon}>
        {CATEGORY_ICONS[spot.category] ?? '◎'}
      </Text>
      <View style={styles.spotBody}>
        <Text style={styles.spotTitle} numberOfLines={1}>{spot.title}</Text>
        <CoordLabel lat={spot.lat} lng={spot.lng} locked={false} />
      </View>
      <Text style={styles.spotArrow}>›</Text>
    </Pressable>
  );
}

export default function ExplorerProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const me = useAuthStore((s) => s.explorer);
  const [blocked, setBlocked] = useState(false);

  const { data: profile, isLoading, isError } = useExplorerProfile(handle ?? '');
  const { data: spots, isLoading: spotsLoading } = useExplorerSpots(
    handle ?? '',
    !isLoading && !isError,
  );

  const blockMutation   = useBlockExplorer();
  const unblockMutation = useUnblockExplorer();

  const isOwnProfile = me?.id === profile?.id;

  async function toggleBlock() {
    if (!profile) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (blocked) {
      Alert.alert(
        'Odblokuj explorera',
        `Odblokować @${profile.handle}?`,
        [
          { text: 'Anuluj', style: 'cancel' },
          {
            text: 'Odblokuj',
            onPress: () => {
              unblockMutation.mutate(profile.id, {
                onSuccess: () => setBlocked(false),
              });
            },
          },
        ],
      );
    } else {
      Alert.alert(
        'Zablokuj explorera',
        `Zablokować @${profile.handle}? Nie będzie widoczny na mapie ani w feedzie.`,
        [
          { text: 'Anuluj', style: 'cancel' },
          {
            text: 'Zablokuj', style: 'destructive',
            onPress: () => {
              blockMutation.mutate(profile.id, {
                onSuccess: () => setBlocked(true),
              });
            },
          },
        ],
      );
    }
  }

  const rankColor = profile ? (RANK_COLORS[profile.rank] ?? Colors.star) : Colors.star;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.loadingHeader}>
          <Pressable style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>← Wróć</Text>
          </Pressable>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.aurora} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !profile) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.loadingHeader}>
          <Pressable style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>← Wróć</Text>
          </Pressable>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorIcon}>◌</Text>
          <Text style={styles.errorTitle}>Explorer nie istnieje</Text>
          <Text style={styles.errorSub}>Profil @{handle} nie został znaleziony.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* ── Header ────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← Wróć</Text>
        </Pressable>
        {!isOwnProfile && (
          <Pressable style={styles.blockBtn} onPress={toggleBlock}>
            <Text style={styles.blockBtnText}>
              {blocked ? 'Odblokuj' : '···'}
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Identity block ──────────────────────────────────────── */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.identity}>
          {/* Avatar */}
          <View style={[styles.avatarWrap, { borderColor: rankColor }]}>
            {profile.avatarUrl ? (
              <Image
                source={{ uri: profile.avatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: `${rankColor}22` }]}>
                <Text style={[styles.avatarLetter, { color: rankColor }]}>
                  {(profile.displayName ?? profile.handle)[0]?.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Name + handle */}
          <View style={styles.nameBlock}>
            {profile.displayName && (
              <Text style={styles.displayName}>{profile.displayName}</Text>
            )}
            <Text style={styles.handle}>@{profile.handle}</Text>
          </View>

          {/* Rank + Archetype chips */}
          <View style={styles.chips}>
            <View style={[styles.chip, { borderColor: rankColor, backgroundColor: `${rankColor}18` }]}>
              <Text style={[styles.chipIcon, { color: rankColor }]}>
                {RANK_ICONS[profile.rank] ?? '◎'}
              </Text>
              <Text style={[styles.chipText, { color: rankColor }]}>
                {profile.rank}
              </Text>
            </View>
            {profile.archetype && (
              <View style={styles.chipNeutral}>
                <Text style={styles.chipNeutralText}>
                  {ARCHETYPE_LABELS[profile.archetype] ?? profile.archetype}
                </Text>
              </View>
            )}
          </View>

          {/* Bio */}
          {profile.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : null}

          {/* Obsessions */}
          {profile.obsessions?.length > 0 && (
            <View style={styles.obsessionsWrap}>
              {profile.obsessions.map((o) => (
                <View key={o} style={styles.obsessionTag}>
                  <Text style={styles.obsessionText}>{o}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* ── Public spots ────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(120).duration(400)}>
          <Text style={styles.sectionEyebrow}>Publiczne Spoty</Text>

          {spotsLoading && (
            <ActivityIndicator
              color={Colors.aurora}
              size="small"
              style={{ marginTop: Spacing.lg }}
            />
          )}

          {!spotsLoading && (!spots || spots.length === 0) && (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>◌</Text>
              <Text style={styles.emptySub}>
                Ten explorer nie ma jeszcze publicznych spotów.
              </Text>
            </GlassCard>
          )}

          {!spotsLoading && spots && spots.length > 0 && (
            <View style={styles.spotsList}>
              {spots.map((spot, i) => (
                <Animated.View
                  key={spot.id}
                  entering={FadeInDown.delay(i * 40).duration(300)}
                >
                  <SpotCard spot={spot} />
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* ── Block CTA ───────────────────────────────────────────── */}
        {!isOwnProfile && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <View style={styles.divider} />
            <SignalButton
              label={blocked ? 'Odblokuj explorera' : 'Zablokuj explorera'}
              onPress={toggleBlock}
              variant={blocked ? 'ghost' : 'ember'}
              size="sm"
              haptic="light"
              style={styles.blockCta}
            />
          </Animated.View>
        )}

        <View style={{ height: Spacing.xl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.abyss },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.steel,
  },
  loadingHeader: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  back: { alignSelf: 'flex-start' },
  backText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.starFaint,
  },
  blockBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  blockBtnText: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: FontSize.bodySm,
    color: Colors.starFaint,
    letterSpacing: 2,
  },

  scroll: { padding: Spacing.xl },

  identity: { alignItems: 'center', gap: Spacing.md },

  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: 36,
  },

  nameBlock: { alignItems: 'center', gap: 2 },
  displayName: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h3,
    color: Colors.starlight,
  },
  handle: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.starFaint,
  },

  chips: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  chipIcon:  { fontSize: 12 },
  chipText:  { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, letterSpacing: 1 },
  chipNeutral: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.steel,
    backgroundColor: Colors.graphite,
  },
  chipNeutralText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.star,
  },

  bio: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.star,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },

  obsessionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  obsessionTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    backgroundColor: Colors.graphite,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.steel,
  },
  obsessionText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.micro,
    color: Colors.starFaint,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.steel,
    marginVertical: Spacing.xl,
  },

  sectionEyebrow: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.starGhost,
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: Spacing.lg,
  },

  spotsList: { gap: Spacing.sm },
  spotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.graphite,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.steel,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  spotIcon: { fontSize: 16, color: Colors.aurora },
  spotBody: { flex: 1, gap: 2 },
  spotTitle: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.bodyMd,
    color: Colors.starlight,
  },
  spotArrow: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 18,
    color: Colors.starGhost,
  },

  emptyCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  emptyIcon: { fontSize: 24, color: Colors.starGhost },
  emptySub: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.starFaint,
    textAlign: 'center',
  },

  blockCta: { alignSelf: 'center' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  errorIcon:  { fontSize: 36, color: Colors.starGhost },
  errorTitle: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight },
  errorSub:   { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star },
});
