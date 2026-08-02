import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { toApiError } from '@/api/client';
import { createAllocation, deleteAllocation, updateAllocation, type AllocationInput } from '@/api/allocations';
import { lookupBuildings, lookupParkingAreas, lookupTenants } from '@/api/lookups';
import { allocationSchema, type AllocationForm as AllocationFormValues } from '@/api/schemas';
import type { Allocation } from '@/api/types';
import { FormSheet } from '@/components/form-sheet';
import { Button, Select, TextField } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { ALLOCATION_TYPES, BUILDING_STATUS, USER_CATEGORIES } from '@/lib/options';
import { zodResolver } from '@/lib/zod-resolver';

type Props = { visible: boolean; allocation: Allocation | null; onClose: () => void; onDeleted?: () => void };

const EMPTY: AllocationFormValues = {
  building_id: 0,
  tenant_id: null,
  parking_area_id: null,
  allocation_type: 'flexible_quota',
  user_category: 'visitor',
  quota: 1,
  release_after_minutes: null,
  starts_at: '',
  ends_at: '',
  status: 'active',
  notes: '',
};

const STATUS_OPTIONS = BUILDING_STATUS; // active | inactive (expired is server-set)

const toInput = (v: AllocationFormValues): AllocationInput => ({
  building_id: v.building_id,
  tenant_id: v.tenant_id || null,
  parking_area_id: v.parking_area_id || null,
  allocation_type: v.allocation_type,
  user_category: v.user_category,
  quota: v.quota,
  release_after_minutes: v.release_after_minutes || null,
  starts_at: v.starts_at || null,
  ends_at: v.ends_at || null,
  status: v.status as AllocationInput['status'],
  notes: v.notes || null,
});

export function AllocationForm({ visible, allocation, onClose, onDeleted }: Props) {
  const qc = useQueryClient();
  const [topError, setTopError] = useState<string | null>(null);
  const [buildingId, setBuildingId] = useState<number | null>(allocation?.building_id ?? null);

  const { data: buildings = [] } = useQuery({ queryKey: ['lookup-buildings'], queryFn: lookupBuildings });
  const { data: areas = [] } = useQuery({
    queryKey: ['lookup-areas', buildingId],
    queryFn: () => lookupParkingAreas(buildingId ?? undefined),
    enabled: buildingId != null,
  });
  const { data: tenants = [] } = useQuery({
    queryKey: ['lookup-tenants', buildingId],
    queryFn: () => lookupTenants(buildingId ?? undefined),
    enabled: buildingId != null,
  });

  const buildingOptions = buildings.map((b) => ({ label: b.name, value: b.id }));
  const areaOptions = [{ label: 'Any area', value: 0 }, ...areas.map((a) => ({ label: a.name, value: a.id }))];
  const tenantOptions = [{ label: 'None', value: 0 }, ...tenants.map((t) => ({ label: t.name, value: t.id }))];

  const values = useMemo<AllocationFormValues>(
    () =>
      allocation
        ? {
            building_id: allocation.building_id,
            tenant_id: allocation.tenant_id,
            parking_area_id: allocation.parking_area_id,
            allocation_type: allocation.allocation_type,
            user_category: allocation.user_category,
            quota: allocation.quota,
            release_after_minutes: allocation.release_after_minutes,
            starts_at: allocation.starts_at ? allocation.starts_at.slice(0, 10) : '',
            ends_at: allocation.ends_at ? allocation.ends_at.slice(0, 10) : '',
            status: allocation.status === 'expired' ? 'inactive' : allocation.status,
            notes: allocation.notes ?? '',
          }
        : EMPTY,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, allocation],
  );

  const { control, handleSubmit, reset, setError } = useForm<AllocationFormValues>({
    resolver: zodResolver(allocationSchema),
    values,
  });

  const mutation = useMutation({
    mutationFn: (v: AllocationFormValues) =>
      allocation ? updateAllocation(allocation.id, toInput(v)) : createAllocation(toInput(v)),
    onMutate: () => setTopError(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allocations'] });
      if (allocation) qc.invalidateQueries({ queryKey: ['allocation', allocation.id] });
      onClose();
    },
    onError: (err) => {
      const api = toApiError(err);
      setTopError(api.status === 422 ? null : api.message);
      Object.entries(api.errors).forEach(([field, msgs]) => setError(field as keyof AllocationFormValues, { message: msgs[0] }));
    },
  });
  const closeWithoutSaving = () => {
    reset(values);
    setBuildingId(allocation?.building_id ?? null);
    mutation.reset();
    setTopError(null);
    onClose();
  };

  return (
    <FormSheet
      visible={visible}
      onClose={closeWithoutSaving}
      title={allocation ? 'Edit allocation' : 'New allocation'}
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      submitting={mutation.isPending}
      submitLabel={allocation ? 'Save changes' : 'Create allocation'}
      error={topError}>
      <Controller
        control={control}
        name="building_id"
        render={({ field, fieldState }) => (
          <Select
            label="Building"
            required
            value={field.value || null}
            options={buildingOptions}
            onChange={(v) => { field.onChange(v); setBuildingId(v as number); }}
            error={fieldState.error?.message}
            placeholder="Select building"
          />
        )}
      />
      <Controller
        control={control}
        name="allocation_type"
        render={({ field, fieldState }) => (
          <Select label="Allocation type" required value={field.value} options={ALLOCATION_TYPES} onChange={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="user_category"
        render={({ field, fieldState }) => (
          <Select label="User category" required value={field.value} options={USER_CATEGORIES} onChange={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="quota"
        render={({ field, fieldState }) => (
          <TextField label="Quota" required keyboardType="numeric" placeholder="10" value={field.value ? String(field.value) : ''} onChangeText={(t) => field.onChange(Number(t) || 0)} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="parking_area_id"
        render={({ field, fieldState }) => (
          <Select label="Restrict to area" value={field.value || 0} options={areaOptions} onChange={(v) => field.onChange(v || null)} error={fieldState.error?.message} placeholder="All areas" />
        )}
      />
      <Controller
        control={control}
        name="tenant_id"
        render={({ field, fieldState }) => (
          <Select label="Tenant" value={field.value || 0} options={tenantOptions} onChange={(v) => field.onChange(v || null)} error={fieldState.error?.message} placeholder="No tenant" />
        )}
      />
      <Controller
        control={control}
        name="release_after_minutes"
        render={({ field, fieldState }) => (
          <TextField label="Release after (minutes)" keyboardType="numeric" placeholder="e.g. 30" value={field.value ? String(field.value) : ''} onChangeText={(t) => field.onChange(Number(t) || null)} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="starts_at"
        render={({ field, fieldState }) => (
          <TextField label="Starts on (YYYY-MM-DD)" placeholder="2025-01-01" value={field.value ?? ''} onChangeText={field.onChange} error={fieldState.error?.message} keyboardType="numeric" />
        )}
      />
      <Controller
        control={control}
        name="ends_at"
        render={({ field, fieldState }) => (
          <TextField label="Ends on (YYYY-MM-DD)" placeholder="2025-12-31" value={field.value ?? ''} onChangeText={field.onChange} error={fieldState.error?.message} keyboardType="numeric" />
        )}
      />
      <Controller
        control={control}
        name="status"
        render={({ field, fieldState }) => (
          <Select label="Status" required value={field.value} options={STATUS_OPTIONS} onChange={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="notes"
        render={({ field, fieldState }) => (
          <TextField label="Notes" placeholder="Optional" multiline value={field.value ?? ''} onChangeText={field.onChange} error={fieldState.error?.message} style={{ minHeight: 72, textAlignVertical: 'top' }} />
        )}
      />

      {allocation && onDeleted ? (
        <Button
          title="Delete allocation"
          variant="danger"
          icon="trash"
          onPress={async () => {
            const ok = await confirm({ title: 'Delete allocation?', message: 'This allocation will be removed.', confirmLabel: 'Delete', destructive: true });
            if (!ok) return;
            try {
              await deleteAllocation(allocation.id);
              qc.invalidateQueries({ queryKey: ['allocations'] });
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
