import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withSequence,
  interpolateColor,
} from 'react-native-reanimated';
import { Tabs } from 'expo-router';
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

  useEffect(() => {
    glow.value = withTiming(focused ? 1 : 0, { duration: 200 });
    if (!focused) press.value = withTiming(1, { duration: 150 });
  }, [focused]);

  function handlePress() {
    press.value = withSequence(
      withSpring(0.84, { damping: 8, stiffness: 700 }),
      withSpring(1,    { damping: 12, stiffness: 300 }),
    );
    void Haptics.selectionAsync();
    onPress();
  }

  // Pure SCAPES: opaque starlight pill on active, transparent on inactive.
  // No layout-changing animations — fixes the icon-size-on-mount bug.
  const pillStyle = useAnimatedStyle(() => {
    const bg = interpolateColor(glow.value, [0, 1], ['rgba(237,232,223,0)', 'rgba(237,232,223,1)']);
    return { backgroundColor: bg, transform: [{ scale: press.value }] };
  });

  return (
    <Pressable
      style={styles.tabItem}
      onPress={handlePress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
    >
      <Animated.View style={[styles.pill, pillStyle]}>
        <Ionicons
          name={focused ? cfg.icon : cfg.iconOff}
          size={20}
          color={focused ? Colors.abyss : Colors.starFaint}
        />
      </Animated.View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{cfg.label}</Text>

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
    <View style={[styles.barOuter, { paddingBottom: insets.bottom + 10 }]}>
      <View style={styles.barShadow}>
        <View style={styles.barShell}>
          <LinearGradient
            colors={['rgba(30,38,46,0.96)', 'rgba(12,17,22,0.96)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, styles.barTint]} />
          <View style={styles.barTopLine} />
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
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
        }}
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
  // Outer is transparent → screen background bleeds through (true floating feel)
  barOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  // Shadow wrapper — no overflow:hidden so Android elevation renders correctly
  barShadow: {
    borderRadius: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 16,
  },
  // Clip wrapper — no elevation so Android doesn't conflict
  barShell: {
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(237,232,223,0.12)',
  },
  // Warm organic tint over the gradient
  barTint: {
    backgroundColor: 'rgba(237,232,223,0.025)',
  },
  // Top highlight line — simulates glass edge light refraction
  barTopLine: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(237,232,223,0.22)',
  },
  tabsRow: {
    flexDirection: 'row',
    height: 76,
    alignItems: 'center',
    paddingHorizontal: 6,
  },

  // ── Tab item ─────────────────────────────────────────────────────────────────
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 76,
    gap: 2,
  },
  tabLabel: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 8,
    color: Colors.starGhost,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tabLabelActive: {
    color: Colors.starFaint,
  },

  // SCAPES pill: active = starlight, inactive = transparent. Fixed size — no layout animation.
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 40,
    borderRadius: 20,
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
