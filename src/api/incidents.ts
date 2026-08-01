import { api, toApiError, USE_FIXTURES } from './client';
import * as fx from './fixtures';
import type { Incident, IncidentStatus, IncidentType, ListParams, Paginator } from './types';

export type IncidentInput = {
  parking_transaction_id?: number | null;
  parking_space_id?: number | null;
  incident_type: IncidentType;
  description: string;
};

export type IncidentUpdateInput = {
  incident_type: IncidentType;
  description: string;
  status: IncidentStatus;
};

export async function listIncidents(params: ListParams = {}): Promise<Paginator<Incident>> {
  if (USE_FIXTURES) {
    const dateFrom = params.date_from ? String(params.date_from) : null;
    const dateTo = params.date_to ? String(params.date_to) : null;
    const rows = fx.incidents.filter(
      (i) =>
        (!params.status || i.status === params.status) &&
        (!params.incident_type || i.incident_type === params.incident_type) &&
        (!dateFrom || i.created_at.slice(0, 10) >= dateFrom) &&
        (!dateTo || i.created_at.slice(0, 10) <= dateTo),
    );
    return fx.delay(fx.paginate(rows, Number(params.page) || 1));
  }
  try {
    const { data } = await api.get<Paginator<Incident>>('/admin/parking-incidents', { params });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function getIncident(id: number): Promise<Incident> {
  if (USE_FIXTURES) {
    const found = fx.incidents.find((i) => i.id === id);
    if (!found) throw toApiError({ response: { status: 404, data: { message: 'Incident not found' } } });
    return fx.delay(found);
  }
  try {
    const { data } = await api.get<{ data: Incident }>(`/admin/parking-incidents/${id}`);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function createIncident(input: IncidentInput): Promise<Incident> {
  if (USE_FIXTURES) {
    const txn = input.parking_transaction_id ? fx.transactions.find((t) => t.id === input.parking_transaction_id) : null;
    const space = input.parking_space_id ? fx.parkingSpaceResources.find((s) => s.id === input.parking_space_id) : null;
    const incident: Incident = {
      id: fx.nextId(fx.incidents),
      parking_transaction_id: input.parking_transaction_id ?? null,
      parking_space_id: input.parking_space_id ?? null,
      incident_type: input.incident_type,
      description: input.description,
      status: 'open',
      reported_by: 1,
      resolved_by: null,
      resolved_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      parking_transaction: txn ? { id: txn.id, transaction_no: txn.transaction_no } : null,
      parking_space: space ? { id: space.id, space_code: space.space_code } : null,
      reporter: { id: 1, name: 'Jordan Avery' },
    };
    fx.incidents.unshift(incident);
    return fx.delay(incident);
  }
  try {
    const { data } = await api.post<{ data: Incident }>('/admin/parking-incidents', input);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function updateIncident(id: number, input: IncidentUpdateInput): Promise<Incident> {
  if (USE_FIXTURES) {
    const idx = fx.incidents.findIndex((i) => i.id === id);
    if (idx < 0) throw toApiError({ response: { status: 404, data: { message: 'Incident not found' } } });
    const nowIso = new Date().toISOString();
    const resolved = input.status === 'resolved';
    fx.incidents[idx] = {
      ...fx.incidents[idx],
      incident_type: input.incident_type,
      description: input.description,
      status: input.status,
      resolved_by: resolved ? 1 : fx.incidents[idx].resolved_by,
      resolved_at: resolved ? nowIso : fx.incidents[idx].resolved_at,
      updated_at: nowIso,
    };
    return fx.delay(fx.incidents[idx]);
  }
  try {
    const { data } = await api.put<{ data: Incident }>(`/admin/parking-incidents/${id}`, input);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}
