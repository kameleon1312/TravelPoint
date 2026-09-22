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
  const glowStyle = glow !== 'none' ? Shadow[`${glow}Glow` as keyof typeof Shadow] : Shadow.card;

  return (
    <View
      style={[
        styles.card,
        { borderRadius: radius },
        glowStyle,
        style as ViewStyle,
      ]}
      {...props}
    >
      <View style={[styles.content, { borderRadius: radius }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.graphite,
    borderWidth: 1,
    borderColor: Colors.steel,
    overflow: 'hidden',
  },
  content: {
    padding: Spacing.lg,
  },
});
