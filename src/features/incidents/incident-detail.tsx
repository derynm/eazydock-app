import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { USE_FIXTURES } from '@/api/client';
import { addIncidentAction, addIncidentNote, changeIncidentStatus, getIncident, getIncidentEvidenceBytes, getIncidentFormData, getIncidentPdf, removeIncidentEvidence, submitIncident, uploadIncidentEvidence } from '@/api/incidents';
import type { IncidentEvidence, IncidentStatus } from '@/api/types';
import { useSession } from '@/auth/session';
import { FormSheet } from '@/components/form-sheet';
import { Badge, Banner, Button, Card, Divider, EmptyState, Icon, IconButton, KeyValue, Section, Select, Skeleton, Text, TextField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { IncidentForm } from '@/features/incidents/incident-form';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { formatDateTime, titleCase } from '@/lib/format';
import { statusMeta } from '@/lib/status';

const TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  open: ['investigating', 'resolved', 'cancelled'],
  investigating: ['open', 'resolved', 'cancelled'],
  resolved: ['open'],
  cancelled: ['open'],
};

function AuthenticatedEvidence({ incidentId, evidence, canRemove, onRemove }: { incidentId: number; evidence: IncidentEvidence; canRemove: boolean; onRemove: () => void }) {
  const theme = useTheme();
  const { activeCompanyId } = useSession();
  const [preview, setPreview] = useState(false);
  const { data: localUri, isLoading } = useQuery({
    queryKey: ['incident-evidence', activeCompanyId, incidentId, evidence.id],
    enabled: !USE_FIXTURES,
    queryFn: async () => {
      const bytes = await getIncidentEvidenceBytes(incidentId, evidence.id);
      if (Platform.OS === 'web') return URL.createObjectURL(new Blob([bytes], { type: evidence.mime_type }));
      const file = new File(Paths.cache, `incident-${incidentId}-evidence-${evidence.id}.${evidence.mime_type.split('/')[1] || 'jpg'}`);
      file.create({ overwrite: true, intermediates: true });
      file.write(new Uint8Array(bytes));
      return file.uri;
    },
  });
  const uri = USE_FIXTURES ? evidence.download_url : localUri;

  useEffect(() => () => { if (Platform.OS === 'web' && localUri?.startsWith('blob:')) URL.revokeObjectURL(localUri); }, [localUri]);

  return (
    <>
      <Pressable onPress={() => uri && setPreview(true)} style={[styles.evidenceCard, { backgroundColor: theme.surfaceSunken }]}>
        {uri ? <Image source={{ uri }} style={styles.evidenceImage} /> : <View style={styles.evidenceLoading}><Icon name="image" color={theme.textMuted} /><Text variant="caption" color="textMuted">{isLoading ? 'Loading…' : 'Preview unavailable'}</Text></View>}
        {canRemove ? <View style={styles.evidenceRemove}><IconButton name="trash" accessibilityLabel={`Remove ${evidence.original_name}`} size={17} surface onPress={(event) => { event.stopPropagation(); onRemove(); }} /></View> : null}
      </Pressable>
      <Modal visible={preview} transparent animationType="fade" onRequestClose={() => setPreview(false)}>
        <SafeAreaProvider style={styles.flex}><SafeAreaView style={styles.preview}><Pressable style={StyleSheet.absoluteFill} onPress={() => setPreview(false)} /><IconButton name="close" accessibilityLabel="Close preview" surface onPress={() => setPreview(false)} style={styles.previewClose} />{uri ? <Image source={{ uri }} style={styles.previewImage} resizeMode="contain" /> : null}</SafeAreaView></SafeAreaProvider>
      </Modal>
    </>
  );
}

export function IncidentDetail({ id }: { id: number }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useSession();
  const { can } = usePermissions();
  const [editing, setEditing] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<IncidentStatus>('investigating');
  const [actionOpen, setActionOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [actionType, setActionType] = useState('manager_notified');
  const [actionLabel, setActionLabel] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [operationError, setOperationError] = useState<string | null>(null);

  const detailQuery = useQuery({ queryKey: ['incident', activeCompanyId, id], queryFn: () => getIncident(id) });
  const { data: formData } = useQuery({ queryKey: ['incident-form-data', activeCompanyId], queryFn: getIncidentFormData });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['incident', activeCompanyId, id] });
    queryClient.invalidateQueries({ queryKey: ['incidents'] });
  };
  const statusMutation = useMutation({ mutationFn: (status: IncidentStatus) => changeIncidentStatus(id, status), onSuccess: () => { invalidate(); setStatusOpen(false); }, onError: (error) => setOperationError(error instanceof Error ? error.message : 'Couldn’t update status') });
  const submitMutation = useMutation({ mutationFn: () => submitIncident(id), onSuccess: invalidate, onError: (error) => setOperationError(error instanceof Error ? error.message : 'Couldn’t submit draft') });
  const evidenceMutation = useMutation({
    mutationFn: async (assets: ImagePicker.ImagePickerAsset[]) => { for (const asset of assets) await uploadIncidentEvidence(id, asset); },
    onSuccess: invalidate,
    onError: (error) => setOperationError(error instanceof Error ? error.message : 'Couldn’t upload evidence'),
  });
  const removeEvidenceMutation = useMutation({ mutationFn: (evidenceId: number) => removeIncidentEvidence(id, evidenceId), onSuccess: invalidate, onError: (error) => setOperationError(error instanceof Error ? error.message : 'Couldn’t remove evidence') });
  const actionMutation = useMutation({ mutationFn: () => addIncidentAction(id, { action_type: actionType, label: actionType === 'custom' ? actionLabel.trim() : undefined, notes: actionNotes.trim() || null, occurred_at: new Date().toISOString() }), onSuccess: () => { invalidate(); setActionOpen(false); setActionNotes(''); setActionLabel(''); }, onError: (error) => setOperationError(error instanceof Error ? error.message : 'Couldn’t add action') });
  const noteMutation = useMutation({ mutationFn: () => addIncidentNote(id, noteBody.trim()), onSuccess: () => { invalidate(); setNoteOpen(false); setNoteBody(''); }, onError: (error) => setOperationError(error instanceof Error ? error.message : 'Couldn’t add note') });
  const pdfMutation = useMutation({
    mutationFn: async () => {
      const { bytes, filename } = await getIncidentPdf(id);
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
      } else {
        const file = new File(Paths.cache, filename); file.create({ overwrite: true, intermediates: true }); file.write(new Uint8Array(bytes));
        await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: 'Save incident report', UTI: 'com.adobe.pdf' });
      }
    },
    onError: (error) => setOperationError(error instanceof Error ? error.message : 'Couldn’t download PDF'),
  });

  if (detailQuery.isLoading) return <View style={styles.loading}><Skeleton width="55%" height={26} /><Skeleton width="70%" height={16} /><Skeleton width="100%" height={180} /></View>;
  if (detailQuery.isError || !detailQuery.data) return <EmptyState tone="error" title="Couldn’t load incident" description={detailQuery.error?.message} actionLabel="Retry" onAction={detailQuery.refetch} />;
  const incident = detailQuery.data;
  const canCreate = can('operations.incidents', 'create');
  const canUpdate = can('operations.incidents', 'update');
  const stateMeta = statusMeta(incident.is_draft ? 'draft' : incident.status);
  const severityMeta = statusMeta(incident.severity);

  const pickEvidence = async () => {
    const remaining = (formData?.evidence_limits.max_files ?? 6) - (incident.evidence?.length ?? 0);
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.85 });
    if (!result.canceled) evidenceMutation.mutate(result.assets);
  };
  const changeStatus = async (status: IncidentStatus) => {
    const needsConfirm = status === 'resolved' || status === 'cancelled';
    if (needsConfirm && !(await confirm({ title: `${titleCase(status)} incident?`, message: status === 'resolved' ? 'This records the incident as handled.' : 'This closes the incident without resolution.', confirmLabel: titleCase(status), destructive: status === 'cancelled' }))) return;
    setOperationError(null); statusMutation.mutate(status);
  };
  const removeEvidence = async (evidence: IncidentEvidence) => {
    if (await confirm({ title: 'Remove evidence?', message: 'This photo will be permanently removed.', confirmLabel: 'Remove', destructive: true })) removeEvidenceMutation.mutate(evidence.id);
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {operationError ? <Banner title="Action failed" message={operationError} tone="danger" /> : null}
        {incident.is_draft ? <Banner title="Private draft" message="Only you can see this report until it is submitted." tone="info" /> : null}
        <Card style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: incident.severity === 'critical' ? theme.dangerSoft : incident.severity === 'high' ? theme.warningSoft : theme.infoSoft }]}><Icon name="incident" size={30} color={incident.severity === 'critical' ? theme.danger : incident.severity === 'high' ? theme.warning : theme.info} /></View>
          <Text variant="heading" center>{titleCase(incident.incident_type)}</Text>
          <Text variant="caption" color="textMuted">{incident.incident_no ?? 'Incident draft'}</Text>
          <View style={styles.badges}><Badge label={severityMeta.label} tone={severityMeta.tone} /><Badge label={stateMeta.label} tone={stateMeta.tone} dot /></View>
        </Card>

        {canCreate && incident.is_draft ? (
          <View style={styles.actions}>
            <Button title="Submit report" icon="check" loading={submitMutation.isPending} onPress={() => submitMutation.mutate()} style={styles.flex} />
            {canUpdate ? <Button title="Edit" icon="edit" variant="secondary" onPress={() => setEditing(true)} style={styles.flex} /> : null}
          </View>
        ) : !incident.is_draft ? (
          <View style={styles.actions}>
            {canUpdate ? <Button title="Change status" icon="swap" onPress={() => { setOperationError(null); setPendingStatus(TRANSITIONS[incident.status][0]); setStatusOpen(true); }} style={styles.flex} /> : null}
            {canUpdate ? <Button title="Edit" icon="edit" variant="secondary" onPress={() => setEditing(true)} style={styles.flex} /> : null}
            <IconButton name="download" accessibilityLabel="Download PDF" surface disabled={pdfMutation.isPending} onPress={() => pdfMutation.mutate()} style={styles.utilityButton} />
          </View>
        ) : null}

        <Card><Section title="Description"><Text variant="body" color="textSecondary">{incident.description}</Text></Section></Card>

        <Card><Section title="Incident details"><View>
          <KeyValue label="Occurred" value={formatDateTime(incident.occurred_at)} icon="clock" /><Divider />
          <KeyValue label="Reported by" value={incident.reporter?.name ?? `User #${incident.reported_by}`} icon="user" /><Divider />
          <KeyValue label="Location" value={[incident.building?.name, incident.parking_area?.name, incident.parking_space?.space_code].filter(Boolean).join(' · ') || 'Not specified'} icon="pin" />
          {incident.location_details ? <><Divider /><KeyValue label="Location details" value={incident.location_details} icon="info" /></> : null}
          {incident.parking_transaction ? <><Divider /><KeyValue label="Related activity" value={incident.parking_transaction.transaction_no} icon="transactions" /></> : null}
          {incident.weather ? <><Divider /><KeyValue label="Weather" value={incident.weather} icon="warning" /></> : null}
          {incident.shift ? <><Divider /><KeyValue label="Shift" value={incident.shift} icon="clock" /></> : null}
        </View></Section></Card>

        {(incident.vehicles?.length ?? 0) > 0 ? <Card><Section title="Vehicles"><View>{incident.vehicles!.map((vehicle, index) => <View key={vehicle.id ?? index}>{index > 0 ? <Divider /> : null}<KeyValue label={vehicle.role === 'reporting' ? 'Reporting vehicle' : `Other vehicle ${index + 1}`} value={[vehicle.plate_number, vehicle.driver_name, vehicle.company_name].filter(Boolean).join(' · ')} icon="vehicles" /></View>)}</View></Section></Card> : null}
        {(incident.witnesses?.length ?? 0) > 0 ? <Card><Section title="Witnesses"><View>{incident.witnesses!.map((witness, index) => <View key={witness.id ?? index}>{index > 0 ? <Divider /> : null}<KeyValue label={witness.name} value={witness.contact_number ?? 'No contact number'} icon="user" /></View>)}</View></Section></Card> : null}

        <Card><Section title="Evidence" action={canCreate && (incident.evidence?.length ?? 0) < (formData?.evidence_limits.max_files ?? 6) ? <Button title="Add photos" icon="camera" size="sm" variant="secondary" loading={evidenceMutation.isPending} onPress={pickEvidence} /> : undefined}>
          {(incident.evidence?.length ?? 0) > 0 ? <View style={styles.evidenceGrid}>{incident.evidence!.map((item) => <AuthenticatedEvidence key={item.id} incidentId={id} evidence={item} canRemove={canUpdate} onRemove={() => removeEvidence(item)} />)}</View> : <Text variant="body" color="textMuted">No evidence uploaded.</Text>}
        </Section></Card>

        <Card><Section title="Actions taken" action={canUpdate ? <Button title="Add action" icon="add" size="sm" variant="secondary" onPress={() => setActionOpen(true)} /> : undefined}>
          {(incident.actions?.length ?? 0) > 0 ? <View>{incident.actions!.map((action, index) => <View key={action.id}>{index > 0 ? <Divider /> : null}<View style={styles.timelineItem}><View style={[styles.timelineDot, { backgroundColor: theme.primary }]} /><View style={styles.flex}><Text variant="bodyStrong">{action.label}</Text>{action.notes ? <Text variant="body" color="textSecondary">{action.notes}</Text> : null}<Text variant="caption" color="textMuted">{formatDateTime(action.occurred_at)} · {action.performer?.name ?? `User #${action.performed_by}`}</Text></View></View></View>)}</View> : <Text variant="body" color="textMuted">No actions recorded.</Text>}
        </Section></Card>

        <Card><Section title="Manager notes" action={canUpdate ? <Button title="Add note" icon="add" size="sm" variant="secondary" onPress={() => setNoteOpen(true)} /> : undefined}>
          {(incident.notes?.length ?? 0) > 0 ? <View>{incident.notes!.map((note, index) => <View key={note.id}>{index > 0 ? <Divider /> : null}<View style={styles.note}><Text variant="body">{note.body}</Text><Text variant="caption" color="textMuted">{note.author?.name ?? `User #${note.created_by}`} · {formatDateTime(note.created_at)}</Text></View></View>)}</View> : <Text variant="body" color="textMuted">No notes yet.</Text>}
        </Section></Card>

        {incident.status === 'resolved' ? <Card><Section title="Resolution"><View><KeyValue label="Resolved" value={formatDateTime(incident.resolved_at)} icon="checkCircle" />{incident.resolver ? <><Divider /><KeyValue label="Resolved by" value={incident.resolver.name} icon="user" /></> : null}</View></Section></Card> : null}

      </ScrollView>

      <IncidentForm visible={editing} incident={incident} onClose={() => setEditing(false)} />
      <FormSheet visible={statusOpen} onClose={() => setStatusOpen(false)} title="Change incident status" subtitle={`Current status: ${stateMeta.label}`} onSubmit={() => changeStatus(pendingStatus)} submitting={statusMutation.isPending} submitLabel="Update status" error={operationError}>
        <Select label="New status" required value={pendingStatus} options={TRANSITIONS[incident.status].map((status) => ({ value: status, label: status === 'open' ? 'Reopen' : titleCase(status) }))} onChange={setPendingStatus} />
      </FormSheet>
      <FormSheet visible={actionOpen} onClose={() => setActionOpen(false)} title="Record action" onSubmit={() => actionMutation.mutate()} submitting={actionMutation.isPending} submitLabel="Add action" error={operationError}>
        <Select label="Action" required value={actionType} options={[...(formData?.action_presets ?? []).filter((item) => item.value !== 'incident_recorded'), { value: 'custom', label: 'Custom action' }]} onChange={setActionType} />
        {actionType === 'custom' ? <TextField label="Action label" required value={actionLabel} onChangeText={setActionLabel} placeholder="Describe the action" /> : null}
        <TextField label="Notes" multiline value={actionNotes} onChangeText={setActionNotes} placeholder="Optional details…" style={styles.multiline} />
      </FormSheet>
      <FormSheet visible={noteOpen} onClose={() => setNoteOpen(false)} title="Add manager note" subtitle="Notes are append-only" onSubmit={() => noteBody.trim() && noteMutation.mutate()} submitting={noteMutation.isPending} submitLabel="Add note" error={operationError}>
        <TextField label="Note" required multiline value={noteBody} onChangeText={setNoteBody} placeholder="Add findings or follow-up instructions…" style={styles.multiline} />
      </FormSheet>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  loading: { padding: Spacing.xl, gap: Spacing.md },
  hero: { alignItems: 'center', gap: Spacing.sm },
  heroIcon: { width: 60, height: 60, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  utilityButton: { width: 44, height: 44 },
  evidenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  evidenceCard: { width: 92, height: 92, borderRadius: Radius.md, overflow: 'hidden' },
  evidenceImage: { width: 92, height: 92 },
  evidenceLoading: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
  evidenceRemove: { position: 'absolute', top: 4, right: 4 },
  preview: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '100%', height: '85%' },
  previewClose: { position: 'absolute', top: Spacing.md, right: Spacing.md, zIndex: 2 },
  timelineItem: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.md },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  note: { gap: Spacing.sm, paddingVertical: Spacing.md },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
});
