import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { toApiError } from '@/api/client';
import { cancelBooking, deleteBooking, fulfilBooking, getBooking } from '@/api/bookings';
import { Badge, Button, Card, Divider, EmptyState, KeyValue, Section, Skeleton, Text, TextField } from '@/components/ui';
import { FormSheet } from '@/components/form-sheet';
import { Radius, Spacing } from '@/constants/theme';
import { BookingForm } from '@/features/bookings/booking-form';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { formatDateTime, formatPlate, titleCase } from '@/lib/format';
import { toSydneyDateTimeValue } from '@/lib/sydney-time';
import { statusMeta } from '@/lib/status';

export function BookingDetail({ id, onChanged }: { id: number; onChanged?: () => void }) {
  const theme = useTheme();
  const qc = useQueryClient();
  const { can } = usePermissions();
  const [editing, setEditing] = useState(false);
  const [fulfilling, setFulfilling] = useState(false);

  const { data: booking, isLoading, isError, error } = useQuery({ queryKey: ['booking', id], queryFn: () => getBooking(id) });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['booking', id] });
    qc.invalidateQueries({ queryKey: ['bookings'] });
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: ['active-vehicles'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    onChanged?.();
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Skeleton width="50%" height={26} />
        <Skeleton width="70%" height={16} />
      </View>
    );
  }
  if (isError || !booking) {
    return <EmptyState tone="error" title="Couldn’t load booking" description={error?.message} />;
  }

  const meta = statusMeta(booking.status);
  const editable = booking.status === 'pending' || booking.status === 'confirmed';
  const canUpdate = can('operations.bookings', 'update');
  const canDelete = can('operations.bookings', 'delete');

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.hero}>
          <View style={[styles.plate, { backgroundColor: theme.text }]}>
            <Text variant="heading" tint={theme.surface}>
              {formatPlate(booking.plate_number_raw)}
            </Text>
          </View>
          <Text variant="caption" color="textMuted">
            {booking.booking_no}
          </Text>
          <View style={styles.heroBadges}>
            <Badge label={meta.label} tone={meta.tone} dot />
            <Badge label={titleCase(booking.driver_type)} tone="neutral" />
          </View>
        </Card>

        {editable && canUpdate ? (
          <View style={styles.actions}>
            <Button title="Fulfil" icon="carIn" onPress={() => setFulfilling(true)} style={styles.flex} />
            <Button title="Edit" icon="edit" variant="secondary" onPress={() => setEditing(true)} style={styles.flex} />
          </View>
        ) : null}

        <Card>
          <Section title="Schedule">
            <View>
              <KeyValue label="Starts" value={formatDateTime(toSydneyDateTimeValue(booking.starts_at))} icon="bookings" />
              <Divider />
              <KeyValue label="Ends" value={formatDateTime(toSydneyDateTimeValue(booking.ends_at))} icon="clock" />
            </View>
          </Section>
        </Card>

        <Card>
          <Section title="Location">
            <View>
              <KeyValue label="Building" value={booking.building?.name} icon="building" />
              <Divider />
              <KeyValue label="Area" value={booking.parking_area?.name} icon="pin" />
              <Divider />
              <KeyValue label="Bay" value={booking.parking_space?.space_code} icon="occupancy" />
              <Divider />
              <KeyValue label="Tenant" value={booking.tenant?.name} icon="tenants" />
            </View>
          </Section>
        </Card>

        {booking.driver ? (
          <Card>
            <Section title="Driver">
              <View>
                <KeyValue label="Name" value={booking.driver.full_name} icon="user" />
                <Divider />
                <KeyValue label="Phone" value={booking.driver.phone} icon="phone" />
                <Divider />
                <KeyValue label="Email" value={booking.driver.email} icon="mail" />
                <Divider />
                <KeyValue label="Company" value={booking.driver.company_name} icon="building" />
              </View>
            </Section>
          </Card>
        ) : null}

        {booking.notes ? (
          <Card>
            <Section title="Notes">
              <Text variant="body" color="textSecondary">
                {booking.notes}
              </Text>
            </Section>
          </Card>
        ) : null}

        {editable && canUpdate ? (
          <Button
            title="Cancel booking"
            variant="ghost"
            icon="xCircle"
            onPress={async () => {
              const ok = await confirm({ title: 'Cancel booking?', confirmLabel: 'Cancel booking', destructive: true });
              if (!ok) return;
              try {
                await cancelBooking(booking.id);
                invalidate();
              } catch (e) {
                await confirm({ title: 'Couldn’t cancel', message: toApiError(e).message, confirmLabel: 'OK' });
              }
            }}
          />
        ) : null}

        {canDelete ? (
          <Button
            title="Delete booking"
            variant="danger"
            icon="trash"
            onPress={async () => {
              const ok = await confirm({ title: 'Delete booking?', message: `${booking.booking_no} will be removed.`, confirmLabel: 'Delete', destructive: true });
              if (!ok) return;
              try {
                await deleteBooking(booking.id);
                qc.invalidateQueries({ queryKey: ['bookings'] });
                onChanged?.();
              } catch (e) {
                const err = toApiError(e);
                await confirm({ title: 'Couldn’t delete', message: err.field('booking') ?? err.message, confirmLabel: 'OK' });
              }
            }}
          />
        ) : null}
      </ScrollView>

      <BookingForm visible={editing} booking={booking} onClose={() => setEditing(false)} />
      <FulfilModal visible={fulfilling} bookingId={booking.id} onClose={() => setFulfilling(false)} onDone={invalidate} />
    </>
  );
}

function FulfilModal({ visible, bookingId, onClose, onDone }: { visible: boolean; bookingId: number; onClose: () => void; onDone: () => void }) {
  const [comments, setComments] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => fulfilBooking(bookingId, comments || undefined),
    onSuccess: () => {
      onClose();
      onDone();
    },
    onError: (e) => {
      const err = toApiError(e);
      setError(err.field('booking') ?? err.message);
    },
  });
  const closeWithoutSaving = () => {
    setComments('');
    setError(null);
    mutation.reset();
    onClose();
  };

  return (
    <FormSheet visible={visible} onClose={closeWithoutSaving} title="Fulfil booking" subtitle="Creates a check-in transaction" onSubmit={() => mutation.mutate()} submitting={mutation.isPending} submitLabel="Fulfil" error={error}>
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
});
