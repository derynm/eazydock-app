import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { toApiError } from '@/api/client';
import { createBuilding, deleteBuilding, updateBuilding, type BuildingInput } from '@/api/buildings';
import { buildingSchema, type BuildingForm as BuildingFormValues } from '@/api/schemas';
import type { BuildingResource } from '@/api/types';
import { FormSheet } from '@/components/form-sheet';
import { Button, Select, TextField } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { BUILDING_STATUS } from '@/lib/options';
import { zodResolver } from '@/lib/zod-resolver';

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
};

const toInput = (v: BuildingFormValues): BuildingInput => ({
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
});

export function BuildingForm({ visible, building, onClose, onDeleted }: Props) {
  const qc = useQueryClient();
  const [topError, setTopError] = useState<string | null>(null);

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
          }
        : EMPTY,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, building],
  );

  const { control, handleSubmit, setError } = useForm<BuildingFormValues>({
    resolver: zodResolver(buildingSchema),
    values,
  });

  const mutation = useMutation({
    mutationFn: (v: BuildingFormValues) =>
      building ? updateBuilding(building.id, toInput(v)) : createBuilding(toInput(v)),
    onMutate: () => setTopError(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buildings'] });
      if (building) qc.invalidateQueries({ queryKey: ['building', building.id] });
      onClose();
    },
    onError: (err) => {
      const api = toApiError(err);
      setTopError(api.status === 422 ? null : api.message);
      Object.entries(api.errors).forEach(([field, msgs]) => setError(field as keyof BuildingFormValues, { message: msgs[0] }));
    },
  });

  return (
    <FormSheet
      visible={visible}
      onClose={onClose}
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
              setTopError(toApiError(e).message);
            }
          }}
        />
      ) : null}
    </FormSheet>
  );
}
