import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { toApiError } from '@/api/client';
import { lookupBuildings, lookupParkingAreas } from '@/api/lookups';
import {
  bulkCreateParkingSpaces,
  createParkingSpace,
  deleteParkingSpace,
  updateParkingSpace,
  type ParkingSpaceInput,
  type BulkCreateInput,
} from '@/api/parking-spaces';
import {
  parkingSpaceSchema,
  bulkCreateSpacesSchema,
  type ParkingSpaceForm as ParkingSpaceFormValues,
  type BulkCreateSpacesForm as BulkCreateSpacesFormValues,
} from '@/api/schemas';
import type { ParkingSpaceResource } from '@/api/types';
import { FormSheet } from '@/components/form-sheet';
import { Button, Select, TextField, Text } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { SPACE_OPERATIONAL_STATUS, SPACE_TYPES, SPACE_USAGE } from '@/lib/options';
import { zodResolver } from '@/lib/zod-resolver';

type EditProps = { visible: boolean; space: ParkingSpaceResource | null; onClose: () => void; onDeleted?: () => void };
type BulkProps = { visible: boolean; onClose: () => void };

const EMPTY: ParkingSpaceFormValues = {
  parking_area_id: 0,
  space_code: '',
  space_type: 'standard',
  default_usage: 'visitor',
  operational_status: 'active',
  notes: '',
};

const toInput = (v: ParkingSpaceFormValues): ParkingSpaceInput => ({
  parking_area_id: v.parking_area_id,
  space_code: v.space_code,
  space_type: v.space_type,
  default_usage: v.default_usage,
  operational_status: v.operational_status,
  notes: v.notes || null,
});

export function ParkingSpaceForm({ visible, space, onClose, onDeleted }: EditProps) {
  const qc = useQueryClient();
  const [topError, setTopError] = useState<string | null>(null);
  const [buildingId, setBuildingId] = useState<number | null>(space?.building_id ?? null);

  const { data: buildings = [] } = useQuery({ queryKey: ['lookup-buildings'], queryFn: lookupBuildings });
  const { data: areas = [] } = useQuery({
    queryKey: ['lookup-areas', buildingId],
    queryFn: () => lookupParkingAreas(buildingId ?? undefined),
    enabled: buildingId != null,
  });
  const buildingOptions = buildings.map((b) => ({ label: b.name, value: b.id }));
  const areaOptions = areas.map((a) => ({ label: a.name, value: a.id }));

  const values = useMemo<ParkingSpaceFormValues>(
    () =>
      space
        ? {
            parking_area_id: space.parking_area_id,
            space_code: space.space_code,
            space_type: space.space_type,
            default_usage: space.default_usage,
            operational_status: space.operational_status,
            notes: space.notes ?? '',
          }
        : EMPTY,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, space],
  );

  const { control, handleSubmit, reset, setError } = useForm<ParkingSpaceFormValues>({
    resolver: zodResolver(parkingSpaceSchema),
    values,
  });

  const mutation = useMutation({
    mutationFn: (v: ParkingSpaceFormValues) =>
      space ? updateParkingSpace(space.id, toInput(v)) : createParkingSpace(toInput(v)),
    onMutate: () => setTopError(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parking-spaces'] });
      qc.invalidateQueries({ queryKey: ['occupancy-grid'] });
      if (space) qc.invalidateQueries({ queryKey: ['parking-space', space.id] });
      onClose();
    },
    onError: (err) => {
      const api = toApiError(err);
      setTopError(api.status === 422 ? null : api.message);
      Object.entries(api.errors).forEach(([field, msgs]) => setError(field as keyof ParkingSpaceFormValues, { message: msgs[0] }));
    },
  });
  const closeWithoutSaving = () => {
    reset(values);
    setBuildingId(space?.building_id ?? null);
    mutation.reset();
    setTopError(null);
    onClose();
  };

  return (
    <FormSheet
      visible={visible}
      onClose={closeWithoutSaving}
      title={space ? 'Edit parking space' : 'New parking space'}
      subtitle={space?.space_code}
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      submitting={mutation.isPending}
      submitLabel={space ? 'Save changes' : 'Create space'}
      error={topError}>
      <Controller
        control={control}
        name="space_code"
        render={({ field, fieldState }) => (
          <TextField label="Space code" required icon="parkingSpace" placeholder="e.g. B1-01" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} autoCapitalize="characters" />
        )}
      />
      <Select label="Building" value={buildingId} options={buildingOptions} onChange={(v) => { setBuildingId(v as number); }} placeholder="Select building" />
      <Controller
        control={control}
        name="parking_area_id"
        render={({ field, fieldState }) => (
          <Select label="Parking area" required value={field.value || null} options={areaOptions} onChange={field.onChange} error={fieldState.error?.message} placeholder={buildingId ? 'Select area' : 'Select a building first'} />
        )}
      />
      <Controller
        control={control}
        name="space_type"
        render={({ field, fieldState }) => (
          <Select label="Space type" required value={field.value} options={SPACE_TYPES} onChange={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="default_usage"
        render={({ field, fieldState }) => (
          <Select label="Default usage" required value={field.value} options={SPACE_USAGE} onChange={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="operational_status"
        render={({ field, fieldState }) => (
          <Select label="Operational status" required value={field.value} options={SPACE_OPERATIONAL_STATUS} onChange={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="notes"
        render={({ field, fieldState }) => (
          <TextField label="Notes" placeholder="Optional" multiline value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} style={{ minHeight: 72, textAlignVertical: 'top' }} />
        )}
      />

      {space && onDeleted ? (
        <Button
          title="Delete space"
          variant="danger"
          icon="trash"
          onPress={async () => {
            const ok = await confirm({ title: 'Delete parking space?', message: `${space.space_code} will be removed.`, confirmLabel: 'Delete', destructive: true });
            if (!ok) return;
            try {
              await deleteParkingSpace(space.id);
              qc.invalidateQueries({ queryKey: ['parking-spaces'] });
              qc.invalidateQueries({ queryKey: ['occupancy-grid'] });
              qc.invalidateQueries({ queryKey: ['lookup-spaces'] });
              qc.invalidateQueries({ queryKey: ['booking-form-data'] });
              qc.invalidateQueries({ queryKey: ['bookings-by-space'] });
              qc.removeQueries({ queryKey: ['parking-space', space.id] });
              onClose();
              onDeleted();
            } catch (e) {
              const err = toApiError(e);
              setTopError(err.field('space') ?? err.message);
            }
          }}
        />
      ) : null}
    </FormSheet>
  );
}

const BULK_EMPTY: BulkCreateSpacesFormValues = {
  parking_area_id: 0,
  prefix: '',
  start_number: 1,
  count: 10,
  space_type: 'standard',
  default_usage: 'visitor',
  operational_status: 'active',
};

export function BulkCreateSpacesForm({ visible, onClose }: BulkProps) {
  const qc = useQueryClient();
  const [topError, setTopError] = useState<string | null>(null);
  const [buildingId, setBuildingId] = useState<number | null>(null);

  const { data: buildings = [] } = useQuery({ queryKey: ['lookup-buildings'], queryFn: lookupBuildings });
  const { data: areas = [] } = useQuery({
    queryKey: ['lookup-areas', buildingId],
    queryFn: () => lookupParkingAreas(buildingId ?? undefined),
    enabled: buildingId != null,
  });
  const buildingOptions = buildings.map((b) => ({ label: b.name, value: b.id }));
  const areaOptions = areas.map((a) => ({ label: a.name, value: a.id }));

  const { control, handleSubmit, setError, reset } = useForm<BulkCreateSpacesFormValues>({
    resolver: zodResolver(bulkCreateSpacesSchema),
    defaultValues: BULK_EMPTY,
  });

  const mutation = useMutation({
    mutationFn: (v: BulkCreateSpacesFormValues) => bulkCreateParkingSpaces(v as BulkCreateInput),
    onMutate: () => setTopError(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parking-spaces'] });
      qc.invalidateQueries({ queryKey: ['occupancy-grid'] });
      qc.invalidateQueries({ queryKey: ['lookup-spaces'] });
      qc.invalidateQueries({ queryKey: ['booking-form-data'] });
      qc.invalidateQueries({ queryKey: ['bookings-by-space'] });
      reset(BULK_EMPTY);
      setBuildingId(null);
      onClose();
    },
    onError: (err) => {
      const api = toApiError(err);
      setTopError(api.status === 422 ? null : api.message);
      Object.entries(api.errors).forEach(([field, msgs]) => setError(field as keyof BulkCreateSpacesFormValues, { message: msgs[0] }));
    },
  });

  const handleClose = () => {
    setTopError(null);
    reset(BULK_EMPTY);
    setBuildingId(null);
    mutation.reset();
    onClose();
  };

  return (
    <FormSheet
      visible={visible}
      onClose={handleClose}
      title="Bulk create spaces"
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      submitting={mutation.isPending}
      submitLabel="Create spaces"
      error={topError}>
      <Select label="Building" value={buildingId} options={buildingOptions} onChange={(v) => setBuildingId(v as number)} placeholder="Select building" />
          <Controller
            control={control}
            name="parking_area_id"
            render={({ field, fieldState }) => (
              <Select label="Parking area" required value={field.value || null} options={areaOptions} onChange={field.onChange} error={fieldState.error?.message} placeholder={buildingId ? 'Select area' : 'Select a building first'} />
            )}
          />
          <Controller
            control={control}
            name="prefix"
            render={({ field, fieldState }) => (
              <TextField label="Prefix" required placeholder="e.g. B1-" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} autoCapitalize="characters" />
            )}
          />
          <Controller
            control={control}
            name="start_number"
            render={({ field, fieldState }) => (
              <TextField label="Start number" required keyboardType="numeric" placeholder="1" value={field.value ? String(field.value) : ''} onChangeText={(t) => field.onChange(Number(t) || 1)} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="count"
            render={({ field, fieldState }) => (
              <TextField label="Count" required keyboardType="numeric" placeholder="10" value={field.value ? String(field.value) : ''} onChangeText={(t) => field.onChange(Number(t) || 0)} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="space_type"
            render={({ field, fieldState }) => (
              <Select label="Space type" required value={field.value} options={SPACE_TYPES} onChange={field.onChange} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="default_usage"
            render={({ field, fieldState }) => (
              <Select label="Default usage" required value={field.value} options={SPACE_USAGE} onChange={field.onChange} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="operational_status"
            render={({ field, fieldState }) => (
              <Select label="Operational status" required value={field.value} options={SPACE_OPERATIONAL_STATUS} onChange={field.onChange} error={fieldState.error?.message} />
            )}
          />
      <Text variant="caption" color="textMuted">
        Spaces with the generated code already in this area will be skipped.
      </Text>
    </FormSheet>
  );
}
