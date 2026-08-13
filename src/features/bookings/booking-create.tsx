import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, View, type ScrollView } from 'react-native';

import { createBooking, getBookingFormData, listBookingsBySpace, type BookingInput } from '@/api/bookings';
import { toApiError } from '@/api/client';
import { searchDrivers } from '@/api/lookups';
import { bookingSchema, type BookingForm as BookingFormValues } from '@/api/schemas';
import { searchDriverCompanies, searchVehicles } from '@/api/transactions';
import { useSession } from '@/auth/session';
import { FormScrollView } from '@/components/form-error-scroll';
import { Screen } from '@/components/screen';
import { AutocompleteField, Banner, Button, Card, DateTimeField, IconButton, Section, Select, TextField, type AutocompleteItem } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { lookupPlate, type ActiveTransaction } from '@/features/transactions/plate-lookup';
import { PlateScanner } from '@/features/transactions/plate-scanner';
import { formatPlate, timeAgo } from '@/lib/format';
import { DRIVER_TYPES } from '@/lib/options';
import { instantFromSydneyDateTimeValue, toSydneyDateTimeValue } from '@/lib/sydney-time';
import { zodResolver } from '@/lib/zod-resolver';

const EMPTY: BookingFormValues = {
  building_id: 0,
  parking_area_id: 0,
  parking_space_id: 0,
  tenant_id: null,
  driver_id: null,
  vehicle_id: null,
  driver_type: 'delivery',
  plate_number: '',
  driver_phone: '',
  starts_at: '',
  ends_at: '',
  notes: '',
};

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'new' }
  | {
      status: 'found';
      driverName?: string;
      tenantName?: string;
      lastVisitAt?: string | null;
      activeTransaction?: ActiveTransaction | null;
    };

const MAX_CONFLICT_LOOKUP_DAYS = 31;

function datesCoveredByRange(startsAt: string, endsAt: string): string[] {
  const startValue = toSydneyDateTimeValue(startsAt);
  const endValue = toSydneyDateTimeValue(endsAt);
  const startDate = startValue.slice(0, 10);
  const endDate = endValue.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) return [];

  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const last = new Date(`${endDate}T00:00:00Z`);
  while (cursor <= last && dates.length < MAX_CONFLICT_LOOKUP_DAYS) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function formatConflictTime(value: string): string {
  const date = new Date(toSydneyDateTimeValue(value));
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function BookingCreate() {
  const router = useRouter();
  const qc = useQueryClient();
  const { selectedBuilding } = useSession();
  const [topError, setTopError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lookup, setLookup] = useState<LookupState>({ status: 'idle' });
  const [revealed, setRevealed] = useState(false);
  const [hasOpenedForm, setHasOpenedForm] = useState(false);
  const [vehicleMatchesQuery, setVehicleMatchesQuery] = useState<string | null>(null);
  const [driverText, setDriverText] = useState('');
  const [driverCompany, setDriverCompany] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const { control, getValues, handleSubmit, setError, setValue, watch } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: EMPTY,
  });

  const buildingId = selectedBuilding?.id ?? 0;
  const areaId = watch('parking_area_id');
  const driverId = watch('driver_id');
  const plateNumber = watch('plate_number');
  const startsAt = watch('starts_at');
  const endsAt = watch('ends_at');
  const normalizedPlate = plateNumber.trim().toUpperCase();
  const hasVehicleMatches = vehicleMatchesQuery === normalizedPlate;
  const conflictLookupDates = datesCoveredByRange(startsAt, endsAt);

  useEffect(() => {
    if (buildingId) setValue('building_id', buildingId);
  }, [buildingId, setValue]);

  useEffect(() => {
    if (!topError) return;
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
    return () => cancelAnimationFrame(frame);
  }, [topError]);

  const { data: formData } = useQuery({
    queryKey: ['booking-form-data'],
    queryFn: getBookingFormData,
  });

  const areas = (formData?.areas ?? []).filter((area) => area.building_id === buildingId);
  const spaces = (formData?.spaces ?? [])
    .filter((space) => space.parking_area_id === areaId)
    .sort((a, b) => a.space_code.localeCompare(b.space_code, undefined, { numeric: true, sensitivity: 'base' }));
  const tenants = formData?.tenants ?? [];

  const { data: bookingDays = [] } = useQuery({
    queryKey: ['booking-time-conflicts', buildingId, areaId, startsAt, endsAt],
    queryFn: () => Promise.all(conflictLookupDates.map((date) => listBookingsBySpace({
      date,
      building_id: buildingId,
      parking_area_id: areaId,
    }))),
    enabled: !!buildingId && !!areaId && conflictLookupDates.length > 0,
  });

  const requestedStart = instantFromSydneyDateTimeValue(startsAt);
  const requestedEnd = instantFromSydneyDateTimeValue(endsAt);
  const conflictMap = new Map<string, { bay: string; plate: string; startsAt: string; endsAt: string }>();
  bookingDays.flatMap((groups) => groups).forEach((group) => {
    group.bookings.forEach((booking) => {
      if (booking.status !== 'pending' && booking.status !== 'confirmed') return;
      const existingStart = instantFromSydneyDateTimeValue(booking.starts_at);
      const existingEnd = instantFromSydneyDateTimeValue(booking.ends_at);
      const overlaps = !!requestedStart && !!requestedEnd && requestedEnd > requestedStart && !!existingStart && !!existingEnd &&
        existingStart < requestedEnd && existingEnd > requestedStart;
      if (overlaps) {
        conflictMap.set(`${group.parking_space_id}:${booking.id}`, {
          bay: group.space_code,
          plate: formatPlate(booking.plate_number_raw),
          startsAt: booking.starts_at,
          endsAt: booking.ends_at,
        });
      }
    });
  });
  const bookingConflicts = [...conflictMap.values()].sort((a, b) =>
    a.bay.localeCompare(b.bay, undefined, { numeric: true, sensitivity: 'base' }) ||
    a.startsAt.localeCompare(b.startsAt),
  );
  const occupiedSpaceIds = new Set(
    bookingDays.flatMap((groups) => groups)
      .filter((group) => group.status === 'occupied')
      .map((group) => group.parking_space_id),
  );
  const isImmediateBooking = !!requestedStart && requestedStart.getTime() <= Date.now();
  const bayOptions = spaces.map((space) => {
    const conflicts = bookingConflicts.filter((conflict) => conflict.bay === space.space_code);
    const currentlyOccupied = isImmediateBooking && occupiedSpaceIds.has(space.id);
    return {
      label: space.space_code,
      value: space.id,
      hint: currentlyOccupied
        ? 'Currently occupied · unavailable for an immediate booking'
        : conflicts.length > 0
        ? conflicts.map((conflict) =>
          `Time conflict · Plate ${conflict.plate} · ${formatConflictTime(conflict.startsAt)}–${formatConflictTime(conflict.endsAt)}`,
        ).join(' • ')
        : 'Available for this schedule',
      hintTone: currentlyOccupied || conflicts.length > 0 ? 'warning' as const : 'success' as const,
    };
  });

  const runLookup = async () => {
    const plate = getValues('plate_number').trim();
    if (!plate) return;

    Keyboard.dismiss();
    setRevealed(false);
    setLookup({ status: 'loading' });
    try {
      const profile = await lookupPlate(plate);

      if (!profile.found) {
        setValue('vehicle_id', null);
        setValue('driver_id', null);
        setDriverText('');
        setDriverCompany('');
        setHasOpenedForm(true);
        setRevealed(true);
        setLookup({ status: 'new' });
        return;
      }

      setHasOpenedForm(!profile.activeTransaction);
      setRevealed(!profile.activeTransaction);
      setValue('vehicle_id', profile.vehicleId ?? null);
      if (profile.driverType) setValue('driver_type', profile.driverType);
      setValue('parking_space_id', 0);
      setValue('tenant_id', profile.tenantId ?? null);
      setValue('driver_id', profile.driverId ?? null);
      setDriverText(profile.driverId ? (profile.driverName ?? `Driver #${profile.driverId}`) : '');
      setDriverCompany(profile.driverCompanyName ?? '');

      const priorVisit = profile.recentVisits.find((v) => v.id !== profile.activeTransaction?.id);
      setLookup({
        status: 'found',
        driverName: profile.driverName,
        tenantName: profile.tenantName,
        lastVisitAt: priorVisit?.carInAt,
        activeTransaction: profile.activeTransaction,
      });
    } catch (error) {
      setTopError(toApiError(error).message);
      setLookup({ status: 'idle' });
    }
  };

  const clearPrefill = (keepFormOpen = false) => {
    setValue('vehicle_id', null);
    setValue('tenant_id', null);
    setValue('driver_id', null);
    setDriverText('');
    setDriverCompany('');
    setRevealed(keepFormOpen);
    setLookup(keepFormOpen ? { status: 'new' } : { status: 'idle' });
  };

  const resetToPlateStep = () => {
    clearPrefill();
    setHasOpenedForm(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
    });
  };

  const onPickVehicle = async (item: AutocompleteItem) => {
    clearPrefill();
    setValue('plate_number', item.label);
    await runLookup();
  };

  const mutation = useMutation({
    mutationFn: (values: BookingFormValues) => {
      const creatingDriver = !values.driver_id && driverText.trim().length > 0;
      const hasDriver = !!values.driver_id || creatingDriver;
      const input: BookingInput = {
        building_id: values.building_id,
        parking_area_id: values.parking_area_id,
        parking_space_id: values.parking_space_id,
        tenant_id: values.tenant_id ?? null,
        driver_id: values.driver_id ?? null,
        driver_name: creatingDriver ? driverText.trim() : null,
        driver_phone: values.driver_phone || null,
        driver_company_name: hasDriver ? driverCompany || null : null,
        vehicle_id: values.vehicle_id ?? null,
        driver_type: values.driver_type,
        plate_number: values.plate_number,
        starts_at: values.starts_at,
        ends_at: values.ends_at,
        notes: values.notes || null,
      };
      return createBooking(input);
    },
    onMutate: () => setTopError(null),
    onSuccess: (booking) => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['bookings-by-space'] });
      qc.invalidateQueries({ queryKey: ['bookings-list'] });
      qc.invalidateQueries({ queryKey: ['drivers'] });
      qc.invalidateQueries({ queryKey: ['booking-form-data'] });
      router.replace(`/bookings/${booking.id}`);
    },
    onError: (error) => {
      const apiError = toApiError(error);
      setTopError(apiError.status === 422 ? null : apiError.message);
      Object.entries(apiError.errors).forEach(([field, messages]) => {
        if (field.startsWith('driver_') && field !== 'driver_id') {
          setTopError(messages[0]);
          return;
        }
        setError(field as keyof BookingFormValues, { message: messages[0] });
      });
    },
  });

  return (
    <Screen title="New booking" onBack={() => router.back()}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <FormScrollView
          key={hasOpenedForm ? 'booking-form' : 'booking-plate-step'}
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[styles.content, !hasOpenedForm && styles.contentCentered]}
          onContentSizeChange={() => {
            if (!hasOpenedForm) scrollRef.current?.scrollTo({ y: 0, animated: false });
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {topError ? <Banner title="Couldn’t create booking" message={topError} tone="danger" /> : null}

          <Card>
            <Section title="Vehicle">

            <Controller
              control={control}
              name="plate_number"
              render={({ field, fieldState }) => (
                <AutocompleteField
                  label="Plate number"
                  required
                  icon="vehicles"
                  placeholder="ABC123"
                  autoCapitalize="characters"
                  autoFocus={false}
                  returnKeyType="search"
                  queryKey="booking-vehicles"
                  minChars={1}
                  noMatchesText="New vehicle"
                  value={field.value}
                  onChangeText={(value) => {
                    field.onChange(value);
                    if (!value.trim()) {
                      resetToPlateStep();
                    } else if (hasOpenedForm) {
                      clearPrefill(true);
                    } else if (lookup.status !== 'idle') {
                      clearPrefill();
                    }
                  }}
                  search={async (query) => {
                    const vehicles = await searchVehicles(query);
                    const normalizedQuery = query.trim().toUpperCase();
                    if (getValues('plate_number').trim().toUpperCase() === normalizedQuery) {
                      setVehicleMatchesQuery(vehicles.length > 0 ? normalizedQuery : null);
                    }
                    return vehicles.map((vehicle) => ({ id: vehicle.id, label: vehicle.plate_number }));
                  }}
                  onSelect={onPickVehicle}
                  onSubmitEditing={runLookup}
                  error={fieldState.error?.message}
                  hint={!revealed ? 'Type a plate — matching vehicles appear as you type.' : undefined}
                  trailing={
                    <IconButton name="scan" size={20} accessibilityLabel="Scan plate" onPress={() => setScanning(true)} />
                  }
                />
              )}
            />

            {lookup.status === 'found' ? (
              <>
                {!lookup.activeTransaction ? (
                  <Banner
                    tone="success"
                    icon="checkCircle"
                    title="Returning vehicle"
                    message={[
                      lookup.driverName || null,
                      lookup.tenantName ? `visiting ${lookup.tenantName}` : null,
                      lookup.lastVisitAt ? `· last seen ${timeAgo(lookup.lastVisitAt)}` : null,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                ) : null}
                {lookup.activeTransaction ? (
                  <Banner
                    tone="warning"
                    title="Currently checked in"
                    message={`This vehicle is inside now (${lookup.activeTransaction.transactionNo}${lookup.activeTransaction.parkingSpaceCode ? ` · bay ${lookup.activeTransaction.parkingSpaceCode}` : ''}).`}
                  />
                ) : null}
              </>
            ) : lookup.status === 'new' && revealed && !hasVehicleMatches ? (
              <Banner
                tone="info"
                icon="info"
                title="New vehicle"
                message="No previous visits for this plate. The vehicle will be resolved when the booking is fulfilled."
              />
            ) : null}

            {!revealed ? (
              <Button
                title="Proceed"
                iconRight="arrowRight"
                size="lg"
                loading={lookup.status === 'loading'}
                disabled={!plateNumber.trim() || (lookup.status === 'found' && !!lookup.activeTransaction)}
                onPress={runLookup}
                fullWidth
              />
            ) : null}
            </Section>
          </Card>

          {revealed ? (
            <>
            <Card>
              <Section title="Schedule">
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
              </Section>
            </Card>

            <Card>
              <Section title="Location">
                <Controller
                  control={control}
                  name="parking_area_id"
                  render={({ field, fieldState }) => (
                    <Select
                      label="Parking area"
                      required
                      value={field.value || null}
                      options={areas.map((area) => ({ label: area.name, value: area.id }))}
                      onChange={(value) => {
                        field.onChange(value);
                        setValue('parking_space_id', 0);
                      }}
                      error={fieldState.error?.message}
                      placeholder={buildingId ? 'Select area' : 'Choose a building first'}
                      disabled={!buildingId}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="parking_space_id"
                  render={({ field, fieldState }) => (
                    <Select
                      label="Bay"
                      required
                      value={field.value || null}
                      options={bayOptions}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                      placeholder={areaId ? 'Select bay' : 'Choose an area first'}
                      disabled={!areaId}
                    />
                  )}
                />
              </Section>
            </Card>

            <Card>
              <Section title="Visit">
                <Controller
                  control={control}
                  name="driver_type"
                  render={({ field, fieldState }) => (
                    <Select
                      label="Driver type"
                      required
                      value={field.value}
                      options={DRIVER_TYPES}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                    />
                  )}
                />
                <AutocompleteField
                  label="Driver"
                  icon="drivers"
                  placeholder="Type a driver name…"
                  hint="Pick a match to link an existing driver, or just type a name to add a new one."
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
                      data: { phone: driver.phone, companyName: driver.company_name },
                    }))
                  }
                  onSelect={(item) => {
                    setDriverText(item.label);
                    setValue('driver_phone', item.data?.phone ?? '');
                    setDriverCompany(item.data?.companyName ?? '');
                    setValue('driver_id', item.id);
                  }}
                />
                <Controller
                  control={control}
                  name="driver_phone"
                  render={({ field, fieldState }) => (
                    <TextField
                      label="Driver phone"
                      icon="phone"
                      keyboardType="phone-pad"
                      placeholder="04xx xxx xxx"
                      value={field.value}
                      onChangeText={field.onChange}
                      error={fieldState.error?.message}
                    />
                  )}
                />
                <AutocompleteField
                  label="Company"
                  icon="building"
                  placeholder="Company name"
                  hint="Pick a match or type a new company name."
                  queryKey="booking-companies"
                  hideNoMatches
                  value={driverCompany}
                  onChangeText={setDriverCompany}
                  search={async (query) =>
                    (await searchDriverCompanies(query)).map((c) => ({ id: c.id, label: c.name }))
                  }
                  onSelect={(item) => setDriverCompany(item.label)}
                />
                <Controller
                  control={control}
                  name="tenant_id"
                  render={({ field, fieldState }) => (
                    <Select
                      label="Visiting (tenant)"
                      value={field.value ?? null}
                      options={tenants.map((tenant) => ({ label: tenant.name, value: tenant.id }))}
                      onChange={field.onChange}
                      placeholder={buildingId ? 'Select tenant' : 'Choose a building first'}
                      disabled={!buildingId}
                      error={fieldState.error?.message}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="notes"
                  render={({ field, fieldState }) => (
                    <TextField
                      label="Notes"
                      placeholder="Optional"
                      multiline
                      value={field.value}
                      onChangeText={field.onChange}
                      error={fieldState.error?.message}
                      style={styles.notes}
                    />
                  )}
                />
              </Section>
            </Card>

            <Button
              title="Create booking"
              icon="bookings"
              size="lg"
              loading={mutation.isPending}
              onPress={handleSubmit((values) => mutation.mutate(values))}
              fullWidth
            />
            <View style={styles.spacer} />
            </>
          ) : null}
        </FormScrollView>
      </KeyboardAvoidingView>

      <PlateScanner
        visible={scanning}
        onClose={() => setScanning(false)}
        onResult={(result) => {
          clearPrefill();
          setValue('plate_number', result.plate);
          setScanning(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  contentCentered: { flex: 1, flexGrow: 1, justifyContent: 'center' },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  spacer: { height: Spacing.xxl },
});
