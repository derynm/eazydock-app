import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { toApiError } from '@/api/client';
import { createBooking, getBookingFormData, updateBooking, type BookingInput } from '@/api/bookings';
import { searchDrivers } from '@/api/lookups';
import { bookingSchema, type BookingForm as BookingFormValues } from '@/api/schemas';
import type { Booking } from '@/api/types';
import { FormSheet } from '@/components/form-sheet';
import { AutocompleteField, DateTimeField, Select, Text, TextField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DRIVER_TYPES } from '@/lib/options';
import { zodResolver } from '@/lib/zod-resolver';

type Props = { visible: boolean; booking: Booking | null; onClose: () => void };

const EMPTY: BookingFormValues = {
  building_id: 0,
  parking_area_id: 0,
  parking_space_id: 0,
  tenant_id: null,
  driver_id: null,
  vehicle_id: null,
  driver_type: 'delivery',
  plate_number: '',
  contact_name: '',
  contact_phone: '',
  starts_at: '',
  ends_at: '',
  notes: '',
};

type NewDriverDraft = { phone: string; company: string };

const toInput = (v: BookingFormValues, driverText: string, newDriver: NewDriverDraft): BookingInput => {
  const creatingDriver = !v.driver_id && driverText.trim().length > 0;
  return {
    building_id: v.building_id,
    parking_area_id: v.parking_area_id,
    parking_space_id: v.parking_space_id,
    tenant_id: v.tenant_id ?? null,
    driver_id: v.driver_id ?? null,
    driver_name: creatingDriver ? driverText.trim() : null,
    driver_phone: creatingDriver ? newDriver.phone || null : null,
    driver_company_name: creatingDriver ? newDriver.company || null : null,
    vehicle_id: v.vehicle_id ?? null,
    driver_type: v.driver_type,
    plate_number: v.plate_number,
    contact_name: v.contact_name || null,
    contact_phone: v.contact_phone || null,
    starts_at: v.starts_at,
    ends_at: v.ends_at,
    notes: v.notes || null,
  };
};

export function BookingForm({ visible, booking, onClose }: Props) {
  const theme = useTheme();
  const qc = useQueryClient();
  const [topError, setTopError] = useState<string | null>(null);
  const [driverText, setDriverText] = useState('');
  const [newDriver, setNewDriver] = useState<NewDriverDraft>({ phone: '', company: '' });
  const initializedDriver = useRef<string | null>(null);

  const { data: formData } = useQuery({ queryKey: ['booking-form-data'], queryFn: getBookingFormData, enabled: visible });

  const formValues = useMemo<BookingFormValues>(
    () =>
      booking
        ? {
            building_id: booking.building_id,
            parking_area_id: booking.parking_area_id,
            parking_space_id: booking.parking_space_id,
            tenant_id: booking.tenant_id,
            driver_id: booking.driver_id,
            vehicle_id: booking.vehicle_id,
            driver_type: booking.driver_type,
            plate_number: booking.plate_number_raw,
            contact_name: booking.contact_name ?? '',
            contact_phone: booking.contact_phone ?? '',
            starts_at: booking.starts_at,
            ends_at: booking.ends_at,
            notes: booking.notes ?? '',
          }
        : EMPTY,
    // `visible` re-syncs the form (and clears stale input) each time it opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, booking],
  );

  const { control, handleSubmit, setError, watch, setValue } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    values: formValues,
  });

  const buildingId = watch('building_id');
  const areaId = watch('parking_area_id');

  const buildings = formData?.buildings ?? [];
  const areas = (formData?.areas ?? []).filter((a) => a.building_id === buildingId);
  const spaces = (formData?.spaces ?? []).filter((s) => s.parking_area_id === areaId);
  const tenants = formData?.tenants ?? [];
  const drivers = useMemo(() => formData?.drivers ?? [], [formData?.drivers]);
  const driverId = watch('driver_id');
  const isNewDriver = !driverId && driverText.trim().length > 0;

  useEffect(() => {
    if (!visible) {
      initializedDriver.current = null;
      return;
    }

    const key = `${booking?.id ?? 'new'}:${booking?.driver_id ?? 'none'}`;
    if (initializedDriver.current === key) return;
    if (booking?.driver_id && drivers.length === 0) return;

    const selected = booking?.driver_id ? drivers.find((driver) => driver.id === booking.driver_id) : undefined;
    setDriverText(selected?.full_name ?? (booking?.driver_id ? `Driver #${booking.driver_id}` : ''));
    setNewDriver({ phone: '', company: '' });
    initializedDriver.current = key;
  }, [booking?.driver_id, booking?.id, drivers, visible]);

  const mutation = useMutation({
    mutationFn: (v: BookingFormValues) =>
      booking
        ? updateBooking(booking.id, toInput(v, driverText, newDriver))
        : createBooking(toInput(v, driverText, newDriver)),
    onMutate: () => setTopError(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['drivers'] });
      qc.invalidateQueries({ queryKey: ['booking-form-data'] });
      if (booking) qc.invalidateQueries({ queryKey: ['booking', booking.id] });
      onClose();
    },
    onError: (err) => {
      const api = toApiError(err);
      setTopError(api.status === 422 ? null : api.message);
      Object.entries(api.errors).forEach(([field, msgs]) => {
        if (field.startsWith('driver_') && field !== 'driver_id') {
          setTopError(msgs[0]);
          return;
        }
        setError(field as keyof BookingFormValues, { message: msgs[0] });
      });
    },
  });

  return (
    <FormSheet
      visible={visible}
      onClose={onClose}
      title={booking ? 'Edit booking' : 'New booking'}
      subtitle={booking?.booking_no}
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      submitting={mutation.isPending}
      submitLabel={booking ? 'Save changes' : 'Create booking'}
      error={topError}>
      <Controller
        control={control}
        name="plate_number"
        render={({ field, fieldState }) => (
          <TextField label="Plate number" required icon="vehicles" placeholder="ABC123" autoCapitalize="characters" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="building_id"
        render={({ field, fieldState }) => (
          <Select label="Building" required value={field.value || null} options={buildings.map((b) => ({ label: b.name, value: b.id }))}
            onChange={(v) => { field.onChange(v); setValue('parking_area_id', 0); setValue('parking_space_id', 0); }}
            error={fieldState.error?.message} placeholder="Select building" />
        )}
      />
      <Controller
        control={control}
        name="parking_area_id"
        render={({ field, fieldState }) => (
          <Select label="Parking area" required value={field.value || null} options={areas.map((a) => ({ label: a.name, value: a.id }))}
            onChange={(v) => { field.onChange(v); setValue('parking_space_id', 0); }}
            error={fieldState.error?.message} placeholder={buildingId ? 'Select area' : 'Choose a building first'} disabled={!buildingId} />
        )}
      />
      <Controller
        control={control}
        name="parking_space_id"
        render={({ field, fieldState }) => (
          <Select label="Bay" required value={field.value || null} options={spaces.map((s) => ({ label: s.space_code, value: s.id }))}
            onChange={field.onChange} error={fieldState.error?.message} placeholder={areaId ? 'Select bay' : 'Choose an area first'} disabled={!areaId} />
        )}
      />
      <Controller
        control={control}
        name="starts_at"
        render={({ field, fieldState }) => (
          <DateTimeField label="Starts at" required value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="ends_at"
        render={({ field, fieldState }) => (
          <DateTimeField label="Ends at" required value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="driver_type"
        render={({ field, fieldState }) => (
          <Select label="Driver type" required value={field.value} options={DRIVER_TYPES} onChange={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="tenant_id"
        render={({ field }) => (
          <Select label="Tenant (optional)" value={field.value ?? null} options={tenants.map((t) => ({ label: t.name, value: t.id }))} onChange={field.onChange} placeholder="No tenant" />
        )}
      />
      <AutocompleteField
        label="Driver (optional)"
        icon="drivers"
        placeholder="Type a driver name…"
        hint="Pick a match to link an existing driver, or type a name to add a new one."
        queryKey="booking-drivers"
        hideNoMatches
        value={driverText}
        onChangeText={(text) => {
          setDriverText(text);
          if (driverId) setValue('driver_id', null);
        }}
        search={async (query) =>
          (await searchDrivers(query)).map((driver) => ({
            id: driver.id,
            label: driver.full_name,
            hint: driver.company_name ?? driver.phone ?? undefined,
          }))
        }
        onSelect={(item) => {
          setDriverText(item.label);
          setNewDriver({ phone: '', company: '' });
          setValue('driver_id', item.id);
        }}
      />
      {isNewDriver ? (
        <View style={[styles.newDriver, { backgroundColor: theme.surfaceSunken }]}>
          <Text variant="caption" tint={theme.primary}>
            New driver — “{driverText.trim()}” will be added to Drivers.
          </Text>
          <TextField
            label="Phone"
            icon="phone"
            keyboardType="phone-pad"
            placeholder="04xx xxx xxx"
            value={newDriver.phone}
            onChangeText={(phone) => setNewDriver((current) => ({ ...current, phone }))}
          />
          <TextField
            label="Company"
            icon="building"
            placeholder="Company name"
            value={newDriver.company}
            onChangeText={(company) => setNewDriver((current) => ({ ...current, company }))}
          />
        </View>
      ) : null}
      <Controller
        control={control}
        name="contact_name"
        render={({ field, fieldState }) => (
          <TextField label="Contact name" icon="user" placeholder="Contact person" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="contact_phone"
        render={({ field, fieldState }) => (
          <TextField label="Contact phone" icon="phone" keyboardType="phone-pad" placeholder="04xx xxx xxx" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="notes"
        render={({ field, fieldState }) => (
          <TextField label="Notes" placeholder="Optional" multiline value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} style={{ minHeight: 80, textAlignVertical: 'top' }} />
        )}
      />
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  newDriver: {
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
});
