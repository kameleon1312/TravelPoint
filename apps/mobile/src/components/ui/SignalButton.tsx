import { Pressable, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Shadow, FontSize, FontWeight, BorderRadius } from '@travelpoint/theme';

type Variant = 'signal' | 'aurora' | 'ember' | 'ghost';
type Size = 'sm' | 'md' | 'lg';
type HapticStyle = 'light' | 'medium' | 'heavy';

interface SignalButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  haptic?: HapticStyle;
}

const VARIANTS: Record<Variant, { gradient: readonly string[]; glow: (typeof Shadow)[keyof typeof Shadow] }> = {
  signal: { gradient: Gradients.signal, glow: Shadow.signalGlow },
  aurora: { gradient: Gradients.aurora, glow: Shadow.auroraGlow },
  ember: { gradient: Gradients.ember, glow: Shadow.emberGlow },
  ghost: { gradient: [Colors.glass, Colors.glass], glow: Shadow.card },
};

const SIZES: Record<Size, { height: number; fontSize: number; px: number }> = {
  sm: { height: 40, fontSize: FontSize.caption, px: 16 },
  md: { height: 52, fontSize: FontSize.cta, px: 20 },
  lg: { height: 60, fontSize: FontSize.body, px: 24 },
};

export function SignalButton({
  label,
  onPress,
  variant = 'signal',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  haptic = 'light',
}: SignalButtonProps) {
  const scale = useSharedValue(1);
  const { gradient, glow } = VARIANTS[variant];
  const { height, fontSize, px } = SIZES[size];
  const isGhost = variant === 'ghost';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.97, { damping: 15 });
    const hapticMap: Record<HapticStyle, () => Promise<void>> = {
      light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
      medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
      heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
    };
    void hapticMap[haptic]();
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 15 });
  }

  return (
    <Animated.View
      style={[
        styles.wrapper,
        animatedStyle,
        fullWidth && styles.fullWidth,
        !isGhost && !disabled && !loading && glow,
        {
          backgroundColor: isGhost ? Colors.glass : gradient[gradient.length - 1],
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        accessibilityLabel={label}
        style={fullWidth && styles.fullWidth}
      >
        <View style={[styles.surface, { height }]}>
          {isGhost ? (
            <View
              style={[
                styles.content,
                {
                  paddingHorizontal: px,
                  backgroundColor: Colors.glass,
                },
              ]}
            >
              <ButtonContent
                loading={loading}
                leftIcon={leftIcon}
                rightIcon={rightIcon}
                label={label}
                fontSize={fontSize}
              />
            </View>
          ) : (
            <LinearGradient
              colors={gradient as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.content, { paddingHorizontal: px }]}
            >
              <View pointerEvents="none" style={styles.sheen} />
              <View pointerEvents="none" style={styles.bottomPolish} />
              <ButtonContent
                loading={loading}
                leftIcon={leftIcon}
                rightIcon={rightIcon}
                label={label}
                fontSize={fontSize}
              />
            </LinearGradient>
          )}
          <View pointerEvents="none" style={styles.border} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function ButtonContent({
  loading,
  leftIcon,
  rightIcon,
  label,
  fontSize,
}: {
  loading: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  label: string;
  fontSize: number;
}) {
  if (loading) {
    return <ActivityIndicator color={Colors.starlight} size="small" />;
  }

  return (
    <>
      {leftIcon}
      <Text style={[styles.label, { fontSize }]}>{label}</Text>
      {rightIcon}
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: BorderRadius.xl,
  },
  surface: {
    overflow: 'hidden',
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.graphite,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '52%',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  bottomPolish: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: 'rgba(237,232,223,0.22)',
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    borderColor: 'rgba(237,232,223,0.18)',
  },
  label: {
    color: Colors.starlight,
    fontFamily: 'GeneralSans-Semibold',
    fontWeight: FontWeight.semibold,
  },
  fullWidth: {
    width: '100%',
  },
});
