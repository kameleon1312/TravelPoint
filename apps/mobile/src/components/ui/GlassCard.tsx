import { View, StyleSheet, type ViewStyle, type ViewProps } from 'react-native';
import { Colors, BorderRadius, Shadow, Spacing } from '@travelpoint/theme';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  glow?: 'aurora' | 'signal' | 'ember' | 'none';
  radius?: number;
}

export function GlassCard({
  children,
  glow = 'none',
  radius = BorderRadius.xl,
  style,
  ...props
}: GlassCardProps) {
  const glowStyle = glow !== 'none' ? Shadow[`${glow}Glow` as keyof typeof Shadow] : {};

  return (
    <View
      style={[
        styles.background,
        { borderRadius: radius, overflow: 'hidden' },
        glowStyle,
        style as ViewStyle,
      ]}
      {...props}
    >
      <View style={[styles.border, { borderRadius: radius }]} />
      <View style={[styles.content, { borderRadius: radius }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: Colors.glass,
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  content: {
    padding: Spacing.lg,
  },
});
