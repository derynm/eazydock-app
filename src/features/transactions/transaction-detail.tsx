import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { toApiError } from '@/api/client';
import { lookupParkingSpaces } from '@/api/lookups';
import { cancelTransaction, changeSpace, checkOut, getTransaction, markOverstay } from '@/api/transactions';
import { markOverstaySchema, type MarkOverstayForm } from '@/api/schemas';
import { Badge, Button, Card, Divider, EmptyState, KeyValue, Section, Select, Skeleton, Text, TextField } from '@/components/ui';
import { zodResolver } from '@/lib/zod-resolver';
import { FormSheet } from '@/components/form-sheet';
import { Radius, Spacing } from '@/constants/theme';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { durationSince, formatDateTime, formatDuration, formatPlate, timeAgo, titleCase } from '@/lib/format';
import { ENTRY_METHODS } from '@/lib/options';
import { useForm, Controller } from 'react-hook-form';
import { transactionStatusMeta } from '@/lib/status';

export function TransactionDetail({ id, onChanged }: { id: number; onChanged?: () => void }) {
  const theme = useTheme();
  const qc = useQueryClient();
  const { can } = usePermissions();
  const [checkingOut, setCheckingOut] = useState(false);
  const [movingSpace, setMovingSpace] = useState(false);
  const [markingOverstay, setMarkingOverstay] = useState(false);

  const { data: txn, isLoading, isError, error } = useQuery({ queryKey: ['transaction', id], queryFn: () => getTransaction(id) });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['transaction', id] });
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: ['active-vehicles'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    onChanged?.();
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Skeleton width="50%" height={28} />
        <Skeleton width="70%" height={16} />
      </View>
    );
  }
  if (isError || !txn) {
    return <EmptyState tone="error" title="Couldn’t load transaction" description={error?.message} />;
  }

  const meta = transactionStatusMeta(txn.status);
  const isActive = txn.status === 'active' || txn.status === 'overstay';
  const canUpdate = can('operations.transactions', 'update');
  const canCancel = can('operations.transactions', 'delete');
  const canMarkOverstay = can('operations.incidents', 'create') && txn.status === 'active';

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.hero}>
          <View style={[styles.plate, { backgroundColor: theme.text }]}>
            <Text variant="heading" tint={theme.surface}>
              {formatPlate(txn.entry_plate_number_raw)}
            </Text>
          </View>
          <Text variant="caption" color="textMuted">
            {txn.transaction_no}
          </Text>
          <View style={styles.heroBadges}>
            <Badge label={meta.label} tone={meta.tone} dot />
            <Badge label={titleCase(txn.driver_type)} tone="neutral" />
          </View>
          <Text variant="body" color="textSecondary">
            {isActive ? `On site ${durationSince(txn.car_in_at)}` : `Stayed ${formatDuration(txn.duration_minutes)}`}
          </Text>
        </Card>

        {isActive && (canUpdate || canCancel || canMarkOverstay) ? (
          <View style={styles.actions}>
            {canUpdate ? <Button title="Check out" icon="carOut" onPress={() => setCheckingOut(true)} style={styles.flex} /> : null}
            {canUpdate ? <Button title="Move bay" icon="swap" variant="secondary" onPress={() => setMovingSpace(true)} style={styles.flex} /> : null}
            {canMarkOverstay ? <Button title="Mark overstay" icon="warning" variant="secondary" onPress={() => setMarkingOverstay(true)} style={styles.flex} /> : null}
          </View>
        ) : null}

        <Card>
          <Section title="Location">
            <View>
              <KeyValue label="Building" value={txn.building?.name} icon="building" />
              <Divider />
              <KeyValue label="Parking area" value={txn.parking_area?.name} icon="pin" />
              <Divider />
              <KeyValue label="Bay" value={txn.parking_space?.space_code} icon="occupancy" />
              <Divider />
              <KeyValue label="Tenant" value={txn.tenant?.name} icon="tenants" />
            </View>
          </Section>
        </Card>

        <Card>
          <Section title="Visit">
            <View>
              <KeyValue label="Driver" value={txn.driver?.full_name ?? txn.driver_snapshot?.full_name} icon="user" />
              <Divider />
              <KeyValue label="Checked in" value={formatDateTime(txn.car_in_at)} icon="carIn" />
              <Divider />
              <KeyValue label="Checked out" value={txn.car_out_at ? formatDateTime(txn.car_out_at) : null} icon="carOut" />
              <Divider />
              <KeyValue label="Duration" value={txn.duration_minutes != null ? formatDuration(txn.duration_minutes) : durationSince(txn.car_in_at)} icon="clock" />
              <Divider />
              <KeyValue label="Entry method" value={titleCase(txn.entry_method ?? '')} />
              <Divider />
              <KeyValue label="Contact name" value={txn.contact_name} icon="user" />
              <Divider />
              <KeyValue label="Contact phone" value={txn.contact_phone} icon="phone" />
            </View>
          </Section>
        </Card>

        {txn.events && txn.events.length > 0 ? (
          <Card>
            <Section title="Timeline">
              <View style={styles.timeline}>
                {txn.events.map((e, i) => (
                  <View key={e.id} style={styles.event}>
                    <View style={styles.eventRail}>
                      <View style={[styles.eventDot, { backgroundColor: theme.primary }]} />
                      {i < txn.events!.length - 1 ? <View style={[styles.eventLine, { backgroundColor: theme.border }]} /> : null}
                    </View>
                    <View style={styles.eventBody}>
                      <Text variant="bodyStrong">{e.description}</Text>
                      <Text variant="caption" color="textMuted">
                        {timeAgo(e.created_at)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </Section>
          </Card>
        ) : null}

        {txn.comments ? (
          <Card>
            <Section title="Comments">
              <Text variant="body" color="textSecondary">
                {txn.comments}
              </Text>
            </Section>
          </Card>
        ) : null}

        {isActive && canCancel ? (
          <Button
            title="Cancel transaction"
            variant="ghost"
            icon="xCircle"
            onPress={async () => {
              const ok = await confirm({ title: 'Cancel transaction?', message: 'This voids the check-in.', confirmLabel: 'Cancel transaction', destructive: true });
              if (!ok) return;
              try {
                await cancelTransaction(txn.id);
                invalidate();
              } catch (e) {
                await confirm({ title: 'Couldn’t cancel', message: toApiError(e).message, confirmLabel: 'OK' });
              }
            }}
          />
        ) : null}
      </ScrollView>

      <CheckOutModal visible={checkingOut} txnId={txn.id} onClose={() => setCheckingOut(false)} onDone={invalidate} />
      <ChangeSpaceModal visible={movingSpace} txnId={txn.id} areaId={txn.parking_area_id} onClose={() => setMovingSpace(false)} onDone={invalidate} />
      <MarkOverstayModal visible={markingOverstay} txnId={txn.id} onClose={() => setMarkingOverstay(false)} onDone={invalidate} />
    </>
  );
}

function CheckOutModal({ visible, txnId, onClose, onDone }: { visible: boolean; txnId: number; onClose: () => void; onDone: () => void }) {
  const [method, setMethod] = useState('manual_entry');
  const [comments, setComments] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => checkOut(txnId, method, comments || undefined),
    onSuccess: () => {
      onClose();
      onDone();
    },
    onError: (e) => setError(toApiError(e).message),
  });

  return (
    <FormSheet visible={visible} onClose={onClose} title="Check out vehicle" onSubmit={() => mutation.mutate()} submitting={mutation.isPending} submitLabel="Check out" error={error}>
      <Select label="Exit method" required value={method} options={ENTRY_METHODS} onChange={setMethod} />
      <TextField label="Comments" placeholder="Optional" multiline value={comments} onChangeText={setComments} style={{ minHeight: 80, textAlignVertical: 'top' }} />
    </FormSheet>
  );
}

function MarkOverstayModal({ visible, txnId, onClose, onDone }: { visible: boolean; txnId: number; onClose: () => void; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, reset } = useForm<MarkOverstayForm>({
    resolver: zodResolver(markOverstaySchema),
    defaultValues: { description: '' },
  });

  const mutation = useMutation({
    mutationFn: (v: MarkOverstayForm) => markOverstay(txnId, v.description),
    onSuccess: () => {
      reset();
      onClose();
      onDone();
    },
    onError: (e) => setError(toApiError(e).message),
  });

  return (
    <FormSheet
      visible={visible}
      onClose={() => { reset(); onClose(); }}
      title="Mark as overstay"
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      submitting={mutation.isPending}
      submitLabel="Mark overstay"
      error={error}>
      <Controller
        control={control}
        name="description"
        render={({ field, fieldState }) => (
          <TextField
            label="Description"
            required
            multiline
            placeholder="Describe why this is an overstay…"
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />
        )}
      />
    </FormSheet>
  );
}

function ChangeSpaceModal({ visible, txnId, areaId, onClose, onDone }: { visible: boolean; txnId: number; areaId: number; onClose: () => void; onDone: () => void }) {
  const [spaceId, setSpaceId] = useState<number | null>(null);
  const [comments, setComments] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: spaces = [] } = useQuery({ queryKey: ['spaces', areaId], queryFn: () => lookupParkingSpaces(areaId), enabled: visible });
  const options = spaces.map((s) => ({ label: s.space_code, value: s.id, hint: titleCase(s.occupancy_status) }));

  const mutation = useMutation({
    mutationFn: () => changeSpace(txnId, spaceId!, comments || undefined),
    onSuccess: () => {
      onClose();
      onDone();
    },
    onError: (e) => setError(toApiError(e).message),
  });

  return (
    <FormSheet
      visible={visible}
      onClose={onClose}
      title="Move to another bay"
      onSubmit={() => (spaceId ? mutation.mutate() : setError('Select a bay'))}
      submitting={mutation.isPending}
      submitLabel="Move vehicle"
      error={error}>
      <Select label="New bay" required value={spaceId} options={options} onChange={setSpaceId} placeholder="Select a bay" />
      <TextField label="Comments" placeholder="Optional" multiline value={comments} onChangeText={setComments} style={{ minHeight: 80, textAlignVertical: 'top' }} />
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg },
  loading: { padding: Spacing.xl, gap: Spacing.md },
  hero: { alignItems: 'center', gap: Spacing.sm },
  plate: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.md },
  heroBadges: { flexDirection: 'row', gap: Spacing.sm },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  flex: { flex: 1 },
  timeline: { gap: 0 },
  event: { flexDirection: 'row', gap: Spacing.md },
  eventRail: { alignItems: 'center', width: 16 },
  eventDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  eventLine: { width: 2, flex: 1, marginVertical: 2 },
  eventBody: { flex: 1, paddingBottom: Spacing.lg, gap: 2 },
});
