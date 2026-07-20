import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, Text, type IconName } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/hooks/use-theme';

type BottomNavItem = {
  key: string;
  label: string;
  route: string;
  icon: IconName;
  slug: string;
};

const ITEMS: BottomNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', route: '/dashboard', icon: 'dashboard', slug: 'dashboard' },
  { key: 'bookings', label: 'Bookings', route: '/bookings', icon: 'bookings', slug: 'operations.bookings' },
  { key: 'tenants', label: 'Tenants', route: '/tenants', icon: 'tenants', slug: 'locations.tenants' },
  { key: 'bays', label: 'Bays', route: '/parking-spaces', icon: 'bays', slug: 'locations.spaces' },
  { key: 'drivers', label: 'Drivers', route: '/drivers', icon: 'drivers', slug: 'people_vehicles.drivers' },
];

export function BottomNavigation() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { can } = usePermissions();

  const isTopLevelPage = pathname.split('/').filter(Boolean).length === 1;
  if (!isTopLevelPage) return null;

  const items = ITEMS.filter((item) => can(item.slug, 'view'));

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.safeArea, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      <View style={styles.items} accessibilityRole="tablist">
        {items.map((item) => {
          const active = pathname === item.route || pathname.startsWith(`${item.route}/`);

          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.label}
              onPress={() => router.navigate(item.route as never)}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
              <Icon
                name={item.icon}
                size={23}
                color={active ? theme.primary : theme.textSecondary}
                weight={active ? 'semibold' : 'regular'}
              />
              <Text
                variant="caption"
                tint={active ? theme.primary : theme.textSecondary}
                style={[styles.label, active && styles.labelActive]}
                numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { borderTopWidth: 1 },
  items: { minHeight: 60, flexDirection: 'row', alignItems: 'stretch' },
  item: {
    flex: 1,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: Spacing.xs,
    paddingTop: Spacing.sm,
    paddingBottom: 6,
  },
  itemPressed: { opacity: 0.65 },
  label: { fontSize: 11, lineHeight: 14 },
  labelActive: { fontWeight: '600' },
});
