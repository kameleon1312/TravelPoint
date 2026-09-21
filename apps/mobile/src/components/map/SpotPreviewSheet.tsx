import {
  View, Text, StyleSheet, Pressable,
} from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring, withTiming, runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@travelpoint/theme';
import { CoordLabel } from '../ui/CoordLabel';
import { pl } from '@/i18n/pl';
import type { SpotForViewer } from '@travelpoint/types';

const CATEGORY_ICONS: Record<string, string> = {
  ABANDONED: '◈', CAFE: '◎', BEACH: '◎',
  ROUTE: '◉', UNDERGROUND: '◈', VIEWPOINT: '◎', CAMP: '◉',
};
const CATEGORY_LABELS = pl.spotCategories as Record<string, string>;
const ACCESS_COLORS: Record<string, string> = {
  PUBLIC: Colors.aurora,
  TRUSTED: Colors.signal,
  SECRET_DROP: Colors.ember,
  CIRCLE_ONLY: Colors.violet,
};
const ACCESS_LABELS = pl.spotAccess as Record<string, string>;

interface Props {
  spot: SpotForViewer | null;
  onDismiss: () => void;
}

const SHEET_HEIGHT = 260;
const SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.8 };

export function SpotPreviewSheet({ spot, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SHEET_HEIGHT + 40);

  useEffect(() => {
    if (spot) {
      translateY.value = withSpring(0, SPRING_CONFIG);
    } else {
      translateY.value = withTiming(SHEET_HEIGHT + 40, { duration: 250 });
    }
  }, [spot]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > SHEET_HEIGHT * 0.35 || e.velocityY > 600) {
        translateY.value = withTiming(SHEET_HEIGHT + 40, { duration: 220 }, () => {
          runOnJS(onDismiss)();
        });
      } else {
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!spot) return null;

  const isLocked    = 'locked' in spot && spot.locked;
  const category    = 'category' in spot ? (spot as { category: string }).category : 'ABANDONED';
  const title       = 'title' in spot ? (spot as { title: string }).title : '???';
  const accessLevel = 'accessLevel' in spot ? (spot as { accessLevel: string }).accessLevel : 'PUBLIC';
  const accentColor = ACCESS_COLORS[accessLevel] ?? Colors.aurora;

  function handleOpen() {
    onDismiss();
    router.push(`/spot/${spot!.id}`);
  }

  return (
    <GestureHandlerRootView style={[StyleSheet.absoluteFill, styles.container]} pointerEvents="box-none">
      {/* Backdrop — tap to dismiss */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + Spacing.md },
            sheetStyle,
          ]}
        >
          {/* Header: drag handle + dismiss */}
          <View style={styles.sheetHeader}>
            <View style={styles.handle} />
            <Pressable onPress={onDismiss} style={styles.dismissBtn} hitSlop={12}>
              <Text style={styles.dismissBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Eyebrow — category */}
          <Text style={styles.eyebrow}>
            {CATEGORY_ICONS[category] ?? '◎'}{'  '}{CATEGORY_LABELS[category] ?? category}
          </Text>

          {/* Title */}
          <Text style={[styles.title, isLocked && { color: Colors.starGhost }]} numberOfLines={2}>
            {title}
          </Text>

          {/* Coords + access badge row */}
          <View style={styles.metaRow}>
            <CoordLabel lat={spot.lat} lng={spot.lng} locked={isLocked} />
            <View style={[styles.accessBadge, { borderColor: accentColor + '50' }]}>
              <Text style={[styles.accessBadgeText, { color: accentColor }]}>
                {ACCESS_LABELS[accessLevel] ?? accessLevel}
              </Text>
            </View>
          </View>

          {/* CTA */}
          <Pressable
            style={[styles.openBtn, isLocked && styles.openBtnLocked]}
            onPress={handleOpen}
          >
            <Text style={[styles.openBtnText, isLocked && { color: Colors.starFaint }]}>
              {isLocked ? '◈ Zablokowane — otwórz szczegóły' : '◉ Otwórz spot'}
            </Text>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  sheet: {
    backgroundColor: Colors.graphite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: Colors.steel,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.steel,
  },
  dismissBtn: {
    position: 'absolute',
    right: 0,
    padding: Spacing.xs,
  },
  dismissBtnText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 16,
    color: Colors.starFaint,
  },
  eyebrow: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.starFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h4,
    color: Colors.starlight,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  accessBadge: {
    borderWidth: 1,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
  },
  accessBadgeText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  openBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.aurora,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  openBtnLocked: {
    backgroundColor: Colors.graphiteSoft,
    borderWidth: 1,
    borderColor: Colors.steel,
  },
  openBtnText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: FontSize.body,
    color: Colors.void,
  },
});
