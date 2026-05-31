import { View, Text, StyleSheet, Pressable } from 'react-native';
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
import { router } from 'expo-router';
import * as Location from 'expo-location';
import MapboxGL from '@rnmapbox/maps';
import { Colors, FontSize, Spacing, Shadow } from '@travelpoint/theme';
import { SignalButton } from '@/components/ui/SignalButton';
import { pl } from '@/i18n/pl';
import { useNearbySpots } from '@/hooks/useSpots';
import { useAuthStore } from '@/stores/auth';
import type { SpotForViewer } from '@travelpoint/types';

const MAPBOX_TOKEN = process.env['EXPO_PUBLIC_MAPBOX_TOKEN'] ?? '';
MapboxGL.setAccessToken(MAPBOX_TOKEN);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const COSMIC_DARK_JSON = JSON.stringify(require('../../assets/map-styles/cosmic-dark.json'));

const ACCESS_PIN_COLORS: Record<string, string> = {
  PUBLIC: Colors.aurora,
  TRUSTED: Colors.signal,
  SECRET_DROP: Colors.ember,
  CIRCLE_ONLY: Colors.violet,
};

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
  const { explorer } = useAuthStore();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [presenceActive, setPresenceActive] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const cameraRef = useRef<MapboxGL.Camera>(null);

  const { data: spots } = useNearbySpots(
    coords?.lat ?? null,
    coords?.lng ?? null,
  );

  useEffect(() => {
    void requestLocation();
  }, []);

  async function requestLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    setLocationGranted(true);

    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude: lat, longitude: lng } = loc.coords;
    setCoords({ lat, lng });

    cameraRef.current?.setCamera({
      centerCoordinate: [lng, lat],
      zoomLevel: 13,
      animationDuration: 1200,
    });
  }

  function togglePresence() {
    if (!locationGranted) {
      void requestLocation();
      return;
    }
    setPresenceActive((v) => !v);
  }

  const spotsGeoJson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: (spots ?? []).map((spot: SpotForViewer) => ({
      type: 'Feature',
      id: spot.id,
      geometry: { type: 'Point', coordinates: [spot.lng, spot.lat] },
      properties: {
        id: spot.id,
        locked: 'locked' in spot ? spot.locked : false,
        accessLevel: 'accessLevel' in spot ? (spot as { accessLevel: string }).accessLevel : 'PUBLIC',
        color: ACCESS_PIN_COLORS[
          'accessLevel' in spot ? (spot as { accessLevel: string }).accessLevel : 'PUBLIC'
        ] ?? Colors.aurora,
      },
    })),
  };

  return (
    <View style={styles.root}>
      <MapboxGL.MapView
        style={StyleSheet.absoluteFill}
        styleJSON={COSMIC_DARK_JSON}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
        scaleBarEnabled={false}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [21.0122, 52.2297],
            zoomLevel: 4,
          }}
        />

        {locationGranted && <MapboxGL.UserLocation visible animated />}

        {spots && spots.length > 0 && (
          <MapboxGL.ShapeSource
            id="spots"
            shape={spotsGeoJson}
            onPress={(e) => {
              const feature = e.features[0];
              if (feature?.properties?.['id']) {
                router.push(`/spot/${feature.properties['id'] as string}`);
              }
            }}
          >
            <MapboxGL.CircleLayer
              id="spot-locked"
              filter={['==', ['get', 'locked'], true]}
              style={{
                circleRadius: 8,
                circleColor: Colors.starGhost,
                circleStrokeWidth: 1.5,
                circleStrokeColor: Colors.steel,
                circleOpacity: 0.7,
              }}
            />
            <MapboxGL.CircleLayer
              id="spot-public"
              filter={['==', ['get', 'locked'], false]}
              style={{
                circleRadius: 10,
                circleColor: ['get', 'color'],
                circleStrokeWidth: 2,
                circleStrokeColor: Colors.abyss,
                circleBlur: 0.2,
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>

      {/* Top bar */}
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <Text style={styles.logo}>TravelPoint</Text>
        <PresenceToggle active={presenceActive} onToggle={togglePresence} />
      </SafeAreaView>

      {/* Bottom CTA */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <SignalButton
          label={pl.spots.dropSpot}
          onPress={() => router.push('/modals/new-spot')}
          variant="aurora"
          size="md"
          fullWidth
          haptic="medium"
        />
      </SafeAreaView>
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
  logo: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h4,
    color: Colors.starlight,
    ...Shadow.card,
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
  presenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  presenceText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.micro,
    color: Colors.starFaint,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
});
