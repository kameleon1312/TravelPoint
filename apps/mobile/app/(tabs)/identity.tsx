import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '@travelpoint/theme';
import { useAuthStore } from '@/stores/auth';
import { SignalButton } from '@/components/ui/SignalButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { useMarkSignalsSeen } from '@/hooks/useSignals';

const RANK_COLORS: Record<string, string> = {
  NEWCOMER: Colors.starGhost,
  EXPLORER: Colors.star,
  TRUSTED: Colors.signal,
  INSIDER: Colors.aurora,
  LEGEND: Colors.ember,
};

export default function IdentityScreen() {
  const { explorer, logout } = useAuthStore();
  const { mutate: markSeen } = useMarkSignalsSeen();

  // Mark signals as seen when explorer opens this screen
  useEffect(() => { markSeen(); }, []);

  if (!explorer) return null;

  const rankColor = RANK_COLORS[explorer.rank] ?? Colors.starGhost;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Explorer Identity</Text>

          {/* Avatar ring */}
          <View style={[styles.avatarRing, { borderColor: rankColor, shadowColor: rankColor }]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>
                {explorer.handle[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
          </View>

          <Text style={styles.handle}>@{explorer.handle}</Text>
          {explorer.displayName && (
            <Text style={styles.displayName}>{explorer.displayName}</Text>
          )}

          {/* Rank badge */}
          <View style={[styles.rankBadge, { borderColor: rankColor }]}>
            <Text style={[styles.rankText, { color: rankColor }]}>
              {explorer.rank}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Trust', value: explorer.trustScore },
            { label: 'Tier', value: explorer.tier },
            { label: 'Archetype', value: explorer.archetype },
          ].map((stat) => (
            <GlassCard key={stat.label} style={styles.statCard}>
              <Text style={styles.statValue}>{String(stat.value)}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </GlassCard>
          ))}
        </View>

        {/* Bio */}
        {explorer.bio && (
          <GlassCard style={styles.section}>
            <Text style={styles.sectionLabel}>Bio</Text>
            <Text style={styles.bioText}>{explorer.bio}</Text>
          </GlassCard>
        )}

        {/* Obsessions */}
        {explorer.obsessions.length > 0 && (
          <GlassCard style={styles.section}>
            <Text style={styles.sectionLabel}>Obsesje</Text>
            <View style={styles.tags}>
              {explorer.obsessions.map((obs) => (
                <View key={obs} style={styles.tag}>
                  <Text style={styles.tagText}>{obs}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        )}

        {/* Logout */}
        <SignalButton
          label="Wyloguj"
          onPress={logout}
          variant="ghost"
          size="md"
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.abyss },
  scroll: { padding: Spacing.xl, gap: Spacing.xl },
  header: { alignItems: 'center', gap: Spacing.md },
  eyebrow: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.starFaint,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.cosmicBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h2,
    color: Colors.aurora,
  },
  handle: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: FontSize.bodyLg,
    color: Colors.starlight,
  },
  displayName: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.star,
  },
  rankBadge: {
    borderWidth: 1,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  rankText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.caption,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h4,
    color: Colors.starlight,
    textAlign: 'center',
  },
  statLabel: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.micro,
    color: Colors.starFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 2,
  },
  section: { gap: Spacing.sm },
  sectionLabel: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: FontSize.caption,
    color: Colors.starFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bioText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.star,
    lineHeight: 22,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  tagText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.caption,
    color: Colors.aurora,
  },
});
