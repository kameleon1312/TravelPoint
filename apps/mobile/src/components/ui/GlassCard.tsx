import { View, StyleSheet, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, BorderRadius, Shadow } from '@travelpoint/theme';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  intensity?: number;
  glow?: 'aurora' | 'signal' | 'ember' | 'none';
  radius?: number;
}

export function GlassCard({
  children,
  intensity = 20,
  glow = 'none',
  radius = BorderRadius.xl,
  style,
  ...props
}: GlassCardProps) {
  const glowStyle = glow !== 'none' ? Shadow[`${glow}Glow` as keyof typeof Shadow] : {};

  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, glowStyle, style as object]} {...props}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[styles.border, { borderRadius: radius }]} />
      <View style={[styles.content, { borderRadius: radius }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  content: {
    padding: 16,
  },
});
