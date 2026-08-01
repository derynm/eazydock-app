import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { listIncidents } from '@/api/incidents';
import { ResponsiveListDetail } from '@/components/responsive-list-detail';
import { Screen } from '@/components/screen';
import { Badge, Button, DateField, FilterSheet, Icon, IconButton, ListRow, Segmented } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { IncidentDetail } from '@/features/incidents/incident-detail';
import { IncidentForm } from '@/features/incidents/incident-form';
import { usePaginatedList } from '@/hooks/use-paginated-list';
import { usePermissions } from '@/hooks/use-permissions';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, titleCase } from '@/lib/format';
import { statusMeta } from '@/lib/status';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

const TYPE_FILTERS = [
  { value: '', label: 'All types' },
  { value: 'overstay', label: 'Overstay' },
  { value: 'damage', label: 'Damage' },
  { value: 'blocked_space', label: 'Blocked' },
  { value: 'unauthorised_vehicle', label: 'Unauthorised' },
  { value: 'safety', label: 'Safety' },
  { value: 'other', label: 'Other' },
] as const;

export default function IncidentsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { can } = usePermissions();
  const { isTablet } = useResponsive();
  const [status, setStatus] = useState('open');
  const [incidentType, setIncidentType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [creating, setCreating] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount =
    (status && status !== 'open' ? 1 : 0) +
    (incidentType ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const list = usePaginatedList(['incidents'], listIncidents, {
    status: status || undefined,
    incident_type: incidentType || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  return (
    <Screen
      title="Incidents"
      headerRight={
        <View style={styles.headerRight}>
          <View>
            <IconButton
              name="filter"
              accessibilityLabel="Open filters"
              surface
              onPress={() => setFilterOpen(true)}
              color={activeFilterCount > 0 ? theme.primary : undefined}
            />
            {activeFilterCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: theme.primary }]} />
            ) : null}
          </View>
          {can('operations.incidents', 'create') ? (
            isTablet ? (
              <Button title="Report incident" icon="add" size="sm" onPress={() => setCreating(true)} />
            ) : (
              <IconButton name="add" accessibilityLabel="Report incident" surface onPress={() => setCreating(true)} />
            )
          ) : null}
        </View>
      }>
      <ResponsiveListDetail
        items={list.items}
        getId={(i) => i.id}
        loading={list.isLoading}
        errorMessage={list.isError ? list.error?.message : undefined}
        onRetry={list.refetch}
        refreshing={list.isRefetching}
        onRefresh={list.refetch}
        onEndReached={() => list.hasNextPage && list.fetchNextPage()}
        loadingMore={list.isFetchingNextPage}
        emptyTitle="No incidents found"
        emptyDescription={status === 'open' ? 'No open incidents — all clear.' : 'No incidents match this filter.'}
        onOpen={(id) => router.push(`/incidents/${id}` as never)}
        renderDetail={(id) => <IncidentDetail key={id} id={id} />}
        renderRow={(incident, { selected, onPress }) => {
          const meta = statusMeta(incident.status);
          const iconColor = incident.status === 'open' ? theme.warning : incident.status === 'resolved' ? theme.success : theme.textMuted;
          const iconBg = incident.status === 'open' ? theme.warningSoft : incident.status === 'resolved' ? theme.successSoft : theme.neutralSoft;
          return (
            <ListRow
              title={titleCase(incident.incident_type)}
              subtitle={incident.description.slice(0, 80)}
              meta={formatDate(incident.created_at)}
              selected={selected}
              onPress={onPress}
              leading={
                <View style={[styles.icon, { backgroundColor: iconBg }]}>
                  <Icon name="incident" size={20} color={iconColor} />
                </View>
              }
              trailing={<Badge label={meta.label} tone={meta.tone} size="sm" dot />}
            />
          );
        }}
      />

      <FilterSheet visible={filterOpen} onClose={() => setFilterOpen(false)} title="Filter incidents">
        <Segmented scrollable options={TYPE_FILTERS as never} value={incidentType} onChange={setIncidentType} />
        <Segmented scrollable options={STATUS_FILTERS as never} value={status} onChange={setStatus} />
        <View style={styles.dateRow}>
          <View style={styles.dateCol}>
            <DateField
              label="From"
              value={dateFrom}
              onChange={(value) => {
                setDateFrom(value);
                if (value && dateTo && value > dateTo) setDateTo(value);
              }}
              placeholder="Date"
            />
          </View>
          <View style={styles.dateCol}>
            <DateField
              label="To"
              value={dateTo}
              onChange={(value) => {
                setDateTo(value);
                if (value && dateFrom && value < dateFrom) setDateFrom(value);
              }}
              placeholder="Date"
            />
          </View>
        </View>
      </FilterSheet>

      <IncidentForm visible={creating} incident={null} onClose={() => setCreating(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  headerRight: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  badge: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4 },
  dateRow: { flexDirection: 'row', gap: Spacing.md },
  dateCol: { flex: 1 },
});
