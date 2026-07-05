import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { getParkingArea } from '@/api/parking-areas';
import { Badge, Button, Card, Divider, EmptyState, Icon, KeyValue, Section, Skeleton, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { ParkingAreaForm } from '@/features/parking-areas/parking-area-form';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, titleCase } from '@/lib/format';
import { statusMeta } from '@/lib/status';

export function ParkingAreaDetail({ id, onDeleted }: { id: number; onDeleted?: () => void }) {
  const theme = useTheme();
  const { can } = usePermissions();
  const [editing, setEditing] = useState(false);

  const { data: area, isLoading, isError, error } = useQuery({ queryKey: ['parking-area', id], queryFn: () => getParkingArea(id) });

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Skeleton width="55%" height={26} />
        <Skeleton width="70%" height={16} />
      </View>
    );
  }
  if (isError || !area) {
    return <EmptyState tone="error" title="Couldn't load parking area" description={error?.message} />;
  }

  const meta = statusMeta(area.status);

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.hero}>
          <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
            <Icon name="parkingArea" size={30} color={theme.primary} />
          </View>
          <Text variant="heading" center>{area.name}</Text>
          <Text variant="body" color="textSecondary" center>{area.building?.name ?? ''}</Text>
          <View style={styles.heroBadges}>
            <Badge label={titleCase(area.area_type)} tone="info" />
            <Badge label={meta.label} tone={meta.tone} dot />
          </View>
        </Card>

        <Card>
          <Section title="Details">
            <View>
              <KeyValue label="Building" value={area.building?.name} icon="buildings" />
              <Divider />
              <KeyValue label="Capacity" value={area.capacity != null ? String(area.capacity) + ' spaces' : null} icon="parkingSpace" />
              <Divider />
              <KeyValue label="Level" value={area.level} />
              <Divider />
              <KeyValue label="Code" value={area.code} icon="tag" />
              <Divider />
              <KeyValue label="Added" value={formatDate(area.created_at)} icon="clock" />
            </View>
          </Section>
        </Card>

        {area.notes ? (
          <Card>
            <Section title="Notes">
              <Text variant="body" color="textSecondary">{area.notes}</Text>
            </Section>
          </Card>
        ) : null}

        {can('locations.parking_areas', 'update') ? (
          <Button title="Edit area" icon="edit" variant="secondary" onPress={() => setEditing(true)} />
        ) : null}
      </ScrollView>

      <ParkingAreaForm
        visible={editing}
        area={area}
        onClose={() => setEditing(false)}
        onDeleted={can('locations.parking_areas', 'delete') ? onDeleted ?? (() => {}) : undefined}
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
