import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { listDrivers } from '@/api/drivers';
import { Screen } from '@/components/screen';
import { ResponsiveListDetail } from '@/components/responsive-list-detail';
import { Avatar, Badge, Button, IconButton, ListRow, SearchBar, Segmented } from '@/components/ui';
import { DriverDetail } from '@/features/drivers/driver-detail';
import { DriverForm } from '@/features/drivers/driver-form';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePaginatedList } from '@/hooks/use-paginated-list';
import { usePermissions } from '@/hooks/use-permissions';
import { useResponsive } from '@/hooks/use-responsive';
import { statusMeta } from '@/lib/status';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'banned', label: 'Banned' },
] as const;

export default function DriversScreen() {
  const router = useRouter();
  const { can } = usePermissions();
  const { isTablet } = useResponsive();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const debounced = useDebouncedValue(search);

  const list = usePaginatedList(['drivers'], listDrivers, { search: debounced, status: status || undefined });

  return (
    <Screen
      title="Drivers"
      subtitle={list.total ? `${list.total} total` : undefined}
      subtitleLoading={list.isLoading || list.isRefetching}
      headerRight={
        can('people_vehicles.drivers', 'create') ? (
          isTablet ? (
            <Button title="New driver" icon="add" size="sm" onPress={() => setCreating(true)} />
          ) : (
            <IconButton name="add" accessibilityLabel="New driver" surface onPress={() => setCreating(true)} />
          )
        ) : undefined
      }>
      <ResponsiveListDetail
        items={list.items}
        getId={(d) => d.id}
        loading={list.isLoading}
        errorMessage={list.isError ? list.error?.message : undefined}
        onRetry={list.refetch}
        refreshing={list.isRefetching}
        onRefresh={list.refetch}
        onEndReached={() => list.hasNextPage && list.fetchNextPage()}
        loadingMore={list.isFetchingNextPage}
        emptyTitle="No drivers found"
        emptyDescription={debounced ? 'Try a different search.' : 'Add your first driver to get started.'}
        onOpen={(id) => router.push(`/drivers/${id}`)}
        renderDetail={(id) => <DriverDetail key={id} id={id} />}
        listHeader={
          <View style={{ gap: 12 }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, company, phone…" />
            <Segmented scrollable options={FILTERS as never} value={status} onChange={setStatus} />
          </View>
        }
        renderRow={(d, { selected, onPress }) => {
          const meta = statusMeta(d.status);
          return (
            <ListRow
              title={d.full_name}
              subtitle={d.company_name ?? undefined}
              meta={d.phone ?? undefined}
              selected={selected}
              onPress={onPress}
              leading={<Avatar name={d.full_name} />}
              trailing={<Badge label={meta.label} tone={meta.tone} size="sm" dot />}
            />
          );
        }}
      />

      <DriverForm visible={creating} driver={null} onClose={() => setCreating(false)} />
    </Screen>
  );
}
