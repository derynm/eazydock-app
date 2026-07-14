import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { toApiError } from '@/api/client';
import { lookupRoles } from '@/api/lookups';
import { userCreateSchema, userUpdateSchema, type UserCreateForm, type UserUpdateForm } from '@/api/schemas';
import type { UserResource } from '@/api/types';
import { createUser, updateUser } from '@/api/users';
import { FormSheet } from '@/components/form-sheet';
import { Select, TextField } from '@/components/ui';
import { USER_STATUS } from '@/lib/options';
import { zodResolver } from '@/lib/zod-resolver';

type Props = { visible: boolean; user: UserResource | null; onClose: () => void };

const EMPTY_CREATE: UserCreateForm = { name: '', email: '', password: '', role_id: 0, status: 'active' };
const EMPTY_UPDATE: UserUpdateForm = { name: '', email: '', role_id: 0, status: 'active' };

export function UserForm({ visible, user, onClose }: Props) {
  const qc = useQueryClient();
  const [topError, setTopError] = useState<string | null>(null);

  const { data: roles = [] } = useQuery({ queryKey: ['lookup-roles'], queryFn: lookupRoles });
  const roleOptions = roles.map((r) => ({ label: r.name, value: r.id }));

  const isEdit = !!user;
  const cu = user?.company_users[0];

  const createValues = useMemo<UserCreateForm>(
    () => (user ? { name: user.name, email: user.email, password: '', role_id: cu?.role_id ?? 0, status: cu?.status ?? 'active' } : EMPTY_CREATE),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, user],
  );
  const updateValues = useMemo<UserUpdateForm>(
    () => (user ? { name: user.name, email: user.email, role_id: cu?.role_id ?? 0, status: cu?.status ?? 'active' } : EMPTY_UPDATE),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, user],
  );

  const createForm = useForm<UserCreateForm>({ resolver: zodResolver(userCreateSchema), values: createValues });
  const updateForm = useForm<UserUpdateForm>({ resolver: zodResolver(userUpdateSchema), values: updateValues });

  const { control, handleSubmit, setError } = isEdit
    ? (updateForm as unknown as typeof createForm)
    : createForm;

  const mutation = useMutation({
    mutationFn: (v: UserCreateForm | UserUpdateForm) => {
      if (user) return updateUser(user.id, v as UserUpdateForm);
      return createUser(v as UserCreateForm);
    },
    onMutate: () => setTopError(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      if (user) qc.invalidateQueries({ queryKey: ['user', user.id] });
      onClose();
    },
    onError: (err) => {
      const api = toApiError(err);
      setTopError(api.status === 422 ? null : api.message);
      Object.entries(api.errors).forEach(([f, msgs]) => setError(f as never, { message: msgs[0] }));
    },
  });

  return (
    <FormSheet
      visible={visible}
      onClose={onClose}
      title={user ? 'Edit user' : 'Invite user'}
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      submitting={mutation.isPending}
      submitLabel={user ? 'Save changes' : 'Create user'}
      error={topError}>
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField label="Full name" required placeholder="Jane Smith" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField label="Email" required placeholder="jane@company.com" autoCapitalize="none" keyboardType="email-address" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      {!isEdit ? (
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <TextField label="Password" required secure placeholder="••••••••" value={(field.value as string) ?? ''} onChangeText={field.onChange} error={fieldState.error?.message} />
          )}
        />
      ) : null}
      <Controller
        control={control}
        name="role_id"
        render={({ field, fieldState }) => (
          <Select label="Role" required value={field.value} options={roleOptions} onChange={(v) => field.onChange(v as number)} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="status"
        render={({ field, fieldState }) => (
          <Select label="Status" required value={field.value} options={USER_STATUS} onChange={field.onChange} error={fieldState.error?.message} />
        )}
      />
    </FormSheet>
  );
}
