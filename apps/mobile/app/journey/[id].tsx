import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import MapView, { Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Haptics from 'expo-haptics';

const MAPS_KEY = process.env['EXPO_PUBLIC_GOOGLE_MAPS_API_KEY'];
import { TERRA_MARE_STYLE } from '@/constants/mapStyle';
import { useJourney, useDeleteJourney, useLikeJourney, useUnlikeJourney } from '@/hooks/useJourneys';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { SignalButton } from '@/components/ui/SignalButton';
import { formatRelative } from '@travelpoint/utils';
import { useAuthStore } from '@/stores/auth';

function extractPolylineCoords(geoJson: unknown): { latitude: number; longitude: number }[] {
  const features =
    (geoJson as { features?: { geometry?: { type?: string; coordinates?: number[][] } }[] })
      ?.features ?? [];
  const coords: { latitude: number; longitude: number }[] = [];
  for (const f of features) {
    if (f.geometry?.type === 'LineString') {
      for (const pair of (f.geometry.coordinates ?? [])) {
        coords.push({ latitude: pair[1] ?? 0, longitude: pair[0] ?? 0 });
      }
    }
  }
  return coords;
}

function computeRegion(geoJson: unknown): Region {
  const features =
    (geoJson as { features?: { geometry?: { type?: string; coordinates?: number[][] } }[] })
      ?.features ?? [];
  let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
  let hasPoints = false;
  for (const f of features) {
    if (f.geometry?.type === 'LineString') {
      for (const pair of (f.geometry.coordinates ?? [])) {
        const lng = pair[0] ?? 0;
        const lat = pair[1] ?? 0;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        hasPoints = true;
      }
    }
  }
  if (!hasPoints) {
    return { latitude: 52.2297, longitude: 21.0122, latitudeDelta: 10, longitudeDelta: 10 };
  }
  const latDelta = Math.max(Math.abs(maxLat - minLat) * 1.5, 0.02);
  const lngDelta = Math.max(Math.abs(maxLng - minLng) * 1.5, 0.02);
  return {
    latitude:       (minLat + maxLat) / 2,
    longitude:      (minLng + maxLng) / 2,
    latitudeDelta:  latDelta,
    longitudeDelta: lngDelta,
  };
}

export default function JourneyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { explorer } = useAuthStore();
  const { data: journey, isLoading } = useJourney(id ?? '');
  const { mutateAsync: deleteJourney, isPending: isDeleting } = useDeleteJourney();
  const likeJourney   = useLikeJourney();
  const unlikeJourney = useUnlikeJourney();

  const isOwner = !!journey && journey.explorerId === explorer?.id;

  async function handleLikeToggle() {
    if (!journey) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (journey.liked) {
      unlikeJourney.mutate(journey.id);
    } else {
      likeJourney.mutate(journey.id);
    }
  }

  function confirmDelete() {
    Alert.alert(
      `Usuń "${journey?.title}"?`,
      'Tej operacji nie można cofnąć. Journey zostanie trwale usunięte.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń', style: 'destructive',
          onPress: async () => {
            try {
              await deleteJourney(id ?? '');
              router.back();
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : 'Nie udało się usunąć.';
              Alert.alert('Błąd', msg);
            }
          },
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.aurora} size="large" />
      </View>
    );
  }

  if (!journey) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Journey nie znalezione.</Text>
        <SignalButton label="Wróć" onPress={() => router.back()} variant="ghost" size="sm" />
      </View>
    );
  }

  const routeCoords = journey.routeGeoJson ? extractPolylineCoords(journey.routeGeoJson) : [];
  const routeRegion = journey.routeGeoJson ? computeRegion(journey.routeGeoJson)           : undefined;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← Journeys</Text>
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.eyebrow}>Journey Replay</Text>
            {journey.isPrivate && (
              <View style={styles.privateBadge}>
                <Text style={styles.privateBadgeText}>◑ Prywatne</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{journey.title}</Text>
          {journey.mood && (
            <Text style={styles.mood}>"{journey.mood}"</Text>
          )}
          <Text style={styles.date}>{formatRelative(journey.createdAt)}</Text>
        </View>

        {/* Route map */}
        <View style={styles.routeCard}>
          <Text style={styles.routeLabel}>Trasa ekspedycji</Text>
          {routeCoords.length > 0 && routeRegion && MAPS_KEY ? (
            <View style={styles.routeMapContainer}>
              <MapView
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                style={styles.routeMap}
                initialRegion={routeRegion}
                scrollEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                zoomEnabled={false}
                showsCompass={false}
                showsScale={false}
                mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
                customMapStyle={Platform.OS === 'android' ? TERRA_MARE_STYLE : undefined}
              >
                <Polyline
                  coordinates={routeCoords}
                  strokeColor={Colors.aurora + '30'}
                  strokeWidth={10}
                />
                <Polyline
                  coordinates={routeCoords}
                  strokeColor={Colors.aurora}
                  strokeWidth={3}
                  lineCap="round"
                  lineJoin="round"
                />
              </MapView>
              <View style={styles.routeStats}>
                <Text style={styles.routeStatText}>
                  {routeCoords.length} punktów trasy
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.routeEmpty}>
              <Text style={styles.routeEmptyIcon}>◌</Text>
              <Text style={styles.routeEmptyText}>Brak zapisanej trasy GPS</Text>
            </View>
          )}
        </View>

        {/* Soundtrack */}
        {journey.soundtrack && (
          <GlassCard style={styles.soundtrackCard}>
            <Text style={styles.soundtrackIcon}>♪</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.soundtrackLabel}>Soundtrack</Text>
              <Text style={styles.soundtrackUrl} numberOfLines={1}>
                {journey.soundtrack}
              </Text>
            </View>
          </GlassCard>
        )}

        {/* Meta */}
        <GlassCard style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Widoczność</Text>
            <View style={[
              styles.metaValueBadge,
              { borderColor: journey.isPrivate ? Colors.ember + '50' : Colors.aurora + '50' },
            ]}>
              <Text style={[styles.metaValueText, { color: journey.isPrivate ? Colors.ember : Colors.aurora }]}>
                {journey.isPrivate ? '◑ Prywatne' : '◎ Publiczne'}
              </Text>
            </View>
          </View>
          {journey.updatedAt && journey.updatedAt !== journey.createdAt && (
            <View style={[styles.metaRow, { marginTop: Spacing.sm }]}>
              <Text style={styles.metaLabel}>Ostatnia edycja</Text>
              <Text style={styles.metaDate}>{formatRelative(journey.updatedAt)}</Text>
            </View>
          )}
        </GlassCard>

        {/* Like — non-owners only */}
        {!isOwner && (
          <Pressable
            style={[styles.likeBtn, journey.liked && styles.likeBtnActive]}
            onPress={() => void handleLikeToggle()}
            disabled={likeJourney.isPending || unlikeJourney.isPending}
          >
            <Text style={[styles.likeIcon, journey.liked && styles.likeIconActive]}>♥</Text>
            <Text style={[styles.likeLabel, journey.liked && styles.likeLabelActive]}>
              {journey.liked ? 'Polubiłeś' : 'Lubię tę journey'}
            </Text>
            {(journey.likeCount ?? 0) > 0 && (
              <Text style={styles.likeCount}>{journey.likeCount}</Text>
            )}
          </Pressable>
        )}

        {/* Like count for owners */}
        {isOwner && (journey.likeCount ?? 0) > 0 && (
          <View style={styles.ownerLikeRow}>
            <Text style={styles.ownerLikeText}>♥ {journey.likeCount} explorers polubiło tę journey</Text>
          </View>
        )}

        {/* Delete — owner only */}
        {isOwner && (
          <SignalButton
            label="Usuń journey"
            onPress={confirmDelete}
            variant="ember"
            size="md"
            fullWidth
            loading={isDeleting}
            haptic="medium"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.abyss },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, backgroundColor: Colors.abyss },
  scroll:  { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: Spacing.huge },

  back:     { alignSelf: 'flex-start' },
  backText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starFaint },

  header:   { gap: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow:  {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.starFaint,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  privateBadge: {
    borderWidth: 1,
    borderColor: Colors.ember + '40',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
  },
  privateBadgeText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.ember,
  },
  title: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h2,
    color: Colors.starlight,
    letterSpacing: -0.5,
  },
  mood: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.body,
    color: Colors.star,
    fontStyle: 'italic',
  },
  date: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.starGhost,
  },

  routeCard: {
    backgroundColor: Colors.graphite,
    borderWidth: 1,
    borderColor: Colors.steel,
    borderRadius: 16,
    overflow: 'hidden',
  },
  routeLabel: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: FontSize.caption,
    color: Colors.starFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  routeMapContainer: { overflow: 'hidden' },
  routeMap:          { height: 220 },
  routeStats: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.steel,
  },
  routeStatText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.starGhost,
  },
  routeEmpty: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  routeEmptyIcon: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 28,
    color: Colors.starGhost,
  },
  routeEmptyText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.starGhost,
  },

  soundtrackCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  soundtrackIcon: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 24,
    color: Colors.aurora,
  },
  soundtrackLabel: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: FontSize.caption,
    color: Colors.starFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  soundtrackUrl: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.signal,
  },

  metaCard: { gap: Spacing.xs },
  metaRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.starFaint,
  },
  metaValueBadge: {
    borderWidth: 1,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
  },
  metaValueText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    textTransform: 'uppercase',
  },
  metaDate: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.starGhost,
  },

  errorText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.body,
    color: Colors.ember,
  },

  likeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.steel,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.graphite,
  },
  likeBtnActive: {
    borderColor: Colors.aurora + '60',
    backgroundColor: Colors.aurora + '12',
  },
  likeIcon:  { fontFamily: 'GeneralSans-Regular', fontSize: 18, color: Colors.starGhost },
  likeIconActive: { color: Colors.aurora },
  likeLabel: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.starFaint },
  likeLabelActive: { color: Colors.aurora },
  likeCount: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.caption, color: Colors.aurora },

  ownerLikeRow: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  ownerLikeText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.caption,
    color: Colors.aurora,
  },
});
