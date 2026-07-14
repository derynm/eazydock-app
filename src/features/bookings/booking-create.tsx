import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet, View, type ScrollView } from 'react-native';

import { createBooking, getBookingFormData, type BookingInput } from '@/api/bookings';
import { toApiError } from '@/api/client';
import { searchDrivers } from '@/api/lookups';
import { bookingSchema, type BookingForm as BookingFormValues } from '@/api/schemas';
import { searchDriverCompanies, searchVehicles } from '@/api/transactions';
import { useSession } from '@/auth/session';
import { FormScrollView } from '@/components/form-error-scroll';
import { Screen } from '@/components/screen';
import { AutocompleteField, Banner, Button, Card, DateTimeField, Section, Select, TextField, type AutocompleteItem } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { lookupPlate, type ActiveTransaction } from '@/features/transactions/plate-lookup';
import { timeAgo } from '@/lib/format';
import { DRIVER_TYPES } from '@/lib/options';
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
  contact_name: '',
  contact_phone: '',
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

export function BookingCreate() {
  const router = useRouter();
  const qc = useQueryClient();
  const { selectedBuilding } = useSession();
  const [topError, setTopError] = useState<string | null>(null);
  const [lookup, setLookup] = useState<LookupState>({ status: 'idle' });
  const [revealed, setRevealed] = useState(false);
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
  const spaces = (formData?.spaces ?? []).filter((space) => space.parking_area_id === areaId);
  const tenants = formData?.tenants ?? [];

  const runLookup = async () => {
    const plate = getValues('plate_number').trim();
    if (plate.length < 2) return;

    setLookup({ status: 'loading' });
    try {
      const profile = await lookupPlate(plate);
      setRevealed(true);

      if (!profile.found) {
        setValue('vehicle_id', null);
        setValue('driver_id', null);
        setDriverText('');
        setDriverCompany('');
        setLookup({ status: 'new' });
        return;
      }

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

  const onPickVehicle = async (item: AutocompleteItem) => {
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
        driver_company_name: hasDriver ? driverCompany || null : null,
        vehicle_id: values.vehicle_id ?? null,
        driver_type: values.driver_type,
        plate_number: values.plate_number,
        contact_name: values.contact_name || null,
        contact_phone: values.contact_phone || null,
        starts_at: values.starts_at,
        ends_at: values.ends_at,
        notes: values.notes || null,
      };
      return createBooking(input);
    },
    onMutate: () => setTopError(null),
    onSuccess: (booking) => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
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
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[styles.content, !revealed && styles.contentCentered]}
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
                  value={field.value}
                  onChangeText={(value) => {
                    field.onChange(value);
                    setValue('vehicle_id', null);
                    if (lookup.status !== 'idle' && lookup.status !== 'loading') setLookup({ status: 'idle' });
                  }}
                  search={async (query) =>
                    (await searchVehicles(query)).map((vehicle) => ({ id: vehicle.id, label: vehicle.plate_number }))
                  }
                  onSelect={onPickVehicle}
                  onSubmitEditing={runLookup}
                  error={fieldState.error?.message}
                  hint={!revealed ? 'Type a plate — matching vehicles appear as you type.' : undefined}
                />
              )}
            />

            <Button
              title={lookup.status === 'loading' ? 'Looking up…' : revealed ? 'Look up again' : 'Look up plate'}
              icon="search"
              variant={revealed ? 'secondary' : 'primary'}
              size={revealed ? 'sm' : 'lg'}
              loading={lookup.status === 'loading'}
              onPress={runLookup}
              fullWidth={!revealed}
            />

            {lookup.status === 'found' ? (
              <>
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
                {lookup.activeTransaction ? (
                  <Banner
                    tone="warning"
                    title="Currently checked in"
                    message={`This vehicle is inside now (${lookup.activeTransaction.transactionNo}${lookup.activeTransaction.parkingSpaceCode ? ` · bay ${lookup.activeTransaction.parkingSpaceCode}` : ''}).`}
                  />
                ) : null}
              </>
            ) : lookup.status === 'new' ? (
              <Banner
                tone="info"
                icon="info"
                title="New vehicle"
                message="No previous visits for this plate. The vehicle will be resolved when the booking is fulfilled."
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
                      options={spaces.map((space) => ({ label: space.space_code, value: space.id }))}
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
                    }))
                  }
                  onSelect={(item) => {
                    setDriverText(item.label);
                    setDriverCompany('');
                    setValue('driver_id', item.id);
                  }}
                />
                <Controller
                  control={control}
                  name="contact_phone"
                  render={({ field, fieldState }) => (
                    <TextField
                      label="Contact phone"
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
