import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withSequence,
  interpolate, interpolateColor,
} from 'react-native-reanimated';
import { Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

type NavRoute = { key: string; name: string };
type TabBarProps = {
  state: { index: number; routes: NavRoute[] };
  navigation: {
    emit: (e: { type: string; target: string; canPreventDefault?: boolean }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
  descriptors: Record<string, unknown>;
};
import { Colors, Spacing } from '@travelpoint/theme';
import { pl } from '@/i18n/pl';
import { useUnseenSignalsCount } from '@/hooks/useSignals';
import { useCircleUnreadCount } from '@/hooks/useCircles';
import { socketManager, type SocketStatus } from '@/lib/socket';

// ── Tab config ────────────────────────────────────────────────────────────────
type TabName = 'index' | 'discover' | 'circles' | 'journeys' | 'identity';
type IoniconName = ComponentProps<typeof Ionicons>['name'];

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
  onPress,
  onLongPress,
}: {
  name: TabName;
  focused: boolean;
  badge?: number;
  badgeColor?: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const cfg   = TAB_CONFIG[name];
  const press = useSharedValue(1);
  const glow  = useSharedValue(focused ? 1 : 0);
  const iconY = useSharedValue(focused ? -1 : 0);

  useEffect(() => {
    glow.value  = withTiming(focused ? 1 : 0, { duration: 210 });
    iconY.value = withSpring(focused ? -1.5 : 0, { damping: 16, stiffness: 400 });
    if (!focused) press.value = withTiming(1, { duration: 150 });
  }, [focused]);

  function handlePress() {
    press.value = withSequence(
      withSpring(0.88, { damping: 6, stiffness: 700 }),
      withSpring(1.06, { damping: 10, stiffness: 400 }),
      withSpring(1,    { damping: 14, stiffness: 280 }),
    );
    void Haptics.selectionAsync();
    onPress();
  }

  // Elastic pill — background and border animate with focus
  const pillStyle = useAnimatedStyle(() => {
    const bg     = interpolateColor(glow.value, [0, 1], ['rgba(92,184,140,0)', 'rgba(92,184,140,0.13)']);
    const border = interpolateColor(glow.value, [0, 1], ['rgba(92,184,140,0)', 'rgba(92,184,140,0.42)']);
    return {
      backgroundColor: bg,
      borderColor:     border,
      transform:       [{ scale: press.value }],
    };
  });

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: iconY.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.55, 1]),
  }));

  return (
    <Pressable
      style={styles.tabItem}
      onPress={handlePress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
    >
      <Animated.View style={[styles.pill, pillStyle]}>
        {/* Icon with subtle lift on focus */}
        <Animated.View style={iconStyle}>
          <Ionicons
            name={focused ? cfg.icon : cfg.iconOff}
            size={21}
            color={focused ? Colors.aurora : Colors.star}
          />
        </Animated.View>

        {/* Label fades in fully when focused */}
        <Animated.Text
          style={[styles.tabLabel, focused && styles.tabLabelActive, labelStyle]}
          numberOfLines={1}
        >
          {cfg.label}
        </Animated.Text>
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
function CustomTabBar({ state, navigation }: TabBarProps) {
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
        {state.routes.map((route: NavRoute, index: number) => {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tabBar={(props) => <CustomTabBar {...(props as any)} />}
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
    borderTopWidth: 0.5,
    borderTopColor: Colors.steel,
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
    height: 60,
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },

  // ── Tab item ─────────────────────────────────────────────────────────────────
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
  },

  // Elastic pill — auto-sizes to content, bg+border animated via useAnimatedStyle
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 48,
  },

  // ── Labels ───────────────────────────────────────────────────────────────────
  tabLabel: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 10,
    color: Colors.star,
    letterSpacing: 0.15,
  },
  tabLabelActive: {
    color: Colors.aurora,
    fontFamily: 'GeneralSans-Semibold',
    letterSpacing: 0.1,
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
