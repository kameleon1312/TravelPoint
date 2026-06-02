import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '@travelpoint/theme';
import { pl } from '@/i18n/pl';
import { useUnseenSignalsCount } from '@/hooks/useSignals';

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

export default function TabsLayout() {
  const { data: unseenCount = 0 } = useUnseenSignalsCount();
  const insets = useSafeAreaInsets();
  // Total tab bar height: 56px visual + system bottom safe area
  const tabBarHeight = 56 + insets.bottom;

  return (
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
          tabBarIcon: ({ focused }) => <TabIcon name="circles" focused={focused} />,
        }}
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
          tabBarIcon: ({ focused }) => <TabIcon name="identity" focused={focused} />,
          tabBarBadge: unseenCount > 0 ? (unseenCount > 9 ? '9+' : unseenCount) : undefined,
          tabBarBadgeStyle: styles.badge,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: { alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 22 },
  tabLabel: { fontFamily: 'GeneralSans-Regular', fontSize: 10 },
  badge: {
    backgroundColor: Colors.ember,
    color: Colors.starlight,
    fontSize: 10,
    fontFamily: 'SpaceMono-Regular',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
  },
});
