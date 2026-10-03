import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, FontSize, Spacing } from '@travelpoint/theme';
import { SignalButton } from '@/components/ui/SignalButton';
import { useMyJourneys } from '@/hooks/useJourneys';
import { formatRelative } from '@travelpoint/utils';
import { pl } from '@/i18n/pl';

const SCREEN_W  = Dimensions.get('window').width;
const H_PAD     = 20;
const CARD_VIS_H = 72;

const MOOD_COLORS: Record<string, string> = {
  adventure: Colors.aurora,
  urban:     Colors.signal,
  nature:    Colors.moss,
  mystery:   Colors.violet,
  default:   Colors.ember,
};

export default function JourneysScreen() {
  const insets = useSafeAreaInsets();
  const {
    data,
    isLoading,
    isError,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMyJourneys();

  const journeys = data?.pages.flatMap((p) => p.journeys) ?? [];

  const fabBottom = insets.bottom + Spacing.lg;

  const hasJourneys = !isLoading && !isError && journeys.length > 0;
  const isEmpty     = !isLoading && !isError && journeys.length === 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Twoje wyprawy</Text>
        <Text style={styles.heading}>Trasy</Text>
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.aurora} size="large" />
        </View>
      )}

      {isError && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>◈</Text>
          <Text style={styles.emptyTitle}>Błąd połączenia</Text>
          <Text style={styles.emptySub}>Nie udało się załadować tras. Spróbuj ponownie.</Text>
          <SignalButton
            label="Spróbuj ponownie"
            onPress={() => void refetch()}
            variant="ghost"
            size="sm"
            haptic="light"
          />
        </View>
      )}

      {isEmpty && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>◎</Text>
          <Text style={styles.emptyTitle}>Jeszcze bez tras</Text>
          <Text style={styles.emptySub}>
            Twoje wyprawy pojawią się tutaj. Zacznij nowe Journey z mapy.
          </Text>
        </View>
      )}

      {hasJourneys && (
        <FlatList
          data={journeys}
          keyExtractor={(j) => j.id}
          renderItem={({ item }) => {
            const moodKey = item.mood?.toLowerCase().split(' ')[0] ?? 'default';
            const accentColor = MOOD_COLORS[moodKey] ?? MOOD_COLORS['default']!;
            const initial = item.title[0]?.toUpperCase() ?? '◎';
            return (
              <Pressable onPress={() => router.push(`/journey/${item.id}`)} style={styles.card}>
                <LinearGradient
                  colors={[Colors.void, accentColor + '50']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardVisual}
                >
                  <Text style={[styles.cardInitial, { color: accentColor }]}>{initial}</Text>
                  <View style={[styles.cardAccentDot, { backgroundColor: accentColor }]} />
                </LinearGradient>
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                    {item.isPrivate && (
                      <View style={styles.privateBadge}>
                        <Text style={styles.privateBadgeText}>◑ Prywatna</Text>
                      </View>
                    )}
                  </View>
                  {item.mood && (
                    <Text style={[styles.mood, { color: accentColor + 'CC' }]}>"{item.mood}"</Text>
                  )}
                  <Text style={styles.date}>{formatRelative(item.createdAt)}</Text>
                </View>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          contentContainerStyle={[styles.list, { paddingBottom: fabBottom + Spacing.xl }]}
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
        />
      )}

      <View style={[styles.fab, { bottom: fabBottom }]}>
        <SignalButton
          label={pl.journeys.newJourney}
          onPress={() => router.push('/modals/new-journey')}
          variant="aurora"
          size="sm"
          haptic="light"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.abyss },
  header:  { paddingHorizontal: H_PAD, paddingTop: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.xs },
  eyebrow: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint, letterSpacing: 3, textTransform: 'uppercase' },
  heading: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h1, color: Colors.starlight },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.xl, gap: Spacing.lg,
  },
  emptyIcon:  { fontSize: 48, color: Colors.starGhost },
  emptyTitle: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight, textAlign: 'center' },
  emptySub:   { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, textAlign: 'center', lineHeight: 22 },
  list: { paddingHorizontal: H_PAD, paddingTop: Spacing.sm, paddingBottom: 110 },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.graphite,
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 88,
  },
  cardVisual: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardInitial: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: 28,
  },
  cardAccentDot: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: 4,
  },
  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title:      { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.body, color: Colors.starlight, flex: 1 },
  privateBadge: {
    borderWidth: 1,
    borderColor: Colors.starGhost + '60',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  privateBadgeText: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost },
  mood:  { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, fontStyle: 'italic', lineHeight: 18 },
  date:  { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost, marginTop: 2 },
  fab:   { position: 'absolute', right: Spacing.xl },
});
