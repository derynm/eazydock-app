import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch, type FieldErrors } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { toApiError } from '@/api/client';
import { getDriver } from '@/api/drivers';
import { getIncidentFormData, updateIncident, type IncidentUpdateInput } from '@/api/incidents';
import { searchDrivers } from '@/api/lookups';
import { incidentSchema, type IncidentForm as IncidentFormValues } from '@/api/schemas';
import { searchVehicles, type VehicleSearchResult } from '@/api/transactions';
import type { Incident, IncidentVehicle, IncidentWitness } from '@/api/types';
import { useSession } from '@/auth/session';
import { FormSheet } from '@/components/form-sheet';
import { AutocompleteField, Button, Card, DateTimeField, IconButton, Section, Select, Text, TextField, type AutocompleteItem } from '@/components/ui';
import { getVehicle } from '@/api/vehicles';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { zodResolver } from '@/lib/zod-resolver';

type Props = { visible: boolean; incident: Incident; onClose: () => void };

const RENDERED_FIELDS: (keyof IncidentFormValues)[] = ['incident_type', 'severity', 'occurred_at', 'description', 'location_details', 'weather', 'shift'];
type EditableVehicle = Omit<IncidentVehicle, 'id'>;
type EditableWitness = Omit<IncidentWitness, 'id'>;

const EMPTY_VEHICLE: EditableVehicle = { role: 'other', vehicle_id: null, driver_id: null, plate_number: '', driver_name: '', driver_contact: '', company_name: '', vehicle_type: '' };
const EMPTY_WITNESS: EditableWitness = { name: '', contact_number: '' };

function hiddenError(errors: FieldErrors<IncidentFormValues>): string | null {
  const hidden = (Object.keys(errors) as (keyof IncidentFormValues)[]).find((name) => !RENDERED_FIELDS.includes(name));
  return hidden && typeof errors[hidden]?.message === 'string' ? (errors[hidden]!.message as string) : null;
}

export function IncidentForm({ visible, incident, onClose }: Props) {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useSession();
  const theme = useTheme();
  const vehicleLookupCache = useRef(new Map<number, VehicleSearchResult>());
  const [topError, setTopError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<EditableVehicle[]>([]);
  const [witnesses, setWitnesses] = useState<EditableWitness[]>([]);
  const { data: formData } = useQuery({ queryKey: ['incident-form-data', activeCompanyId], queryFn: getIncidentFormData, enabled: visible });

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setVehicles((incident.vehicles ?? []).map(({ id, ...vehicle }) => { void id; return vehicle; }));
      setWitnesses((incident.witnesses ?? []).map(({ id, ...witness }) => { void id; return witness; }));
    });
    return () => cancelAnimationFrame(frame);
  }, [incident.vehicles, incident.witnesses, visible]);

  const values = useMemo<IncidentFormValues>(() => ({
    parking_transaction_id: incident.parking_transaction_id,
    building_id: incident.building_id,
    parking_area_id: incident.parking_area_id,
    parking_space_id: incident.parking_space_id,
    incident_type: incident.incident_type,
    severity: incident.severity,
    occurred_at: incident.occurred_at,
    description: incident.description,
    location_details: incident.location_details ?? '',
    weather: incident.weather ?? '',
    shift: incident.shift ?? '',
    status: incident.status,
  }), [incident]);

  const { control, handleSubmit, reset, setError, setValue } = useForm<IncidentFormValues>({ resolver: zodResolver(incidentSchema), values });
  const buildingId = useWatch({ control, name: 'building_id' });
  const areaId = useWatch({ control, name: 'parking_area_id' });
  const areaOptions = (formData?.parking_areas ?? []).filter((area) => !buildingId || area.building_id === buildingId).map((area) => ({ value: area.id, label: area.name }));
  const spaceOptions = (formData?.parking_spaces ?? []).filter((space) => space.parking_area_id === areaId).map((space) => ({ value: space.id, label: space.space_code }));
  const mutation = useMutation({
    mutationFn: (form: IncidentFormValues) => {
      const input: IncidentUpdateInput = {
        incident_type: form.incident_type,
        severity: form.severity,
        occurred_at: form.occurred_at,
        description: form.description,
        building_id: form.building_id,
        parking_area_id: form.parking_area_id,
        parking_space_id: form.parking_space_id,
        location_details: form.location_details || null,
        weather: form.weather || null,
        shift: form.shift || null,
        vehicles: vehicles
          .filter((vehicle) => vehicle.plate_number.trim())
          .map((vehicle) => ({ ...vehicle, plate_number: vehicle.plate_number.trim().toUpperCase() })),
        witnesses: witnesses
          .filter((witness) => witness.name.trim())
          .map((witness) => ({ ...witness, name: witness.name.trim() })),
      };
      return updateIncident(incident.id, input);
    },
    onMutate: () => setTopError(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident', activeCompanyId, incident.id] });
      onClose();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      setTopError(apiError.status === 422 ? null : apiError.message);
      Object.entries(apiError.errors).forEach(([field, messages]) => setError(field as keyof IncidentFormValues, { message: messages[0] }));
      if (apiError.status === 422) {
        const hidden = Object.keys(apiError.errors).find((field) => !RENDERED_FIELDS.includes(field as keyof IncidentFormValues));
        if (hidden) setTopError(apiError.errors[hidden]?.[0] ?? 'Check the form and try again.');
      }
    },
  });

  const close = () => { reset(values); mutation.reset(); setTopError(null); onClose(); };

  const updateVehicleRow = (index: number, patch: Partial<EditableVehicle>) => {
    setVehicles((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const selectVehicle = async (index: number, item: AutocompleteItem) => {
    const match = vehicleLookupCache.current.get(item.id);
    updateVehicleRow(index, {
      vehicle_id: item.id,
      plate_number: item.label,
      vehicle_type: match?.vehicle_type ?? vehicles[index]?.vehicle_type ?? '',
      driver_id: match?.driver_id ?? vehicles[index]?.driver_id ?? null,
      driver_name: match?.driver_name ?? vehicles[index]?.driver_name ?? '',
      driver_contact: match?.driver_phone ?? vehicles[index]?.driver_contact ?? '',
      company_name: match?.company_name ?? vehicles[index]?.company_name ?? '',
    });
    if (match?.driver_id || match?.driver_name) return;
    try {
      const vehicle = await getVehicle(item.id);
      const linkedDriver = vehicle.drivers?.[0];
      if (!linkedDriver) {
        updateVehicleRow(index, { vehicle_type: vehicle.vehicle_type });
        return;
      }
      const driver = await getDriver(linkedDriver.id);
      updateVehicleRow(index, { vehicle_type: vehicle.vehicle_type, driver_id: driver.id, driver_name: driver.full_name, driver_contact: driver.phone ?? '', company_name: driver.company_name ?? '' });
    } catch {
      // Keep the selected plate even when related details are unavailable.
    }
  };

  const selectDriver = (index: number, item: AutocompleteItem) => {
    updateVehicleRow(index, { driver_id: item.id, driver_name: item.label, driver_contact: item.data?.phone ?? '', company_name: item.data?.companyName ?? '' });
  };

  const submit = handleSubmit(
    (form) => mutation.mutate(form),
    (errors) => {
      const message = hiddenError(errors);
      if (message) setTopError(message);
    },
  );

  return (
    <FormSheet visible={visible} onClose={close} title="Edit incident" subtitle={incident.incident_no ?? 'Draft'} onSubmit={submit} submitting={mutation.isPending} submitLabel="Save changes" error={topError} tabletTall>
      <Card>
        <Section title="Incident">
          <View style={styles.fields}>
            <Controller control={control} name="incident_type" render={({ field, fieldState }) => <Select label="Incident type" required value={field.value} options={formData?.incident_types ?? []} onChange={field.onChange} error={fieldState.error?.message} />} />
            <Controller control={control} name="severity" render={({ field, fieldState }) => <Select label="Severity" required value={field.value} options={formData?.severities ?? []} onChange={field.onChange} error={fieldState.error?.message} />} />
            <Controller control={control} name="occurred_at" render={({ field, fieldState }) => <DateTimeField label="Occurred at" required value={field.value} onChange={field.onChange} error={fieldState.error?.message} />} />
            <Controller control={control} name="description" render={({ field, fieldState }) => <TextField label="Description" required multiline value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} placeholder="Describe what happened and any immediate risk…" style={{ minHeight: 112, textAlignVertical: 'top' }} />} />
          </View>
        </Section>
      </Card>
      <Card>
        <Section title="Parking context">
          <View style={styles.fields}>
            <Text variant="caption" color="textMuted">The linked activity and location are kept from the incident report.</Text>
            <Controller control={control} name="parking_area_id" render={({ field, fieldState }) => <Select label="Parking area" required value={field.value} options={areaOptions} onChange={(value) => { field.onChange(value); setValue('parking_space_id', null); }} error={fieldState.error?.message} />} />
            <Controller control={control} name="parking_space_id" render={({ field, fieldState }) => <Select label="Parking space (optional)" value={field.value} options={spaceOptions} onChange={field.onChange} error={fieldState.error?.message} />} />
            <Controller control={control} name="location_details" render={({ field, fieldState }) => <TextField label="Location details" value={field.value ?? ''} onChangeText={field.onChange} error={fieldState.error?.message} placeholder="e.g. Bay 4, right side" />} />
            <View style={styles.twoColumns}>
              <View style={styles.flex}><Controller control={control} name="weather" render={({ field, fieldState }) => <TextField label="Weather" value={field.value ?? ''} onChangeText={field.onChange} error={fieldState.error?.message} placeholder="Fine" />} /></View>
              <View style={styles.flex}><Controller control={control} name="shift" render={({ field, fieldState }) => <TextField label="Shift" value={field.value ?? ''} onChangeText={field.onChange} error={fieldState.error?.message} placeholder="Evening" />} /></View>
            </View>
          </View>
        </Section>
      </Card>
      <Card>
        <Section title="Other vehicles">
          <View style={styles.fields}>
            <Text variant="caption" color="textMuted">The vehicle from a linked activity is included automatically.</Text>
            {vehicles.map((vehicle, index) => (
          <View key={index} style={[styles.participant, { borderColor: theme.border }]}>
            <View style={styles.participantHeader}><Text variant="label">Vehicle {index + 1}</Text><IconButton name="trash" accessibilityLabel="Remove vehicle" size={18} onPress={() => setVehicles((items) => items.filter((_, itemIndex) => itemIndex !== index))} /></View>
            <AutocompleteField label="Plate number" icon="vehicles" placeholder="Type a plate…" hint="Pick a match to link an existing vehicle, or enter a new plate." autoCapitalize="characters" queryKey={`edit-incident-vehicle-${index}`} minChars={1} hideNoMatches value={vehicle.plate_number} onChangeText={(value) => updateVehicleRow(index, { plate_number: value, vehicle_id: null })} search={async (query) => { const matches = await searchVehicles(query); matches.forEach((item) => vehicleLookupCache.current.set(item.id, item)); return matches.map((item) => ({ id: item.id, label: item.plate_number, hint: item.driver_name ?? undefined })); }} onSelect={(item) => { void selectVehicle(index, item); }} />
            <AutocompleteField label="Driver name" icon="drivers" placeholder="Type a driver name…" hint="Pick a match to link an existing driver, or enter a new name." queryKey={`edit-incident-driver-${index}`} hideNoMatches value={vehicle.driver_name ?? ''} onChangeText={(value) => updateVehicleRow(index, { driver_name: value, driver_id: null })} search={async (query) => (await searchDrivers(query)).map((item) => ({ id: item.id, label: item.full_name, hint: item.company_name ?? item.phone ?? undefined, data: { phone: item.phone, companyName: item.company_name } }))} onSelect={(item) => selectDriver(index, item)} />
            <TextField label="Driver contact" value={vehicle.driver_contact ?? ''} keyboardType="phone-pad" onChangeText={(value) => updateVehicleRow(index, { driver_contact: value })} />
            <TextField label="Company" value={vehicle.company_name ?? ''} onChangeText={(value) => updateVehicleRow(index, { company_name: value })} />
            <TextField label="Vehicle type" value={vehicle.vehicle_type ?? ''} onChangeText={(value) => updateVehicleRow(index, { vehicle_type: value })} placeholder="e.g. van" />
          </View>
            ))}
            <Button title="Add vehicle" icon="add" variant="secondary" onPress={() => setVehicles((items) => [...items, { ...EMPTY_VEHICLE }])} />
          </View>
        </Section>
      </Card>
      <Card>
        <Section title="Witnesses">
          <View style={styles.fields}>
            <Text variant="caption" color="textMuted">Add anyone who observed or can provide context about the incident.</Text>
            {witnesses.map((witness, index) => (
          <View key={index} style={[styles.participant, { borderColor: theme.border }]}>
            <View style={styles.participantHeader}><Text variant="label">Witness {index + 1}</Text><IconButton name="trash" accessibilityLabel="Remove witness" size={18} onPress={() => setWitnesses((items) => items.filter((_, itemIndex) => itemIndex !== index))} /></View>
            <TextField label="Name" value={witness.name} onChangeText={(value) => setWitnesses((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, name: value } : item))} />
            <TextField label="Contact number" value={witness.contact_number ?? ''} keyboardType="phone-pad" onChangeText={(value) => setWitnesses((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, contact_number: value } : item))} />
          </View>
            ))}
            <Button title="Add witness" icon="add" variant="secondary" onPress={() => setWitnesses((items) => [...items, { ...EMPTY_WITNESS }])} />
          </View>
        </Section>
      </Card>
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  twoColumns: { flexDirection: 'row', gap: Spacing.md },
  fields: { gap: Spacing.lg },
  participant: { gap: Spacing.md, padding: Spacing.md, borderWidth: 1, borderRadius: Radius.md },
  participantHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
