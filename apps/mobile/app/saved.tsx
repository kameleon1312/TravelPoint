import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors, FontSize, Spacing } from '@travelpoint/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { CoordLabel } from '@/components/ui/CoordLabel';
import { SignalButton } from '@/components/ui/SignalButton';
import { useSavedSpots, useUnsaveSpot } from '@/hooks/useSpots';
import type { SpotForViewer } from '@travelpoint/types';

const ACCESS_COLORS: Record<string, string> = {
  PUBLIC:      Colors.aurora,
  TRUSTED:     Colors.signal,
  SECRET_DROP: Colors.ember,
  CIRCLE_ONLY: Colors.violet,
};

function SavedSpotCard({ spot }: { spot: SpotForViewer }) {
  const unsave  = useUnsaveSpot();
  const isLocked = 'locked' in spot && spot.locked;
  const accessLevel = 'accessLevel' in spot
    ? (spot as { accessLevel: string }).accessLevel
    : 'PUBLIC';
  const accentColor = ACCESS_COLORS[accessLevel] ?? Colors.starFaint;

  function confirmUnsave() {
    Alert.alert(
      'Usuń z zapisanych',
      `Usunąć "${('title' in spot ? (spot as { title: string }).title : 'ten spot')}" z zapisanych?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń', style: 'destructive',
          onPress: async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            unsave.mutate(spot.id);
          },
        },
      ],
    );
  }

  return (
    <GlassCard style={styles.card}>
      <Pressable style={styles.cardBody} onPress={() => router.push(`/spot/${spot.id}`)}>
        <View style={styles.cardTop}>
          <Text style={[styles.accessIcon, { color: accentColor }]}>
            {accessLevel === 'SECRET_DROP' ? '◉' : accessLevel === 'TRUSTED' ? '◈' : accessLevel === 'CIRCLE_ONLY' ? '◑' : '◎'}
          </Text>
          <Text style={styles.category} numberOfLines={1}>
            {'category' in spot ? (spot as { category: string }).category : ''}
          </Text>
        </View>
        <Text style={[styles.title, isLocked && styles.titleLocked]} numberOfLines={2}>
          {'title' in spot ? (spot as { title: string }).title : '???'}
        </Text>
        <CoordLabel lat={spot.lat} lng={spot.lng} locked={isLocked} />
      </Pressable>
      <Pressable style={styles.unsaveBtn} onPress={confirmUnsave}>
        <Text style={styles.unsaveBtnText}>✕</Text>
      </Pressable>
    </GlassCard>
  );
}

export default function SavedWorldsScreen() {
  const { data: spots, isLoading } = useSavedSpots();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← Wróć</Text>
        </Pressable>
        <Text style={styles.eyebrow}>Kolekcja</Text>
        <Text style={styles.heading}>Zapisane miejsca</Text>
        {spots && (
          <Text style={styles.sub}>{spots.length} {spots.length === 1 ? 'spot' : 'spotów'} zapisanych</Text>
        )}
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.aurora} size="large" />
        </View>
      )}

      {!isLoading && (!spots || spots.length === 0) && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>◎</Text>
          <Text style={styles.emptyTitle}>Brak zapisanych spotów</Text>
          <Text style={styles.emptySub}>
            Odkryj spoty na mapie i zapisuj te, do których chcesz wrócić.
          </Text>
          <SignalButton
            label="Otwórz mapę"
            onPress={() => router.push('/(tabs)/')}
            variant="aurora"
            size="md"
            haptic="light"
          />
        </View>
      )}

      {!isLoading && spots && spots.length > 0 && (
        <FlatList
          data={spots}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <SavedSpotCard spot={item} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.abyss },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.xs },
  back:       { alignSelf: 'flex-start', marginBottom: Spacing.sm },
  backText:   { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starFaint },
  eyebrow: {
    fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro,
    color: Colors.starFaint, letterSpacing: 3, textTransform: 'uppercase',
  },
  heading: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h2, color: Colors.starlight },
  sub:     { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.xl, gap: Spacing.lg,
  },
  emptyIcon:  { fontSize: 40, color: Colors.starGhost },
  emptyTitle: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight, textAlign: 'center' },
  emptySub:   { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, textAlign: 'center', lineHeight: 22 },
  list: { padding: Spacing.xl },
  card: { flexDirection: 'row', alignItems: 'center', paddingRight: Spacing.md },
  cardBody:  { flex: 1, gap: Spacing.xs },
  cardTop:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  accessIcon: { fontSize: 14 },
  category:  { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 1, flex: 1 },
  title:     { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight },
  titleLocked: { color: Colors.starGhost },
  unsaveBtn:  { padding: Spacing.md, marginLeft: Spacing.md },
  unsaveBtnText: { fontFamily: 'GeneralSans-Regular', fontSize: 14, color: Colors.starGhost },
});
