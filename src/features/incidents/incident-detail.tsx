import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { getIncident } from '@/api/incidents';
import { Badge, Button, Card, Divider, EmptyState, Icon, KeyValue, Section, Skeleton, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { IncidentForm } from '@/features/incidents/incident-form';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatDateTime, titleCase } from '@/lib/format';
import { statusMeta } from '@/lib/status';

export function IncidentDetail({ id }: { id: number }) {
  const theme = useTheme();
  const { can } = usePermissions();
  const [editing, setEditing] = useState(false);

  const { data: incident, isLoading, isError, error } = useQuery({ queryKey: ['incident', id], queryFn: () => getIncident(id) });

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Skeleton width="55%" height={26} />
        <Skeleton width="70%" height={16} />
      </View>
    );
  }
  if (isError || !incident) {
    return <EmptyState tone="error" title="Couldn't load incident" description={error?.message} />;
  }

  const meta = statusMeta(incident.status);
  const typeMeta = statusMeta(incident.incident_type);

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.hero}>
          <View style={[styles.icon, { backgroundColor: theme.warningSoft }]}>
            <Icon name="incident" size={30} color={theme.warning} />
          </View>
          <Text variant="heading" center>{titleCase(incident.incident_type)}</Text>
          <View style={styles.heroBadges}>
            <Badge label={meta.label} tone={meta.tone} dot />
          </View>
        </Card>

        <Card>
          <Section title="Description">
            <Text variant="body" color="textSecondary">{incident.description}</Text>
          </Section>
        </Card>

        <Card>
          <Section title="Details">
            <View>
              <KeyValue label="Type" value={titleCase(incident.incident_type)} icon="incident" />
              <Divider />
              <KeyValue label="Reported by" value={incident.reporter?.name ?? `User #${incident.reported_by}`} icon="user" />
              <Divider />
              <KeyValue label="Reported" value={formatDateTime(incident.created_at)} icon="clock" />
              {incident.parking_transaction ? (
                <><Divider /><KeyValue label="Transaction" value={incident.parking_transaction.transaction_no} icon="transactions" /></>
              ) : null}
              {incident.parking_space ? (
                <><Divider /><KeyValue label="Space" value={incident.parking_space.space_code} icon="parkingSpace" /></>
              ) : null}
            </View>
          </Section>
        </Card>

        {incident.status === 'resolved' ? (
          <Card>
            <Section title="Resolution">
              <View>
                <KeyValue label="Resolved" value={formatDateTime(incident.resolved_at)} icon="checkCircle" />
                {incident.resolved_by ? (
                  <><Divider /><KeyValue label="Resolved by" value={`User #${incident.resolved_by}`} icon="user" /></>
                ) : null}
              </View>
            </Section>
          </Card>
        ) : null}

        {can('operations.incidents', 'update') && incident.status === 'open' ? (
          <Button title="Update incident" icon="edit" variant="secondary" onPress={() => setEditing(true)} />
        ) : null}
      </ScrollView>

      <IncidentForm visible={editing} incident={incident} onClose={() => setEditing(false)} />
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
