import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { listTenants } from '@/api/tenants';
import { Screen } from '@/components/screen';
import { ResponsiveListDetail } from '@/components/responsive-list-detail';
import { Badge, Button, Icon, IconButton, ListRow, SearchBar, Segmented } from '@/components/ui';
import { Radius } from '@/constants/theme';
import { TenantDetail } from '@/features/tenants/tenant-detail';
import { TenantForm } from '@/features/tenants/tenant-form';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useListFilterCounts } from '@/hooks/use-list-filter-counts';
import { usePaginatedList } from '@/hooks/use-paginated-list';
import { usePermissions } from '@/hooks/use-permissions';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { titleCase } from '@/lib/format';
import { statusMeta } from '@/lib/status';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

export default function TenantsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { can } = usePermissions();
  const { isTablet } = useResponsive();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const debounced = useDebouncedValue(search);

  const list = usePaginatedList(['tenants'], listTenants, { search: debounced, status: status || undefined });
  const counts = useListFilterCounts({
    baseKey: ['tenants'],
    fetcher: listTenants,
    params: { search: debounced },
    values: FILTERS.map((filter) => filter.value),
  });

  return (
    <Screen
      title="Tenants"
      headerRight={
        can('locations.tenants', 'create') ? (
          isTablet ? (
            <Button title="New tenant" icon="add" size="sm" onPress={() => setCreating(true)} />
          ) : (
            <IconButton name="add" accessibilityLabel="New tenant" surface onPress={() => setCreating(true)} />
          )
        ) : undefined
      }>
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
        emptyTitle="No tenants found"
        emptyDescription={debounced ? 'Try a different search.' : 'Add your first tenant to get started.'}
        onOpen={(id) => router.push(`/tenants/${id}`)}
        renderDetail={(id) => <TenantDetail key={id} id={id} />}
        listHeader={
          <View style={{ gap: 12 }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search tenant name or code…" />
            <Segmented
              scrollable
              options={FILTERS.map((filter) => ({ ...filter, count: counts[filter.value] })) as never}
              value={status}
              onChange={setStatus}
            />
          </View>
        }
        renderRow={(t, { selected, onPress }) => {
          const meta = statusMeta(t.status);
          return (
            <ListRow
              title={t.name}
              subtitle={t.building?.name ?? undefined}
              meta={titleCase(t.tenant_type)}
              selected={selected}
              onPress={onPress}
              leading={
                <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
                  <Icon name="tenants" size={20} color={theme.primary} />
                </View>
              }
              trailing={<Badge label={meta.label} tone={meta.tone} size="sm" dot />}
            />
          );
        }}
      />

      <TenantForm visible={creating} tenant={null} onClose={() => setCreating(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
