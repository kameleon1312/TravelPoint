import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, withDelay } from 'react-native-reanimated';
import { useEffect } from 'react';
import { router } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '@travelpoint/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { CoordLabel } from '@/components/ui/CoordLabel';

// Demo hidden spots — will come from API /api/spots when connected
const DEMO_SPOTS = [
  { id: '1', title: 'Opuszczona Cementownia', category: 'ABANDONED', locked: false, lat: 50.0614, lng: 19.9383, accessLevel: 'PUBLIC' },
  { id: '2', title: '???', category: 'UNDERGROUND', locked: true, lat: 50.05, lng: 19.94, accessLevel: 'TRUSTED' },
  { id: '3', title: 'Secret Drop aktywny', category: 'VIEWPOINT', locked: false, lat: 50.07, lng: 19.95, accessLevel: 'SECRET_DROP' },
  { id: '4', title: '???', category: 'CAFE', locked: true, lat: 50.055, lng: 19.93, accessLevel: 'CIRCLE_ONLY' },
];

const ACCESS_COLORS: Record<string, string> = {
  PUBLIC: Colors.aurora,
  TRUSTED: Colors.signal,
  SECRET_DROP: Colors.ember,
  CIRCLE_ONLY: Colors.violet,
};

function SpotCard({ spot }: { spot: typeof DEMO_SPOTS[0] }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (spot.accessLevel === 'SECRET_DROP') {
      pulse.value = withRepeat(
        withSequence(withTiming(1.15, { duration: 600 }), withTiming(1, { duration: 800 })),
        -1,
      );
    }
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const accentColor = ACCESS_COLORS[spot.accessLevel] ?? Colors.starFaint;

  return (
    <Pressable onPress={() => router.push(`/spot/${spot.id}`)}>
      <GlassCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Animated.View style={[styles.dot, { backgroundColor: accentColor }, animStyle]} />
          <Text style={styles.category}>{spot.category}</Text>
          {spot.locked && <Text style={styles.lockBadge}>🔒 {spot.accessLevel.replace('_', ' ')}</Text>}
          {spot.accessLevel === 'SECRET_DROP' && <Text style={styles.dropBadge}>⚡ DROP</Text>}
        </View>

        <Text style={[styles.title, spot.locked && styles.titleLocked]}>
          {spot.title}
        </Text>

        <CoordLabel lat={spot.lat} lng={spot.lng} locked={spot.locked} />
      </GlassCard>
    </Pressable>
  );
}

export default function DiscoverScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Hidden Layer</Text>
        <Text style={styles.heading}>Odkrywaj</Text>
        <Text style={styles.sub}>Spoty posortowane według bliskości i Twojego ranku.</Text>
      </View>

      <FlatList
        data={DEMO_SPOTS}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <SpotCard spot={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.abyss },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.xs },
  eyebrow: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint, letterSpacing: 3, textTransform: 'uppercase' },
  heading: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h2, color: Colors.starlight },
  sub: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star },
  list: { padding: Spacing.xl },
  card: { gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  category: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint, flex: 1, textTransform: 'uppercase', letterSpacing: 1 },
  lockBadge: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.micro, color: Colors.starGhost },
  dropBadge: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.ember },
  title: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight },
  titleLocked: { color: Colors.starGhost },
});
