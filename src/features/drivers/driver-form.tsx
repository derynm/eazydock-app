import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { toApiError } from '@/api/client';
import { createDriver, deleteDriver, updateDriver, type DriverInput } from '@/api/drivers';
import { driverSchema, type DriverForm as DriverFormValues } from '@/api/schemas';
import type { Driver } from '@/api/types';
import { FormSheet } from '@/components/form-sheet';
import { Button, Select, TextField } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { ENTITY_STATUS } from '@/lib/options';
import { zodResolver } from '@/lib/zod-resolver';

type Props = { visible: boolean; driver: Driver | null; onClose: () => void; onDeleted?: () => void };

const EMPTY: DriverFormValues = {
  full_name: '',
  phone: '',
  email: '',
  company_name: '',
  license_no: '',
  status: 'active',
  notes: '',
};

const toInput = (v: DriverFormValues): DriverInput => ({
  full_name: v.full_name,
  phone: v.phone || null,
  email: v.email || null,
  company_name: v.company_name || null,
  license_no: v.license_no || null,
  status: v.status,
  notes: v.notes || null,
});

export function DriverForm({ visible, driver, onClose, onDeleted }: Props) {
  const qc = useQueryClient();
  const [topError, setTopError] = useState<string | null>(null);

  const values = useMemo<DriverFormValues>(
    () =>
      driver
        ? {
            full_name: driver.full_name,
            phone: driver.phone ?? '',
            email: driver.email ?? '',
            company_name: driver.company_name ?? '',
            license_no: driver.license_no ?? '',
            status: driver.status,
            notes: driver.notes ?? '',
          }
        : EMPTY,
    // `visible` re-syncs the form (and clears stale input) each time it opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, driver],
  );

  const { control, handleSubmit, setError } = useForm<DriverFormValues>({
    resolver: zodResolver(driverSchema),
    values,
  });

  const mutation = useMutation({
    mutationFn: (v: DriverFormValues) =>
      driver ? updateDriver(driver.id, toInput(v)) : createDriver(toInput(v)),
    onMutate: () => setTopError(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
      if (driver) qc.invalidateQueries({ queryKey: ['driver', driver.id] });
      onClose();
    },
    onError: (err) => {
      const api = toApiError(err);
      setTopError(api.status === 422 ? null : api.message);
      Object.entries(api.errors).forEach(([field, msgs]) =>
        setError(field as keyof DriverFormValues, { message: msgs[0] }),
      );
    },
  });

  return (
    <FormSheet
      visible={visible}
      onClose={onClose}
      title={driver ? 'Edit driver' : 'New driver'}
      subtitle={driver?.full_name}
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      submitting={mutation.isPending}
      submitLabel={driver ? 'Save changes' : 'Create driver'}
      error={topError}>
      <Controller
        control={control}
        name="full_name"
        render={({ field, fieldState }) => (
          <TextField label="Full name" required icon="user" placeholder="Jane Smith" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} autoCapitalize="words" />
        )}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field, fieldState }) => (
          <TextField label="Phone" icon="phone" placeholder="04xx xxx xxx" keyboardType="phone-pad" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField label="Email" icon="mail" placeholder="name@company.com" keyboardType="email-address" autoCapitalize="none" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="company_name"
        render={({ field, fieldState }) => (
          <TextField label="Company" icon="building" placeholder="Company name" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="license_no"
        render={({ field, fieldState }) => (
          <TextField label="License number" icon="card" placeholder="DL123456" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} autoCapitalize="characters" />
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

      {driver && onDeleted ? (
        <Button
          title="Delete driver"
          variant="danger"
          icon="trash"
          onPress={async () => {
            const ok = await confirm({ title: 'Delete driver?', message: `${driver.full_name} will be removed.`, confirmLabel: 'Delete', destructive: true });
            if (!ok) return;
            try {
              await deleteDriver(driver.id);
              qc.invalidateQueries({ queryKey: ['drivers'] });
              onClose();
              onDeleted();
            } catch (e) {
              const err = toApiError(e);
              setTopError(err.field('driver') ?? err.message);
            }
          }}
        />
      ) : null}
    </FormSheet>
  );
}
