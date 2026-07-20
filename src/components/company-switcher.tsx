import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useActiveCompany, useSession } from '@/auth/session';
import { useTheme } from '@/hooks/use-theme';

export function CompanySwitcher() {
  const theme = useTheme();
  const router = useRouter();
  const { companies, activeCompanyId, switchCompany } = useSession();
  const active = useActiveCompany();
  const [open, setOpen] = useState(false);

  if (companies.length === 0) return null;
  const single = companies.length === 1;

  return (
    <>
      <Pressable
        disabled={single}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, { borderColor: theme.sidebarBorder }, pressed && { opacity: 0.7 }]}>
        <View style={[styles.badge, { backgroundColor: theme.sidebarActive }]}>
          <Text variant="label" tint="#FFFFFF">
            {active?.code?.slice(0, 2) ?? '—'}
          </Text>
        </View>
        <View style={styles.triggerText}>
          <Text variant="caption" tint={theme.sidebarMuted}>
            Company
          </Text>
          <Text variant="bodyStrong" tint={theme.sidebarText} numberOfLines={1}>
            {active?.name ?? 'Select…'}
          </Text>
        </View>
        {!single ? <Icon name="swap" size={16} color={theme.sidebarMuted} /> : null}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.scrim, { backgroundColor: theme.scrim }]} onPress={() => setOpen(false)}>
          <SafeAreaView style={styles.sheetWrap}>
            <Pressable style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text variant="overline" color="textMuted" style={styles.sheetTitle}>
                Switch company
              </Text>
              {companies.map((c) => {
                const selected = c.id === activeCompanyId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={async () => {
                      setOpen(false);
                      if (selected) return;
                      await switchCompany(c.id);
                      router.replace('/select-building');
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      { borderColor: theme.border },
                      selected && { backgroundColor: theme.primarySoft, borderColor: 'transparent' },
                      pressed && !selected && { backgroundColor: theme.surfaceSunken },
                    ]}>
                    <View style={[styles.optionBadge, { backgroundColor: selected ? theme.primary : theme.surfaceSunken }]}>
                      <Text variant="label" tint={selected ? theme.onPrimary : theme.textSecondary}>
                        {c.code.slice(0, 2)}
                      </Text>
                    </View>
                    <View style={styles.optionText}>
                      <Text variant="bodyStrong" numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text variant="caption" color="textMuted">
                        {c.code}
                      </Text>
                    </View>
                    {selected ? <Icon name="checkCircle" size={20} color={theme.primary} /> : null}
                  </Pressable>
                );
              })}
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  triggerText: { flex: 1, gap: 1 },
  scrim: { flex: 1, justifyContent: 'center', padding: Spacing.xl },
  sheetWrap: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  sheet: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.lg, gap: Spacing.sm },
  sheetTitle: { marginBottom: Spacing.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  optionBadge: { width: 38, height: 38, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, gap: 1 },
});
