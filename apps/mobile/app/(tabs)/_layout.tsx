import { Tabs } from 'expo-router';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withSequence,
  withRepeat, withDelay,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing } from '@travelpoint/theme';
import { pl } from '@/i18n/pl';
import { useUnseenSignalsCount } from '@/hooks/useSignals';
import { useCircleUnreadCount } from '@/hooks/useCircles';
import { socketManager, type SocketStatus } from '@/lib/socket';

// ── Tab config ────────────────────────────────────────────────────────────────
type TabName = 'index' | 'discover' | 'circles' | 'journeys' | 'identity';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<TabName, { icon: IoniconName; iconOff: IoniconName; label: string }> = {
  index:    { icon: 'map',            iconOff: 'map-outline',            label: pl.nav.atlas },
  discover: { icon: 'compass',        iconOff: 'compass-outline',        label: pl.nav.discover },
  circles:  { icon: 'people',         iconOff: 'people-outline',         label: pl.nav.circles },
  journeys: { icon: 'bookmarks',      iconOff: 'bookmarks-outline',      label: pl.nav.journeys },
  identity: { icon: 'person-circle',  iconOff: 'person-circle-outline',  label: pl.nav.identity },
};

// ── Single tab item ───────────────────────────────────────────────────────────
function TabItem({
  name,
  focused,
  badge,
  badgeColor,
  hasPulse,
  onPress,
  onLongPress,
}: {
  name: TabName;
  focused: boolean;
  badge?: number;
  badgeColor?: string;
  hasPulse?: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const cfg = TAB_CONFIG[name];
  const scale          = useSharedValue(1);
  const capsuleOpacity = useSharedValue(focused ? 1 : 0);
  const capsuleScale   = useSharedValue(focused ? 1 : 0.5);
  const iconScale      = useSharedValue(focused ? 1.06 : 1);
  const pulse          = useSharedValue(1);

  useEffect(() => {
    capsuleOpacity.value = withTiming(focused ? 1 : 0, { duration: 160 });
    capsuleScale.value   = withSpring(focused ? 1 : 0.5, { damping: 20, stiffness: 280 });
    iconScale.value      = withSpring(focused ? 1.08 : 1, { damping: 18, stiffness: 260 });
  }, [focused]);

  useEffect(() => {
    if (hasPulse) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.35, { duration: 600 }),
          withDelay(300, withTiming(1, { duration: 500 })),
        ),
        -1,
      );
    } else {
      pulse.value = withTiming(1, { duration: 250 });
    }
  }, [hasPulse]);

  function handlePress() {
    scale.value = withSequence(
      withSpring(0.80, { damping: 22, stiffness: 500 }),
      withSpring(1,    { damping: 12, stiffness: 280 }),
    );
    void Haptics.selectionAsync();
    onPress();
  }

  const wrapAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const capsuleAnimStyle = useAnimatedStyle(() => ({
    opacity: capsuleOpacity.value,
    transform: [{ scale: capsuleScale.value }],
  }));
  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value * pulse.value }],
  }));

  return (
    <Pressable
      style={styles.tabItem}
      onPress={handlePress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
    >
      <Animated.View style={[styles.tabInner, wrapAnimStyle]}>
        {/* Glow capsule */}
        <Animated.View style={[styles.capsule, capsuleAnimStyle]} />

        {/* Icon */}
        <Animated.View style={iconAnimStyle}>
          <Ionicons
            name={focused ? cfg.icon : cfg.iconOff}
            size={name === 'index' ? 24 : 22}
            color={focused ? Colors.aurora : Colors.starGhost}
          />
        </Animated.View>

        {/* Label */}
        <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
          {cfg.label}
        </Text>
      </Animated.View>

      {/* Badge */}
      {badge && badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: badgeColor ?? Colors.ember }]}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ── Custom tab bar ────────────────────────────────────────────────────────────
function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { data: unseenCount = 0 }          = useUnseenSignalsCount();
  const { count: circleUnread, reset: resetCircleUnread } = useCircleUnreadCount();

  return (
    <View style={[styles.barOuter, { paddingBottom: insets.bottom }]}>
      {/* Top glow line */}
      <LinearGradient
        colors={['transparent', Colors.aurora + '28', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topLine}
        pointerEvents="none"
      />

      <View style={styles.tabsRow}>
        {state.routes.map((route, index) => {
          const name    = route.name as TabName;
          const focused = state.index === index;

          const badge = name === 'identity'
            ? unseenCount
            : name === 'circles'
              ? circleUnread
              : 0;

          const badgeColor = name === 'circles' ? Colors.violet : Colors.ember;

          return (
            <TabItem
              key={route.key}
              name={name}
              focused={focused}
              badge={badge}
              badgeColor={badgeColor}
              hasPulse={name === 'identity' && unseenCount > 0 && focused}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
                if (name === 'circles') resetCircleUnread();
              }}
              onLongPress={() => {
                navigation.emit({ type: 'tabLongPress', target: route.key });
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

// ── Socket reconnecting banner ────────────────────────────────────────────────
function SocketBanner() {
  const [status, setStatus] = useState<SocketStatus>(socketManager.status);
  useEffect(() => socketManager.onStatusChange(setStatus), []);
  if (status === 'connected' || status === 'disconnected') return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>◌ Łączenie z siecią…</Text>
    </View>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function TabsLayout() {
  return (
    <>
      <SocketBanner />
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tabs.Screen name="index"    options={{ title: pl.nav.atlas }} />
        <Tabs.Screen name="discover" options={{ title: pl.nav.discover }} />
        <Tabs.Screen name="circles"  options={{ title: pl.nav.circles }} />
        <Tabs.Screen name="journeys" options={{ title: pl.nav.journeys }} />
        <Tabs.Screen name="identity" options={{ title: pl.nav.identity }} />
      </Tabs>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Bar container ────────────────────────────────────────────────────────────
  barOuter: {
    backgroundColor: Colors.graphite,
    borderTopWidth: 1,
    borderTopColor: Colors.steel,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 20,
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    height: 62,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },

  // ── Tab item ─────────────────────────────────────────────────────────────────
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 62,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    position: 'relative',
  },

  // ── Aurora glow capsule ──────────────────────────────────────────────────────
  capsule: {
    position: 'absolute',
    width: 58,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.aurora + '14',
    borderWidth: 1,
    borderColor: Colors.aurora + '28',
    // subtle inner glow via shadow
    shadowColor: Colors.aurora,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },

  // ── Labels ───────────────────────────────────────────────────────────────────
  tabLabel: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 9,
    color: Colors.starGhost,
    letterSpacing: 0.2,
    marginTop: 1,
  },
  tabLabelActive: {
    color: Colors.aurora,
    fontFamily: 'SpaceMono-Regular',
  },

  // ── Badge ────────────────────────────────────────────────────────────────────
  badge: {
    position: 'absolute',
    top: 7,
    right: '50%',
    marginRight: -24,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: Colors.graphite,
  },
  badgeText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 9,
    color: Colors.starlight,
    fontWeight: '700',
    lineHeight: 12,
  },

  // ── Socket banner ────────────────────────────────────────────────────────────
  banner: {
    backgroundColor: Colors.signal + '22',
    borderBottomWidth: 1,
    borderBottomColor: Colors.signal + '40',
    paddingVertical: 6,
    alignItems: 'center',
  },
  bannerText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 10,
    color: Colors.signal,
    letterSpacing: 1,
  },
});
