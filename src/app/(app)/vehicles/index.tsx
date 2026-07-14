import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { listVehicles } from '@/api/vehicles';
import { Screen } from '@/components/screen';
import { ResponsiveListDetail } from '@/components/responsive-list-detail';
import { Badge, Button, Icon, IconButton, ListRow, SearchBar, Segmented, Text } from '@/components/ui';
import { Radius } from '@/constants/theme';
import { VehicleDetail } from '@/features/vehicles/vehicle-detail';
import { VehicleForm } from '@/features/vehicles/vehicle-form';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePaginatedList } from '@/hooks/use-paginated-list';
import { usePermissions } from '@/hooks/use-permissions';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { formatPlate, titleCase } from '@/lib/format';
import { statusMeta } from '@/lib/status';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'banned', label: 'Banned' },
] as const;

export default function VehiclesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { can } = usePermissions();
  const { isTablet } = useResponsive();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const debounced = useDebouncedValue(search);

  const list = usePaginatedList(['vehicles'], listVehicles, { search: debounced, status: status || undefined });

  return (
    <Screen
      title="Vehicles"
      subtitle={list.total ? `${list.total} total` : undefined}
      subtitleLoading={list.isLoading || list.isRefetching}
      headerRight={
        can('people_vehicles.vehicles', 'create') ? (
          isTablet ? (
            <Button title="New vehicle" icon="add" size="sm" onPress={() => setCreating(true)} />
          ) : (
            <IconButton name="add" accessibilityLabel="New vehicle" surface onPress={() => setCreating(true)} />
          )
        ) : undefined
      }>
      <ResponsiveListDetail
        items={list.items}
        getId={(v) => v.id}
        loading={list.isLoading}
        errorMessage={list.isError ? list.error?.message : undefined}
        onRetry={list.refetch}
        refreshing={list.isRefetching}
        onRefresh={list.refetch}
        onEndReached={() => list.hasNextPage && list.fetchNextPage()}
        loadingMore={list.isFetchingNextPage}
        emptyTitle="No vehicles found"
        emptyDescription={debounced ? 'Try a different search.' : 'Add your first vehicle to get started.'}
        onOpen={(id) => router.push(`/vehicles/${id}`)}
        renderDetail={(id) => <VehicleDetail key={id} id={id} />}
        listHeader={
          <View style={{ gap: 12 }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search plate, make, model…" />
            <Segmented scrollable options={FILTERS as never} value={status} onChange={setStatus} />
          </View>
        }
        renderRow={(v, { selected, onPress }) => {
          const meta = statusMeta(v.status);
          const sub = [v.make, v.model].filter(Boolean).join(' ');
          return (
            <ListRow
              title={formatPlate(v.plate_number)}
              subtitle={sub || titleCase(v.vehicle_type)}
              meta={v.plate_state ?? undefined}
              selected={selected}
              onPress={onPress}
              leading={
                <View style={[styles.icon, { backgroundColor: theme.surfaceSunken }]}>
                  <Icon name="vehicles" size={20} color={theme.textSecondary} />
                </View>
              }
              trailing={
                <View style={styles.trail}>
                  <Text variant="caption" color="textMuted">
                    {titleCase(v.vehicle_type)}
                  </Text>
                  <Badge label={meta.label} tone={meta.tone} size="sm" dot />
                </View>
              }
            />
          );
        }}
      />

      <VehicleForm visible={creating} vehicle={null} onClose={() => setCreating(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  trail: { alignItems: 'flex-end', gap: 4 },
});
