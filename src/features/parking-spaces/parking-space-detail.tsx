import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { deleteParkingSpace, getParkingSpace } from '@/api/parking-spaces';
import { toApiError } from '@/api/client';
import { Badge, Banner, Button, Card, Divider, EmptyState, Icon, KeyValue, Section, Skeleton, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { ParkingSpaceForm } from '@/features/parking-spaces/parking-space-form';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { formatDate, formatDateTime, titleCase } from '@/lib/format';
import { statusMeta } from '@/lib/status';

export function ParkingSpaceDetail({ id, onDeleted }: { id: number; onDeleted?: () => void }) {
  const theme = useTheme();
  const qc = useQueryClient();
  const { can } = usePermissions();
  const [editing, setEditing] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  const { data: space, isLoading, isError, error } = useQuery({ queryKey: ['parking-space', id], queryFn: () => getParkingSpace(id) });

  useEffect(() => {
    setEditing(false);
    setTopError(null);
  }, [id]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Skeleton width="40%" height={26} />
        <Skeleton width="60%" height={16} />
      </View>
    );
  }
  if (isError || !space) {
    return <EmptyState tone="error" title="Couldn't load parking space" description={error?.message} />;
  }

  const opMeta = statusMeta(space.operational_status);
  const occMeta = statusMeta(space.occupancy_status);
  const canUpdate = can('locations.spaces', 'update');
  const canDelete = can('locations.spaces', 'delete');

  const handleDelete = async () => {
    setTopError(null);
    const ok = await confirm({
      title: 'Delete parking space?',
      message: `${space.space_code} will be removed and its code can be reused.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteParkingSpace(space.id);
      qc.invalidateQueries({ queryKey: ['parking-spaces'] });
      qc.invalidateQueries({ queryKey: ['occupancy-grid'] });
      qc.invalidateQueries({ queryKey: ['lookup-spaces'] });
      qc.invalidateQueries({ queryKey: ['booking-form-data'] });
      qc.invalidateQueries({ queryKey: ['bookings-by-space'] });
      qc.removeQueries({ queryKey: ['parking-space', space.id] });
      onDeleted?.();
    } catch (e) {
      const err = toApiError(e);
      setTopError(err.field('space') ?? err.message);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {topError ? <Banner title="Couldn't delete space" message={topError} tone="danger" /> : null}

        <Card style={styles.hero}>
          <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
            <Icon name="parkingSpace" size={30} color={theme.primary} />
          </View>
          <Text variant="heading" center>{space.space_code}</Text>
          <Text variant="body" color="textSecondary" center>
            {[space.parking_area?.name, space.building?.name].filter(Boolean).join(' · ')}
          </Text>
          <View style={styles.heroBadges}>
            <Badge label={occMeta.label} tone={occMeta.tone} dot />
            <Badge label={opMeta.label} tone={opMeta.tone} />
            <Badge label={titleCase(space.space_type)} tone="neutral" />
          </View>
        </Card>

        {space.current_transaction ? (
          <Card>
            <Section title="Currently occupied">
              <View>
                <KeyValue label="Transaction" value={space.current_transaction.transaction_no} icon="transactions" />
                <Divider />
                <KeyValue label="Parked since" value={formatDateTime(space.current_transaction.car_in_at)} icon="clock" />
                {space.current_vehicle ? <><Divider /><KeyValue label="Vehicle" value={space.current_vehicle.plate_number} icon="vehicles" /></> : null}
              </View>
            </Section>
          </Card>
        ) : null}

        <Card>
          <Section title="Details">
            <View>
              <KeyValue label="Building" value={space.building?.name} icon="buildings" />
              <Divider />
              <KeyValue label="Parking area" value={space.parking_area?.name} icon="parkingArea" />
              <Divider />
              <KeyValue label="Space type" value={titleCase(space.space_type)} />
              <Divider />
              <KeyValue label="Default usage" value={titleCase(space.default_usage)} />
              <Divider />
              <KeyValue label="Operational status" value={opMeta.label} />
              <Divider />
              <KeyValue label="Added" value={formatDate(space.created_at)} icon="clock" />
            </View>
          </Section>
        </Card>

        {space.notes ? (
          <Card>
            <Section title="Notes">
              <Text variant="body" color="textSecondary">{space.notes}</Text>
            </Section>
          </Card>
        ) : null}

        {canUpdate || canDelete ? (
          <View style={styles.actions}>
            {canUpdate ? (
              <Button title="Edit space" icon="edit" variant="secondary" onPress={() => setEditing(true)} style={styles.actionButton} />
            ) : null}
            {canDelete ? (
              <Button title="Delete space" icon="trash" variant="danger" onPress={handleDelete} style={styles.actionButton} />
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <ParkingSpaceForm
        visible={editing}
        space={space}
        onClose={() => setEditing(false)}
        onDeleted={canDelete ? onDeleted ?? (() => {}) : undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg },
  loading: { padding: Spacing.xl, gap: Spacing.md },
  hero: { alignItems: 'center', gap: Spacing.sm },
  icon: { width: 64, height: 64, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  heroBadges: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  actionButton: { flex: 1 },
});
