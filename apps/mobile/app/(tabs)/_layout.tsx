import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withDelay,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { Colors, Spacing } from '@travelpoint/theme';
import { pl } from '@/i18n/pl';
import { useUnseenSignalsCount } from '@/hooks/useSignals';
import { useCircleUnreadCount } from '@/hooks/useCircles';
import { socketManager, type SocketStatus } from '@/lib/socket';

const TAB_ICONS: Record<string, string> = {
  index:    '◉',
  discover: '◈',
  circles:  '◑',
  journeys: '◎',
  identity: '◐',
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.icon, { color: focused ? Colors.aurora : Colors.starGhost }]}>
        {TAB_ICONS[name] ?? '○'}
      </Text>
    </View>
  );
}

function IdentityTabIcon({ focused, unseenCount }: { focused: boolean; unseenCount: number }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (unseenCount > 0) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.35, { duration: 600 }),
          withDelay(200, withTiming(1, { duration: 600 })),
        ),
        -1,
      );
    } else {
      pulse.value = withTiming(1, { duration: 300 });
    }
  }, [unseenCount > 0]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View style={styles.tabIcon}>
      <Animated.Text
        style={[
          styles.icon,
          { color: focused ? Colors.aurora : Colors.starGhost },
          unseenCount > 0 && animStyle,
        ]}
      >
        {TAB_ICONS['identity']}
      </Animated.Text>
    </View>
  );
}

function CirclesTabIcon({ focused, unreadCount }: { focused: boolean; unreadCount: number }) {
  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.icon, { color: focused ? Colors.aurora : Colors.starGhost }]}>
        {TAB_ICONS['circles']}
      </Text>
      {unreadCount > 0 && (
        <View style={styles.circleUnreadDot}>
          <Text style={styles.circleUnreadText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </View>
  );
}

function SocketBanner() {
  const [status, setStatus] = useState<SocketStatus>(socketManager.status);

  useEffect(() => {
    return socketManager.onStatusChange(setStatus);
  }, []);

  if (status === 'connected' || status === 'disconnected') return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>◌ Łączenie z siecią…</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { data: unseenCount = 0 } = useUnseenSignalsCount();
  const { count: circleUnread, reset: resetCircleUnread } = useCircleUnreadCount();
  const insets = useSafeAreaInsets();
  // Total tab bar height: 56px visual + system bottom safe area
  const tabBarHeight = 56 + insets.bottom;

  return (
    <>
      <SocketBanner />
      <Tabs
        screenOptions={{
          headerShown: false,
        tabBarStyle: {
          // NOT position: 'absolute' — the tab bar top edge is the hard viewport boundary
          // for every section. Content stops here, nothing slides under.
          height: tabBarHeight,
          paddingBottom: insets.bottom + Spacing.sm,
          backgroundColor: Colors.graphite,
          borderTopWidth: 1,
          borderTopColor: Colors.steel,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: Colors.aurora,
        tabBarInactiveTintColor: Colors.starGhost,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: pl.nav.atlas,
          tabBarIcon: ({ focused }) => <TabIcon name="index" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: pl.nav.discover,
          tabBarIcon: ({ focused }) => <TabIcon name="discover" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="circles"
        options={{
          title: pl.nav.circles,
          tabBarIcon: ({ focused }) => (
            <CirclesTabIcon focused={focused} unreadCount={circleUnread} />
          ),
        }}
        listeners={{ tabPress: () => resetCircleUnread() }}
      />
      <Tabs.Screen
        name="journeys"
        options={{
          title: pl.nav.journeys,
          tabBarIcon: ({ focused }) => <TabIcon name="journeys" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="identity"
        options={{
          title: pl.nav.identity,
          tabBarIcon: ({ focused }) => (
            <IdentityTabIcon focused={focused} unseenCount={unseenCount} />
          ),
          tabBarBadge: unseenCount > 0 ? (unseenCount > 9 ? '9+' : unseenCount) : undefined,
          tabBarBadgeStyle: styles.badge,
        }}
      />
    </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabIcon: { alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 22 },
  tabLabel: { fontFamily: 'GeneralSans-Regular', fontSize: 10 },
  circleUnreadDot: {
    position: 'absolute', top: -4, right: -8,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.violet, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  circleUnreadText: {
    fontFamily: 'SpaceMono-Regular', fontSize: 9, color: Colors.starlight, fontWeight: '700',
  },
  badge: {
    backgroundColor: Colors.ember,
    color: Colors.starlight,
    fontSize: 10,
    fontFamily: 'SpaceMono-Regular',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
  },
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
