import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton, Text } from '@/components/ui';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useShell } from '@/shell/shell-context';

type Props = {
  title: string;
  subtitle?: string;
  subtitleLoading?: boolean;
  headerRight?: ReactNode;
  /** Sticky area below the title (search, filters). */
  toolbar?: ReactNode;
  /** Back button instead of the menu (detail screens on phone). */
  onBack?: () => void;
  /** Use a denser header on phone while keeping the standard tablet header. */
  compactHeader?: boolean;
  children: ReactNode;
};

export function Screen({ title, subtitle, subtitleLoading, headerRight, toolbar, onBack, compactHeader, children }: Props) {
  const theme = useTheme();
  const { isTablet, openDrawer } = useShell();
  const isCompact = compactHeader && !isTablet;

  const leading = onBack ? (
    <IconButton name="arrowLeft" accessibilityLabel="Back" onPress={onBack} color={theme.text} />
  ) : !isTablet ? (
    <IconButton name="menu" accessibilityLabel="Open menu" onPress={openDrawer} color={theme.text} />
  ) : null;

  return (
    <SafeAreaView edges={isTablet ? ['top', 'right'] : ['top']} style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, isCompact && styles.headerCompact, { borderBottomColor: theme.border, backgroundColor: theme.background }]}>
        <View style={styles.headerLeft}>
          {leading}
          <View style={styles.titleWrap}>
            <Text variant={isCompact ? 'heading' : 'title'} numberOfLines={1}>
              {title}
            </Text>
            {subtitleLoading ? (
              <View style={[styles.subtitleSkeleton, { backgroundColor: theme.skeleton }]} />
            ) : subtitle ? (
              <Text variant="caption" color="textMuted" numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
      </View>
      {toolbar ? <View style={styles.toolbar}>{toolbar}</View> : null}
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    minHeight: Layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCompact: { minHeight: 50, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  titleWrap: { flex: 1, gap: 1 },
  subtitleSkeleton: { width: 64, height: 14, borderRadius: 7 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  toolbar: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  body: { flex: 1 },
});
