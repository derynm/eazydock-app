import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { toApiError } from '@/api/client';
import { lookupParkingAreas } from '@/api/lookups';
import { checkOut, listActiveVehicles, listTransactions } from '@/api/transactions';
import type { ListParams, Transaction } from '@/api/types';
import { useSession } from '@/auth/session';
import { ResponsiveListDetail } from '@/components/responsive-list-detail';
import { Screen } from '@/components/screen';
import {
  Badge,
  Button,
  DateTimeField,
  FilterSheet,
  Icon,
  IconButton,
  ListRow,
  SearchBar,
  Segmented,
  Select,
  Text,
  TimeField,
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
import { dateValueFromPicker, instantFromSydneyDateTimeValue, sydneyNowPickerDate, toSydneyDateTimeValue } from '@/lib/sydney-time';

const SCOPES = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'On site' },
  { value: 'completed', label: 'Completed' },
] as const;

const DATE_MODES = [
  { value: 'today', label: 'Today' },
  { value: 'between', label: 'Date between' },
] as const;

type TransactionScope = (typeof SCOPES)[number]['value'];
type DateMode = (typeof DATE_MODES)[number]['value'];

function dateAndTime(value: string, time: string, endOfDay: boolean): string {
  if (!value) return '';
  const clock = time || (endOfDay ? '23:59' : '00:00');
  return instantFromSydneyDateTimeValue(`${value}T${clock}:${endOfDay ? '59' : '00'}`)?.toISOString() ?? '';
}

function toSydneyTime(value: string): string {
  if (!value) return '';
  const match = toSydneyDateTimeValue(value).match(/T(\d{2}:\d{2})$/);
  return match?.[1] ?? '';
}

function TransactionCard({ transaction, onPress }: { transaction: Transaction; onPress: () => void }) {
  const theme = useTheme();
  const meta = transactionStatusMeta(transaction.status);
  const active = transaction.status === 'active';
  const location = [transaction.parking_area?.name, transaction.parking_space?.space_code]
    .filter(Boolean)
    .join('  ·  ');
  const driver = transaction.driver?.full_name ?? 'Unknown driver';
  const plate = formatPlate(transaction.vehicle?.plate_number) || 'Unknown plate';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open transaction for ${plate}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.transactionCard,
        { backgroundColor: pressed ? theme.surfaceSunken : theme.surface, borderColor: theme.border },
        Shadow.xs as object,
      ]}>
      <View
        style={[
          styles.cardIcon,
          { backgroundColor: theme.primarySoft },
        ]}>
        <Icon
          name="transactions"
          size={20}
          color={theme.primary}
        />
      </View>
      <View style={styles.cardBody}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {plate}
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
        {transaction.is_overstay ? <Badge label="Overstay" tone="warning" size="sm" dot /> : null}
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
  const { activeCompanyId, selectedBuilding } = useSession();
  const buildingId = selectedBuilding?.id;
  const [scope, setScope] = useState<TransactionScope>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [showExport, setShowExport] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [openExportAfterFilter, setOpenExportAfterFilter] = useState(false);
  const [areaSelection, setAreaSelection] = useState<{
    companyId: number | null;
    buildingId: number | undefined;
    areaId: number | null;
  }>({ companyId: activeCompanyId, buildingId, areaId: null });
  const [driverType, setDriverType] = useState('');
  const [dateMode, setDateMode] = useState<DateMode>('today');
  const [todayTimeFrom, setTodayTimeFrom] = useState('');
  const [todayTimeTo, setTodayTimeTo] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debounced = useDebouncedValue(search);
  const areaId = areaSelection.companyId === activeCompanyId && areaSelection.buildingId === buildingId
    ? areaSelection.areaId
    : null;
  const today = dateValueFromPicker(sydneyNowPickerDate());

  const commonParams = {
    search: debounced || undefined,
    building_id: buildingId,
    parking_area_id: areaId || undefined,
    driver_type: driverType || undefined,
  };
  const paramsForScope = (targetScope: TransactionScope): ListParams => {
    const hasTodayTimeFilter = dateMode === 'today' && (!!todayTimeFrom || !!todayTimeTo);
    const dateParams = hasTodayTimeFilter
      ? {
          date_from: dateAndTime(today, todayTimeFrom, false) || undefined,
          date_to: dateAndTime(today, todayTimeTo, true) || undefined,
        }
      : dateMode === 'between'
        ? {
            date_from: dateAndTime(dateFrom, '', false) || undefined,
            date_to: dateAndTime(dateTo, '', true) || undefined,
          }
        : {};
    return {
      ...commonParams,
      ...dateParams,
      status: targetScope === 'completed' ? 'completed' : undefined,
    };
  };
  const fetcherForScope = (targetScope: TransactionScope) =>
    targetScope === 'active' ? listActiveVehicles : listTransactions;
  const exportFilters: ListParams = {
    ...paramsForScope(scope),
    status: scope === 'all' ? undefined : scope,
  };
  const fetcher = fetcherForScope(scope);
  const baseKey = scope === 'active'
    ? ['active-vehicles', buildingId]
    : ['transactions', buildingId];
  const list = usePaginatedList(
    baseKey,
    fetcher,
    paramsForScope(scope),
  );
  const scopeCountQueries = useQueries({
    queries: SCOPES.map((option) => ({
      queryKey: ['transaction-scope-count', option.value, activeCompanyId, buildingId, paramsForScope(option.value)],
      queryFn: () => fetcherForScope(option.value)({ page: 1, per_page: 1, ...paramsForScope(option.value) }),
      enabled: option.value !== scope,
    })),
  });

  useFocusEffect(
    useCallback(() => {
      const currentScopeKey = scope === 'active'
        ? ['active-vehicles', buildingId]
        : ['transactions', buildingId];
      void Promise.all([
        qc.refetchQueries({ queryKey: currentScopeKey, type: 'active' }),
        qc.refetchQueries({ queryKey: ['transaction-scope-count'], type: 'active' }),
      ]);
    }, [buildingId, qc, scope]),
  );

  const countForScope = (targetScope: TransactionScope) => {
    if (targetScope === scope) return list.total;
    const index = SCOPES.findIndex((option) => option.value === targetScope);
    return scopeCountQueries[index]?.data?.meta.total;
  };
  const { data: areas = [] } = useQuery({
    queryKey: ['lookup-areas', activeCompanyId, buildingId],
    queryFn: () => lookupParkingAreas(buildingId),
  });
  const areaOptions = [{ label: 'All areas', value: 0 }, ...areas.map((area) => ({ label: area.name, value: area.id }))];
  const driverTypeOptions = [{ label: 'All driver types', value: '' }, ...DRIVER_TYPES];
  const hasFilters =
    areaId !== null ||
    driverType !== '' ||
    (dateMode === 'today' ? !!todayTimeFrom || !!todayTimeTo : !!dateFrom || !!dateTo);
  const openTransaction = (id: number) => {
    const transaction = list.items.find((item) => item.id === id);
    if (transaction) qc.setQueryData(['transaction-summary', id], transaction);
    router.push(`/transactions/${id}`);
  };
  const openExport = () => {
    setOpenExportAfterFilter(true);
    setShowFilter(false);
  };
  const handleFilterClosed = () => {
    if (!openExportAfterFilter) return;
    setOpenExportAfterFilter(false);
    setShowExport(true);
  };
  const handleCheckOut = async (transaction: Transaction) => {
    const ok = await confirm({
      title: 'Check out vehicle?',
      message: formatPlate(transaction.vehicle?.plate_number) || 'Unknown plate',
      confirmLabel: 'Check out',
    });
    if (!ok) return;

    try {
      await checkOut(transaction.id);
      await Promise.all([
        list.refetch(),
        qc.invalidateQueries({ queryKey: ['transactions'] }),
        qc.invalidateQueries({ queryKey: ['active-vehicles'] }),
        qc.invalidateQueries({ queryKey: ['transaction-scope-count'] }),
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
            accessibilityLabel="Filter activity"
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
              count: countForScope(option.value),
            })) as never}
            value={scope}
            onChange={(v) => setScope(v as TransactionScope)}
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
          emptyTitle={scope === 'active' ? 'No vehicles on site' : scope === 'completed' ? 'No completed transactions' : 'No transactions found'}
          emptyDescription={debounced ? 'Try a different search.' : scope === 'active' ? 'Checked-in vehicles will appear here.' : scope === 'completed' ? 'Checked-out vehicles will appear here.' : undefined}
          onOpen={openTransaction}
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
          emptyTitle={scope === 'active' ? 'No vehicles on site' : scope === 'completed' ? 'No completed transactions' : 'No transactions found'}
          emptyDescription={debounced ? 'Try a different search.' : scope === 'active' ? 'Checked-in vehicles will appear here.' : scope === 'completed' ? 'Checked-out vehicles will appear here.' : undefined}
          onOpen={openTransaction}
          renderDetail={(id) => <TransactionDetail key={id} id={id} summary={list.items.find((item) => item.id === id)} />}
          listHeader={toolbar}
          showSeparators={isTablet}
          phoneCards={false}
          phoneHeaderTopPadding={0}
          contentBottomPadding={isTablet ? Spacing.xxl : 96}
          renderRow={(t, { selected, onPress }) => {
            const meta = transactionStatusMeta(t.status);
            const active = t.status === 'active';
            if (!isTablet) return <TransactionCard transaction={t} onPress={onPress} />;

            return (
              <ListRow
                title={formatPlate(t.vehicle?.plate_number) || 'Unknown plate'}
                subtitle={`${t.parking_area?.name ?? ''}${t.parking_space ? ` · ${t.parking_space.space_code}` : ''}`}
                meta={t.driver?.full_name ?? 'Unknown driver'}
                selected={selected}
                onPress={onPress}
                leading={
                  <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
                    <Icon name="transactions" size={20} color={theme.primary} />
                  </View>
                }
                trailing={
                  <View style={styles.trail}>
                    <Badge label={meta.label} tone={meta.tone} size="sm" dot />
                    {t.is_overstay ? <Badge label="Overstay" tone="warning" size="sm" dot /> : null}
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
        key={scope}
        visible={showExport}
        onClose={() => setShowExport(false)}
        filters={exportFilters}
      />

      <FilterSheet
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        onClosed={handleFilterClosed}
        title="Filter activity">
        {can('operations.transactions', 'export') ? (
          <View style={styles.drawerActionRow}>
            <Text variant="label" color="textSecondary">Export activity</Text>
            <IconButton
              name="download"
              accessibilityLabel="Export Activity"
              surface
              onPress={openExport}
              style={[styles.filterButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            />
          </View>
        ) : null}
        <Select
          value={areaId ?? 0}
          options={areaOptions}
          onChange={(value) => setAreaSelection({
            companyId: activeCompanyId,
            buildingId,
            areaId: (value as number) || null,
          })}
          placeholder="All areas"
        />
        <Select
          value={driverType}
          options={driverTypeOptions}
          onChange={(value) => setDriverType(value as string)}
          placeholder="All driver types"
        />
        <View style={styles.dateModeField}>
          <Segmented
            options={DATE_MODES as never}
            value={dateMode}
            onChange={(value) => {
              const nextMode = value as DateMode;
              if (nextMode === 'today') {
                setTodayTimeFrom(toSydneyTime(dateFrom));
                setTodayTimeTo(toSydneyTime(dateTo));
              } else {
                setDateFrom(todayTimeFrom ? dateAndTime(today, todayTimeFrom, false) : '');
                setDateTo(todayTimeTo ? dateAndTime(today, todayTimeTo, true) : '');
              }
              setDateMode(nextMode);
            }}
          />
        </View>
        {dateMode === 'today' ? (
          <View style={styles.dateRow}>
            <View style={styles.dateCol}>
              <TimeField
                label="From time"
                value={todayTimeFrom}
                onChange={(value) => {
                  setTodayTimeFrom(value);
                  if (value && todayTimeTo && value > todayTimeTo) setTodayTimeTo(value);
                }}
                placeholder="Start of day"
                clearable
              />
            </View>
            <View style={styles.dateCol}>
              <TimeField
                label="To time"
                value={todayTimeTo}
                onChange={(value) => {
                  setTodayTimeTo(value);
                  if (value && todayTimeFrom && value < todayTimeFrom) setTodayTimeFrom(value);
                }}
                placeholder="End of day"
                clearable
              />
            </View>
          </View>
        ) : (
          <View style={styles.dateRow}>
            <View style={styles.dateCol}>
              <DateTimeField
                label="From"
                value={dateFrom}
                onChange={(value) => {
                  setDateFrom(value);
                  if (value && dateTo && value > dateTo) setDateTo(value);
                }}
                placeholder="Date & time"
                clearable
              />
            </View>
            <View style={styles.dateCol}>
              <DateTimeField
                label="To"
                value={dateTo}
                onChange={(value) => {
                  setDateTo(value);
                  if (value && dateFrom && value < dateFrom) setDateFrom(value);
                }}
                placeholder="Date & time"
                clearable
              />
            </View>
          </View>
        )}
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
  drawerActionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  dateModeField: { gap: Spacing.xs },
  dateRow: { flexDirection: 'row', gap: Spacing.md },
  dateCol: { flex: 1 },
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
