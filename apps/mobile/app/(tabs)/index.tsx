import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { router } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, Shadow } from '@travelpoint/theme';
import { SignalButton } from '@/components/ui/SignalButton';
import { pl } from '@/i18n/pl';

// Placeholder spot pins for the map (real impl uses @rnmapbox/maps + cosmic-dark style)
const DEMO_PINS = [
  { id: '1', x: '25%', y: '35%', type: 'public', color: Colors.aurora },
  { id: '2', x: '60%', y: '50%', type: 'locked', color: Colors.starGhost },
  { id: '3', x: '45%', y: '65%', type: 'secret', color: Colors.ember },
  { id: '4', x: '75%', y: '30%', type: 'public', color: Colors.signal },
];

function PulsingPin({ color, delay = 0 }: { color: string; delay?: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withDelay(delay, withRepeat(
      withSequence(withTiming(1.8, { duration: 600 }), withTiming(1, { duration: 800 })),
      -1,
    ));
    opacity.value = withDelay(delay, withRepeat(
      withSequence(withTiming(0, { duration: 600 }), withTiming(1, { duration: 800 })),
      -1,
    ));
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[styles.pinRing, ringStyle, { borderColor: color }]}
      />
      <View style={[styles.pin, { backgroundColor: color }]} />
    </View>
  );
}

export default function AtlasScreen() {
  return (
    <View style={styles.root}>
      {/* Map placeholder — developer wstawia @rnmapbox/maps z cosmic-dark.json */}
      <View style={styles.map}>
        {/* Grid overlay (represents map tiles) */}
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.mapGrid} />
        </View>

        {/* Signal pins */}
        {DEMO_PINS.map((pin, i) => (
          <Pressable
            key={pin.id}
            style={[styles.pinContainer, { left: pin.x, top: pin.y }]}
            onPress={() => router.push(`/spot/${pin.id}`)}
            accessibilityLabel={`Spot ${pin.type}`}
          >
            <PulsingPin color={pin.color} delay={i * 300} />
          </Pressable>
        ))}

        {/* Top bar */}
        <SafeAreaView edges={['top']} style={styles.topBar}>
          <Text style={styles.logo}>TravelPoint</Text>
          <View style={styles.presenceIndicator}>
            <Animated.View style={[styles.presenceDot]} />
            <Text style={styles.presenceText}>{pl.presence.presenceOff}</Text>
          </View>
        </SafeAreaView>
      </View>

      {/* Bottom CTA — kciuk-reachable */}
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
  map: { flex: 1, position: 'relative' },
  mapGrid: {
    flex: 1,
    backgroundColor: Colors.midnight,
    // TODO(developer): Replace with <MapboxGL.MapView styleURL={cosmicDarkStyle} />
  },
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
  presenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.starGhost,
  },
  presenceText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.micro,
    color: Colors.starFaint,
  },
  pinContainer: {
    position: 'absolute',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -22 }, { translateY: -22 }],
  },
  pinRing: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  pin: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  bottomBar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.steel,
    backgroundColor: Colors.abyss,
  },
});
