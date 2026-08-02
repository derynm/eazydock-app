import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, Switch, View } from 'react-native';

import { getBuilding } from '@/api/buildings';
import { toApiError } from '@/api/client';
import { lookupBuildings } from '@/api/lookups';
import { createParkingArea, deleteParkingArea, updateParkingArea, type ParkingAreaInput } from '@/api/parking-areas';
import { parkingAreaSchema, type ParkingAreaForm as ParkingAreaFormValues } from '@/api/schemas';
import type { ParkingAreaResource } from '@/api/types';
import { FormSheet } from '@/components/form-sheet';
import { OperatingDaySelector } from '@/components/operating-day-selector';
import { Button, Select, Text, TextField, TimeField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { confirm } from '@/lib/confirm';
import { AREA_STATUS, AREA_TYPES } from '@/lib/options';
import { formatOperatingDays, formatOperatingHours, normalizeOperatingDays } from '@/lib/operating-schedule';
import { zodResolver } from '@/lib/zod-resolver';
import { useTheme } from '@/hooks/use-theme';

type Props = { visible: boolean; area: ParkingAreaResource | null; onClose: () => void; onDeleted?: () => void };

const EMPTY: ParkingAreaFormValues = {
  building_id: 0,
  name: '',
  code: '',
  level: '',
  area_type: 'standard',
  capacity: 0,
  status: 'active',
  notes: '',
  inherits_building_operating_schedule: false,
  operating_start_time: '',
  operating_end_time: '',
  operating_days: normalizeOperatingDays(null),
  parking_time_limit_minutes: null,
};

const toInput = (v: ParkingAreaFormValues): ParkingAreaInput => ({
  building_id: v.building_id,
  name: v.name,
  code: v.code || null,
  level: v.level || null,
  area_type: v.area_type,
  capacity: v.capacity,
  status: v.status,
  notes: v.notes || null,
  inherits_building_operating_schedule: v.inherits_building_operating_schedule,
  ...(!v.inherits_building_operating_schedule ? {
    operating_start_time: v.operating_start_time || null,
    operating_end_time: v.operating_end_time || null,
    operating_days: v.operating_days,
    parking_time_limit_minutes: v.parking_time_limit_minutes,
  } : {}),
});

export function ParkingAreaForm({ visible, area, onClose, onDeleted }: Props) {
  const qc = useQueryClient();
  const theme = useTheme();
  const [topError, setTopError] = useState<string | null>(null);

  const { data: buildings = [] } = useQuery({ queryKey: ['lookup-buildings'], queryFn: lookupBuildings });
  const buildingOptions = buildings.map((b) => ({ label: b.name, value: b.id }));

  const values = useMemo<ParkingAreaFormValues>(
    () =>
      area
        ? {
            building_id: area.building_id,
            name: area.name,
            code: area.code ?? '',
            level: area.level ?? '',
            area_type: area.area_type,
            capacity: area.capacity,
            status: area.status,
            notes: area.notes ?? '',
            inherits_building_operating_schedule: area.inherits_building_operating_schedule,
            operating_start_time: area.operating_start_time?.slice(0, 5) ?? '',
            operating_end_time: area.operating_end_time?.slice(0, 5) ?? '',
            operating_days: normalizeOperatingDays(area.operating_days),
            parking_time_limit_minutes: area.parking_time_limit_minutes,
          }
        : EMPTY,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, area],
  );

  const { control, handleSubmit, reset, setError } = useForm<ParkingAreaFormValues>({
    resolver: zodResolver(parkingAreaSchema),
    values,
  });
  const buildingId = useWatch({ control, name: 'building_id' });
  const inherits = useWatch({ control, name: 'inherits_building_operating_schedule' });
  const buildingQuery = useQuery({ queryKey: ['building', buildingId], queryFn: () => getBuilding(buildingId), enabled: visible && inherits && buildingId > 0 });

  const mutation = useMutation({
    mutationFn: (v: ParkingAreaFormValues) =>
      area ? updateParkingArea(area.id, toInput(v)) : createParkingArea(toInput(v)),
    onMutate: () => setTopError(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parking-areas'] });
      qc.invalidateQueries({ queryKey: ['operating-hours'] });
      if (area) qc.invalidateQueries({ queryKey: ['parking-area', area.id] });
      onClose();
    },
    onError: (err) => {
      const api = toApiError(err);
      setTopError(api.status === 422 ? null : api.message);
      Object.entries(api.errors).forEach(([field, msgs]) => setError(field.split('.')[0] as keyof ParkingAreaFormValues, { message: msgs[0] }));
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
      title={area ? 'Edit parking area' : 'New parking area'}
      subtitle={area?.name}
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      submitting={mutation.isPending}
      submitLabel={area ? 'Save changes' : 'Create area'}
      error={topError}>
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField label="Name" required icon="parkingArea" placeholder="e.g. Level B1" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="building_id"
        render={({ field, fieldState }) => (
          <Select label="Building" required value={field.value || null} options={buildingOptions} onChange={field.onChange} error={fieldState.error?.message} placeholder="Select building" />
        )}
      />
      <Controller control={control} name="inherits_building_operating_schedule" render={({ field }) => (
        <View style={[styles.scheduleSection, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
          <View style={styles.switchRow}>
            <View style={styles.flex}><Text variant="label">Use building schedule</Text><Text variant="caption" color="textMuted">Use the selected building’s days, hours, and parking limit.</Text></View>
            <Switch value={field.value} onValueChange={field.onChange} trackColor={{ false: theme.borderStrong, true: theme.primary }} thumbColor={theme.surface} />
          </View>
          {field.value ? (
            buildingQuery.isLoading ? <Text variant="caption" color="textMuted">Loading building schedule…</Text> : buildingQuery.data ? (
              <View style={styles.preview}>
                <Text variant="bodyStrong">{formatOperatingDays(buildingQuery.data.operating_days)}</Text>
                <Text variant="body" color="textSecondary">{formatOperatingHours(buildingQuery.data.operating_start_time, buildingQuery.data.operating_end_time)}</Text>
                <Text variant="caption" color="textMuted">{buildingQuery.data.parking_time_limit_minutes === null ? 'No parking time limit' : `${buildingQuery.data.parking_time_limit_minutes} minute limit`}</Text>
              </View>
            ) : <Text variant="caption" tint={theme.danger}>Building schedule could not be loaded.</Text>
          ) : null}
        </View>
      )} />

      {!inherits ? <>
        <Controller control={control} name="operating_days" render={({ field, fieldState }) => <OperatingDaySelector value={field.value} onChange={field.onChange} error={fieldState.error?.message} />} />
        <View style={styles.timeFields}>
          <Controller control={control} name="operating_start_time" render={({ field, fieldState }) => <View style={styles.flex}><TimeField label="Operation starts" value={field.value} onChange={field.onChange} clearable />{fieldState.error ? <Text variant="caption" tint={theme.danger}>{fieldState.error.message}</Text> : null}</View>} />
          <Controller control={control} name="operating_end_time" render={({ field, fieldState }) => <View style={styles.flex}><TimeField label="Operation ends" value={field.value} onChange={field.onChange} clearable />{fieldState.error ? <Text variant="caption" tint={theme.danger}>{fieldState.error.message}</Text> : null}</View>} />
        </View>
        <Controller control={control} name="parking_time_limit_minutes" render={({ field, fieldState }) => <TextField label="Parking time limit (minutes)" keyboardType="number-pad" placeholder="No limit" value={field.value === null ? '' : String(field.value)} onChangeText={(text) => field.onChange(text.trim() ? Number(text) : null)} error={fieldState.error?.message} />} />
      </> : null}
      <Controller
        control={control}
        name="area_type"
        render={({ field, fieldState }) => (
          <Select label="Area type" required value={field.value} options={AREA_TYPES} onChange={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="capacity"
        render={({ field, fieldState }) => (
          <TextField label="Capacity" required keyboardType="numeric" placeholder="40" value={field.value ? String(field.value) : ''} onChangeText={(t) => field.onChange(Number(t) || 0)} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="code"
        render={({ field, fieldState }) => (
          <TextField label="Code" icon="tag" placeholder="B1" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} autoCapitalize="characters" />
        )}
      />
      <Controller
        control={control}
        name="level"
        render={({ field, fieldState }) => (
          <TextField label="Level" placeholder="e.g. B1, Ground, Roof" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="status"
        render={({ field, fieldState }) => (
          <Select label="Status" required value={field.value} options={AREA_STATUS} onChange={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="notes"
        render={({ field, fieldState }) => (
          <TextField label="Notes" placeholder="Optional notes" multiline value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} style={{ minHeight: 72, textAlignVertical: 'top' }} />
        )}
      />

      {area && onDeleted ? (
        <Button
          title="Delete area"
          variant="danger"
          icon="trash"
          onPress={async () => {
            const ok = await confirm({ title: 'Delete parking area?', message: `${area.name} will be removed.`, confirmLabel: 'Delete', destructive: true });
            if (!ok) return;
            try {
              await deleteParkingArea(area.id);
              qc.invalidateQueries({ queryKey: ['parking-areas'] });
              onClose();
              onDeleted();
            } catch (e) {
              const err = toApiError(e);
              setTopError(err.field('area') ?? err.message);
            }
          }}
        />
      ) : null}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scheduleSection: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  preview: { gap: Spacing.xs },
  timeFields: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
});
