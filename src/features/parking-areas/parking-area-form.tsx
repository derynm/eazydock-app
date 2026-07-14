import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { toApiError } from '@/api/client';
import { lookupBuildings } from '@/api/lookups';
import { createParkingArea, deleteParkingArea, updateParkingArea, type ParkingAreaInput } from '@/api/parking-areas';
import { parkingAreaSchema, type ParkingAreaForm as ParkingAreaFormValues } from '@/api/schemas';
import type { ParkingAreaResource } from '@/api/types';
import { FormSheet } from '@/components/form-sheet';
import { Button, Select, TextField } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { AREA_STATUS, AREA_TYPES } from '@/lib/options';
import { zodResolver } from '@/lib/zod-resolver';

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
});

export function ParkingAreaForm({ visible, area, onClose, onDeleted }: Props) {
  const qc = useQueryClient();
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
          }
        : EMPTY,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, area],
  );

  const { control, handleSubmit, setError } = useForm<ParkingAreaFormValues>({
    resolver: zodResolver(parkingAreaSchema),
    values,
  });

  const mutation = useMutation({
    mutationFn: (v: ParkingAreaFormValues) =>
      area ? updateParkingArea(area.id, toInput(v)) : createParkingArea(toInput(v)),
    onMutate: () => setTopError(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parking-areas'] });
      if (area) qc.invalidateQueries({ queryKey: ['parking-area', area.id] });
      onClose();
    },
    onError: (err) => {
      const api = toApiError(err);
      setTopError(api.status === 422 ? null : api.message);
      Object.entries(api.errors).forEach(([field, msgs]) => setError(field as keyof ParkingAreaFormValues, { message: msgs[0] }));
    },
  });

  return (
    <FormSheet
      visible={visible}
      onClose={onClose}
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
