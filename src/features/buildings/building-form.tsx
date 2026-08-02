import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { toApiError } from '@/api/client';
import { createBuilding, deleteBuilding, updateBuilding, type BuildingInput } from '@/api/buildings';
import { listAllParkingAreasForBuilding } from '@/api/parking-areas';
import { buildingSchema, type BuildingForm as BuildingFormValues } from '@/api/schemas';
import type { BuildingResource } from '@/api/types';
import { FormSheet } from '@/components/form-sheet';
import { OperatingDaySelector } from '@/components/operating-day-selector';
import { Button, Select, Text, TextField, TimeField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { BUILDING_STATUS } from '@/lib/options';
import { zodResolver } from '@/lib/zod-resolver';
import { normalizeOperatingDays } from '@/lib/operating-schedule';

type Props = { visible: boolean; building: BuildingResource | null; onClose: () => void; onDeleted?: () => void };

const EMPTY: BuildingFormValues = {
  name: '',
  code: '',
  building_type: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  address_line_1: '',
  address_line_2: '',
  suburb: '',
  state: '',
  postal_code: '',
  country: '',
  status: 'active',
  operating_start_time: '',
  operating_end_time: '',
  operating_days: normalizeOperatingDays(null),
  parking_time_limit_minutes: null,
  operating_schedule_parking_area_ids: [],
};

const toInput = (v: BuildingFormValues, synchronizeMembership = false): BuildingInput => ({
  name: v.name,
  code: v.code || null,
  building_type: v.building_type || null,
  contact_name: v.contact_name || null,
  contact_phone: v.contact_phone || null,
  contact_email: v.contact_email || null,
  address_line_1: v.address_line_1,
  address_line_2: v.address_line_2 || null,
  suburb: v.suburb || null,
  state: v.state || null,
  postal_code: v.postal_code || null,
  country: v.country || null,
  status: v.status,
  operating_start_time: v.operating_start_time || null,
  operating_end_time: v.operating_end_time || null,
  operating_days: v.operating_days,
  parking_time_limit_minutes: v.parking_time_limit_minutes,
  ...(synchronizeMembership
    ? { operating_schedule_parking_area_ids: v.operating_schedule_parking_area_ids }
    : {}),
});

export function BuildingForm({ visible, building, onClose, onDeleted }: Props) {
  const qc = useQueryClient();
  const theme = useTheme();
  const [topError, setTopError] = useState<string | null>(null);
  const areasQuery = useQuery({
    queryKey: ['parking-areas', 'building-membership', building?.id],
    queryFn: () => listAllParkingAreasForBuilding(building!.id),
    enabled: visible && !!building,
  });
  const areas = areasQuery.data ?? [];

  const values = useMemo<BuildingFormValues>(
    () =>
      building
        ? {
            name: building.name,
            code: building.code ?? '',
            building_type: building.building_type ?? '',
            contact_name: building.contact_name ?? '',
            contact_phone: building.contact_phone ?? '',
            contact_email: building.contact_email ?? '',
            address_line_1: building.address_line_1,
            address_line_2: building.address_line_2 ?? '',
            suburb: building.suburb ?? '',
            state: building.state ?? '',
            postal_code: building.postal_code ?? '',
            country: building.country ?? '',
            status: building.status,
            operating_start_time: building.operating_start_time?.slice(0, 5) ?? '',
            operating_end_time: building.operating_end_time?.slice(0, 5) ?? '',
            operating_days: normalizeOperatingDays(building.operating_days),
            parking_time_limit_minutes: building.parking_time_limit_minutes,
            operating_schedule_parking_area_ids: areas.filter((area) => area.inherits_building_operating_schedule).map((area) => area.id),
          }
        : EMPTY,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, building, areasQuery.data],
  );

  const { control, handleSubmit, reset, setError } = useForm<BuildingFormValues>({
    resolver: zodResolver(buildingSchema),
    values,
  });

  const mutation = useMutation({
    mutationFn: (v: BuildingFormValues) =>
      building ? updateBuilding(building.id, toInput(v, areasQuery.isSuccess)) : createBuilding(toInput(v)),
    onMutate: () => setTopError(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buildings'] });
      qc.invalidateQueries({ queryKey: ['parking-areas'] });
      qc.invalidateQueries({ queryKey: ['parking-area'] });
      qc.invalidateQueries({ queryKey: ['operating-hours'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      if (building) qc.invalidateQueries({ queryKey: ['building', building.id] });
      onClose();
    },
    onError: (err) => {
      const api = toApiError(err);
      setTopError(api.status === 422 ? null : api.message);
      Object.entries(api.errors).forEach(([field, msgs]) => setError(field.split('.')[0] as keyof BuildingFormValues, { message: msgs[0] }));
    },
  });
  const closeWithoutSaving = () => {
    reset(values);
    mutation.reset();
    setTopError(null);
    onClose();
  };

  return (
    <FormSheet
      visible={visible}
      onClose={closeWithoutSaving}
      title={building ? 'Edit building' : 'New building'}
      subtitle={building?.name}
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      submitting={mutation.isPending}
      submitLabel={building ? 'Save changes' : 'Create building'}
      error={topError}>
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField label="Name" required icon="buildings" placeholder="Building name" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="code"
        render={({ field, fieldState }) => (
          <TextField label="Code" icon="tag" placeholder="BLD-01" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} autoCapitalize="characters" />
        )}
      />
      <Controller
        control={control}
        name="building_type"
        render={({ field, fieldState }) => (
          <TextField label="Building type" placeholder="e.g. office, warehouse" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="address_line_1"
        render={({ field, fieldState }) => (
          <TextField label="Address" required icon="pin" placeholder="Street address" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="address_line_2"
        render={({ field, fieldState }) => (
          <TextField label="Address line 2" placeholder="Suite, level, unit" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="suburb"
        render={({ field, fieldState }) => (
          <TextField label="Suburb" placeholder="Suburb / city" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="state"
        render={({ field, fieldState }) => (
          <TextField label="State" placeholder="NSW" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} autoCapitalize="characters" />
        )}
      />
      <Controller
        control={control}
        name="postal_code"
        render={({ field, fieldState }) => (
          <TextField label="Postal code" keyboardType="numeric" placeholder="2000" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="country"
        render={({ field, fieldState }) => (
          <TextField label="Country" placeholder="Australia" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
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
          <TextField label="Contact phone" icon="phone" keyboardType="phone-pad" placeholder="02xx xxx xxx" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="contact_email"
        render={({ field, fieldState }) => (
          <TextField label="Contact email" icon="mail" keyboardType="email-address" autoCapitalize="none" placeholder="name@building.com" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="status"
        render={({ field, fieldState }) => (
          <Select label="Status" required value={field.value} options={BUILDING_STATUS} onChange={field.onChange} error={fieldState.error?.message} />
        )}
      />

      <Controller
        control={control}
        name="operating_days"
        render={({ field, fieldState }) => <OperatingDaySelector value={field.value} onChange={field.onChange} error={fieldState.error?.message} />}
      />
      <View style={styles.timeFields}>
        <Controller control={control} name="operating_start_time" render={({ field, fieldState }) => (
          <View style={styles.flex}><TimeField label="Operation starts" value={field.value} onChange={field.onChange} clearable />{fieldState.error ? <Text variant="caption" tint={theme.danger}>{fieldState.error.message}</Text> : null}</View>
        )} />
        <Controller control={control} name="operating_end_time" render={({ field, fieldState }) => (
          <View style={styles.flex}><TimeField label="Operation ends" value={field.value} onChange={field.onChange} clearable />{fieldState.error ? <Text variant="caption" tint={theme.danger}>{fieldState.error.message}</Text> : null}</View>
        )} />
      </View>
      <Controller control={control} name="parking_time_limit_minutes" render={({ field, fieldState }) => (
        <TextField label="Parking time limit (minutes)" keyboardType="number-pad" placeholder="No limit" value={field.value === null ? '' : String(field.value)} onChangeText={(text) => field.onChange(text.trim() ? Number(text) : null)} error={fieldState.error?.message} hint="Leave empty for no time limit." />
      )} />

      {building ? (
        <Controller control={control} name="operating_schedule_parking_area_ids" render={({ field, fieldState }) => (
          <View style={[styles.membership, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
            <View style={styles.membershipHeader}>
              <View style={styles.flex}>
                <Text variant="subtitle">Parking areas using this schedule</Text>
                <Text variant="caption" color="textSecondary">{field.value.length} of {areas.length} selected</Text>
              </View>
              <View style={styles.shortcuts}>
                <Button title="Select all" size="sm" variant="ghost" disabled={areasQuery.isLoading} onPress={() => field.onChange(areas.map((area) => area.id))} />
                <Button title="Clear all" size="sm" variant="ghost" disabled={areasQuery.isLoading} onPress={() => field.onChange([])} />
              </View>
            </View>
            <Text variant="caption" color="textMuted">Removing an inherited area makes it custom and keeps the previously effective building schedule.</Text>
            {areasQuery.isError ? <Text variant="caption" tint={theme.danger}>Couldn’t load all parking areas. Retry by reopening this form.</Text> : null}
            {areas.map((area) => {
              const selected = field.value.includes(area.id);
              return <Pressable key={area.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => field.onChange(selected ? field.value.filter((id) => id !== area.id) : [...field.value, area.id])} style={[styles.areaOption, { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primarySoft : theme.surface }]}>
                <View style={styles.flex}><Text variant="bodyStrong">{area.name}</Text><Text variant="caption" color="textMuted">{area.code ?? 'No code'} · {area.inherits_building_operating_schedule ? 'Currently inherited' : 'Currently custom'}</Text></View>
                <Text variant="label" tint={selected ? theme.primary : theme.textMuted}>{selected ? 'Selected' : 'Custom'}</Text>
              </Pressable>;
            })}
            {fieldState.error ? <Text variant="caption" tint={theme.danger}>{fieldState.error.message}</Text> : null}
          </View>
        )} />
      ) : null}

      {building && onDeleted ? (
        <Button
          title="Delete building"
          variant="danger"
          icon="trash"
          onPress={async () => {
            const ok = await confirm({ title: 'Delete building?', message: `${building.name} and all its data will be removed.`, confirmLabel: 'Delete', destructive: true });
            if (!ok) return;
            try {
              await deleteBuilding(building.id);
              qc.invalidateQueries({ queryKey: ['buildings'] });
              onClose();
              onDeleted();
            } catch (e) {
              const err = toApiError(e);
              setTopError(err.field('building') ?? err.message);
            }
          }}
        />
      ) : null}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  timeFields: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  membership: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md },
  membershipHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.sm },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap' },
  areaOption: { minHeight: 52, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
