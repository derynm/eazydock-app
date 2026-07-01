import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { listBookings } from '@/api/bookings';
import { Screen } from '@/components/screen';
import { ResponsiveListDetail } from '@/components/responsive-list-detail';
import { Badge, Button, Icon, IconButton, ListRow, SearchBar, Segmented } from '@/components/ui';
import { Radius } from '@/constants/theme';
import { BookingDetail } from '@/features/bookings/booking-detail';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePaginatedList } from '@/hooks/use-paginated-list';
import { usePermissions } from '@/hooks/use-permissions';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime, formatPlate } from '@/lib/format';
import { statusMeta } from '@/lib/status';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export default function BookingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { can } = usePermissions();
  const { isTablet } = useResponsive();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debounced = useDebouncedValue(search);

  const list = usePaginatedList(['bookings'], listBookings, { search: debounced, status: status || undefined });

  return (
    <Screen
      title="Bookings"
      subtitle={list.total ? `${list.total} total` : undefined}
      headerRight={
        can('operations.bookings', 'create') ? (
          isTablet ? (
            <Button title="New booking" icon="add" size="sm" onPress={() => router.push('/bookings/create')} />
          ) : (
            <IconButton name="add" accessibilityLabel="New booking" surface onPress={() => router.push('/bookings/create')} />
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
        emptyTitle="No bookings found"
        emptyDescription={debounced ? 'Try a different search.' : 'Create your first booking to get started.'}
        onOpen={(id) => router.push(`/bookings/${id}`)}
        renderDetail={(id) => <BookingDetail key={id} id={id} />}
        listHeader={
          <View style={{ gap: 12 }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search plate, ref, contact…" />
            <Segmented scrollable options={FILTERS as never} value={status} onChange={setStatus} />
          </View>
        }
        renderRow={(b, { selected, onPress }) => {
          const meta = statusMeta(b.status);
          return (
            <ListRow
              title={formatPlate(b.plate_number_raw)}
              subtitle={`${b.parking_area?.name ?? ''}${b.parking_space ? ` · ${b.parking_space.space_code}` : ''}`}
              meta={formatDateTime(b.starts_at)}
              selected={selected}
              onPress={onPress}
              leading={
                <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
                  <Icon name="bookings" size={20} color={theme.primary} />
                </View>
              }
              trailing={<Badge label={meta.label} tone={meta.tone} size="sm" dot />}
            />
          );
        }}
      />

    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
