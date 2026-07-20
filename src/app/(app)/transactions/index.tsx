import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { toApiError } from '@/api/client';
import { lookupParkingAreas } from '@/api/lookups';
import { checkOut, listActiveVehicles, listTransactions } from '@/api/transactions';
import type { Transaction } from '@/api/types';
import { useSession } from '@/auth/session';
import { ResponsiveListDetail } from '@/components/responsive-list-detail';
import { Screen } from '@/components/screen';
import {
  Badge,
  Button,
  FilterSheet,
  Icon,
  IconButton,
  ListRow,
  SearchBar,
  Segmented,
  Select,
  Text,
  ViewModeToggle,
  type ViewMode,
} from '@/components/ui';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { TransactionDetail } from '@/features/transactions/transaction-detail';
import { TransactionExportSheet } from '@/features/transactions/transaction-export';
import { TransactionTable } from '@/features/transactions/transaction-table';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePaginatedList } from '@/hooks/use-paginated-list';
import { usePermissions } from '@/hooks/use-permissions';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { durationSince, formatDuration, formatPlate } from '@/lib/format';
import { DRIVER_TYPES } from '@/lib/options';
import { transactionStatusMeta } from '@/lib/status';

const SCOPES = [
  { value: 'active', label: 'On site' },
  { value: 'all', label: 'All' },
] as const;

function TransactionCard({ transaction, onPress }: { transaction: Transaction; onPress: () => void }) {
  const theme = useTheme();
  const meta = transactionStatusMeta(transaction.status);
  const active = transaction.status === 'active' || transaction.status === 'overstay';
  const location = [transaction.parking_area?.name, transaction.parking_space?.space_code]
    .filter(Boolean)
    .join('  ·  ');
  const driver = transaction.driver?.full_name ?? transaction.driver_snapshot?.full_name;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open transaction for ${formatPlate(transaction.entry_plate_number_raw)}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.transactionCard,
        { backgroundColor: pressed ? theme.surfaceSunken : theme.surface, borderColor: theme.border },
        Shadow.xs as object,
      ]}>
      <View
        style={[
          styles.cardIcon,
          { backgroundColor: meta.tone === 'warning' ? theme.warningSoft : theme.primarySoft },
        ]}>
        <Icon
          name="transactions"
          size={20}
          color={meta.tone === 'warning' ? theme.warning : theme.primary}
        />
      </View>
      <View style={styles.cardBody}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {formatPlate(transaction.entry_plate_number_raw)}
        </Text>
        {location ? (
          <View style={styles.cardMetaLine}>
            <Icon name="pin" size={14} color={theme.textMuted} />
            <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.flex}>
              {location}
            </Text>
          </View>
        ) : null}
        {driver ? (
          <View style={styles.cardMetaLine}>
            <Icon name="user" size={14} color={theme.textMuted} />
            <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.flex}>
              {driver}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardStatus}>
        <Badge label={meta.label} tone={meta.tone} size="sm" dot />
        <View style={styles.durationLine}>
          <Icon name="clock" size={14} color={theme.textMuted} />
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {active ? durationSince(transaction.car_in_at) : formatDuration(transaction.duration_minutes)}
          </Text>
        </View>
      </View>
      <Icon name="chevronRight" size={16} color={theme.textMuted} />
    </Pressable>
  );
}

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
  const [showFilter, setShowFilter] = useState(false);
  const [areaId, setAreaId] = useState<number | null>(null);
  const [driverType, setDriverType] = useState('');
  const debounced = useDebouncedValue(search);
  const { selectedBuilding } = useSession();

  const fetcher = scope === 'active' ? listActiveVehicles : listTransactions;
  const baseKey = scope === 'active' ? ['active-vehicles', selectedBuilding?.id] : ['transactions', selectedBuilding?.id];
  const list = usePaginatedList(baseKey, fetcher, {
    search: debounced,
    building_id: selectedBuilding?.id,
    parking_area_id: areaId || undefined,
    driver_type: driverType || undefined,
  });
  const otherScope = scope === 'active' ? 'all' : 'active';
  const { data: otherScopePage } = useQuery({
    queryKey: [
      'transaction-scope-count',
      otherScope,
      selectedBuilding?.id,
      debounced,
      areaId,
      driverType,
    ],
    queryFn: () =>
      (otherScope === 'active' ? listActiveVehicles : listTransactions)({
        page: 1,
        search: debounced,
        building_id: selectedBuilding?.id,
        parking_area_id: areaId || undefined,
        driver_type: driverType || undefined,
      }),
  });
  const activeCount = scope === 'active' ? list.total : otherScopePage?.meta.total;
  const allCount = scope === 'all' ? list.total : otherScopePage?.meta.total;
  const { data: areas = [] } = useQuery({
    queryKey: ['lookup-areas', selectedBuilding?.id],
    queryFn: () => lookupParkingAreas(selectedBuilding?.id),
  });
  const areaOptions = [{ label: 'All areas', value: 0 }, ...areas.map((area) => ({ label: area.name, value: area.id }))];
  const driverTypeOptions = [{ label: 'All driver types', value: '' }, ...DRIVER_TYPES];
  const hasFilters = areaId !== null || driverType !== '';
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
    <View style={[styles.toolbar, !isTablet && styles.toolbarPhone]}>
      <View style={styles.searchRow}>
        <View style={styles.flex}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search plate, ref, driver…" />
        </View>
        <View>
          <IconButton
            name="filter"
            accessibilityLabel="Filter transactions"
            onPress={() => setShowFilter(true)}
            style={[styles.filterButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          />
          {hasFilters ? <View style={[styles.filterDot, { backgroundColor: theme.primary }]} /> : null}
        </View>
      </View>
      <View style={styles.viewRow}>
        <View style={styles.flex}>
          <Segmented
            options={SCOPES.map((option) => ({
              ...option,
              count: option.value === 'active' ? activeCount : allCount,
            })) as never}
            value={scope}
            onChange={(v) => setScope(v as 'active' | 'all')}
            activeTone="primary"
          />
        </View>
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </View>
    </View>
  );

  return (
    <Screen
      title="Activity"
      headerRight={
        <View style={styles.headerActions}>
          {can('operations.transactions', 'export') ? (
            <IconButton
              name="download"
              accessibilityLabel="Export Activity"
              surface
              onPress={() => setShowExport(true)}
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderWidth: 1,
              }}
            />
          ) : null}
          {can('operations.transactions', 'create') ? (
            isTablet ? (
              <Button title="Check in" icon="carIn" size="sm" onPress={() => router.push('/transactions/check-in')} />
            ) : null
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
          showSeparators={isTablet}
          phoneCards={false}
          phoneHeaderTopPadding={0}
          contentBottomPadding={isTablet ? Spacing.xxl : 96}
          renderRow={(t, { selected, onPress }) => {
            const meta = transactionStatusMeta(t.status);
            const active = t.status === 'active' || t.status === 'overstay';
            if (!isTablet) return <TransactionCard transaction={t} onPress={onPress} />;

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

      <FilterSheet visible={showFilter} onClose={() => setShowFilter(false)} title="Filter transactions">
        <Select
          value={areaId ?? 0}
          options={areaOptions}
          onChange={(value) => setAreaId((value as number) || null)}
          placeholder="All areas"
        />
        <Select
          value={driverType}
          options={driverTypeOptions}
          onChange={(value) => setDriverType(value as string)}
          placeholder="All driver types"
        />
      </FilterSheet>

      {!isTablet && can('operations.transactions', 'create') ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New check-in"
          onPress={() => router.push('/transactions/check-in')}
          style={({ pressed }) => [
            styles.checkInFab,
            { backgroundColor: theme.primary },
            Shadow.md as object,
            pressed && styles.checkInFabPressed,
          ]}>
          <Icon name="add" size={26} color={theme.onPrimary} />
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  trail: { alignItems: 'flex-end', gap: 4 },
  toolbar: { gap: 12 },
  toolbarPhone: { paddingTop: Spacing.md },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  filterButton: { width: 44, height: 44, borderWidth: 1 },
  filterDot: { position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: Radius.pill },
  viewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  transactionCard: {
    minHeight: 96,
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  cardIcon: { width: 42, height: 42, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, minWidth: 0, gap: 3 },
  cardMetaLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  cardStatus: { alignItems: 'flex-end', gap: 5, flexShrink: 0 },
  durationLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  checkInFab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  checkInFabPressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
});
