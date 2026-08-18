import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getIncidentFormData, listIncidents } from '@/api/incidents';
import type { IncidentListResponse, IncidentSeverity } from '@/api/types';
import { useSession } from '@/auth/session';
import { ResponsiveListDetail } from '@/components/responsive-list-detail';
import { Screen } from '@/components/screen';
import { Badge, Button, Card, DateField, FilterSheet, Icon, IconButton, ListRow, SearchBar, Select, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { IncidentDetail } from '@/features/incidents/incident-detail';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePaginatedList } from '@/hooks/use-paginated-list';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime, titleCase } from '@/lib/format';
import { statusMeta } from '@/lib/status';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'cancelled', label: 'Cancelled' },
];

const severityCards: { key: IncidentSeverity | ''; label: string; icon: 'alert' | 'warning' | 'info' | 'checkCircle' | 'incident' }[] = [
  { key: '', label: 'Total', icon: 'incident' },
  { key: 'critical', label: 'Critical', icon: 'alert' },
  { key: 'high', label: 'High', icon: 'warning' },
  { key: 'medium', label: 'Medium', icon: 'info' },
  { key: 'low', label: 'Low', icon: 'checkCircle' },
];

export default function IncidentsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { activeCompanyId, selectedBuilding } = useSession();
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState('open');
  const [incidentType, setIncidentType] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity | ''>('');
  const [areaId, setAreaId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: formData } = useQuery({ queryKey: ['incident-form-data', activeCompanyId], queryFn: getIncidentFormData });
  const buildingId = selectedBuilding?.id ?? null;
  const activeFilterCount = (status && status !== 'open' ? 1 : 0) + (incidentType ? 1 : 0) + (severity ? 1 : 0) + (areaId ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);
  const list = usePaginatedList(['incidents'], listIncidents, {
    search: debouncedSearch || undefined,
    status: status || undefined,
    incident_type: incidentType || undefined,
    severity: severity || undefined,
    building_id: buildingId ?? undefined,
    parking_area_id: areaId ?? undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });
  const summary = (list.firstPage as IncidentListResponse | undefined)?.summary ?? { critical: 0, high: 0, medium: 0, low: 0, total: 0 };

  const listHeader = (
    <View style={styles.listHeader}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryRow}>
        {severityCards.map((item) => {
          const selected = severity === item.key;
          const meta = statusMeta(item.key || 'open');
          return (
            <Pressable key={item.label} onPress={() => setSeverity(item.key)} accessibilityRole="button" accessibilityState={{ selected }}>
              <Card style={[styles.summaryCard, selected && { borderColor: theme.primary, backgroundColor: theme.primarySoft }]}>
                <View style={styles.summaryTop}><Icon name={item.icon} size={17} color={selected ? theme.primary : item.key ? ({ critical: theme.danger, high: theme.warning, medium: theme.info, low: theme.textMuted } as const)[item.key] : theme.primary} /><Text variant="display" style={styles.summaryValue}>{item.key ? summary[item.key] : summary.total}</Text></View>
                <Text variant="caption" tint={selected ? theme.primary : meta.tone === 'danger' ? theme.danger : theme.textSecondary}>{item.label}</Text>
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text variant="caption" color="textMuted">{list.total} result{list.total === 1 ? '' : 's'} · tap a severity card to filter</Text>
    </View>
  );

  return (
    <Screen
      title="Incidents"
      toolbar={<View style={styles.toolbarRow}><View style={styles.flex}><SearchBar value={search} onChangeText={setSearch} placeholder="Search number, location, plate, or driver" /></View><View><IconButton name="filter" accessibilityLabel="Open filters" surface onPress={() => setFilterOpen(true)} color={activeFilterCount > 0 ? theme.primary : undefined} />{activeFilterCount > 0 ? <View style={[styles.filterDot, { backgroundColor: theme.primary }]} /> : null}</View>{can('operations.incidents', 'create') ? <IconButton name="add" accessibilityLabel="Report incident" surface onPress={() => router.push('/incidents/create' as never)} /> : null}</View>}>
      <ResponsiveListDetail
        items={list.items}
        getId={(incident) => incident.id}
        loading={list.isLoading}
        errorMessage={list.isError ? list.error?.message : undefined}
        onRetry={list.refetch}
        refreshing={list.isRefetching}
        onRefresh={list.refetch}
        onEndReached={() => list.hasNextPage && list.fetchNextPage()}
        loadingMore={list.isFetchingNextPage}
        emptyTitle="No incidents found"
        emptyDescription={status === 'open' ? 'No open incidents — all clear.' : 'No incidents match these filters.'}
        listHeader={listHeader}
        onOpen={(id) => router.push(`/incidents/${id}` as never)}
        renderDetail={(id) => <IncidentDetail key={id} id={id} />}
        renderRow={(incident, { selected, onPress }) => {
          const state = statusMeta(incident.is_draft ? 'draft' : incident.status);
          const severityMeta = statusMeta(incident.severity);
          const severityColor = incident.severity === 'critical' ? theme.danger : incident.severity === 'high' ? theme.warning : incident.severity === 'medium' ? theme.info : theme.textMuted;
          return <ListRow title={incident.incident_no ?? 'Private draft'} subtitle={`${titleCase(incident.incident_type)} · ${incident.parking_area?.name ?? incident.location_details ?? 'Location not set'}`} meta={`${formatDateTime(incident.occurred_at)} · ${incident.description.slice(0, 64)}`} selected={selected} onPress={onPress} leading={<View style={[styles.icon, { backgroundColor: severityColor + '18' }]}><Icon name="incident" size={20} color={severityColor} /></View>} trailing={<View style={styles.rowBadges}><Badge label={severityMeta.label} tone={severityMeta.tone} size="sm" /><Badge label={state.label} tone={state.tone} size="sm" dot /></View>} />;
        }}
      />

      <FilterSheet visible={filterOpen} onClose={() => setFilterOpen(false)} title="Filter incidents">
        <Select label="Status" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
        <Select label="Incident type" value={incidentType} options={[{ value: '', label: 'All types' }, ...(formData?.incident_types ?? [])]} onChange={setIncidentType} />
        <Select label="Severity" value={severity} options={[{ value: '', label: 'All severities' }, ...(formData?.severities ?? [])]} onChange={(value) => setSeverity(value as IncidentSeverity | '')} />
        <Select label="Parking area" value={areaId} options={(formData?.parking_areas ?? []).filter((item) => !buildingId || item.building_id === buildingId).map((item) => ({ value: item.id, label: item.name }))} placeholder="All areas" onChange={setAreaId} />
        <View style={styles.dateRow}><View style={styles.flex}><DateField label="From" value={dateFrom} onChange={(value) => { setDateFrom(value); if (value && dateTo && value > dateTo) setDateTo(value); }} /></View><View style={styles.flex}><DateField label="To" value={dateTo} onChange={(value) => { setDateTo(value); if (value && dateFrom && value < dateFrom) setDateFrom(value); }} /></View></View>
        <Button title="Reset filters" variant="ghost" onPress={() => { setStatus('open'); setIncidentType(''); setSeverity(''); setAreaId(null); setDateFrom(''); setDateTo(''); }} />
      </FilterSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  toolbarRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  filterDot: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4 },
  listHeader: { gap: Spacing.sm },
  summaryRow: { gap: Spacing.sm },
  summaryCard: { width: 108, minHeight: 78, padding: Spacing.md, gap: Spacing.xs },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryValue: { fontSize: 24, lineHeight: 28 },
  icon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  rowBadges: { alignItems: 'flex-end', gap: Spacing.xs },
  dateRow: { flexDirection: 'row', gap: Spacing.md },
});
