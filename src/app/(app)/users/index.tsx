import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { listUsers } from '@/api/users';
import { Screen } from '@/components/screen';
import { ResponsiveListDetail } from '@/components/responsive-list-detail';
import { Badge, Button, Icon, IconButton, ListRow, SearchBar } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { UserDetail } from '@/features/users/user-detail';
import { UserForm } from '@/features/users/user-form';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePaginatedList } from '@/hooks/use-paginated-list';
import { usePermissions } from '@/hooks/use-permissions';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { statusMeta } from '@/lib/status';

export default function UsersScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { can } = usePermissions();
  const { isTablet } = useResponsive();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const debounced = useDebouncedValue(search);

  const list = usePaginatedList(['users'], listUsers, { search: debounced });

  return (
    <Screen
      title="Users"
      subtitle={list.total ? `${list.total} total` : undefined}
      subtitleLoading={list.isLoading || list.isRefetching}
      headerRight={
        can('administration.users', 'create') ? (
          isTablet ? (
            <Button title="Invite user" icon="add" size="sm" onPress={() => setCreating(true)} />
          ) : (
            <IconButton name="add" accessibilityLabel="Invite user" surface onPress={() => setCreating(true)} />
          )
        ) : undefined
      }>
      <ResponsiveListDetail
        items={list.items}
        getId={(u) => u.id}
        loading={list.isLoading}
        errorMessage={list.isError ? list.error?.message : undefined}
        onRetry={list.refetch}
        refreshing={list.isRefetching}
        onRefresh={list.refetch}
        onEndReached={() => list.hasNextPage && list.fetchNextPage()}
        loadingMore={list.isFetchingNextPage}
        emptyTitle="No users found"
        emptyDescription={debounced ? 'Try a different search.' : 'Invite a user to get started.'}
        onOpen={(id) => router.push(`/users/${id}` as never)}
        renderDetail={(id) => <UserDetail key={id} id={id} />}
        listHeader={
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search name or email…" />
        }
        renderRow={(u, { selected, onPress }) => {
          const cu = u.company_users[0];
          const meta = statusMeta(cu?.status ?? 'inactive');
          return (
            <ListRow
              title={u.name}
              subtitle={u.email}
              meta={cu?.role.name}
              selected={selected}
              onPress={onPress}
              leading={
                <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
                  <Icon name="user" size={20} color={theme.primary} />
                </View>
              }
              trailing={<Badge label={meta.label} tone={meta.tone} size="sm" dot />}
            />
          );
        }}
      />

      <UserForm visible={creating} user={null} onClose={() => setCreating(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
