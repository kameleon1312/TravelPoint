import { View, Text, StyleSheet, Platform, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker, Region } from 'react-native-maps';
import { Colors, FontSize, Spacing, Shadow } from '@travelpoint/theme';
import { SignalButton } from '@/components/ui/SignalButton';
import { pl } from '@/i18n/pl';
import { useNearbySpots } from '@/hooks/useSpots';
import { useAuthStore } from '@/stores/auth';
import { socketManager } from '@/lib/socket';
import { api } from '@/lib/api';
import type { SpotForViewer } from '@travelpoint/types';

const TERRA_MARE_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0C1014' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8A827A' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0C1014' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#253035' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1B2328' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#131A1F' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#253035' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0F1E2A' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#131A1F' }] },
];

const ACCESS_PIN_COLORS: Record<string, string> = {
  PUBLIC:      Colors.aurora,
  TRUSTED:     Colors.signal,
  SECRET_DROP: Colors.ember,
  CIRCLE_ONLY: Colors.violet,
};

const DEFAULT_REGION: Region = {
  latitude: 52.2297,
  longitude: 21.0122,
  latitudeDelta: 20,
  longitudeDelta: 20,
};

interface NearbyExplorer {
  explorerId: string;
  lat: number;
  lng: number;
}

function PresenceToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  const scale = useSharedValue(1);
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(withTiming(1.5, { duration: 800 }), withTiming(1, { duration: 800 })),
        -1,
      );
    } else {
      scale.value = withSpring(1);
    }
  }, [active]);

  return (
    <Pressable
      style={[styles.presenceIndicator, active && styles.presenceIndicatorActive]}
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={active ? pl.presence.presenceActive : pl.presence.presenceOff}
    >
      <Animated.View
        style={[
          styles.presenceDot,
          { backgroundColor: active ? Colors.aurora : Colors.starGhost },
          dotStyle,
        ]}
      />
      <Text style={[styles.presenceText, active && { color: Colors.aurora }]}>
        {active ? pl.presence.presenceActive : pl.presence.presenceOff}
      </Text>
    </Pressable>
  );
}

export default function AtlasScreen() {
  const { explorer, setExplorer } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [presenceActive, setPresenceActive] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [nearbyExplorers, setNearbyExplorers] = useState<NearbyExplorer[]>([]);
  const mapRef = useRef<MapView>(null);

  const { data: spots } = useNearbySpots(
    region.latitude,
    region.longitude,
  );

  useEffect(() => {
    const handler = (data: unknown) => {
      const e = data as NearbyExplorer;
      if (!e.explorerId || e.explorerId === explorer?.id) return;
      setNearbyExplorers((prev) => {
        const filtered = prev.filter((p) => p.explorerId !== e.explorerId);
        return [...filtered, e].slice(-20);
      });
    };
    socketManager.on('explorer:nearby', handler);
    return () => socketManager.off('explorer:nearby', handler);
  }, [explorer?.id]);

  useEffect(() => {
    void requestLocation();
  }, []);

  useEffect(() => {
    if (!locationGranted) return;
    if (presenceActive) {
      socketManager.emit('presence:enable', { lat: region.latitude, lng: region.longitude });
    } else {
      socketManager.emit('presence:disable');
      setNearbyExplorers([]);
    }
  }, [presenceActive, locationGranted]);

  async function requestLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    setLocationGranted(true);

    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = loc.coords;
    const newRegion: Region = { latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 1200);
  }

  async function grantPresenceConsent() {
    try {
      await api.patch('/api/explorers/me', { presenceConsent: true });
      setExplorer({ ...explorer!, presenceConsent: true });
      setPresenceActive(true);
    } catch {
      Alert.alert(pl.common.error, 'Nie udało się zapisać zgody na presence.');
    }
  }

  function togglePresence() {
    if (!locationGranted) {
      void requestLocation();
      return;
    }
    // First activation requires explicit RODO consent — location shown as ±500m signal
    if (!presenceActive && !explorer?.presenceConsent) {
      Alert.alert(
        'Presence — bądź widoczny na mapie',
        'Inni exploratorzy zobaczą Cię jako sygnał na mapie. Twoja lokalizacja jest zawsze przybliżona (±500m). Możesz wyłączyć presence w każdej chwili.',
        [
          { text: 'Anuluj', style: 'cancel' },
          { text: 'Włącz Presence', onPress: () => void grantPresenceConsent() },
        ],
      );
      return;
    }
    setPresenceActive((v) => !v);
  }

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={DEFAULT_REGION}
        showsUserLocation={locationGranted}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsTraffic={false}
        showsBuildings={false}
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        customMapStyle={Platform.OS === 'android' ? TERRA_MARE_STYLE : undefined}
      >
        {/* Spot pins */}
        {spots?.map((spot: SpotForViewer) => {
          const isLocked = 'locked' in spot ? spot.locked : false;
          const accessLevel = 'accessLevel' in spot ? (spot as { accessLevel: string }).accessLevel : 'PUBLIC';
          const color = isLocked ? Colors.starGhost : (ACCESS_PIN_COLORS[accessLevel] ?? Colors.aurora);
          return (
            <Marker
              key={spot.id}
              coordinate={{ latitude: spot.lat, longitude: spot.lng }}
              onPress={() => router.push(`/spot/${spot.id}`)}
            >
              <View style={[styles.spotPin, { backgroundColor: color, opacity: isLocked ? 0.6 : 1 }]} />
            </Marker>
          );
        })}

        {/* Presence pins */}
        {presenceActive && nearbyExplorers.map((e) => (
          <Marker key={e.explorerId} coordinate={{ latitude: e.lat, longitude: e.lng }} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.presenceOuter}>
              <View style={styles.presenceInner} />
            </View>
          </Marker>
        ))}
      </MapView>

      <SafeAreaView edges={['top']} style={styles.topBar}>
        <Text style={styles.logo}>TravelPoint</Text>
        <View style={styles.topRight}>
          {presenceActive && nearbyExplorers.length > 0 && (
            <View style={styles.nearbyBadge}>
              <Text style={styles.nearbyText}>
                {nearbyExplorers.length} {pl.presence.nearby}
              </Text>
            </View>
          )}
          <PresenceToggle active={presenceActive} onToggle={togglePresence} />
        </View>
      </SafeAreaView>

      <View style={[styles.bottomBar, { bottom: insets.bottom + Spacing.md }]}>
        <SignalButton
          label={pl.spots.dropSpot}
          onPress={() => router.push('/modals/new-spot')}
          variant="aurora"
          size="md"
          fullWidth
          haptic="medium"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.abyss },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  logo: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h4,
    color: Colors.starlight,
    ...Shadow.card,
  },
  nearbyBadge: {
    backgroundColor: Colors.aurora + '20',
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.aurora + '50',
  },
  nearbyText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.aurora,
  },
  presenceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.glass,
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  presenceIndicatorActive: {
    borderColor: Colors.aurora + '60',
    backgroundColor: Colors.aurora + '12',
  },
  presenceDot: { width: 6, height: 6, borderRadius: 3 },
  presenceText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.micro,
    color: Colors.starFaint,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  spotPin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.abyss,
  },
  presenceOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.aurora + '25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presenceInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.aurora,
    borderWidth: 2,
    borderColor: Colors.abyss,
  },
});
