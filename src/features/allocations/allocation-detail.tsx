import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { getAllocation } from '@/api/allocations';
import { Badge, Button, Card, Divider, EmptyState, Icon, KeyValue, Section, Skeleton, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { AllocationForm } from '@/features/allocations/allocation-form';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, titleCase } from '@/lib/format';
import { statusMeta } from '@/lib/status';

export function AllocationDetail({ id, onDeleted }: { id: number; onDeleted?: () => void }) {
  const theme = useTheme();
  const { can } = usePermissions();
  const [editing, setEditing] = useState(false);

  const { data: allocation, isLoading, isError, error } = useQuery({ queryKey: ['allocation', id], queryFn: () => getAllocation(id) });

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Skeleton width="55%" height={26} />
        <Skeleton width="70%" height={16} />
      </View>
    );
  }
  if (isError || !allocation) {
    return <EmptyState tone="error" title="Couldn't load allocation" description={error?.message} />;
  }

  const meta = statusMeta(allocation.status);

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.hero}>
          <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
            <Icon name="allocation" size={30} color={theme.primary} />
          </View>
          <Text variant="heading" center>{titleCase(allocation.allocation_type)}</Text>
          <Text variant="body" color="textSecondary" center>{allocation.building?.name ?? ''}</Text>
          <View style={styles.heroBadges}>
            <Badge label={titleCase(allocation.user_category)} tone="info" />
            <Badge label={meta.label} tone={meta.tone} dot />
          </View>
        </Card>

        <Card>
          <Section title="Allocation">
            <View>
              <KeyValue label="Building" value={allocation.building?.name} icon="buildings" />
              <Divider />
              <KeyValue label="Parking area" value={allocation.parking_area?.name ?? 'All areas'} icon="parkingArea" />
              <Divider />
              <KeyValue label="Tenant" value={allocation.tenant?.name ?? 'None'} icon="tenants" />
              <Divider />
              <KeyValue label="Quota" value={String(allocation.quota) + ' spaces'} icon="parkingSpace" />
              <Divider />
              <KeyValue label="Release after" value={allocation.release_after_minutes ? `${allocation.release_after_minutes} min` : null} icon="clock" />
            </View>
          </Section>
        </Card>

        <Card>
          <Section title="Period">
            <View>
              <KeyValue label="Starts" value={allocation.starts_at ? formatDate(allocation.starts_at) : 'No start date'} icon="clock" />
              <Divider />
              <KeyValue label="Ends" value={allocation.ends_at ? formatDate(allocation.ends_at) : 'No end date'} icon="clock" />
              <Divider />
              <KeyValue label="Created" value={formatDate(allocation.created_at)} />
            </View>
          </Section>
        </Card>

        {allocation.notes ? (
          <Card>
            <Section title="Notes">
              <Text variant="body" color="textSecondary">{allocation.notes}</Text>
            </Section>
          </Card>
        ) : null}

        {can('locations.allocations', 'update') ? (
          <Button title="Edit allocation" icon="edit" variant="secondary" onPress={() => setEditing(true)} />
        ) : null}
      </ScrollView>

      <AllocationForm
        visible={editing}
        allocation={allocation}
        onClose={() => setEditing(false)}
        onDeleted={can('locations.allocations', 'delete') ? onDeleted ?? (() => {}) : undefined}
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
