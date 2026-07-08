import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { toApiError } from '@/api/client';
import { checkOut, listActiveVehicles, listTransactions } from '@/api/transactions';
import type { Transaction } from '@/api/types';
import { Screen } from '@/components/screen';
import { ResponsiveListDetail } from '@/components/responsive-list-detail';
import {
  Badge,
  Button,
  Icon,
  IconButton,
  ListRow,
  SearchBar,
  Segmented,
  Text,
  ViewModeToggle,
  type ViewMode,
} from '@/components/ui';
import { Radius } from '@/constants/theme';
import { TransactionDetail } from '@/features/transactions/transaction-detail';
import { TransactionExportSheet } from '@/features/transactions/transaction-export';
import { TransactionTable } from '@/features/transactions/transaction-table';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePaginatedList } from '@/hooks/use-paginated-list';
import { usePermissions } from '@/hooks/use-permissions';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/auth/session';
import { confirm } from '@/lib/confirm';
import { durationSince, formatDuration, formatPlate } from '@/lib/format';
import { transactionStatusMeta } from '@/lib/status';

const SCOPES = [
  { value: 'active', label: 'On site' },
  { value: 'all', label: 'All' },
] as const;

export default function TransactionsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const theme = useTheme();
  const { can } = usePermissions();
  const { isTablet } = useResponsive();
  const [scope, setScope] = useState<'active' | 'all'>('active');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [showExport, setShowExport] = useState(false);
  const debounced = useDebouncedValue(search);
  const { selectedBuilding } = useSession();

  const fetcher = scope === 'active' ? listActiveVehicles : listTransactions;
  const baseKey = scope === 'active' ? ['active-vehicles', selectedBuilding?.id] : ['transactions', selectedBuilding?.id];
  const list = usePaginatedList(baseKey, fetcher, { search: debounced, building_id: selectedBuilding?.id });
  const handleCheckOut = async (transaction: Transaction) => {
    const ok = await confirm({
      title: 'Check out vehicle?',
      message: formatPlate(transaction.entry_plate_number_raw),
      confirmLabel: 'Check out',
    });
    if (!ok) return;

    try {
      await checkOut(transaction.id, 'manual_entry');
      await Promise.all([
        list.refetch(),
        qc.invalidateQueries({ queryKey: ['transactions'] }),
        qc.invalidateQueries({ queryKey: ['active-vehicles'] }),
        qc.invalidateQueries({ queryKey: ['transaction', transaction.id] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    } catch (error) {
      await confirm({
        title: 'Couldn’t check out',
        message: toApiError(error).message,
        confirmLabel: 'OK',
      });
    }
  };
  const toolbar = (
    <View style={styles.toolbar}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search plate, ref, driver…" />
      <View style={styles.viewRow}>
        <View style={styles.flex}>
          <Segmented options={SCOPES as never} value={scope} onChange={(v) => setScope(v as 'active' | 'all')} />
        </View>
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </View>
    </View>
  );

  return (
    <Screen
      title="Activity"
      subtitle={list.total ? `${list.total} ${scope === 'active' ? 'on site' : 'total'}` : undefined}
      headerRight={
        <View style={styles.headerActions}>
          {can('operations.transactions', 'export') ? (
            <IconButton name="download" accessibilityLabel="Export transactions" surface onPress={() => setShowExport(true)} />
          ) : null}
          {can('operations.transactions', 'create') ? (
            isTablet ? (
              <Button title="Check in" icon="carIn" size="sm" onPress={() => router.push('/transactions/check-in')} />
            ) : (
              <IconButton name="add" accessibilityLabel="New check-in" surface onPress={() => router.push('/transactions/check-in')} />
            )
          ) : null}
        </View>
      }>
      {viewMode === 'table' ? (
        <TransactionTable
          items={list.items}
          toolbar={toolbar}
          loading={list.isLoading}
          errorMessage={list.isError ? list.error?.message : undefined}
          onRetry={list.refetch}
          refreshing={list.isRefetching}
          onRefresh={list.refetch}
          onEndReached={() => list.hasNextPage && list.fetchNextPage()}
          loadingMore={list.isFetchingNextPage}
          emptyTitle={scope === 'active' ? 'No vehicles on site' : 'No transactions found'}
          emptyDescription={debounced ? 'Try a different search.' : scope === 'active' ? 'Checked-in vehicles will appear here.' : undefined}
          onOpen={(id) => router.push(`/transactions/${id}`)}
          canCheckOut={can('operations.transactions', 'update')}
          onCheckOut={handleCheckOut}
        />
      ) : (
        <ResponsiveListDetail
          items={list.items}
          getId={(t) => t.id}
          loading={list.isLoading}
          errorMessage={list.isError ? list.error?.message : undefined}
          onRetry={list.refetch}
          refreshing={list.isRefetching}
          onRefresh={list.refetch}
          onEndReached={() => list.hasNextPage && list.fetchNextPage()}
          loadingMore={list.isFetchingNextPage}
          emptyTitle={scope === 'active' ? 'No vehicles on site' : 'No transactions found'}
          emptyDescription={debounced ? 'Try a different search.' : scope === 'active' ? 'Checked-in vehicles will appear here.' : undefined}
          onOpen={(id) => router.push(`/transactions/${id}`)}
          renderDetail={(id) => <TransactionDetail key={id} id={id} />}
          listHeader={toolbar}
          renderRow={(t, { selected, onPress }) => {
            const meta = transactionStatusMeta(t.status);
            const active = t.status === 'active' || t.status === 'overstay';
            return (
              <ListRow
                title={formatPlate(t.entry_plate_number_raw)}
                subtitle={`${t.parking_area?.name ?? ''}${t.parking_space ? ` · ${t.parking_space.space_code}` : ''}`}
                meta={t.driver?.full_name ?? t.driver_snapshot?.full_name ?? undefined}
                selected={selected}
                onPress={onPress}
                leading={
                  <View style={[styles.icon, { backgroundColor: meta.tone === 'warning' ? theme.warningSoft : theme.primarySoft }]}>
                    <Icon name="transactions" size={20} color={meta.tone === 'warning' ? theme.warning : theme.primary} />
                  </View>
                }
                trailing={
                  <View style={styles.trail}>
                    <Badge label={meta.label} tone={meta.tone} size="sm" dot />
                    <Text variant="caption" color="textMuted">
                      {active ? durationSince(t.car_in_at) : formatDuration(t.duration_minutes)}
                    </Text>
                  </View>
                }
              />
            );
          }}
        />
      )}

      <TransactionExportSheet
        visible={showExport}
        onClose={() => setShowExport(false)}
        buildingId={selectedBuilding?.id}
        initialStatus={scope === 'active' ? 'active' : ''}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  trail: { alignItems: 'flex-end', gap: 4 },
  toolbar: { gap: 12 },
  viewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
});
