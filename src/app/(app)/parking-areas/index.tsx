import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { listParkingAreas } from '@/api/parking-areas';
import { Screen } from '@/components/screen';
import { ResponsiveListDetail } from '@/components/responsive-list-detail';
import { Badge, Button, FilterSheet, Icon, IconButton, ListRow, SearchBar, Segmented } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { ParkingAreaDetail } from '@/features/parking-areas/parking-area-detail';
import { ParkingAreaForm } from '@/features/parking-areas/parking-area-form';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePaginatedList } from '@/hooks/use-paginated-list';
import { usePermissions } from '@/hooks/use-permissions';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/auth/session';
import { titleCase } from '@/lib/format';
import { statusMeta } from '@/lib/status';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'maintenance', label: 'Maintenance' },
] as const;

export default function ParkingAreasScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { can } = usePermissions();
  const { isTablet } = useResponsive();
  const { selectedBuilding } = useSession();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const debounced = useDebouncedValue(search);

  const buildingId = selectedBuilding?.id ?? null;
  const activeFilterCount = status ? 1 : 0;

  const list = usePaginatedList(['parking-areas'], listParkingAreas, {
    search: debounced,
    status: status || undefined,
    building_id: buildingId || undefined,
  });

  return (
    <Screen
      title="Parking Areas"
      subtitle={list.total ? `${list.total} total` : undefined}
      headerRight={
        can('locations.parking_areas', 'create') ? (
          isTablet ? (
            <Button title="New area" icon="add" size="sm" onPress={() => setCreating(true)} />
          ) : (
            <IconButton name="add" accessibilityLabel="New parking area" surface onPress={() => setCreating(true)} />
          )
        ) : undefined
      }>
      <ResponsiveListDetail
        items={list.items}
        getId={(a) => a.id}
        loading={list.isLoading}
        errorMessage={list.isError ? list.error?.message : undefined}
        onRetry={list.refetch}
        refreshing={list.isRefetching}
        onRefresh={list.refetch}
        onEndReached={() => list.hasNextPage && list.fetchNextPage()}
        loadingMore={list.isFetchingNextPage}
        emptyTitle="No parking areas found"
        emptyDescription={debounced ? 'Try a different search.' : 'Add your first parking area to get started.'}
        onOpen={(id) => router.push(`/parking-areas/${id}` as never)}
        renderDetail={(id) => <ParkingAreaDetail key={id} id={id} />}
        listHeader={
          <View style={styles.row}>
            <View style={styles.flex}>
              <SearchBar value={search} onChangeText={setSearch} placeholder="Search area name or code…" />
            </View>
            <View>
              <IconButton
                name="filter"
                accessibilityLabel="Open filters"
                surface
                onPress={() => setFilterOpen(true)}
                color={activeFilterCount > 0 ? theme.primary : undefined}
              />
              {activeFilterCount > 0 ? (
                <View style={[styles.badge, { backgroundColor: theme.primary }]} />
              ) : null}
            </View>
          </View>
        }
        renderRow={(a, { selected, onPress }) => {
          const meta = statusMeta(a.status);
          return (
            <ListRow
              title={a.name}
              subtitle={a.building?.name}
              meta={titleCase(a.area_type)}
              selected={selected}
              onPress={onPress}
              leading={
                <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
                  <Icon name="parkingArea" size={20} color={theme.primary} />
                </View>
              }
              trailing={<Badge label={meta.label} tone={meta.tone} size="sm" dot />}
            />
          );
        }}
      />

      <FilterSheet visible={filterOpen} onClose={() => setFilterOpen(false)} title="Filter areas">
        <Segmented scrollable options={STATUS_FILTERS as never} value={status} onChange={setStatus} />
      </FilterSheet>

      <ParkingAreaForm visible={creating} area={null} onClose={() => setCreating(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  flex: { flex: 1 },
  badge: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4 },
});
