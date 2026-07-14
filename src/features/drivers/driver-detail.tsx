import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { getDriver } from '@/api/drivers';
import { Avatar, Badge, Button, Card, Divider, EmptyState, Icon, KeyValue, ListRow, Section, Skeleton, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { DriverForm } from '@/features/drivers/driver-form';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatPlate } from '@/lib/format';
import { statusMeta } from '@/lib/status';

export function DriverDetail({ id, onDeleted }: { id: number; onDeleted?: () => void }) {
  const theme = useTheme();
  const { can } = usePermissions();
  const [editing, setEditing] = useState(false);

  const { data: driver, isLoading, isError, error } = useQuery({ queryKey: ['driver', id], queryFn: () => getDriver(id) });

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Skeleton width={72} height={72} radius={36} />
        <Skeleton width="60%" height={22} />
        <Skeleton width="40%" height={14} />
      </View>
    );
  }
  if (isError || !driver) {
    return <EmptyState tone="error" title="Couldn’t load driver" description={error?.message} />;
  }

  const meta = statusMeta(driver.status);

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.hero}>
          <Avatar name={driver.full_name} size={72} />
          <Text variant="heading" center>
            {driver.full_name}
          </Text>
          {driver.company_name ? (
            <Text variant="body" color="textSecondary" center>
              {driver.company_name}
            </Text>
          ) : null}
          <Badge label={meta.label} tone={meta.tone} dot />
        </Card>

        <Card>
          <Section title="Contact">
            <View>
              <KeyValue label="Phone" value={driver.phone} icon="phone" />
              <Divider />
              <KeyValue label="Email" value={driver.email} icon="mail" />
              <Divider />
              <KeyValue label="Company" value={driver.company_name} icon="building" />
              <Divider />
              <KeyValue label="License" value={driver.license_no} icon="card" />
              <Divider />
              <KeyValue label="Added" value={formatDate(driver.created_at)} icon="clock" />
            </View>
          </Section>
        </Card>

        <Card padded={false}>
          <View style={styles.sectionPad}>
            <Text variant="overline" color="textMuted">
              Linked vehicles
            </Text>
          </View>
          {driver.vehicles && driver.vehicles.length > 0 ? (
            driver.vehicles.map((v, i) => (
              <View key={v.id}>
                {i > 0 ? <Divider inset={Spacing.lg + 44} /> : null}
                <ListRow
                  title={formatPlate(v.plate_number)}
                  subtitle={v.plate_state ?? undefined}
                  showChevron={false}
                  leading={
                    <View style={[styles.vehIcon, { backgroundColor: theme.surfaceSunken }]}>
                      <Icon name="vehicles" size={20} color={theme.textSecondary} />
                    </View>
                  }
                />
              </View>
            ))
          ) : (
            <View style={styles.sectionPad}>
              <Text variant="body" color="textMuted">
                No linked vehicles.
              </Text>
            </View>
          )}
        </Card>

        {driver.notes ? (
          <Card>
            <Section title="Notes">
              <Text variant="body" color="textSecondary">
                {driver.notes}
              </Text>
            </Section>
          </Card>
        ) : null}

        {can('people_vehicles.drivers', 'update') ? (
          <Button title="Edit driver" icon="edit" variant="secondary" onPress={() => setEditing(true)} />
        ) : null}
      </ScrollView>

      <DriverForm
        visible={editing}
        driver={driver}
        onClose={() => setEditing(false)}
        onDeleted={can('people_vehicles.drivers', 'delete') ? onDeleted ?? (() => {}) : undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg },
  loading: { padding: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  hero: { alignItems: 'center', gap: Spacing.sm },
  sectionPad: { padding: Spacing.lg, paddingBottom: Spacing.sm },
  vehIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
