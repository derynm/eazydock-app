import { useRouter, usePathname } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand';
import { CompanySwitcher } from '@/components/company-switcher';
import { Icon, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/auth/session';
import { useTheme } from '@/hooks/use-theme';
import { usePermissions } from '@/hooks/use-permissions';
import { MOBILE_MENU } from '@/navigation/mobile-menu';

type Props = {
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
  showCollapseToggle?: boolean;
};

export function AppSidebar({ collapsed = false, onNavigate, onToggleCollapse, showCollapseToggle }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { can } = usePermissions();
  const { user, logout } = useSession();

  const groups = MOBILE_MENU.map((g) => ({
    ...g,
    items: g.items.filter((i) => can(i.slug, 'view')),
  })).filter((g) => g.items.length > 0);

  const go = (route: string) => {
    onNavigate?.();
    router.navigate(route as never);
  };

  const handleLogout = async () => {
    onNavigate?.();
    await logout();
    router.replace('/login');
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.sidebar }]}>
      <SafeAreaView edges={['top', 'bottom', 'left']} style={styles.safe}>
        {/* Brand */}
        <View style={[styles.brand, collapsed && styles.brandCollapsed]}>
          <BrandMark size={36} />
          {!collapsed ? (
            <View style={styles.brandText}>
              <Text variant="bodyStrong" tint={theme.sidebarText}>
                eazydock
              </Text>
              <Text variant="caption" tint={theme.sidebarMuted}>
                Operations
              </Text>
            </View>
          ) : null}
          {showCollapseToggle && !collapsed ? (
            <Pressable hitSlop={8} onPress={onToggleCollapse} style={styles.collapseBtn}>
              <Icon name="sidebar" size={20} color={theme.sidebarMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* Nav */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.nav}>
          {groups.map((group) => (
            <View key={group.key} style={styles.group}>
              {group.title && !collapsed ? (
                <Text variant="overline" tint={theme.sidebarMuted} style={styles.groupTitle}>
                  {group.title}
                </Text>
              ) : null}
              {group.items.map((item) => {
                const active = pathname.startsWith(item.route);
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => go(item.route)}
                    style={({ pressed }) => [
                      styles.item,
                      collapsed && styles.itemCollapsed,
                      active && { backgroundColor: theme.sidebarActive },
                      !active && pressed && { backgroundColor: theme.sidebarAlt },
                    ]}>
                    <Icon
                      name={item.icon}
                      size={21}
                      color={active ? '#FFFFFF' : theme.sidebarMuted}
                      weight={active ? 'semibold' : 'regular'}
                    />
                    {!collapsed ? (
                      <Text variant="body" tint={active ? '#FFFFFF' : theme.sidebarText} style={styles.itemLabel}>
                        {item.label}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: theme.sidebarBorder }]}>
          {!collapsed ? (
            <>
              <CompanySwitcher />
              <View style={styles.userRow}>
                <View style={[styles.userAvatar, { backgroundColor: theme.sidebarAlt }]}>
                  <Icon name="user" size={22} color={theme.sidebarText} />
                </View>
                <View style={styles.userText}>
                  <Text variant="label" tint={theme.sidebarText} numberOfLines={1}>
                    {user?.name ?? 'Signed in'}
                  </Text>
                  <Text variant="caption" tint={theme.sidebarMuted} numberOfLines={1}>
                    {user?.email ?? ''}
                  </Text>
                </View>
                <Pressable hitSlop={8} onPress={handleLogout} style={styles.logoutBtn}>
                  <Icon name="logout" size={20} color={theme.sidebarMuted} />
                </Pressable>
              </View>
            </>
          ) : (
            <Pressable onPress={handleLogout} style={[styles.item, styles.itemCollapsed]}>
              <Icon name="logout" size={21} color={theme.sidebarMuted} />
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  brandCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  brandText: { flex: 1, gap: 1 },
  collapseBtn: { padding: 4 },
  nav: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, gap: Spacing.lg, paddingBottom: Spacing.xl },
  group: { gap: 2 },
  groupTitle: { paddingHorizontal: Spacing.sm, marginBottom: Spacing.xs },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  itemCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  itemLabel: { flex: 1 },
  footer: { padding: Spacing.md, gap: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xs },
  userAvatar: { width: 38, height: 38, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  userText: { flex: 1, gap: 1 },
  logoutBtn: { padding: 6 },
});
