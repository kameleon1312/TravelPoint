import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { SignalButton } from '@/components/ui/SignalButton';
import { useMyCircles } from '@/hooks/useCircles';
import { pl } from '@/i18n/pl';
import { useAuthStore } from '@/stores/auth';

const ROLE_COLORS: Record<string, string> = {
  FOUNDER: Colors.ember,
  GUIDE: Colors.aurora,
  MEMBER: Colors.signal,
};

export default function CirclesScreen() {
  const { data: circles, isLoading, error } = useMyCircles();
  const { explorer } = useAuthStore();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Twoje kręgi</Text>
        <Text style={styles.heading}>{pl.circles.myCircles}</Text>
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.aurora} size="large" />
        </View>
      )}

      {!isLoading && (!circles || circles.length === 0) && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>◑</Text>
          <Text style={styles.emptyTitle}>Nie należysz jeszcze do żadnego circle</Text>
          <Text style={styles.emptySub}>
            Circles to prywatne kręgi eksploratorów ze wspólnymi mapami i chatami.
          </Text>
        </View>
      )}

      <FlatList
        data={circles ?? []}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/circle/${item.slug ?? item.id}`)}>
            <GlassCard style={styles.card}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.circleName}>{item.name}</Text>
                  <Text style={styles.circleSlug}>
                    {item.slug ? `@${item.slug}` : ''}
                  </Text>
                </View>
                <View style={[styles.roleBadge, { borderColor: ROLE_COLORS[item.role] ?? Colors.steel }]}>
                  <Text style={[styles.roleText, { color: ROLE_COLORS[item.role] ?? Colors.starFaint }]}>
                    {item.role}
                  </Text>
                </View>
              </View>
              {item.description && (
                <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
              )}
              <View style={styles.meta}>
                {item.isInviteOnly && (
                  <Text style={styles.metaTag}>◑ Invite only</Text>
                )}
              </View>
            </GlassCard>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.fab}>
        <SignalButton
          label={pl.circles.joinCircle}
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
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.xs },
  eyebrow: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint, letterSpacing: 3, textTransform: 'uppercase' },
  heading: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h2, color: Colors.starlight },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg },
  emptyIcon: { fontSize: 48, color: Colors.starGhost },
  emptyTitle: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight, textAlign: 'center' },
  emptySub: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, textAlign: 'center', lineHeight: 22 },
  list: { padding: Spacing.xl, paddingBottom: 100 },
  card: { gap: Spacing.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  circleName: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight },
  circleSlug: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint },
  roleBadge: { borderWidth: 1, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: 2 },
  roleText: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, textTransform: 'uppercase' },
  desc: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, lineHeight: 20 },
  meta: { flexDirection: 'row', gap: Spacing.sm },
  metaTag: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.micro, color: Colors.starGhost },
  fab: { position: 'absolute', bottom: Spacing.huge, right: Spacing.xl },
});
