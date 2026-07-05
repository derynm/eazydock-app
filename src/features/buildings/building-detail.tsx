import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { getBuilding } from '@/api/buildings';
import { Badge, Button, Card, Divider, EmptyState, Icon, KeyValue, Section, Skeleton, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { BuildingForm } from '@/features/buildings/building-form';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, titleCase } from '@/lib/format';
import { statusMeta } from '@/lib/status';

export function BuildingDetail({ id, onDeleted }: { id: number; onDeleted?: () => void }) {
  const theme = useTheme();
  const { can } = usePermissions();
  const [editing, setEditing] = useState(false);

  const { data: building, isLoading, isError, error } = useQuery({ queryKey: ['building', id], queryFn: () => getBuilding(id) });

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Skeleton width="55%" height={26} />
        <Skeleton width="70%" height={16} />
      </View>
    );
  }
  if (isError || !building) {
    return <EmptyState tone="error" title="Couldn't load building" description={error?.message} />;
  }

  const meta = statusMeta(building.status);

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.hero}>
          <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
            <Icon name="buildings" size={30} color={theme.primary} />
          </View>
          <Text variant="heading" center>{building.name}</Text>
          {building.suburb || building.state ? (
            <Text variant="body" color="textSecondary" center>
              {[building.suburb, building.state].filter(Boolean).join(', ')}
            </Text>
          ) : null}
          <View style={styles.heroBadges}>
            {building.building_type ? <Badge label={titleCase(building.building_type)} tone="info" /> : null}
            <Badge label={meta.label} tone={meta.tone} dot />
          </View>
        </Card>

        <Card>
          <Section title="Address">
            <View>
              <KeyValue label="Line 1" value={building.address_line_1} icon="pin" />
              {building.address_line_2 ? <><Divider /><KeyValue label="Line 2" value={building.address_line_2} /></> : null}
              <Divider />
              <KeyValue label="Suburb" value={building.suburb} />
              <Divider />
              <KeyValue label="State" value={building.state} />
              <Divider />
              <KeyValue label="Postal code" value={building.postal_code} />
              <Divider />
              <KeyValue label="Country" value={building.country} />
            </View>
          </Section>
        </Card>

        <Card>
          <Section title="Contact">
            <View>
              <KeyValue label="Name" value={building.contact_name} icon="user" />
              <Divider />
              <KeyValue label="Phone" value={building.contact_phone} icon="phone" />
              <Divider />
              <KeyValue label="Email" value={building.contact_email} icon="mail" />
            </View>
          </Section>
        </Card>

        <Card>
          <Section title="Details">
            <View>
              <KeyValue label="Code" value={building.code} icon="tag" />
              <Divider />
              <KeyValue label="Type" value={building.building_type ? titleCase(building.building_type) : null} />
              <Divider />
              <KeyValue label="Added" value={formatDate(building.created_at)} icon="clock" />
            </View>
          </Section>
        </Card>

        {can('locations.buildings', 'update') ? (
          <Button title="Edit building" icon="edit" variant="secondary" onPress={() => setEditing(true)} />
        ) : null}
      </ScrollView>

      <BuildingForm
        visible={editing}
        building={building}
        onClose={() => setEditing(false)}
        onDeleted={can('locations.buildings', 'delete') ? onDeleted ?? (() => {}) : undefined}
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
