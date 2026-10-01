import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '@travelpoint/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { BackButton } from '@/components/ui/BackButton';
import { useAuthStore } from '@/stores/auth';
import { useBillingStatus, useCheckout, usePortal } from '@/hooks/useBilling';

// ── Pricing ──────────────────────────────────────────────────────────────────

const PRICES = {
  PRO:        { monthly: 49, annual: 39 },
  EXPEDITION: { monthly: 149, annual: 119 },
} as const;

// ── Tier definitions ─────────────────────────────────────────────────────────

interface TierDef {
  id: 'FREE' | 'PRO' | 'EXPEDITION';
  label: string;
  color: string;
  icon: string;
  tagline: string;
  features: { label: string; available: boolean }[];
}

const TIERS: TierDef[] = [
  {
    id: 'FREE',
    label: 'Explorer',
    color: Colors.starFaint,
    icon: '◎',
    tagline: 'Odkrywaj pierwsze miejsca',
    features: [
      { label: 'Mapa odkrywcza',            available: true },
      { label: 'Spoty publiczne bez limitu', available: true },
      { label: '3 wyprawy',                 available: true },
      { label: '25 zapisanych miejsc',       available: true },
      { label: 'Spoty dla zaufanych',        available: false },
      { label: 'Tajne dropy',               available: false },
      { label: 'Własne Circles',            available: false },
    ],
  },
  {
    id: 'PRO',
    label: 'Explorer PRO',
    color: Colors.signal,
    icon: '◈',
    tagline: 'Dla eksploratorów bez kompromisów',
    features: [
      { label: 'Wszystko z Free',              available: true },
      { label: 'Spoty dla zaufanych',           available: true },
      { label: 'Nieograniczone wyprawy',        available: true },
      { label: 'Nieograniczone zapisane miejsca', available: true },
      { label: 'Tajne dropy',                  available: false },
      { label: 'Własne Circles (do 5)',       available: false },
      { label: 'Ukryta warstwa mapy',         available: false },
    ],
  },
  {
    id: 'EXPEDITION',
    label: 'Expedition',
    color: Colors.ember,
    icon: '◉',
    tagline: 'Pełny dostęp do sieci',
    features: [
      { label: 'Wszystko z PRO',             available: true },
      { label: 'Tajne dropy',                  available: true },
      { label: 'Własne Circles (do 5)',       available: true },
      { label: 'Ukryta warstwa mapy',         available: true },
      { label: 'Priorytetowe wsparcie',       available: true },
      { label: 'Wczesny dostęp do funkcji',   available: true },
      { label: 'Explorer rank boost ×1.5',    available: true },
    ],
  },
];

// ── Price toggle ─────────────────────────────────────────────────────────────

function BillingToggle({
  annual,
  onToggle,
}: {
  annual: boolean;
  onToggle: () => void;
}) {
  const offset = useSharedValue(annual ? 1 : 0);
  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(offset.value * 88, { duration: 220 }) }],
  }));

  function handleToggle() {
    offset.value = annual ? 0 : 1;
    onToggle();
  }

  return (
    <View style={toggle.wrapper}>
      <Pressable style={toggle.track} onPress={handleToggle} accessibilityRole="switch">
        <Animated.View style={[toggle.knob, knobStyle]} />
        <Text style={[toggle.label, !annual && toggle.labelActive]}>Miesięcznie</Text>
        <Text style={[toggle.label, annual && toggle.labelActive]}>Rocznie</Text>
      </Pressable>
      {annual && (
        <Animated.View entering={FadeInDown.duration(200)} style={toggle.badge}>
          <Text style={toggle.badgeText}>Oszczędź 20%</Text>
        </Animated.View>
      )}
    </View>
  );
}

const toggle = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: Spacing.sm },
  track: {
    flexDirection: 'row',
    backgroundColor: Colors.graphite,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.steel,
    overflow: 'hidden',
    position: 'relative',
    height: 40,
    width: 200,
    alignItems: 'center',
  },
  knob: {
    position: 'absolute',
    width: 100,
    height: 38,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.graphiteSoft,
    borderWidth: 1,
    borderColor: Colors.steel,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.starGhost,
    zIndex: 1,
  },
  labelActive: { color: Colors.starlight },
  badge: {
    backgroundColor: Colors.aurora + '22',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.aurora,
    letterSpacing: 0.5,
  },
});

// ── Tier card ─────────────────────────────────────────────────────────────────

function TierCard({
  tier,
  currentTier,
  annual,
  onUpgrade,
  onPortal,
  isLoading,
}: {
  tier: TierDef;
  currentTier: string;
  annual: boolean;
  onUpgrade: (id: 'PRO' | 'EXPEDITION') => void;
  onPortal: () => void;
  isLoading: boolean;
}) {
  const isCurrent  = tier.id === currentTier;
  const isUpgrade  = tier.id !== 'FREE' && tier.id !== currentTier && (
    currentTier === 'FREE' || (currentTier === 'PRO' && tier.id === 'EXPEDITION')
  );
  const isDowngrade = tier.id !== 'FREE' && currentTier !== 'FREE' && !isUpgrade && !isCurrent;

  const price = tier.id !== 'FREE'
    ? PRICES[tier.id as 'PRO' | 'EXPEDITION'][annual ? 'annual' : 'monthly']
    : null;

  const annualTotal = tier.id !== 'FREE' && annual
    ? price! * 12
    : null;

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(TIERS.indexOf(tier) * 80)}>
      <GlassCard style={[
        styles.tierCard,
        isCurrent && { borderColor: tier.color + '50' },
        tier.id === 'EXPEDITION' && { borderColor: Colors.ember + '30', ...Shadow.emberGlow },
      ]}>
        {/* Card header */}
        <View style={styles.tierHeader}>
          <View style={[styles.tierIconWrap, { backgroundColor: tier.color + '18' }]}>
            <Text style={[styles.tierIcon, { color: tier.color }]}>{tier.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tierName, { color: tier.color }]}>{tier.label}</Text>
            <Text style={styles.tierTagline}>{tier.tagline}</Text>
          </View>
          {isCurrent && (
            <View style={[styles.currentBadge, { borderColor: tier.color + '50', backgroundColor: tier.color + '18' }]}>
              <Text style={[styles.currentBadgeText, { color: tier.color }]}>Aktywny</Text>
            </View>
          )}
          {tier.id === 'PRO' && !isCurrent && currentTier === 'FREE' && (
            <View style={styles.trialBadgeSmall}>
              <Text style={styles.trialBadgeSmallText}>7 dni gratis</Text>
            </View>
          )}
        </View>

        {/* Price */}
        {price !== null ? (
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: tier.color }]}>{price} PLN</Text>
            <Text style={styles.pricePer}>/mies</Text>
            {annualTotal && (
              <Text style={styles.priceAnnual}>({annualTotal} PLN/rok)</Text>
            )}
          </View>
        ) : (
          <Text style={[styles.price, { color: tier.color }]}>Gratis</Text>
        )}

        {/* Features */}
        <View style={styles.featureList}>
          {tier.features.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <Text style={[styles.featureDot, f.available ? { color: tier.color } : styles.featureDotOff]}>
                {f.available ? '◎' : '—'}
              </Text>
              <Text style={[styles.featureLabel, !f.available && styles.featureLabelOff]}>
                {f.label}
              </Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        {isUpgrade && (
          <Pressable
            style={[styles.ctaBtn, { backgroundColor: tier.color }]}
            onPress={() => onUpgrade(tier.id as 'PRO' | 'EXPEDITION')}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.void} size="small" />
            ) : (
              <Text style={styles.ctaBtnText}>
                {tier.id === 'PRO' && currentTier === 'FREE' ? 'Zacznij 7 dni za darmo' : `Przejdź na ${tier.label}`}
              </Text>
            )}
          </Pressable>
        )}

        {isCurrent && tier.id !== 'FREE' && (
          <Pressable style={styles.portalBtn} onPress={onPortal}>
            <Text style={styles.portalBtnText}>Zarządzaj subskrypcją</Text>
          </Pressable>
        )}

        {isDowngrade && (
          <Pressable style={styles.portalBtn} onPress={onPortal}>
            <Text style={styles.portalBtnText}>Zmień plan</Text>
          </Pressable>
        )}
      </GlassCard>
    </Animated.View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function PlansScreen() {
  const { explorer } = useAuthStore();
  const { data: billing, isLoading: billingLoading } = useBillingStatus();
  const checkout = useCheckout();
  const portal   = usePortal();
  const [annual, setAnnual] = useState(false);

  const currentTier = billing?.tier ?? explorer?.tier ?? 'FREE';

  function handleUpgrade(tier: 'PRO' | 'EXPEDITION') {
    checkout.mutate({ tier, billingPeriod: annual ? 'ANNUAL' : 'MONTHLY' });
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.eyebrow}>Sieć eksploratorów</Text>
          <Text style={styles.heading}>Wybierz poziom dostępu</Text>
          <Text style={styles.sub}>
            Dołącz do sieci. Im głębiej, tym więcej odkryjesz.
          </Text>
        </View>

        {/* Billing period toggle */}
        <BillingToggle annual={annual} onToggle={() => setAnnual((v) => !v)} />

        {/* Loading state */}
        {billingLoading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.aurora} />
          </View>
        )}

        {/* Tier cards */}
        {!billingLoading && TIERS.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            currentTier={currentTier}
            annual={annual}
            onUpgrade={handleUpgrade}
            onPortal={() => portal.mutate()}
            isLoading={checkout.isPending}
          />
        ))}

        {/* Fine print */}
        <View style={styles.finePrint}>
          <Text style={styles.fineText}>
            Subskrypcja odnawialna. Anuluj w dowolnym momencie w ustawieniach konta.
            Trial 7 dni dotyczy nowych subskrybentów planu PRO.
            Ceny netto, VAT doliczony według stawki krajowej.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.abyss },
  scroll: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: Spacing.xxxl },

  header: { gap: Spacing.sm },
  eyebrow: {
    fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro,
    color: Colors.starFaint, letterSpacing: 3, textTransform: 'uppercase',
  },
  heading: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h2, color: Colors.starlight },
  sub: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm,
    color: Colors.star, lineHeight: 22,
  },

  loadingWrap: { height: 120, alignItems: 'center', justifyContent: 'center' },

  tierCard: { gap: Spacing.md },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  tierIconWrap: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  tierIcon: { fontSize: 18 },
  tierName: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4 },
  tierTagline: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.micro,
    color: Colors.starFaint, marginTop: 2,
  },
  currentBadge: {
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
    borderRadius: BorderRadius.pill, borderWidth: 1,
  },
  currentBadgeText: { fontFamily: 'SpaceMono-Regular', fontSize: 9, letterSpacing: 0.5 },
  trialBadgeSmall: {
    backgroundColor: Colors.aurora + '22',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
  },
  trialBadgeSmallText: {
    fontFamily: 'SpaceMono-Regular', fontSize: 9,
    color: Colors.aurora, letterSpacing: 0.5,
  },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xs },
  price: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h2 },
  pricePer: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm,
    color: Colors.starFaint,
  },
  priceAnnual: {
    fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro,
    color: Colors.starFaint, marginLeft: Spacing.xs,
  },

  featureList: { gap: Spacing.xs },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  featureDot:    { fontSize: 12 },
  featureDotOff: { color: Colors.steel },
  featureLabel:    { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star },
  featureLabelOff: { color: Colors.starGhost },

  ctaBtn: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  ctaBtnText: {
    fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.body,
    color: Colors.void,
  },
  portalBtn: {
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.steel,
  },
  portalBtnText: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm,
    color: Colors.starFaint,
  },

  finePrint: { paddingTop: Spacing.md },
  fineText: {
    fontFamily: 'GeneralSans-Regular', fontSize: 11,
    color: Colors.starGhost, textAlign: 'center', lineHeight: 17,
  },
});
