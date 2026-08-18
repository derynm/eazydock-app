import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, type ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toApiError } from '@/api/client';
import { getDriver } from '@/api/drivers';
import { createIncident, getIncidentFormData, searchIncidentTransactions, submitIncident, updateIncident, uploadIncidentEvidence, type IncidentInput } from '@/api/incidents';
import { searchDrivers } from '@/api/lookups';
import { incidentSchema, type IncidentForm as IncidentFormValues } from '@/api/schemas';
import { searchVehicles, type VehicleSearchResult } from '@/api/transactions';
import type { IncidentTransactionOption, IncidentVehicle, IncidentWitness } from '@/api/types';
import { getVehicle } from '@/api/vehicles';
import { useSession } from '@/auth/session';
import { FormScrollView } from '@/components/form-error-scroll';
import { Screen } from '@/components/screen';
import { AutocompleteField, Banner, Button, Card, DateTimeField, FilterSheet, Icon, IconButton, SearchSelect, Section, Select, Text, TextField, type AutocompleteItem, type SearchSelectItem } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { toSydneyDateTimeValue } from '@/lib/sydney-time';
import { zodResolver } from '@/lib/zod-resolver';

type LocalVehicle = Omit<IncidentVehicle, 'id'>;
type LocalWitness = Omit<IncidentWitness, 'id'>;

const EMPTY_VEHICLE: LocalVehicle = { role: 'other', vehicle_id: null, driver_id: null, plate_number: '', driver_name: '', driver_contact: '', company_name: '', vehicle_type: '' };
const EMPTY_WITNESS: LocalWitness = { name: '', contact_number: '' };

export function IncidentCreate() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { activeCompanyId, selectedBuilding } = useSession();
  const scrollRef = useRef<ScrollView>(null);
  const transactionCache = useRef(new Map<number, IncidentTransactionOption>());
  const vehicleLookupCache = useRef(new Map<number, VehicleSearchResult>());
  const serverDraftId = useRef<number | null>(null);
  const uploadedUris = useRef(new Set<string>());
  const evidencePickerAction = useRef<'camera' | 'library' | null>(null);
  const [topError, setTopError] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<IncidentTransactionOption | null>(null);
  const [evidence, setEvidence] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [vehicles, setVehicles] = useState<LocalVehicle[]>([]);
  const [witnesses, setWitnesses] = useState<LocalWitness[]>([]);
  const [evidencePickerOpen, setEvidencePickerOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const { data: formData, isError: formDataError, error: formError } = useQuery({
    queryKey: ['incident-form-data', activeCompanyId],
    queryFn: getIncidentFormData,
  });

  const { control, handleSubmit, setError, setValue } = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      parking_transaction_id: null,
      building_id: selectedBuilding?.id ?? null,
      parking_area_id: null,
      parking_space_id: null,
      incident_type: 'other',
      severity: 'medium',
      occurred_at: toSydneyDateTimeValue(new Date().toISOString()),
      description: '',
      location_details: '',
      weather: '',
      shift: '',
      status: 'open',
    },
  });

  const buildingId = useWatch({ control, name: 'building_id' });
  const areaId = useWatch({ control, name: 'parking_area_id' });
  useEffect(() => {
    if (selectedBuilding?.id) setValue('building_id', selectedBuilding.id);
  }, [selectedBuilding?.id, setValue]);

  useEffect(() => {
    if (!topError) return;
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
  }, [topError]);

  const maxFiles = formData?.evidence_limits.max_files ?? 6;
  const maxBytes = (formData?.evidence_limits.max_size_kb ?? 10_240) * 1024;
  const areaOptions = (formData?.parking_areas ?? []).filter((area) => !buildingId || area.building_id === buildingId).map((area) => ({ value: area.id, label: area.name }));
  const spaceOptions = (formData?.parking_spaces ?? []).filter((space) => space.parking_area_id === areaId).map((space) => ({ value: space.id, label: space.space_code }));

  const validateAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    const allowed = new Set(formData?.evidence_limits.mime_types ?? ['image/jpeg', 'image/png', 'image/webp']);
    const valid = assets.filter((asset) => (!asset.mimeType || allowed.has(asset.mimeType)) && (!asset.fileSize || asset.fileSize <= maxBytes));
    if (valid.length !== assets.length) setTopError('Some photos were skipped. Evidence must be JPEG, PNG, or WebP and no larger than 10 MB.');
    setEvidence((current) => [...current, ...valid].slice(0, maxFiles));
  };

  const pickEvidence = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setTopError('Photo library access is required to choose evidence photos.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: Math.max(1, maxFiles - evidence.length), quality: 0.85 });
      if (!result.canceled) validateAssets(result.assets);
    } catch (error) {
      setTopError(error instanceof Error ? error.message : 'Couldn’t open the photo library.');
    }
  };

  const captureEvidence = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setTopError('Camera access is required to take an evidence photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
      if (!result.canceled) validateAssets(result.assets);
    } catch (error) {
      setTopError(error instanceof Error ? error.message : 'Couldn’t open the camera.');
    }
  };

  const chooseEvidenceSource = (action: 'camera' | 'library') => {
    if (Platform.OS === 'web') {
      setEvidencePickerOpen(false);
      if (action === 'camera') void captureEvidence();
      else void pickEvidence();
      return;
    }
    evidencePickerAction.current = action;
    setEvidencePickerOpen(false);
  };

  const runEvidencePickerAction = () => {
    const action = evidencePickerAction.current;
    evidencePickerAction.current = null;
    if (!action) return;
    setTimeout(() => {
      if (action === 'camera') void captureEvidence();
      else void pickEvidence();
    }, 150);
  };

  const mutation = useMutation({
    mutationFn: async ({ values, submit }: { values: IncidentFormValues; submit: boolean }) => {
      const input: IncidentInput = {
        submission_state: evidence.length > 0 ? 'draft' : submit ? 'submitted' : 'draft',
        parking_transaction_id: transaction?.id ?? null,
        building_id: transaction ? null : values.building_id,
        parking_area_id: transaction ? null : values.parking_area_id,
        parking_space_id: transaction ? null : values.parking_space_id,
        incident_type: values.incident_type,
        severity: values.severity,
        occurred_at: values.occurred_at,
        description: values.description,
        location_details: values.location_details || null,
        weather: values.weather || null,
        shift: values.shift || null,
        vehicles: vehicles.filter((item) => item.plate_number.trim()).map((item) => ({ ...item, plate_number: item.plate_number.trim().toUpperCase() })),
        witnesses: witnesses.filter((item) => item.name.trim()).map((item) => ({ ...item, name: item.name.trim() })),
      };
      const { submission_state: _submissionState, ...updateInput } = input;
      let incident = serverDraftId.current
        ? await updateIncident(serverDraftId.current, updateInput)
        : await createIncident(input);
      if (incident.is_draft) serverDraftId.current = incident.id;
      const pendingEvidence = evidence.filter((asset) => !uploadedUris.current.has(asset.uri));
      for (let index = 0; index < pendingEvidence.length; index += 1) {
        setUploadProgress(`Uploading photo ${index + 1} of ${pendingEvidence.length}…`);
        await uploadIncidentEvidence(incident.id, pendingEvidence[index]);
        uploadedUris.current.add(pendingEvidence[index].uri);
      }
      if (submit && incident.is_draft) incident = await submitIncident(incident.id);
      return incident;
    },
    onMutate: () => { setTopError(null); setUploadProgress(''); },
    onSuccess: (incident) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      router.replace(`/incidents/${incident.id}` as never);
    },
    onError: (error) => {
      const apiError = toApiError(error);
      setTopError(apiError.status === 422 && Object.keys(apiError.errors).length > 0 ? null : apiError.message);
      Object.entries(apiError.errors).forEach(([field, messages]) => setError(field as keyof IncidentFormValues, { message: messages[0] }));
    },
    onSettled: () => setUploadProgress(''),
  });

  const runSubmit = (submit: boolean) => handleSubmit((values) => mutation.mutate({ values, submit }))();
  const updateVehicleRow = (index: number, patch: Partial<LocalVehicle>) => {
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
      updateVehicleRow(index, {
        vehicle_type: vehicle.vehicle_type,
        driver_id: driver.id,
        driver_name: driver.full_name,
        driver_contact: driver.phone ?? '',
        company_name: driver.company_name ?? '',
      });
    } catch {
      // The plate is still linked even when the user cannot access full vehicle/driver details.
    }
  };
  const selectDriver = (index: number, item: AutocompleteItem) => {
    updateVehicleRow(index, {
      driver_id: item.id,
      driver_name: item.label,
      driver_contact: item.data?.phone ?? '',
      company_name: item.data?.companyName ?? '',
    });
  };

  return (
    <Screen title="Report incident" onBack={() => router.back()}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <FormScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {topError ? <Banner title="Couldn’t save incident" message={topError} tone="danger" /> : null}
          {formDataError ? <Banner title="Couldn’t load form options" message={formError?.message} tone="danger" /> : null}

          <Card>
            <Section title="Incident">
              <View style={styles.fields}>
                <Controller control={control} name="incident_type" render={({ field, fieldState }) => <Select label="Incident type" required value={field.value} options={formData?.incident_types ?? []} onChange={field.onChange} error={fieldState.error?.message} />} />
                <Controller control={control} name="severity" render={({ field, fieldState }) => <Select label="Severity" required value={field.value} options={formData?.severities ?? []} onChange={field.onChange} error={fieldState.error?.message} />} />
                <Controller control={control} name="occurred_at" render={({ field, fieldState }) => <DateTimeField label="Occurred at" required value={field.value} onChange={field.onChange} error={fieldState.error?.message} />} />
                <Controller control={control} name="description" render={({ field, fieldState }) => <TextField label="Description" required multiline value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} placeholder="Describe what happened and any immediate risk…" style={styles.multiline} />} />
              </View>
            </Section>
          </Card>

          <Card>
            <Section title="Parking context">
              <View style={styles.fields}>
                <Text variant="caption" color="textMuted">Link a recent activity, or enter the location manually.</Text>
                <SearchSelect
                  label="Related activity (optional)"
                  placeholder="Search transaction, plate, or driver"
                  queryKey="incident-transactions"
                  minChars={0}
                  value={transaction ? { id: transaction.id, label: transaction.transaction_no, hint: transaction.vehicle?.plate_number } : null}
                  search={async (query) => {
                    const rows = await searchIncidentTransactions(query);
                    rows.forEach((item) => transactionCache.current.set(item.id, item));
                    return rows.map<SearchSelectItem>((item) => ({ id: item.id, label: item.transaction_no, hint: [item.vehicle?.plate_number, item.driver?.full_name, item.parking_area?.name].filter(Boolean).join(' · ') }));
                  }}
                  onChange={(item) => {
                    const selected = item ? transactionCache.current.get(item.id) ?? null : null;
                    setTransaction(selected);
                    setValue('parking_transaction_id', selected?.id ?? null);
                    if (selected) {
                      setValue('building_id', selected.building?.id ?? null);
                      setValue('parking_area_id', selected.parking_area?.id ?? null);
                      setValue('parking_space_id', selected.parking_space?.id ?? null);
                    }
                  }}
                />
                {transaction ? (
                  <View style={[styles.contextPreview, { backgroundColor: theme.primarySoft }]}>
                    <Icon name="transactions" size={20} color={theme.primary} />
                    <View style={styles.flex}>
                      <Text variant="bodyStrong">{transaction.vehicle?.plate_number ?? transaction.transaction_no}</Text>
                      <Text variant="caption" color="textSecondary">{[transaction.driver?.full_name, transaction.building?.name, transaction.parking_area?.name, transaction.parking_space?.space_code].filter(Boolean).join(' · ')}</Text>
                    </View>
                  </View>
                ) : (
                  <>
                    <Controller control={control} name="parking_area_id" render={({ field, fieldState }) => <Select label="Parking area" required value={field.value} options={areaOptions} onChange={(value) => { field.onChange(value); setValue('parking_space_id', null); }} error={fieldState.error?.message} />} />
                    <Controller control={control} name="parking_space_id" render={({ field, fieldState }) => <Select label="Parking space (optional)" value={field.value} options={spaceOptions} onChange={field.onChange} error={fieldState.error?.message} />} />
                  </>
                )}
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
                    <AutocompleteField
                      label="Plate number"
                      icon="vehicles"
                      placeholder="Type a plate…"
                      hint="Pick a match to link an existing vehicle, or enter a new plate."
                      autoCapitalize="characters"
                      queryKey={`incident-vehicle-${index}`}
                      minChars={1}
                      hideNoMatches
                      value={vehicle.plate_number}
                      onChangeText={(value) => updateVehicleRow(index, { plate_number: value, vehicle_id: null })}
                      search={async (query) => {
                        const matches = await searchVehicles(query);
                        matches.forEach((item) => vehicleLookupCache.current.set(item.id, item));
                        return matches.map((item) => ({ id: item.id, label: item.plate_number, hint: item.driver_name ?? undefined }));
                      }}
                      onSelect={(item) => { void selectVehicle(index, item); }}
                    />
                    <AutocompleteField
                      label="Driver name"
                      icon="drivers"
                      placeholder="Type a driver name…"
                      hint="Pick a match to link an existing driver, or enter a new name."
                      queryKey={`incident-driver-${index}`}
                      hideNoMatches
                      value={vehicle.driver_name ?? ''}
                      onChangeText={(value) => updateVehicleRow(index, { driver_name: value, driver_id: null })}
                      search={async (query) => (await searchDrivers(query)).map((item) => ({ id: item.id, label: item.full_name, hint: item.company_name ?? item.phone ?? undefined, data: { phone: item.phone, companyName: item.company_name } }))}
                      onSelect={(item) => selectDriver(index, item)}
                    />
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

          <Card>
            <Section title="Evidence">
              <View style={styles.fields}>
                <Text variant="caption" color="textMuted">Optional · Up to {maxFiles} photos · 10 MB each</Text>
                <View style={styles.photoGrid}>
                  {evidence.map((asset, index) => <View key={`${asset.uri}-${index}`} style={styles.photoWrap}><Image source={{ uri: asset.uri }} style={styles.photo} /><Pressable accessibilityLabel="Remove photo" onPress={() => setEvidence((items) => items.filter((_, itemIndex) => itemIndex !== index))} style={[styles.photoRemove, { backgroundColor: theme.surface }]}><Icon name="close" size={14} color={theme.danger} /></Pressable></View>)}
                  {evidence.length < maxFiles ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={evidence.length > 0 ? 'Add more evidence photos' : 'Add evidence photos'}
                      onPress={() => setEvidencePickerOpen(true)}
                      style={({ pressed }) => [styles.addPhotoTile, { backgroundColor: theme.surfaceSunken, borderColor: pressed ? theme.primary : theme.border }]}>
                      <Icon name="camera" size={22} color={theme.textMuted} />
                      <Text variant="caption" color="textSecondary" center>{evidence.length > 0 ? 'Add more' : 'Add photo'}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </Section>
          </Card>

          <FilterSheet visible={evidencePickerOpen} onClose={() => setEvidencePickerOpen(false)} onClosed={runEvidencePickerAction} title="Add evidence" scrollable={false}>
            <Button title="Take photo" icon="camera" variant="secondary" fullWidth onPress={() => chooseEvidenceSource('camera')} />
            <Button title="Choose photos" icon="image" variant="secondary" fullWidth onPress={() => chooseEvidenceSource('library')} />
          </FilterSheet>

        </FormScrollView>
        <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border, paddingBottom: Spacing.md + insets.bottom }]}>
          {uploadProgress ? <Banner title="Saving report" message={uploadProgress} tone="info" /> : null}
          <View style={styles.actions}>
            <Button title="Save draft" variant="secondary" disabled={mutation.isPending} onPress={() => runSubmit(false)} style={styles.footerButton} />
            <Button title="Submit report" icon="check" loading={mutation.isPending} onPress={() => runSubmit(true)} style={styles.footerButton} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  fields: { gap: Spacing.lg },
  multiline: { minHeight: 112, textAlignVertical: 'top' },
  twoColumns: { flexDirection: 'row', gap: Spacing.md },
  contextPreview: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center', padding: Spacing.md, borderRadius: Radius.md },
  participant: { gap: Spacing.md, padding: Spacing.md, borderWidth: 1, borderRadius: Radius.md },
  participantHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  photoWrap: { position: 'relative' },
  photo: { width: 88, height: 88, borderRadius: Radius.md },
  photoRemove: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addPhotoTile: { width: 88, height: 88, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, padding: Spacing.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
  footerButton: { flex: 1 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
});
