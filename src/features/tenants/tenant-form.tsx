import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { toApiError } from '@/api/client';
import { lookupBuildings } from '@/api/lookups';
import { createTenant, deleteTenant, updateTenant, type TenantInput } from '@/api/tenants';
import { tenantSchema, type TenantForm as TenantFormValues } from '@/api/schemas';
import type { Tenant } from '@/api/types';
import { FormSheet } from '@/components/form-sheet';
import { Button, Select, TextField } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { TENANT_STATUS, TENANT_TYPES } from '@/lib/options';
import { zodResolver } from '@/lib/zod-resolver';

type Props = { visible: boolean; tenant: Tenant | null; onClose: () => void; onDeleted?: () => void };

const EMPTY: TenantFormValues = {
  building_id: 0,
  name: '',
  code: '',
  tenant_type: 'tenant',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  suite_or_unit: '',
  floor: '',
  status: 'active',
};

const toInput = (v: TenantFormValues): TenantInput => ({
  building_id: v.building_id,
  name: v.name,
  code: v.code || null,
  tenant_type: v.tenant_type,
  contact_name: v.contact_name || null,
  contact_phone: v.contact_phone || null,
  contact_email: v.contact_email || null,
  suite_or_unit: v.suite_or_unit || null,
  floor: v.floor || null,
  status: v.status,
});

export function TenantForm({ visible, tenant, onClose, onDeleted }: Props) {
  const qc = useQueryClient();
  const [topError, setTopError] = useState<string | null>(null);

  const { data: buildings = [] } = useQuery({ queryKey: ['lookup-buildings'], queryFn: lookupBuildings });
  const buildingOptions = buildings.map((b) => ({ label: b.name, value: b.id }));

  const values = useMemo<TenantFormValues>(
    () =>
      tenant
        ? {
            building_id: tenant.building_id,
            name: tenant.name,
            code: tenant.code ?? '',
            tenant_type: tenant.tenant_type,
            contact_name: tenant.contact_name ?? '',
            contact_phone: tenant.contact_phone ?? '',
            contact_email: tenant.contact_email ?? '',
            suite_or_unit: tenant.suite_or_unit ?? '',
            floor: tenant.floor ?? '',
            status: tenant.status,
          }
        : EMPTY,
    // `visible` re-syncs the form (and clears stale input) each time it opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, tenant],
  );

  const { control, handleSubmit, setError } = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    values,
  });

  const mutation = useMutation({
    mutationFn: (v: TenantFormValues) =>
      tenant ? updateTenant(tenant.id, toInput(v)) : createTenant(toInput(v)),
    onMutate: () => setTopError(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants'] });
      if (tenant) qc.invalidateQueries({ queryKey: ['tenant', tenant.id] });
      onClose();
    },
    onError: (err) => {
      const api = toApiError(err);
      setTopError(api.status === 422 ? null : api.message);
      Object.entries(api.errors).forEach(([field, msgs]) => setError(field as keyof TenantFormValues, { message: msgs[0] }));
    },
  });

  return (
    <FormSheet
      visible={visible}
      onClose={onClose}
      title={tenant ? 'Edit tenant' : 'New tenant'}
      subtitle={tenant?.name}
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      submitting={mutation.isPending}
      submitLabel={tenant ? 'Save changes' : 'Create tenant'}
      error={topError}>
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField label="Name" required icon="tenants" placeholder="Tenant name" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
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
        name="tenant_type"
        render={({ field, fieldState }) => (
          <Select label="Tenant type" required value={field.value} options={TENANT_TYPES} onChange={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="code"
        render={({ field, fieldState }) => (
          <TextField label="Code" icon="tag" placeholder="T-101" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} autoCapitalize="characters" />
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
          <TextField label="Contact email" icon="mail" keyboardType="email-address" autoCapitalize="none" placeholder="name@tenant.com" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="suite_or_unit"
        render={({ field, fieldState }) => (
          <TextField label="Suite / unit" placeholder="Suite 101" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="floor"
        render={({ field, fieldState }) => (
          <TextField label="Floor" placeholder="3" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="status"
        render={({ field, fieldState }) => (
          <Select label="Status" required value={field.value} options={TENANT_STATUS} onChange={field.onChange} error={fieldState.error?.message} />
        )}
      />

      {tenant && onDeleted ? (
        <Button
          title="Delete tenant"
          variant="danger"
          icon="trash"
          onPress={async () => {
            const ok = await confirm({ title: 'Delete tenant?', message: `${tenant.name} will be removed.`, confirmLabel: 'Delete', destructive: true });
            if (!ok) return;
            try {
              await deleteTenant(tenant.id);
              qc.invalidateQueries({ queryKey: ['tenants'] });
              onClose();
              onDeleted();
            } catch (e) {
              const err = toApiError(e);
              setTopError(err.field('tenant') ?? err.message);
            }
          }}
        />
      ) : null}
    </FormSheet>
  );
}
