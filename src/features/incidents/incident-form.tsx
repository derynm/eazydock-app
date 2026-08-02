import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { toApiError } from '@/api/client';
import { createIncident, updateIncident, type IncidentInput, type IncidentUpdateInput } from '@/api/incidents';
import { incidentSchema, type IncidentForm as IncidentFormValues } from '@/api/schemas';
import type { Incident } from '@/api/types';
import { FormSheet } from '@/components/form-sheet';
import { Select, TextField } from '@/components/ui';
import { INCIDENT_STATUS, INCIDENT_TYPES } from '@/lib/options';
import { zodResolver } from '@/lib/zod-resolver';

type Props = { visible: boolean; incident: Incident | null; onClose: () => void };

const EMPTY: IncidentFormValues = {
  parking_transaction_id: null,
  parking_space_id: null,
  incident_type: 'other',
  description: '',
  status: 'open',
};

export function IncidentForm({ visible, incident, onClose }: Props) {
  const qc = useQueryClient();
  const [topError, setTopError] = useState<string | null>(null);

  const values = useMemo<IncidentFormValues>(
    () =>
      incident
        ? {
            parking_transaction_id: incident.parking_transaction_id,
            parking_space_id: incident.parking_space_id,
            incident_type: incident.incident_type,
            description: incident.description,
            status: incident.status,
          }
        : EMPTY,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, incident],
  );

  const { control, handleSubmit, reset, setError } = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentSchema),
    values,
  });

  const mutation = useMutation({
    mutationFn: (v: IncidentFormValues) => {
      if (incident) {
        const update: IncidentUpdateInput = {
          incident_type: v.incident_type,
          description: v.description,
          status: v.status ?? incident.status,
        };
        return updateIncident(incident.id, update);
      }
      const input: IncidentInput = {
        parking_transaction_id: v.parking_transaction_id,
        parking_space_id: v.parking_space_id,
        incident_type: v.incident_type,
        description: v.description,
      };
      return createIncident(input);
    },
    onMutate: () => setTopError(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      if (incident) qc.invalidateQueries({ queryKey: ['incident', incident.id] });
      onClose();
    },
    onError: (err) => {
      const api = toApiError(err);
      setTopError(api.status === 422 ? null : api.message);
      Object.entries(api.errors).forEach(([field, msgs]) => setError(field as keyof IncidentFormValues, { message: msgs[0] }));
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
      title={incident ? 'Edit incident' : 'Report incident'}
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      submitting={mutation.isPending}
      submitLabel={incident ? 'Save changes' : 'Report incident'}
      error={topError}>
      <Controller
        control={control}
        name="incident_type"
        render={({ field, fieldState }) => (
          <Select label="Incident type" required value={field.value} options={INCIDENT_TYPES} onChange={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field, fieldState }) => (
          <TextField
            label="Description"
            required
            multiline
            placeholder="Describe the incident in detail…"
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
            style={{ minHeight: 96, textAlignVertical: 'top' }}
          />
        )}
      />
      {incident ? (
        <Controller
          control={control}
          name="status"
          render={({ field, fieldState }) => (
            <Select label="Status" required value={field.value ?? 'open'} options={INCIDENT_STATUS} onChange={field.onChange} error={fieldState.error?.message} />
          )}
        />
      ) : null}
    </FormSheet>
  );
}
