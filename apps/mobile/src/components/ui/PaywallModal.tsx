import {
  View, Text, StyleSheet, Modal, Pressable,
} from 'react-native';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withSpring, FadeIn, FadeOut,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { useFreeTrialDays } from '@/hooks/usePurchases';

type RequiredTier = 'PRO' | 'EXPEDITION';

const TIER_LABELS: Record<RequiredTier, string> = {
  PRO: 'Explorer PRO',
  EXPEDITION: 'Expedition',
};

const TIER_COLORS: Record<RequiredTier, string> = {
  PRO: Colors.signal,
  EXPEDITION: Colors.ember,
};

const TIER_ICONS: Record<RequiredTier, string> = {
  PRO: '◈',
  EXPEDITION: '◉',
};

const TIER_PERKS: Record<RequiredTier, string[]> = {
  PRO: [
    'Spoty zaufanych bez ograniczeń',
    'Nieograniczone wyprawy',
    'Nieograniczone zapisane miejsca',
  ],
  EXPEDITION: [
    'Dostęp do Tajnych Dropów',
    'Twórz własne Circles (do 5)',
    'Ukryta warstwa mapy',
  ],
};

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  requiredTier: RequiredTier;
  featureLabel?: string;
}

export function PaywallModal({ visible, onClose, requiredTier, featureLabel }: PaywallModalProps) {
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(0.88);
  const glow  = useSharedValue(1);
  const color = TIER_COLORS[requiredTier];
  const trialDays = useFreeTrialDays(requiredTier);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 14, stiffness: 180 });
      glow.value  = withRepeat(
        withSequence(withTiming(1.2, { duration: 1100 }), withTiming(1, { duration: 1100 })),
        -1,
      );
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      scale.value = 0.88;
    }
  }, [visible]);

  const cardStyle  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const iconStyle  = useAnimatedStyle(() => ({ transform: [{ scale: glow.value }] }));

  function handlePlans() {
    onClose();
    router.push('/plans');
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(160)}
          style={[styles.backdropInner, { paddingBottom: Math.max(insets.bottom, Spacing.xl) }]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Animated.View style={[styles.card, { borderColor: color + '40' }, cardStyle]}>
              <Animated.Text style={[styles.icon, { color }, iconStyle]}>
                {TIER_ICONS[requiredTier]}
              </Animated.Text>

              <Text style={styles.title}>
                {featureLabel ? `Odblokuj ${featureLabel}` : 'Treść zablokowana'}
              </Text>

              <View style={[styles.tierBadge, { borderColor: color + '60', backgroundColor: color + '18' }]}>
                <Text style={[styles.tierBadgeText, { color }]}>
                  Wymaga planu {TIER_LABELS[requiredTier]}
                </Text>
              </View>

              <View style={styles.perks}>
                {TIER_PERKS[requiredTier].map((perk) => (
                  <View key={perk} style={styles.perkRow}>
                    <Text style={[styles.perkDot, { color }]}>◎</Text>
                    <Text style={styles.perkText}>{perk}</Text>
                  </View>
                ))}
              </View>

              {trialDays !== null && (
                <View style={styles.trialBadge}>
                  <Text style={styles.trialText}>{trialDays} dni gratis</Text>
                </View>
              )}

              <Pressable
                style={[styles.cta, { backgroundColor: color }]}
                onPress={handlePlans}
              >
                <Text style={styles.ctaText}>Zobacz plany</Text>
              </Pressable>

              <Pressable style={styles.dismiss} onPress={onClose}>
                <Text style={styles.dismissText}>Może później</Text>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7,10,12,0.82)',
    justifyContent: 'flex-end',
  },
  backdropInner: {
    paddingHorizontal: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.graphite,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  icon: {
    fontSize: 40,
    marginBottom: Spacing.xs,
  },
  title: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h3,
    color: Colors.starlight,
    textAlign: 'center',
  },
  tierBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
  },
  tierBadgeText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  perks: {
    width: '100%',
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  perkDot: { fontSize: 12 },
  perkText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.star,
    flex: 1,
  },
  trialBadge: {
    backgroundColor: Colors.aurora + '22',
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  trialText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.aurora,
    letterSpacing: 0.5,
  },
  cta: {
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  ctaText: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.body,
    color: Colors.void,
  },
  dismiss: {
    paddingVertical: Spacing.sm,
  },
  dismissText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.starGhost,
  },
});
