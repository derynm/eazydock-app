import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { listBuildings } from '@/api/buildings';
import { Screen } from '@/components/screen';
import { ResponsiveListDetail } from '@/components/responsive-list-detail';
import { Badge, Button, Icon, IconButton, ListRow, SearchBar, Segmented } from '@/components/ui';
import { Radius } from '@/constants/theme';
import { BuildingDetail } from '@/features/buildings/building-detail';
import { BuildingForm } from '@/features/buildings/building-form';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePaginatedList } from '@/hooks/use-paginated-list';
import { usePermissions } from '@/hooks/use-permissions';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { statusMeta } from '@/lib/status';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

export default function BuildingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { can } = usePermissions();
  const { isTablet } = useResponsive();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const debounced = useDebouncedValue(search);

  const list = usePaginatedList(['buildings'], listBuildings, { search: debounced, status: status || undefined });

  return (
    <Screen
      title="Buildings"
      subtitle={list.total ? `${list.total} total` : undefined}
      subtitleLoading={list.isLoading || list.isRefetching}
      headerRight={
        can('locations.buildings', 'create') ? (
          isTablet ? (
            <Button title="New building" icon="add" size="sm" onPress={() => setCreating(true)} />
          ) : (
            <IconButton name="add" accessibilityLabel="New building" surface onPress={() => setCreating(true)} />
          )
        ) : undefined
      }>
      <ResponsiveListDetail
        items={list.items}
        getId={(b) => b.id}
        loading={list.isLoading}
        errorMessage={list.isError ? list.error?.message : undefined}
        onRetry={list.refetch}
        refreshing={list.isRefetching}
        onRefresh={list.refetch}
        onEndReached={() => list.hasNextPage && list.fetchNextPage()}
        loadingMore={list.isFetchingNextPage}
        emptyTitle="No buildings found"
        emptyDescription={debounced ? 'Try a different search.' : 'Add your first building to get started.'}
        onOpen={(id) => router.push(`/buildings/${id}` as never)}
        renderDetail={(id) => <BuildingDetail key={id} id={id} />}
        listHeader={
          <View style={{ gap: 12 }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search name or code…" />
            <Segmented scrollable options={FILTERS as never} value={status} onChange={setStatus} />
          </View>
        }
        renderRow={(b, { selected, onPress }) => {
          const meta = statusMeta(b.status);
          return (
            <ListRow
              title={b.name}
              subtitle={[b.suburb, b.state].filter(Boolean).join(', ') || b.address_line_1}
              meta={b.code ?? undefined}
              selected={selected}
              onPress={onPress}
              leading={
                <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
                  <Icon name="buildings" size={20} color={theme.primary} />
                </View>
              }
              trailing={<Badge label={meta.label} tone={meta.tone} size="sm" dot />}
            />
          );
        }}
      />

      <BuildingForm visible={creating} building={null} onClose={() => setCreating(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
