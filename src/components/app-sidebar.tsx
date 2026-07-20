import { usePathname, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/auth/session';
import { CompanySwitcher } from '@/components/company-switcher';
import { Icon, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/hooks/use-theme';
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
  const { user, logout, selectedBuilding } = useSession();

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

  const openProfile = () => {
    onNavigate?.();
    router.navigate('/profile' as never);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.sidebar }]}>
      <SafeAreaView edges={['top', 'bottom', 'left']} style={styles.safe}>
        {/* Company context */}
        <View style={[styles.companyHeader, collapsed && styles.companyHeaderCollapsed]}>
          {!collapsed ? (
            <View style={styles.companySwitcher}>
              <CompanySwitcher />
            </View>
          ) : null}
          {showCollapseToggle ? (
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
              <Pressable
                onPress={() => { onNavigate?.(); router.navigate('/select-building' as never); }}
                style={[styles.buildingChip, { backgroundColor: theme.sidebarAlt }]}>
                <Icon name="buildings" size={17} color={theme.sidebarMuted} />
                <Text variant="caption" tint={theme.sidebarMuted} style={styles.buildingLabel} numberOfLines={1}>
                  {selectedBuilding ? selectedBuilding.name : 'Select building'}
                </Text>
                <Icon name="chevronDown" size={13} color={theme.sidebarMuted} />
              </Pressable>
              <View style={styles.userRow}>
                <Pressable
                  onPress={openProfile}
                  accessibilityRole="button"
                  accessibilityLabel="Open profile"
                  style={({ pressed }) => [styles.profileButton, pressed && { opacity: 0.75 }]}>
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
                </Pressable>
                <Pressable hitSlop={8} onPress={handleLogout} style={styles.logoutBtn}>
                  <Icon name="logout" size={20} color={theme.sidebarMuted} />
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Pressable onPress={openProfile} style={[styles.item, styles.itemCollapsed]}>
                <Icon name="user" size={21} color={theme.sidebarMuted} />
              </Pressable>
              <Pressable onPress={handleLogout} style={[styles.item, styles.itemCollapsed]}>
                <Icon name="logout" size={21} color={theme.sidebarMuted} />
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  companyHeaderCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  companySwitcher: { flex: 1, minWidth: 0 },
  collapseBtn: { padding: 4 },
  buildingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
  },
  buildingLabel: { flex: 1 },
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
  profileButton: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  userAvatar: { width: 38, height: 38, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  userText: { flex: 1, gap: 1 },
  logoutBtn: { padding: 6 },
});
