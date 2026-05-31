import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { SignalButton } from '@/components/ui/SignalButton';
import { useCircle, useJoinCircle } from '@/hooks/useCircles';
import { useAuthStore } from '@/stores/auth';
import type { Circle } from '@travelpoint/types';

const ROLE_COLORS: Record<string, string> = {
  FOUNDER: Colors.ember,
  GUIDE: Colors.aurora,
  MEMBER: Colors.signal,
};

const ROLE_ICONS: Record<string, string> = {
  FOUNDER: '◉',
  GUIDE: '◈',
  MEMBER: '◎',
};

function PulsingDot({ color }: { color: string }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.4, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1,
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

export default function CircleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { explorer } = useAuthStore();
  const { data: circle, isLoading, error } = useCircle(id ?? '');
  const { mutateAsync: joinCircle, isPending: isJoining } = useJoinCircle();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.aurora} size="large" />
      </View>
    );
  }

  if (error || !circle) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Circle nie znalezione.</Text>
        <SignalButton label="Wróć" onPress={() => router.back()} variant="ghost" size="sm" />
      </View>
    );
  }

  const members = (circle as Circle & { members?: Array<{ explorer: { id: string; handle: string; rank: string; displayName?: string }; role: string }> }).members ?? [];
  const myMembership = members.find((m) => m.explorer.id === explorer?.id);
  const isMember = !!myMembership;
  const memberCount = (circle as Circle & { _count?: { members: number } })._count?.members ?? members.length;

  async function handleJoin() {
    try {
      await joinCircle({ slug: circle!.slug ?? id! });
    } catch {
      // error handled by mutation
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Back */}
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← Circles</Text>
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <PulsingDot color={Colors.violet} />
            <Text style={styles.name}>{circle.name}</Text>
          </View>
          {circle.slug && <Text style={styles.slug}>@{circle.slug}</Text>}

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>◑ {memberCount} członków</Text>
            </View>
            {(circle as Circle & { isInviteOnly?: boolean }).isInviteOnly && (
              <View style={[styles.metaChip, styles.inviteChip]}>
                <Text style={[styles.metaChipText, { color: Colors.ember }]}>🔒 Invite only</Text>
              </View>
            )}
            {isMember && myMembership && (
              <View style={[styles.metaChip, { borderColor: ROLE_COLORS[myMembership.role] ?? Colors.signal }]}>
                <Text style={[styles.metaChipText, { color: ROLE_COLORS[myMembership.role] ?? Colors.signal }]}>
                  {ROLE_ICONS[myMembership.role] ?? '◎'} {myMembership.role}
                </Text>
              </View>
            )}
          </View>

          {circle.description && (
            <Text style={styles.description}>{circle.description}</Text>
          )}
        </View>

        {/* Join / Leave button */}
        {!isMember && (
          <SignalButton
            label={
              (circle as Circle & { isInviteOnly?: boolean }).isInviteOnly
                ? 'Wymaga zaproszenia'
                : 'Dołącz do circle'
            }
            onPress={handleJoin}
            variant="signal"
            size="lg"
            fullWidth
            loading={isJoining}
            disabled={(circle as Circle & { isInviteOnly?: boolean }).isInviteOnly}
            haptic="medium"
          />
        )}

        {/* Members */}
        {members.length > 0 && (
          <GlassCard style={styles.membersCard}>
            <Text style={styles.sectionLabel}>Członkowie</Text>
            {members.map((m, i) => (
              <View key={m.explorer.id}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.memberRow}>
                  <View style={[styles.memberAvatar, { borderColor: ROLE_COLORS[m.role] ?? Colors.steel }]}>
                    <Text style={[styles.memberAvatarLetter, { color: ROLE_COLORS[m.role] ?? Colors.starFaint }]}>
                      {m.explorer.handle[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberHandle}>@{m.explorer.handle}</Text>
                    {m.explorer.displayName && (
                      <Text style={styles.memberDisplayName}>{m.explorer.displayName}</Text>
                    )}
                  </View>
                  <View style={[styles.roleBadge, { borderColor: ROLE_COLORS[m.role] ?? Colors.steel }]}>
                    <Text style={[styles.roleText, { color: ROLE_COLORS[m.role] ?? Colors.starFaint }]}>
                      {ROLE_ICONS[m.role] ?? '○'} {m.role}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </GlassCard>
        )}

        {/* Transmissions (circle chat entry point) */}
        {isMember && (
          <SignalButton
            label="Transmissions circle"
            onPress={() => router.push('/modals/transmissions')}
            variant="ghost"
            size="md"
            fullWidth
            haptic="light"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.abyss },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, backgroundColor: Colors.abyss },
  scroll: { padding: Spacing.xl, gap: Spacing.xl },
  back: { alignSelf: 'flex-start' },
  backText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starFaint },
  header: { gap: Spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h2, color: Colors.starlight, letterSpacing: -0.5, flex: 1 },
  slug: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.caption, color: Colors.starFaint },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  metaChip: {
    borderWidth: 1,
    borderColor: Colors.steel,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  inviteChip: { borderColor: Colors.ember + '50' },
  metaChipText: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint },
  description: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, lineHeight: 22 },
  membersCard: { gap: Spacing.sm },
  sectionLabel: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: FontSize.caption,
    color: Colors.starFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  divider: { height: 1, backgroundColor: Colors.steel, marginVertical: Spacing.sm },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.graphite,
  },
  memberAvatarLetter: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.bodySm },
  memberInfo: { flex: 1, gap: 2 },
  memberHandle: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.starlight },
  memberDisplayName: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.starFaint },
  roleBadge: { borderWidth: 1, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  roleText: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, textTransform: 'uppercase' },
  errorText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.danger },
});
