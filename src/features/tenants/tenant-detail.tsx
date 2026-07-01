import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { getTenant } from '@/api/tenants';
import { Badge, Button, Card, Divider, EmptyState, Icon, KeyValue, Section, Skeleton, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { TenantForm } from '@/features/tenants/tenant-form';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, titleCase } from '@/lib/format';
import { statusMeta } from '@/lib/status';

export function TenantDetail({ id, onDeleted }: { id: number; onDeleted?: () => void }) {
  const theme = useTheme();
  const { can } = usePermissions();
  const [editing, setEditing] = useState(false);

  const { data: tenant, isLoading, isError, error } = useQuery({ queryKey: ['tenant', id], queryFn: () => getTenant(id) });

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Skeleton width="55%" height={26} />
        <Skeleton width="70%" height={16} />
      </View>
    );
  }
  if (isError || !tenant) {
    return <EmptyState tone="error" title="Couldn’t load tenant" description={error?.message} />;
  }

  const meta = statusMeta(tenant.status);

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.hero}>
          <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
            <Icon name="tenants" size={30} color={theme.primary} />
          </View>
          <Text variant="heading" center>
            {tenant.name}
          </Text>
          <Text variant="body" color="textSecondary" center>
            {tenant.building?.name ?? ''}
          </Text>
          <View style={styles.heroBadges}>
            <Badge label={titleCase(tenant.tenant_type)} tone="info" />
            <Badge label={meta.label} tone={meta.tone} dot />
          </View>
        </Card>

        <Card>
          <Section title="Contact">
            <View>
              <KeyValue label="Contact" value={tenant.contact_name} icon="user" />
              <Divider />
              <KeyValue label="Phone" value={tenant.contact_phone} icon="phone" />
              <Divider />
              <KeyValue label="Email" value={tenant.contact_email} icon="mail" />
            </View>
          </Section>
        </Card>

        <Card>
          <Section title="Location">
            <View>
              <KeyValue label="Building" value={tenant.building?.name} icon="building" />
              <Divider />
              <KeyValue label="Suite / unit" value={tenant.suite_or_unit} icon="pin" />
              <Divider />
              <KeyValue label="Floor" value={tenant.floor} />
              <Divider />
              <KeyValue label="Code" value={tenant.code} icon="tag" />
              <Divider />
              <KeyValue label="Added" value={formatDate(tenant.created_at)} icon="clock" />
            </View>
          </Section>
        </Card>

        {can('locations.tenants', 'update') ? (
          <Button title="Edit tenant" icon="edit" variant="secondary" onPress={() => setEditing(true)} />
        ) : null}
      </ScrollView>

      <TenantForm
        visible={editing}
        tenant={tenant}
        onClose={() => setEditing(false)}
        onDeleted={can('locations.tenants', 'delete') ? onDeleted ?? (() => {}) : undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg },
  loading: { padding: Spacing.xl, gap: Spacing.md },
  hero: { alignItems: 'center', gap: Spacing.sm },
  icon: { width: 64, height: 64, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  heroBadges: { flexDirection: 'row', gap: Spacing.sm },
});
