import { useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { EmptyState, Icon, SkeletonRows, Text } from '@/components/ui';
import { Layout, Radius, Shadow, Spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

type Props<T> = {
  items: T[];
  getId: (item: T) => number;
  renderRow: (item: T, opts: { selected: boolean; onPress: () => void }) => ReactNode;
  /** Phone: navigate to the detail route. */
  onOpen: (id: number) => void;
  /** Tablet: rendered in the right pane. */
  renderDetail: (id: number) => ReactNode;
  loading: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached?: () => void;
  loadingMore?: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  listHeader?: ReactNode;
  /** Left inset for row separators. Defaults to icon-offset (56). Pass 0 for table layouts. */
  separatorInset?: number;
  /** Disable row dividers for card-style phone lists. */
  showSeparators?: boolean;
  /** Extra room below the last row, for example when a screen has a floating action button. */
  contentBottomPadding?: number;
  /** Present phone rows as the same light bordered cards used by the Activity screen. */
  phoneCards?: boolean;
  /** Space between the phone screen header and list controls. */
  phoneHeaderTopPadding?: number;
};

export function ResponsiveListDetail<T>({
  items,
  getId,
  renderRow,
  onOpen,
  renderDetail,
  loading,
  errorMessage,
  onRetry,
  refreshing,
  onRefresh,
  onEndReached,
  loadingMore,
  emptyTitle,
  emptyDescription,
  listHeader,
  separatorInset = Spacing.md + 44,
  showSeparators = true,
  contentBottomPadding = Spacing.xxl,
  phoneCards = true,
  phoneHeaderTopPadding = Spacing.md,
}: Props<T>) {
  const theme = useTheme();
  const { isTablet } = useResponsive();
  const [picked, setPicked] = useState<number | null>(null);

  // Tablet: derive a valid selection (picked if still present, else first row).
  const selectedId =
    picked != null && items.some((i) => getId(i) === picked) ? picked : (items[0] ? getId(items[0]) : null);

  const handlePress = (id: number) => {
    if (isTablet) setPicked(id);
    else onOpen(id);
  };

  const list = (
    <FlatList
      data={items}
      keyExtractor={(item) => String(getId(item))}
      renderItem={({ item }) => {
        const row = renderRow(item, {
          selected: isTablet && getId(item) === selectedId,
          onPress: () => handlePress(getId(item)),
        }) as React.ReactElement;

        return !isTablet && phoneCards ? (
          <View
            style={[
              styles.phoneCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
              Shadow.xs as object,
            ]}>
            {row}
          </View>
        ) : row;
      }}
      contentContainerStyle={[
        styles.listContent,
        { paddingBottom: contentBottomPadding },
        items.length === 0 && styles.listEmpty,
      ]}
      ItemSeparatorComponent={showSeparators && (isTablet || !phoneCards)
        ? () => <View style={[styles.sep, { backgroundColor: theme.border, marginLeft: separatorInset }]} />
        : undefined}
      ListHeaderComponent={listHeader ? (
        <View style={[styles.header, !isTablet && { paddingTop: phoneHeaderTopPadding }]}>{listHeader}</View>
      ) : null}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : null
      }
      ListEmptyComponent={
        loading ? (
          <SkeletonRows count={8} />
        ) : errorMessage ? (
          <EmptyState tone="error" title="Couldn’t load" description={errorMessage} actionLabel="Retry" onAction={onRetry} />
        ) : (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        )
      }
    />
  );

  if (!isTablet) return list;

  return (
    <View style={styles.split}>
      <View style={[styles.listPane, { width: Layout.listPaneWidth, borderRightColor: theme.border }]}>{list}</View>
      <View style={styles.detailPane}>
        {selectedId != null ? (
          renderDetail(selectedId)
        ) : (
          <View style={styles.placeholder}>
            <Icon name="sidebar" size={40} color={theme.textMuted} />
            <Text variant="body" color="textMuted">
              Select an item to see details
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: Spacing.sm },
  listEmpty: { flexGrow: 1 },
  header: { paddingHorizontal: Spacing.sm, paddingBottom: Spacing.sm },
  phoneCard: {
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  sep: { height: StyleSheet.hairlineWidth },
  footer: { paddingVertical: Spacing.lg },
  split: { flex: 1, flexDirection: 'row' },
  listPane: { borderRightWidth: StyleSheet.hairlineWidth },
  detailPane: { flex: 1 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
});
