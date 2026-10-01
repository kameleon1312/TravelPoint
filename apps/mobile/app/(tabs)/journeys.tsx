import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, FontSize, Spacing } from '@travelpoint/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { SignalButton } from '@/components/ui/SignalButton';
import { useMyJourneys } from '@/hooks/useJourneys';
import { formatRelative } from '@travelpoint/utils';
import { pl } from '@/i18n/pl';

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
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/journey/${item.id}`)}>
              <GlassCard style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.title}>{item.title}</Text>
                  {item.isPrivate && (
                    <Text style={styles.privateBadge}>◑</Text>
                  )}
                </View>
                {item.mood && (
                  <Text style={styles.mood}>"{item.mood}"</Text>
                )}
                <Text style={styles.date}>{formatRelative(item.createdAt)}</Text>
              </GlassCard>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
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
  header:  { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.xs },
  eyebrow: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint, letterSpacing: 3, textTransform: 'uppercase' },
  heading: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h2, color: Colors.starlight },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.xl, gap: Spacing.lg,
  },
  emptyIcon:  { fontSize: 48, color: Colors.starGhost },
  emptyTitle: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight, textAlign: 'center' },
  emptySub:   { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, textAlign: 'center', lineHeight: 22 },
  list:       { padding: Spacing.xl },
  card:       { gap: Spacing.sm },
  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title:      { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight, flex: 1 },
  privateBadge: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost },
  mood:  { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, fontStyle: 'italic', lineHeight: 20 },
  date:  { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost },
  fab:   { position: 'absolute', right: Spacing.xl },
});
