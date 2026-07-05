import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { listAllocations } from '@/api/allocations';
import { Screen } from '@/components/screen';
import { ResponsiveListDetail } from '@/components/responsive-list-detail';
import { Badge, Button, FilterSheet, Icon, IconButton, ListRow, Segmented } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { AllocationDetail } from '@/features/allocations/allocation-detail';
import { AllocationForm } from '@/features/allocations/allocation-form';
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
  { value: 'expired', label: 'Expired' },
] as const;

const TYPE_FILTERS = [
  { value: '', label: 'All types' },
  { value: 'flexible_quota', label: 'Flexible' },
  { value: 'temporary_quota', label: 'Temporary' },
  { value: 'visitor_quota', label: 'Visitor' },
  { value: 'loading_quota', label: 'Loading' },
] as const;

export default function AllocationsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { can } = usePermissions();
  const { isTablet } = useResponsive();
  const { selectedBuilding } = useSession();
  const [status, setStatus] = useState('');
  const [allocationType, setAllocationType] = useState('');
  const [creating, setCreating] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const buildingId = selectedBuilding?.id ?? null;
  const activeFilterCount = (status ? 1 : 0) + (allocationType ? 1 : 0);

  const list = usePaginatedList(['allocations'], listAllocations, {
    status: status || undefined,
    building_id: buildingId || undefined,
    allocation_type: allocationType || undefined,
  });

  return (
    <Screen
      title="Allocations"
      subtitle={list.total ? `${list.total} total` : undefined}
      headerRight={
        <View style={styles.headerRight}>
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
          {can('locations.allocations', 'create') ? (
            isTablet ? (
              <Button title="New allocation" icon="add" size="sm" onPress={() => setCreating(true)} />
            ) : (
              <IconButton name="add" accessibilityLabel="New allocation" surface onPress={() => setCreating(true)} />
            )
          ) : null}
        </View>
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
        emptyTitle="No allocations found"
        emptyDescription="Create an allocation to manage parking quotas."
        onOpen={(id) => router.push(`/allocations/${id}` as never)}
        renderDetail={(id) => <AllocationDetail key={id} id={id} />}
        renderRow={(a, { selected, onPress }) => {
          const meta = statusMeta(a.status);
          return (
            <ListRow
              title={titleCase(a.allocation_type)}
              subtitle={[a.building?.name, a.parking_area?.name ?? 'All areas'].filter(Boolean).join(' · ')}
              meta={`${a.quota} spaces · ${titleCase(a.user_category)}`}
              selected={selected}
              onPress={onPress}
              leading={
                <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
                  <Icon name="allocation" size={20} color={theme.primary} />
                </View>
              }
              trailing={<Badge label={meta.label} tone={meta.tone} size="sm" dot />}
            />
          );
        }}
      />

      <FilterSheet visible={filterOpen} onClose={() => setFilterOpen(false)} title="Filter allocations">
        <Segmented scrollable options={TYPE_FILTERS as never} value={allocationType} onChange={setAllocationType} />
        <Segmented scrollable options={STATUS_FILTERS as never} value={status} onChange={setStatus} />
      </FilterSheet>

      <AllocationForm visible={creating} allocation={null} onClose={() => setCreating(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  headerRight: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  badge: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4 },
});
