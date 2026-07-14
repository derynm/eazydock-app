import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActionSheetIOS, Alert, Platform, StyleSheet, View } from 'react-native';

import { listParkingSpaces } from '@/api/parking-spaces';
import { lookupParkingAreas } from '@/api/lookups';
import { Screen } from '@/components/screen';
import { ResponsiveListDetail } from '@/components/responsive-list-detail';
import { Badge, Button, FilterSheet, Icon, IconButton, ListRow, SearchBar, Segmented, Select } from '@/components/ui';
import { ViewModeToggle } from '@/components/ui/view-mode-toggle';
import { Radius, Spacing } from '@/constants/theme';
import { ParkingSpaceDetail } from '@/features/parking-spaces/parking-space-detail';
import { BulkCreateSpacesForm, ParkingSpaceForm } from '@/features/parking-spaces/parking-space-form';
import { OccupancyGrid } from '@/features/parking-spaces/occupancy-grid';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePaginatedList } from '@/hooks/use-paginated-list';
import { usePermissions } from '@/hooks/use-permissions';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/auth/session';
import { titleCase } from '@/lib/format';
import { statusMeta } from '@/lib/status';

const OP_STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'blocked', label: 'Blocked' },
] as const;

export default function ParkingSpacesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { can } = usePermissions();
  const { isTablet } = useResponsive();
  const { selectedBuilding } = useSession();
  const [search, setSearch] = useState('');
  const [opStatus, setOpStatus] = useState('');
  const [areaId, setAreaId] = useState<number | null>(null);
  const buildingId = selectedBuilding?.id ?? null;
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [creating, setCreating] = useState(false);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const debounced = useDebouncedValue(search);

  const activeFilterCount = (areaId ? 1 : 0) + (opStatus ? 1 : 0);

  const showAddMenu = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'New space', 'Bulk create'], cancelButtonIndex: 0 },
        (i) => { if (i === 1) setCreating(true); if (i === 2) setBulkCreating(true); },
      );
    } else {
      Alert.alert('Create spaces', undefined, [
        { text: 'New space', onPress: () => setCreating(true) },
        { text: 'Bulk create', onPress: () => setBulkCreating(true) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const { data: areas = [] } = useQuery({
    queryKey: ['lookup-areas', buildingId],
    queryFn: () => lookupParkingAreas(buildingId ?? undefined),
  });
  const areaOptions = [{ label: 'All areas', value: 0 }, ...areas.map((a) => ({ label: a.name, value: a.id }))];

  const list = usePaginatedList(['parking-spaces'], listParkingSpaces, {
    search: debounced,
    operational_status: opStatus || undefined,
    parking_area_id: areaId || undefined,
  });
  const handleSpaceDeleted = () => {
    list.refetch();
  };

  const gridParams = {
    building_id: buildingId ?? undefined,
    parking_area_id: areaId ?? undefined,
    operational_status: opStatus || undefined,
  };

  const listHeader = (
    <View style={styles.row}>
      <View style={styles.flex}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search space code…" />
      </View>
      <View style={styles.headerActions}>
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
        <ViewModeToggle
          value={viewMode === 'grid' ? 'table' : 'cards'}
          onChange={(m) => setViewMode(m === 'table' ? 'grid' : 'list')}
        />
      </View>
    </View>
  );

  return (
    <Screen
      title="Parking Spaces"
      subtitle={viewMode === 'list' && list.total ? `${list.total} total` : undefined}
      subtitleLoading={viewMode === 'list' && (list.isLoading || list.isRefetching)}
      headerRight={
        can('locations.spaces', 'create') ? (
          isTablet ? (
            <View style={styles.row}>
              <Button title="Bulk create" icon="add" size="sm" variant="secondary" onPress={() => setBulkCreating(true)} />
              <Button title="New space" icon="add" size="sm" onPress={() => setCreating(true)} />
            </View>
          ) : (
            <IconButton name="add" accessibilityLabel="Create spaces" surface onPress={showAddMenu} />
          )
        ) : undefined
      }>
      {viewMode === 'grid' ? (
        <View style={styles.gridContainer}>
          <View style={styles.gridHeader}>{listHeader}</View>
          <OccupancyGrid params={gridParams} />
        </View>
      ) : (
        <ResponsiveListDetail
          items={list.items}
          getId={(s) => s.id}
          loading={list.isLoading}
          errorMessage={list.isError ? list.error?.message : undefined}
          onRetry={list.refetch}
          refreshing={list.isRefetching}
          onRefresh={list.refetch}
          onEndReached={() => list.hasNextPage && list.fetchNextPage()}
          loadingMore={list.isFetchingNextPage}
          emptyTitle="No parking spaces found"
          emptyDescription={debounced ? 'Try a different search.' : 'Add spaces or use bulk create.'}
          onOpen={(id) => router.push(`/parking-spaces/${id}` as never)}
          renderDetail={(id) => <ParkingSpaceDetail key={id} id={id} onDeleted={handleSpaceDeleted} />}
          listHeader={listHeader}
          renderRow={(s, { selected, onPress }) => {
            const opMeta = statusMeta(s.operational_status);
            const occMeta = statusMeta(s.occupancy_status);
            return (
              <ListRow
                title={s.space_code}
                subtitle={[s.parking_area?.name, s.building?.name].filter(Boolean).join(' · ')}
                meta={titleCase(s.space_type)}
                selected={selected}
                onPress={onPress}
                leading={
                  <View style={[styles.icon, { backgroundColor: s.occupancy_status === 'occupied' ? theme.infoSoft : theme.successSoft }]}>
                    <Icon name="parkingSpace" size={20} color={s.occupancy_status === 'occupied' ? theme.info : theme.success} />
                  </View>
                }
                trailing={
                  <View style={{ gap: 4, alignItems: 'flex-end' }}>
                    <Badge label={occMeta.label} tone={occMeta.tone} size="sm" dot />
                    <Badge label={opMeta.label} tone={opMeta.tone} size="sm" />
                  </View>
                }
              />
            );
          }}
        />
      )}

      <FilterSheet visible={filterOpen} onClose={() => setFilterOpen(false)} title="Filter spaces">
        <Select value={areaId ?? 0} options={areaOptions} onChange={(v) => setAreaId((v as number) || null)} placeholder="All areas" />
        <Segmented scrollable options={OP_STATUS_FILTERS as never} value={opStatus} onChange={setOpStatus} />
      </FilterSheet>

      <ParkingSpaceForm visible={creating} space={null} onClose={() => setCreating(false)} />
      <BulkCreateSpacesForm visible={bulkCreating} onClose={() => setBulkCreating(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  flex: { flex: 1 },
  headerActions: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' },
  badge: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4 },
  gridContainer: { flex: 1 },
  gridHeader: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xs },
});
