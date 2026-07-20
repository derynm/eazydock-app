import { Redirect, Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppSidebar } from '@/components/app-sidebar';
import { BottomNavigation } from '@/components/bottom-navigation';
import { Layout } from '@/constants/theme';
import { useSession } from '@/auth/session';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { ShellContext } from '@/shell/shell-context';

const DRAWER_WIDTH = 300;

const contentScreenOptions = {
  headerShown: false,
  animation: 'default',
} as const;

const flowScreenOptions = {
  headerShown: false,
  presentation: 'card',
  animation: 'slide_from_bottom',
} as const;

export default function AppLayout() {
  const theme = useTheme();
  const { status } = useSession();
  const { isTablet, width } = useResponsive();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const progress = useSharedValue(0); // 0 closed, 1 open (phone)

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);

  // Overlay only applies on phone; ignore any stale open state on tablet.
  const overlayOpen = drawerOpen && !isTablet;

  useEffect(() => {
    progress.value = withTiming(overlayOpen ? 1 : 0, { duration: 240 });
  }, [overlayOpen, progress]);

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.value - 1) * DRAWER_WIDTH }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    pointerEvents: progress.value > 0 ? 'auto' : 'none',
  }));

  const shell = useMemo(
    () => ({ isTablet, drawerOpen, openDrawer, closeDrawer, collapsed, toggleCollapsed }),
    [isTablet, drawerOpen, openDrawer, closeDrawer, collapsed, toggleCollapsed],
  );

  if (status === 'loading') {
    return <View style={[styles.fill, { backgroundColor: theme.background }]} />;
  }
  if (status === 'guest') {
    return <Redirect href="/login" />;
  }

  const contentStack = (
    <Stack screenOptions={{ ...contentScreenOptions, contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="transactions/check-in" options={flowScreenOptions} />
      <Stack.Screen name="bookings/create" options={flowScreenOptions} />
    </Stack>
  );

  // Tablet: pinned sidebar (rail when collapsed) beside the content.
  if (isTablet) {
    const sidebarWidth = collapsed ? Layout.sidebarRailWidth : Math.min(Layout.sidebarWidth, width * 0.32);
    return (
      <ShellContext.Provider value={shell}>
        <View style={[styles.row, { backgroundColor: theme.background }]}>
          <View style={{ width: sidebarWidth }}>
            <AppSidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} showCollapseToggle />
          </View>
          <View style={styles.fill}>
            {contentStack}
          </View>
        </View>
      </ShellContext.Provider>
    );
  }

  // Phone: full-bleed content + overlay drawer.
  return (
    <ShellContext.Provider value={shell}>
      <View style={[styles.fill, { backgroundColor: theme.background }]}>
        {contentStack}
        <BottomNavigation />
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { backgroundColor: theme.scrim }, scrimStyle]}>
          <Pressable style={styles.fill} onPress={closeDrawer} accessibilityLabel="Close menu" />
        </Animated.View>
        <Animated.View style={[styles.drawer, { width: DRAWER_WIDTH }, drawerStyle]}>
          <AppSidebar onNavigate={closeDrawer} />
        </Animated.View>
      </View>
    </ShellContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flex: 1, flexDirection: 'row' },
  scrim: { zIndex: 10 },
  drawer: { position: 'absolute', top: 0, bottom: 0, left: 0, zIndex: 20 },
});
