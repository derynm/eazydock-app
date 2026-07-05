import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { toApiError } from '@/api/client';
import { getUser, removeUserFromCompany } from '@/api/users';
import { Badge, Button, Card, Divider, EmptyState, KeyValue, Section, Skeleton, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { UserForm } from '@/features/users/user-form';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { formatDate } from '@/lib/format';
import { statusMeta } from '@/lib/status';

export function UserDetail({ id }: { id: number }) {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { can } = usePermissions();
  const [editing, setEditing] = useState(false);

  const { data: user, isLoading, isError, error } = useQuery({
    queryKey: ['user', id],
    queryFn: () => getUser(id),
  });

  const removeMutation = useMutation({
    mutationFn: () => removeUserFromCompany(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      router.back();
    },
    onError: (err) => {
      const api = toApiError(err);
      alert(api.message);
    },
  });

  const handleRemove = async () => {
    const ok = await confirm({
      title: 'Remove from company?',
      message: `${user?.name ?? 'This user'} will lose access to this company. Their account is not deleted.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (ok) removeMutation.mutate();
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Skeleton width="50%" height={24} />
        <Skeleton width="70%" height={16} />
      </View>
    );
  }
  if (isError || !user) {
    return <EmptyState tone="error" title="Couldn't load user" description={error?.message} />;
  }

  const cu = user.company_users[0];
  const statusM = statusMeta(cu?.status ?? 'inactive');

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <Card style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
            <Text variant="title" tint={theme.primary} style={styles.avatarText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text variant="subtitle" center numberOfLines={1}>{user.name}</Text>
          <Text variant="body" color="textSecondary" center numberOfLines={1}>{user.email}</Text>
          <View style={styles.heroBadges}>
            {cu ? <Badge label={cu.role.name} tone="primary" /> : null}
            <Badge label={statusM.label} tone={statusM.tone} dot />
          </View>
        </Card>

        {/* Details */}
        <Card>
          <Section title="Account">
            <View>
              <KeyValue label="Email" value={user.email} icon="mail" />
              <Divider />
              <KeyValue label="Role" value={cu?.role.name ?? '—'} icon="user" />
              <Divider />
              <KeyValue label="Status" value={cu?.status ?? '—'} icon="checkCircle" />
              <Divider />
              <KeyValue label="Member since" value={formatDate(user.created_at)} icon="clock" />
            </View>
          </Section>
        </Card>

        {/* Actions */}
        {can('administration.users', 'update') ? (
          <Button title="Edit user" icon="edit" variant="secondary" onPress={() => setEditing(true)} />
        ) : null}
        {can('administration.users', 'delete') ? (
          <Button
            title="Remove from company"
            icon="close"
            variant="ghost"
            loading={removeMutation.isPending}
            onPress={handleRemove}
          />
        ) : null}
      </ScrollView>

      <UserForm visible={editing} user={user} onClose={() => setEditing(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg },
  loading: { padding: Spacing.xl, gap: Spacing.md },
  hero: { alignItems: 'center', gap: Spacing.sm },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, lineHeight: 32 },
  heroBadges: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
});
