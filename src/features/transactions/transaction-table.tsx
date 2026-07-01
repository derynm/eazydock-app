import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Transaction } from '@/api/types';
import { Badge, Button, EmptyState, Skeleton, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { durationSince, formatDuration, formatPlate } from '@/lib/format';
import { transactionStatusMeta } from '@/lib/status';

type Props = {
  items: Transaction[];
  toolbar: ReactNode;
  loading: boolean;
  errorMessage?: string;
  onRetry: () => void;
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  loadingMore: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  onOpen: (id: number) => void;
  canCheckOut: boolean;
  onCheckOut: (transaction: Transaction) => Promise<void>;
};

const TABLE_WIDTH = 990;

export function TransactionTable({
  items,
  toolbar,
  loading,
  errorMessage,
  onRetry,
  refreshing,
  onRefresh,
  onEndReached,
  loadingMore,
  emptyTitle,
  emptyDescription,
  onOpen,
  canCheckOut,
  onCheckOut,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useResponsive();
  const [checkingOutId, setCheckingOutId] = useState<number | null>(null);
  const [rootHeight, setRootHeight] = useState(0);
  const [toolbarHeight, setToolbarHeight] = useState(0);
  const visibleRows = loading && items.length === 0 ? 8 : items.length;
  const naturalHeight =
    items.length === 0 && !loading
      ? 320
      : 42 + Math.max(visibleRows, 1) * 56 + (loadingMore ? 48 : 0);
  const measuredSpace = rootHeight > 0 ? rootHeight - toolbarHeight - Spacing.md - insets.bottom : height - 230;
  const tableHeight = Math.min(naturalHeight, Math.max(180, measuredSpace));

  const handleCheckOut = async (transaction: Transaction) => {
    setCheckingOutId(transaction.id);
    try {
      await onCheckOut(transaction);
    } finally {
      setCheckingOutId(null);
    }
  };

  return (
    <View style={styles.root} onLayout={(event: LayoutChangeEvent) => setRootHeight(event.nativeEvent.layout.height)}>
      <View
        style={styles.toolbar}
        onLayout={(event: LayoutChangeEvent) => setToolbarHeight(event.nativeEvent.layout.height)}>
        {toolbar}
      </View>
      <ScrollView
        horizontal
        directionalLockEnabled
        style={styles.horizontal}
        contentContainerStyle={[styles.horizontalContent, { paddingBottom: Spacing.md + insets.bottom }]}
        showsHorizontalScrollIndicator>
        <View
          style={[
            styles.table,
            {
              width: TABLE_WIDTH,
              height: tableHeight,
              backgroundColor: theme.surface,
              borderColor: theme.borderStrong,
            },
          ]}>
          <View style={[styles.header, { backgroundColor: theme.surfaceSunken, borderBottomColor: theme.border }]}>
            <HeaderCell label="Reference" width={135} />
            <HeaderCell label="Plate" width={115} />
            <HeaderCell label="Driver" width={180} />
            <HeaderCell label="Location" width={190} />
            <HeaderCell label="Status" width={120} />
            <HeaderCell label="Duration" width={110} align="right" />
            <HeaderCell label="Action" width={140} align="right" />
          </View>

          {loading && items.length === 0 ? (
            <TableSkeleton />
          ) : errorMessage && items.length === 0 ? (
            <View style={styles.state}>
              <EmptyState tone="error" title="Couldn’t load" description={errorMessage} actionLabel="Retry" onAction={onRetry} />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.state}>
              <EmptyState title={emptyTitle} description={emptyDescription} />
            </View>
          ) : (
            <FlatList
              style={styles.list}
              nestedScrollEnabled
              data={items}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TransactionTableRow
                  transaction={item}
                  canCheckOut={canCheckOut}
                  checkingOut={checkingOutId === item.id}
                  onPress={() => onOpen(item.id)}
                  onCheckOut={() => handleCheckOut(item)}
                />
              )}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.4}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.footer}>
                    <ActivityIndicator color={theme.primary} />
                  </View>
                ) : null
              }
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function HeaderCell({ label, width, align }: { label: string; width: number; align?: 'left' | 'right' }) {
  return (
    <View style={[styles.cell, { width }, align === 'right' && styles.alignRight]}>
      <Text variant="overline" color="textMuted">
        {label}
      </Text>
    </View>
  );
}

function TransactionTableRow({
  transaction,
  canCheckOut,
  checkingOut,
  onPress,
  onCheckOut,
}: {
  transaction: Transaction;
  canCheckOut: boolean;
  checkingOut: boolean;
  onPress: () => void;
  onCheckOut: () => void;
}) {
  const theme = useTheme();
  const meta = transactionStatusMeta(transaction.status);
  const active = transaction.status === 'active' || transaction.status === 'overstay';
  const driver = transaction.driver?.full_name ?? transaction.driver_snapshot?.full_name ?? '—';
  const location =
    [transaction.parking_area?.name, transaction.parking_space?.space_code].filter(Boolean).join(' · ') || '—';

  return (
    <Pressable
      onPress={onPress}
      style={(state) => [
        styles.row,
        { borderBottomColor: theme.border },
        state.pressed && { backgroundColor: theme.surfaceSunken },
      ]}>
      <Cell width={135} value={transaction.transaction_no} strong />
      <Cell width={115} value={formatPlate(transaction.entry_plate_number_raw)} strong />
      <Cell width={180} value={driver} />
      <Cell width={190} value={location} />
      <View style={[styles.cell, { width: 120 }]}>
        <Badge label={meta.label} tone={meta.tone} size="sm" dot />
      </View>
      <View style={[styles.cell, styles.alignRight, { width: 110 }]}>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {active ? durationSince(transaction.car_in_at) : formatDuration(transaction.duration_minutes)}
        </Text>
      </View>
      <View style={[styles.actionCell, { width: 140 }]}>
        {active && canCheckOut ? (
          <Button
            title="Check out"
            size="sm"
            loading={checkingOut}
            onPress={(event) => {
              event.stopPropagation();
              onCheckOut();
            }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

function Cell({ width, value, strong }: { width: number; value: string; strong?: boolean }) {
  return (
    <View style={[styles.cell, { width }]}>
      <Text variant={strong ? 'bodyStrong' : 'body'} color={strong ? 'text' : 'textSecondary'} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function TableSkeleton() {
  return (
    <View>
      {Array.from({ length: 8 }).map((_, index) => (
        <View key={index} style={styles.skeletonRow}>
          <View style={styles.skeletonReference}><Skeleton width={92} height={14} /></View>
          <View style={styles.skeletonPlate}><Skeleton width={72} height={14} /></View>
          <View style={styles.skeletonDriver}><Skeleton width={126} height={14} /></View>
          <View style={styles.skeletonLocation}><Skeleton width={140} height={14} /></View>
          <View style={styles.skeletonStatus}><Skeleton width={74} height={22} radius={Radius.pill} /></View>
          <View style={styles.skeletonDuration}><Skeleton width={48} height={14} /></View>
          <View style={styles.skeletonAction}><Skeleton width={78} height={36} radius={Radius.md} /></View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  horizontal: { flexGrow: 0 },
  horizontalContent: { minWidth: '100%', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  table: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  list: { flex: 1 },
  header: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cell: { paddingHorizontal: Spacing.md, justifyContent: 'center' },
  alignRight: { alignItems: 'flex-end' },
  actionCell: { paddingHorizontal: Spacing.sm, alignItems: 'flex-end', justifyContent: 'center' },
  state: { flex: 1, justifyContent: 'center' },
  footer: { paddingVertical: Spacing.lg },
  skeletonRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center' },
  skeletonReference: { width: 135, paddingHorizontal: Spacing.md },
  skeletonPlate: { width: 115, paddingHorizontal: Spacing.md },
  skeletonDriver: { width: 180, paddingHorizontal: Spacing.md },
  skeletonLocation: { width: 190, paddingHorizontal: Spacing.md },
  skeletonStatus: { width: 120, paddingHorizontal: Spacing.md },
  skeletonDuration: { width: 110, paddingHorizontal: Spacing.md, alignItems: 'flex-end' },
  skeletonAction: { width: 140, paddingHorizontal: Spacing.sm, alignItems: 'flex-end' },
});
