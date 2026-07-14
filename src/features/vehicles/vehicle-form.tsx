import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { toApiError } from '@/api/client';
import { createVehicle, deleteVehicle, updateVehicle, type VehicleInput } from '@/api/vehicles';
import { vehicleSchema, type VehicleForm as VehicleFormValues } from '@/api/schemas';
import type { Vehicle } from '@/api/types';
import { FormSheet } from '@/components/form-sheet';
import { Button, Select, TextField } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { ENTITY_STATUS, VEHICLE_TYPES } from '@/lib/options';
import { zodResolver } from '@/lib/zod-resolver';

type Props = { visible: boolean; vehicle: Vehicle | null; onClose: () => void; onDeleted?: () => void };

const EMPTY: VehicleFormValues = {
  plate_number: '',
  plate_state: '',
  plate_country: 'Australia',
  vehicle_type: 'van',
  make: '',
  model: '',
  colour: '',
  status: 'active',
  notes: '',
};

const toInput = (v: VehicleFormValues): VehicleInput => ({
  plate_number: v.plate_number,
  plate_state: v.plate_state || null,
  plate_country: v.plate_country || null,
  vehicle_type: v.vehicle_type,
  make: v.make || null,
  model: v.model || null,
  colour: v.colour || null,
  status: v.status,
  notes: v.notes || null,
});

export function VehicleForm({ visible, vehicle, onClose, onDeleted }: Props) {
  const qc = useQueryClient();
  const [topError, setTopError] = useState<string | null>(null);

  const values = useMemo<VehicleFormValues>(
    () =>
      vehicle
        ? {
            plate_number: vehicle.plate_number,
            plate_state: vehicle.plate_state ?? '',
            plate_country: vehicle.plate_country ?? 'Australia',
            vehicle_type: vehicle.vehicle_type,
            make: vehicle.make ?? '',
            model: vehicle.model ?? '',
            colour: vehicle.colour ?? '',
            status: vehicle.status,
            notes: vehicle.notes ?? '',
          }
        : EMPTY,
    // `visible` re-syncs the form (and clears stale input) each time it opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, vehicle],
  );

  const { control, handleSubmit, setError } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    values,
  });

  const mutation = useMutation({
    mutationFn: (v: VehicleFormValues) =>
      vehicle ? updateVehicle(vehicle.id, toInput(v)) : createVehicle(toInput(v)),
    onMutate: () => setTopError(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      if (vehicle) qc.invalidateQueries({ queryKey: ['vehicle', vehicle.id] });
      onClose();
    },
    onError: (err) => {
      const api = toApiError(err);
      setTopError(api.status === 422 ? null : api.message);
      Object.entries(api.errors).forEach(([field, msgs]) => setError(field as keyof VehicleFormValues, { message: msgs[0] }));
    },
  });

  return (
    <FormSheet
      visible={visible}
      onClose={onClose}
      title={vehicle ? 'Edit vehicle' : 'New vehicle'}
      subtitle={vehicle?.plate_number}
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      submitting={mutation.isPending}
      submitLabel={vehicle ? 'Save changes' : 'Create vehicle'}
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
        name="plate_state"
        render={({ field, fieldState }) => (
          <TextField label="State" icon="pin" placeholder="NSW" autoCapitalize="characters" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="vehicle_type"
        render={({ field, fieldState }) => (
          <Select label="Vehicle type" required value={field.value} options={VEHICLE_TYPES} onChange={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="make"
        render={({ field, fieldState }) => (
          <TextField label="Make" placeholder="Toyota" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="model"
        render={({ field, fieldState }) => (
          <TextField label="Model" placeholder="HiAce" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="colour"
        render={({ field, fieldState }) => (
          <TextField label="Colour" placeholder="White" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="status"
        render={({ field, fieldState }) => (
          <Select label="Status" required value={field.value} options={ENTITY_STATUS} onChange={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="notes"
        render={({ field, fieldState }) => (
          <TextField label="Notes" placeholder="Optional notes" multiline value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} style={{ minHeight: 80, textAlignVertical: 'top' }} />
        )}
      />

      {vehicle && onDeleted ? (
        <Button
          title="Delete vehicle"
          variant="danger"
          icon="trash"
          onPress={async () => {
            const ok = await confirm({ title: 'Delete vehicle?', message: `${vehicle.plate_number} will be removed.`, confirmLabel: 'Delete', destructive: true });
            if (!ok) return;
            try {
              await deleteVehicle(vehicle.id);
              qc.invalidateQueries({ queryKey: ['vehicles'] });
              onClose();
              onDeleted();
            } catch (e) {
              const err = toApiError(e);
              setTopError(err.field('vehicle') ?? err.message);
            }
          }}
        />
      ) : null}
    </FormSheet>
  );
}
