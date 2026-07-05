import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { toApiError } from '@/api/client';
import { lookupParkingAreas, lookupParkingSpaces, lookupTenants, searchDrivers } from '@/api/lookups';
import { checkInSchema, type CheckInForm } from '@/api/schemas';
import { checkIn, searchVehicles, type CheckInInput } from '@/api/transactions';
import type { VehicleType } from '@/api/types';
import { useSession } from '@/auth/session';
import { Screen } from '@/components/screen';
import { AutocompleteField, Banner, Button, Card, IconButton, Section, Select, TextField, type AutocompleteItem } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { lookupPlate } from '@/features/transactions/plate-lookup';
import { PlateScanner } from '@/features/transactions/plate-scanner';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/lib/format';
import { DRIVER_TYPES } from '@/lib/options';
import { zodResolver } from '@/lib/zod-resolver';

const EMPTY: CheckInForm = {
  building_id: 0,
  parking_area_id: 0,
  parking_space_id: null,
  tenant_id: null,
  driver_id: null,
  vehicle_id: null,
  plate_number: '',
  vehicle_make: '',
  vehicle_model: '',
  vehicle_colour: '',
  driver_type: 'delivery',
  entry_method: 'manual_entry',
  comments: '',
};

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'new' }
  | { status: 'found'; driverName?: string; tenantName?: string; lastVisitAt?: string | null };

export default function CheckInScreen() {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { selectedBuilding } = useSession();
  const [topError, setTopError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lookup, setLookup] = useState<LookupState>({ status: 'idle' });
  const [revealed, setRevealed] = useState(false);
  const [driverText, setDriverText] = useState('');
  const [newDriver, setNewDriver] = useState({ phone: '', company: '' });
  const [vehicleType, setVehicleType] = useState<VehicleType | undefined>();

  const { control, handleSubmit, watch, setValue, getValues, setError } = useForm<CheckInForm>({
    resolver: zodResolver(checkInSchema),
    defaultValues: { ...EMPTY, building_id: selectedBuilding?.id ?? 0 },
  });

  const buildingId = selectedBuilding?.id ?? 0;
  const areaId = watch('parking_area_id');
  const driverId = watch('driver_id');
  // A typed driver name with no linked record → we'll create them on check-in.
  const isNewDriver = !driverId && driverText.trim().length > 0;

  // Keep the hidden form field in sync if the user switches buildings.
  useEffect(() => {
    if (buildingId) setValue('building_id', buildingId);
  }, [buildingId, setValue]);

  const { data: areas = [] } = useQuery({ queryKey: ['lookup-areas', buildingId], queryFn: () => lookupParkingAreas(buildingId), enabled: !!buildingId });
  const { data: spaces = [] } = useQuery({ queryKey: ['lookup-spaces', areaId], queryFn: () => lookupParkingSpaces(areaId, true), enabled: !!areaId });
  const { data: tenants = [] } = useQuery({ queryKey: ['lookup-tenants', buildingId], queryFn: () => lookupTenants(buildingId), enabled: !!buildingId });

  // Plate lookup → prefill from the vehicle's last visit, or flag a new vehicle.
  const runLookup = async () => {
    const plate = getValues('plate_number').trim();
    if (plate.length < 2) return;
    setLookup({ status: 'loading' });
    try {
      const p = await lookupPlate(plate);
      setRevealed(true);
      if (!p.found) {
        setLookup({ status: 'new' });
        return;
      }
      setValue('vehicle_id', p.vehicleId ?? null);
      setValue('vehicle_make', p.make ?? '');
      setValue('vehicle_model', p.model ?? '');
      setValue('vehicle_colour', p.colour ?? '');
      setVehicleType(p.vehicleType);
      if (p.driverType) setValue('driver_type', p.driverType);
      if (p.parkingAreaId) setValue('parking_area_id', p.parkingAreaId);
      setValue('parking_space_id', null);
      setValue('tenant_id', p.tenantId ?? null);
      setValue('driver_id', p.driverId ?? null);
      setDriverText(p.driverId ? (p.driverName ?? `Driver #${p.driverId}`) : '');
      setLookup({ status: 'found', driverName: p.driverName, tenantName: p.tenantName, lastVisitAt: p.lastVisitAt });
    } catch {
      setLookup({ status: 'idle' });
    }
  };

  const clearPrefill = () => {
    setValue('vehicle_id', null);
    setValue('vehicle_make', '');
    setValue('vehicle_model', '');
    setValue('vehicle_colour', '');
    setValue('tenant_id', null);
    setValue('driver_id', null);
    setVehicleType(undefined);
    setDriverText('');
    setNewDriver({ phone: '', company: '' });
    setLookup({ status: 'idle' });
  };

  // Picking a vehicle suggestion sets the plate and runs the same prefill.
  const onPickVehicle = async (item: AutocompleteItem) => {
    setValue('plate_number', item.label);
    await runLookup();
  };

  const mutation = useMutation({
    mutationFn: (values: CheckInForm) => {
      // Linked driver → send driver_id. New driver → send the details and the
      // backend creates + links it as part of check-in (no separate call).
      const linking = !values.driver_id && driverText.trim().length > 0;
      const input: CheckInInput = {
        building_id: values.building_id,
        parking_area_id: values.parking_area_id,
        parking_space_id: values.parking_space_id ?? null,
        tenant_id: values.tenant_id ?? null,
        driver_id: values.driver_id ?? null,
        driver_name: linking ? driverText.trim() : null,
        driver_phone: linking ? newDriver.phone || null : null,
        driver_company_name: linking ? newDriver.company || null : null,
        vehicle_id: values.vehicle_id ?? null,
        plate_number: values.plate_number,
        vehicle_make: values.vehicle_make || null,
        vehicle_model: values.vehicle_model || null,
        vehicle_colour: values.vehicle_colour || null,
        vehicle_type: vehicleType ?? null,
        driver_type: values.driver_type,
        entry_method: values.entry_method,
        comments: values.comments || null,
      };
      return checkIn(input);
    },
    onMutate: () => setTopError(null),
    onSuccess: (txn) => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['active-vehicles'] });
      qc.invalidateQueries({ queryKey: ['drivers'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      router.replace(`/transactions/${txn.id}`);
    },
    onError: (err) => {
      const api = toApiError(err);
      setTopError(api.status === 422 ? null : api.message);
      Object.entries(api.errors).forEach(([field, msgs]) => setError(field as keyof CheckInForm, { message: msgs[0] }));
    },
  });


  return (
    <Screen title="New check-in" onBack={() => router.back()}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.content, !revealed && styles.contentCentered]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {topError ? <Banner title="Couldn’t check in" message={topError} tone="danger" /> : null}

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
                  queryKey="checkin-vehicles"
                  minChars={1}
                  value={field.value}
                  onChangeText={(v) => {
                    field.onChange(v);
                    if (lookup.status !== 'idle' && lookup.status !== 'loading') setLookup({ status: 'idle' });
                  }}
                  search={async (q) => (await searchVehicles(q)).map((v) => ({ id: v.id, label: v.plate_number }))}
                  onSelect={onPickVehicle}
                  onEndEditing={runLookup}
                  onSubmitEditing={runLookup}
                  error={fieldState.error?.message}
                  hint={!revealed ? 'Type a plate — matching vehicles appear as you type.' : undefined}
                  trailing={
                    <IconButton name="scan" size={20} accessibilityLabel="Scan plate" onPress={() => setScanning(true)} />
                  }
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
              <Banner
                tone="success"
                icon="checkCircle"
                title="Returning vehicle"
                message={[
                  lookup.driverName ? `${lookup.driverName}` : null,
                  lookup.tenantName ? `visiting ${lookup.tenantName}` : null,
                  lookup.lastVisitAt ? `· last seen ${timeAgo(lookup.lastVisitAt)}` : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            ) : lookup.status === 'new' ? (
              <Banner tone="info" icon="info" title="New vehicle" message="No previous visits for this plate — enter the details below." />
            ) : null}
          </Section>
        </Card>

        {revealed ? (
          <>
        <Card>
          <Section title="Location">
            <Controller
              control={control}
              name="parking_area_id"
              render={({ field, fieldState }) => (
                <Select label="Parking area" required value={field.value || null} options={areas.map((a) => ({ label: a.name, value: a.id }))}
                  onChange={(v) => { field.onChange(v); setValue('parking_space_id', null); }}
                  error={fieldState.error?.message} placeholder={buildingId ? 'Select area' : 'Choose a building first'} disabled={!buildingId} />
              )}
            />
            <Controller
              control={control}
              name="parking_space_id"
              render={({ field }) => (
                <Select label="Bay (optional — auto-assigned if blank)" value={field.value ?? null} options={spaces.map((s) => ({ label: s.space_code, value: s.id }))}
                  onChange={field.onChange} placeholder={areaId ? 'Auto-assign next available' : 'Choose an area first'} disabled={!areaId} />
              )}
            />
          </Section>
        </Card>

        <Card>
          <Section title="Visit">
            <Controller control={control} name="driver_type" render={({ field, fieldState }) => (
              <Select label="Driver type" required value={field.value} options={DRIVER_TYPES} onChange={field.onChange} error={fieldState.error?.message} />
            )} />
            <AutocompleteField
              label="Driver"
              icon="drivers"
              placeholder="Type a driver name…"
              hint="Pick a match to link an existing driver, or just type a name to add a new one."
              queryKey="checkin-drivers"
              hideNoMatches
              value={driverText}
              onChangeText={(t) => {
                setDriverText(t);
                // Editing the name unlinks any matched driver (becomes a new one).
                if (driverId) setValue('driver_id', null);
              }}
              search={async (q) =>
                (await searchDrivers(q)).map((d) => ({ id: d.id, label: d.full_name, hint: d.company_name ?? d.phone ?? undefined }))
              }
              onSelect={(item) => {
                setDriverText(item.label);
                setValue('driver_id', item.id);
              }}
            />

            {isNewDriver ? (
              <View style={[styles.newDriver, { backgroundColor: theme.surfaceSunken }]}>
                <TextField label="Phone" icon="phone" keyboardType="phone-pad" placeholder="04xx xxx xxx" value={newDriver.phone} onChangeText={(v) => setNewDriver((s) => ({ ...s, phone: v }))} />
                <TextField label="Company" icon="building" placeholder="Company name" value={newDriver.company} onChangeText={(v) => setNewDriver((s) => ({ ...s, company: v }))} />
              </View>
            ) : null}

            <Controller control={control} name="tenant_id" render={({ field }) => (
              <Select label="Visiting (tenant)" value={field.value ?? null} options={tenants.map((t) => ({ label: t.name, value: t.id }))}
                onChange={field.onChange} placeholder={buildingId ? 'Select tenant' : 'Choose a building first'} disabled={!buildingId} />
            )} />
            <Controller control={control} name="comments" render={({ field }) => (
              <TextField label="Comments" placeholder="Optional" multiline value={field.value} onChangeText={field.onChange} style={{ minHeight: 80, textAlignVertical: 'top' }} />
            )} />
          </Section>
        </Card>

<Button title="Check in vehicle" icon="carIn" size="lg" loading={mutation.isPending} onPress={handleSubmit((v) => mutation.mutate(v))} fullWidth />
        <View style={styles.spacer} />
          </>
        ) : null}
      </ScrollView>
      </KeyboardAvoidingView>

      <PlateScanner
        visible={scanning}
        onClose={() => setScanning(false)}
        onResult={(r) => {
          setValue('plate_number', r.plate);
          setScanning(false);
          runLookup();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg },
  contentCentered: { flexGrow: 1, justifyContent: 'center' },
  newDriver: { gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.md },
  row: { flexDirection: 'row', gap: Spacing.md },
summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    borderRadius: Radius.md,
  },
  flex: { flex: 1 },
  spacer: { height: Spacing.xxl },
});
