import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Colors } from '@travelpoint/theme';

export function SkeletonCard({ width, height, borderRadius = 20 }: { width: number; height: number; borderRadius?: number }) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false);
  }, []);

  const shimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-width, width]) }],
  }));

  return (
    <View style={[styles.root, { width, height, borderRadius }]}>
      <Animated.View style={[StyleSheet.absoluteFill, shimStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(237,232,223,0.08)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.graphite,
    overflow: 'hidden',
  },
});
