import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { SignalButton } from '@/components/ui/SignalButton';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { useMyJourneys } from '@/hooks/useJourneys';
import { formatRelative } from '@travelpoint/utils';
import { pl } from '@/i18n/pl';

const SCREEN_W = Dimensions.get('window').width;
const H_PAD    = 16;
const CARD_GAP = 10;
const CARD_W   = Math.floor((SCREEN_W - H_PAD * 2 - CARD_GAP) / 2);
const CARD_H   = Math.round(CARD_W * 1.3);

const MOOD_COLORS: Record<string, string> = {
  adventure: Colors.aurora,
  urban:     Colors.signal,
  nature:    Colors.moss,
  mystery:   Colors.violet,
  default:   Colors.ember,
};

const MOOD_EMOJIS: Record<string, string> = {
  adventure: '⛰',
  urban:     '🏙',
  nature:    '🌿',
  mystery:   '◈',
  default:   '◎',
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

  const journeys    = data?.pages.flatMap((p) => p.journeys) ?? [];
  const fabBottom   = insets.bottom + Spacing.lg;
  const hasJourneys = !isLoading && !isError && journeys.length > 0;
  const isEmpty     = !isLoading && !isError && journeys.length === 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Twoje wyprawy</Text>
        <Text style={styles.heading}>Journeys</Text>
      </View>

      {isLoading && (
        <View style={styles.skeletonGrid}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} width={CARD_W} height={CARD_H} />
          ))}
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
          <Text style={styles.emptyTitle}>Jeszcze bez wypraw</Text>
          <Text style={styles.emptySub}>
            Twoje journeys pojawią się tutaj. Wyjdź na trasę i zacznij nagrywać na mapie.
          </Text>
          <SignalButton
            label="Otwórz Atlas"
            onPress={() => router.navigate('/(tabs)')}
            variant="signal"
            size="md"
            haptic="light"
          />
        </View>
      )}

      {hasJourneys && (
        <FlatList
          data={journeys}
          keyExtractor={(j) => j.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => {
            const moodKey     = item.mood?.toLowerCase().split(' ')[0] ?? 'default';
            const accentColor = MOOD_COLORS[moodKey] ?? MOOD_COLORS['default']!;
            const emoji       = MOOD_EMOJIS[moodKey] ?? MOOD_EMOJIS['default']!;
            const initial     = item.title[0]?.toUpperCase() ?? '◎';
            return (
              <Pressable onPress={() => router.push(`/journey/${item.id}`)} style={{ width: CARD_W }}>
                <LinearGradient
                  colors={[Colors.graphite, Colors.void, accentColor + '33']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.card}
                >
                  {/* Top: privacy + date */}
                  <View style={styles.cardTop}>
                    {item.isPrivate ? (
                      <View style={styles.privatePill}>
                        <Text style={styles.privatePillText}>◑ Prywatna</Text>
                      </View>
                    ) : (
                      <View style={[styles.moodPill, { borderColor: accentColor + '50', backgroundColor: accentColor + '14' }]}>
                        <Text style={[styles.moodPillText, { color: accentColor }]}>
                          {emoji} {moodKey !== 'default' ? moodKey : 'journey'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Center: large initial */}
                  <Text style={[styles.cardInitial, { color: accentColor + '35' }]}>{initial}</Text>

                  {/* Bottom: title + date */}
                  <View style={styles.cardBottom}>
                    <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.date}>{formatRelative(item.createdAt)}</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            );
          }}
          contentContainerStyle={[styles.list, { paddingBottom: fabBottom + 72 }]}
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
  header:  { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.lg, gap: 2 },
  eyebrow: {
    fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro,
    color: Colors.aurora, letterSpacing: 3, textTransform: 'uppercase',
  },
  heading: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h1, color: Colors.starlight },

  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  skeletonGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: H_PAD, paddingTop: Spacing.xs, gap: CARD_GAP,
  },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.xl, gap: Spacing.lg,
  },
  emptyIcon:  { fontSize: 48, color: Colors.starGhost },
  emptyTitle: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight, textAlign: 'center' },
  emptySub:   { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, textAlign: 'center', lineHeight: 22 },

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

  cardTop: { flexDirection: 'row', gap: Spacing.xs },

  privatePill: {
    borderWidth: 1,
    borderColor: Colors.starGhost + '40',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  privatePillText: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost },

  moodPill: {
    borderWidth: 1,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  moodPillText: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, textTransform: 'capitalize' },

  cardInitial: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: 72,
    textAlign: 'center',
    lineHeight: 80,
  },

  cardBottom: { gap: 3 },
  title: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.body, color: Colors.starlight, lineHeight: 20 },
  date:  { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost },

  fab: { position: 'absolute', right: Spacing.xl },
});
