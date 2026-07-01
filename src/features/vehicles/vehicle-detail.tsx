import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { getVehicle } from '@/api/vehicles';
import { Avatar, Badge, Button, Card, Divider, EmptyState, KeyValue, ListRow, Section, Skeleton, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { VehicleForm } from '@/features/vehicles/vehicle-form';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatPlate, titleCase } from '@/lib/format';
import { statusMeta } from '@/lib/status';

export function VehicleDetail({ id, onDeleted }: { id: number; onDeleted?: () => void }) {
  const theme = useTheme();
  const { can } = usePermissions();
  const [editing, setEditing] = useState(false);

  const { data: vehicle, isLoading, isError, error } = useQuery({ queryKey: ['vehicle', id], queryFn: () => getVehicle(id) });

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Skeleton width="50%" height={26} />
        <Skeleton width="70%" height={16} />
      </View>
    );
  }
  if (isError || !vehicle) {
    return <EmptyState tone="error" title="Couldn’t load vehicle" description={error?.message} />;
  }

  const meta = statusMeta(vehicle.status);
  const subtitle = [vehicle.make, vehicle.model, vehicle.colour].filter(Boolean).join(' · ');

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.hero}>
          <View style={[styles.plate, { backgroundColor: theme.text }]}>
            <Text variant="heading" tint={theme.surface}>
              {formatPlate(vehicle.plate_number)}
            </Text>
          </View>
          {subtitle ? (
            <Text variant="body" color="textSecondary" center>
              {subtitle}
            </Text>
          ) : null}
          <View style={styles.heroBadges}>
            <Badge label={titleCase(vehicle.vehicle_type)} tone="info" />
            <Badge label={meta.label} tone={meta.tone} dot />
          </View>
        </Card>

        <Card>
          <Section title="Details">
            <View>
              <KeyValue label="Plate state" value={vehicle.plate_state} icon="pin" />
              <Divider />
              <KeyValue label="Country" value={vehicle.plate_country} />
              <Divider />
              <KeyValue label="Type" value={titleCase(vehicle.vehicle_type)} icon="vehicles" />
              <Divider />
              <KeyValue label="Added" value={formatDate(vehicle.created_at)} icon="clock" />
            </View>
          </Section>
        </Card>

        <Card padded={false}>
          <View style={styles.sectionPad}>
            <Text variant="overline" color="textMuted">
              Linked drivers
            </Text>
          </View>
          {vehicle.drivers && vehicle.drivers.length > 0 ? (
            vehicle.drivers.map((d, i) => (
              <View key={d.id}>
                {i > 0 ? <Divider inset={Spacing.lg + 44} /> : null}
                <ListRow title={d.full_name} subtitle={d.company_name ?? undefined} showChevron={false} leading={<Avatar name={d.full_name} />} />
              </View>
            ))
          ) : (
            <View style={styles.sectionPad}>
              <Text variant="body" color="textMuted">
                No linked drivers.
              </Text>
            </View>
          )}
        </Card>

        {vehicle.notes ? (
          <Card>
            <Section title="Notes">
              <Text variant="body" color="textSecondary">
                {vehicle.notes}
              </Text>
            </Section>
          </Card>
        ) : null}

        {can('people_vehicles.vehicles', 'update') ? (
          <Button title="Edit vehicle" icon="edit" variant="secondary" onPress={() => setEditing(true)} />
        ) : null}
      </ScrollView>

      <VehicleForm
        visible={editing}
        vehicle={vehicle}
        onClose={() => setEditing(false)}
        onDeleted={can('people_vehicles.vehicles', 'delete') ? onDeleted ?? (() => {}) : undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg },
  loading: { padding: Spacing.xl, gap: Spacing.md },
  hero: { alignItems: 'center', gap: Spacing.md },
  plate: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.md },
  heroBadges: { flexDirection: 'row', gap: Spacing.sm },
  sectionPad: { padding: Spacing.lg, paddingBottom: Spacing.sm },
});
