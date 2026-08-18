import type { ImagePickerAsset } from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { api, toApiError, USE_FIXTURES } from './client';
import * as fx from './fixtures';
import type {
  Incident,
  IncidentAction,
  IncidentFormData,
  IncidentListResponse,
  IncidentNote,
  IncidentSeverity,
  IncidentStatus,
  IncidentSubmissionState,
  IncidentTransactionOption,
  IncidentType,
  IncidentVehicle,
  IncidentWitness,
  ListParams,
} from './types';

export type IncidentInput = {
  submission_state: IncidentSubmissionState;
  parking_transaction_id?: number | null;
  building_id?: number | null;
  parking_area_id?: number | null;
  parking_space_id?: number | null;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  occurred_at: string;
  description: string;
  location_details?: string | null;
  weather?: string | null;
  shift?: string | null;
  vehicles?: Omit<IncidentVehicle, 'id'>[];
  witnesses?: Omit<IncidentWitness, 'id'>[];
};

export type IncidentUpdateInput = Partial<Omit<IncidentInput, 'submission_state'>>;

export type IncidentListParams = ListParams & {
  severity?: IncidentSeverity;
  incident_type?: IncidentType;
  building_id?: number;
  parking_area_id?: number;
  date_from?: string;
  date_to?: string;
};

const EVIDENCE_WEBP_QUALITY = 0.85;

async function convertEvidenceToWebp(asset: ImagePickerAsset): Promise<ImagePickerAsset> {
  if (asset.mimeType === 'image/webp' && asset.fileName?.toLowerCase().endsWith('.webp')) return asset;
  const rendered = await ImageManipulator.manipulate(asset.uri).renderAsync();
  const converted = await rendered.saveAsync({
    compress: EVIDENCE_WEBP_QUALITY,
    format: SaveFormat.WEBP,
    base64: false,
  });
  const originalName = asset.fileName?.replace(/\.[^.]+$/, '') || `incident-evidence-${Date.now()}`;
  return {
    ...asset,
    uri: converted.uri,
    width: converted.width,
    height: converted.height,
    fileName: `${originalName}.webp`,
    fileSize: undefined,
    mimeType: 'image/webp',
  };
}

const labels = (values: readonly string[]) => values.map((value) => ({
  value,
  label: value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
}));

function fixtureFormData(): IncidentFormData {
  return {
    incident_types: labels(['damage', 'vehicle_collision', 'illegal_parking', 'loading_dock_issue', 'unauthorised_vehicle', 'overstay', 'blocked_space', 'safety', 'other']) as IncidentFormData['incident_types'],
    severities: labels(['critical', 'high', 'medium', 'low']) as IncidentFormData['severities'],
    statuses: labels(['open', 'investigating', 'resolved', 'cancelled']) as IncidentFormData['statuses'],
    action_presets: labels(['security_notified', 'driver_notified', 'manager_notified', 'photos_taken', 'area_inspected', 'incident_recorded']),
    buildings: fx.buildingResources.map(({ id, name, code }) => ({ id, name, code })),
    parking_areas: fx.parkingAreaResources.map(({ id, building_id, name, code }) => ({ id, building_id, name, code })),
    parking_spaces: fx.parkingSpaceResources.map(({ id, building_id, parking_area_id, space_code }) => ({ id, building_id, parking_area_id, space_code })),
    evidence_limits: { max_files: 6, max_size_kb: 10_240, mime_types: ['image/jpeg', 'image/png', 'image/webp'] },
  };
}

export async function listIncidents(params: IncidentListParams = {}): Promise<IncidentListResponse> {
  if (USE_FIXTURES) {
    const query = params.search?.trim().toLowerCase();
    const summaryRows = fx.incidents.filter((incident) => {
      const draftMatches = params.status === 'draft' ? incident.is_draft : !params.status || incident.status === params.status;
      const haystack = [incident.incident_no, incident.description, incident.location_details, incident.parking_area?.name, incident.vehicles?.map((v) => `${v.plate_number} ${v.driver_name}`).join(' ')].join(' ').toLowerCase();
      return draftMatches &&
        (!params.incident_type || incident.incident_type === params.incident_type) &&
        (!params.building_id || incident.building_id === Number(params.building_id)) &&
        (!params.parking_area_id || incident.parking_area_id === Number(params.parking_area_id)) &&
        (!params.date_from || incident.occurred_at.slice(0, 10) >= params.date_from) &&
        (!params.date_to || incident.occurred_at.slice(0, 10) <= params.date_to) &&
        (!query || haystack.includes(query));
    }).filter((incident) => !incident.is_draft);
    const rows = fx.incidents.filter((incident) => {
      const draftMatches = params.status === 'draft' ? incident.is_draft : !params.status || incident.status === params.status;
      const haystack = [incident.incident_no, incident.description, incident.location_details, incident.parking_area?.name, incident.vehicles?.map((v) => `${v.plate_number} ${v.driver_name}`).join(' ')].join(' ').toLowerCase();
      return draftMatches &&
        (!params.incident_type || incident.incident_type === params.incident_type) &&
        (!params.severity || incident.severity === params.severity) &&
        (!params.building_id || incident.building_id === Number(params.building_id)) &&
        (!params.parking_area_id || incident.parking_area_id === Number(params.parking_area_id)) &&
        (!params.date_from || incident.occurred_at.slice(0, 10) >= params.date_from) &&
        (!params.date_to || incident.occurred_at.slice(0, 10) <= params.date_to) &&
        (!query || haystack.includes(query));
    });
    const summary = {
      critical: summaryRows.filter((i) => i.severity === 'critical').length,
      high: summaryRows.filter((i) => i.severity === 'high').length,
      medium: summaryRows.filter((i) => i.severity === 'medium').length,
      low: summaryRows.filter((i) => i.severity === 'low').length,
      total: summaryRows.length,
    };
    return fx.delay({ ...fx.paginate(rows, Number(params.page) || 1), summary, filters: { date_from: params.date_from, date_to: params.date_to } });
  }
  try {
    const { data } = await api.get<IncidentListResponse>('/admin/parking-incidents', { params });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getIncidentFormData(): Promise<IncidentFormData> {
  if (USE_FIXTURES) return fx.delay(fixtureFormData());
  try {
    const { data } = await api.get<IncidentFormData>('/admin/parking-incidents/form-data');
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function searchIncidentTransactions(search = '', parkingAreaId?: number): Promise<IncidentTransactionOption[]> {
  if (USE_FIXTURES) {
    const query = search.trim().toLowerCase();
    return fx.delay(fx.transactions
      .filter((transaction) => (!parkingAreaId || transaction.parking_area_id === parkingAreaId) && (!query || [transaction.transaction_no, transaction.vehicle?.plate_number, transaction.driver?.full_name].join(' ').toLowerCase().includes(query)))
      .slice(0, 50)
      .map((transaction) => ({
        id: transaction.id,
        transaction_no: transaction.transaction_no,
        status: transaction.status,
        car_in_at: transaction.car_in_at ?? transaction.created_at,
        building: transaction.building ? { ...transaction.building, code: null } : null,
        parking_area: transaction.parking_area ? { ...transaction.parking_area, code: null } : null,
        parking_space: transaction.parking_space ?? null,
        vehicle: transaction.vehicle ? { id: transaction.vehicle.id, plate_number: transaction.vehicle.plate_number, vehicle_type: fx.vehicles.find((item) => item.id === transaction.vehicle?.id)?.vehicle_type ?? null } : null,
        driver: transaction.driver ? { id: transaction.driver.id, full_name: transaction.driver.full_name, phone: transaction.driver.phone ?? null, company_name: transaction.driver.company_name ?? null } : null,
      })));
  }
  try {
    const { data } = await api.get<{ transactions: IncidentTransactionOption[] }>('/admin/parking-incidents/transaction-options', { params: { search: search || undefined, parking_area_id: parkingAreaId } });
    return data.transactions;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getIncident(id: number): Promise<Incident> {
  if (USE_FIXTURES) {
    const found = fx.incidents.find((incident) => incident.id === id);
    if (!found) throw toApiError({ response: { status: 404, data: { message: 'Incident not found' } } });
    return fx.delay(found);
  }
  try {
    const { data } = await api.get<{ data: Incident }>(`/admin/parking-incidents/${id}`);
    return data.data;
  } catch (error) {
    throw toApiError(error);
  }
}

function fixtureIncident(input: IncidentInput): Incident {
  const transaction = input.parking_transaction_id ? fx.transactions.find((item) => item.id === input.parking_transaction_id) : null;
  const areaId = transaction?.parking_area_id ?? input.parking_area_id ?? null;
  const area = fx.parkingAreaResources.find((item) => item.id === areaId);
  const buildingId = transaction?.building_id ?? input.building_id ?? area?.building_id ?? null;
  const building = fx.buildingResources.find((item) => item.id === buildingId);
  const spaceId = transaction?.parking_space_id ?? input.parking_space_id ?? null;
  const space = fx.parkingSpaceResources.find((item) => item.id === spaceId);
  const now = new Date().toISOString();
  const submitted = input.submission_state === 'submitted';
  const id = fx.nextId(fx.incidents);
  const reportingVehicle = transaction?.vehicle ? [{
    role: 'reporting' as const,
    vehicle_id: transaction.vehicle.id,
    driver_id: transaction.driver?.id ?? null,
    plate_number: transaction.vehicle.plate_number,
    driver_name: transaction.driver?.full_name ?? null,
    driver_contact: transaction.driver?.phone ?? null,
    company_name: transaction.driver?.company_name ?? null,
    vehicle_type: fx.vehicles.find((item) => item.id === transaction.vehicle?.id)?.vehicle_type ?? null,
  }] : [];
  return {
    id,
    incident_no: submitted ? `INC-2026-${String(id).padStart(5, '0')}` : null,
    parking_transaction_id: transaction?.id ?? null,
    building_id: buildingId,
    parking_area_id: areaId,
    parking_space_id: spaceId,
    incident_type: input.incident_type,
    severity: input.severity,
    occurred_at: input.occurred_at,
    submitted_at: submitted ? now : null,
    is_draft: !submitted,
    location_details: input.location_details ?? null,
    weather: input.weather ?? null,
    shift: input.shift ?? null,
    description: input.description,
    status: 'open',
    reported_by: 1,
    resolved_by: null,
    resolved_at: null,
    created_at: now,
    updated_at: now,
    parking_transaction: transaction ? { id: transaction.id, transaction_no: transaction.transaction_no } : null,
    building: building ? { id: building.id, name: building.name, code: building.code } : null,
    parking_area: area ? { id: area.id, name: area.name, code: area.code } : null,
    parking_space: space ? { id: space.id, space_code: space.space_code } : null,
    reporter: { id: 1, name: 'Jordan Avery' },
    resolver: null,
    vehicles: [...reportingVehicle, ...(input.vehicles ?? [])].map((item, index) => ({ ...item, id: index + 1 })),
    witnesses: (input.witnesses ?? []).map((item, index) => ({ ...item, id: index + 1 })),
    evidence: [],
    actions: submitted ? [{ id: 1, action_type: 'incident_recorded', label: 'Incident recorded', notes: null, occurred_at: now, performed_by: 1, performer: { id: 1, name: 'Jordan Avery' } }] : [],
    notes: [],
  };
}

export async function createIncident(input: IncidentInput): Promise<Incident> {
  if (USE_FIXTURES) {
    const incident = fixtureIncident(input);
    fx.incidents.unshift(incident);
    return fx.delay(incident);
  }
  try {
    const { data } = await api.post<{ data: Incident }>('/admin/parking-incidents', input);
    return data.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function updateIncident(id: number, input: IncidentUpdateInput): Promise<Incident> {
  if (USE_FIXTURES) {
    const index = fx.incidents.findIndex((item) => item.id === id);
    if (index < 0) throw toApiError({ response: { status: 404, data: { message: 'Incident not found' } } });
    fx.incidents[index] = { ...fx.incidents[index], ...input, updated_at: new Date().toISOString() } as Incident;
    return fx.delay(fx.incidents[index]);
  }
  try {
    const { data } = await api.put<{ data: Incident }>(`/admin/parking-incidents/${id}`, input);
    return data.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function submitIncident(id: number): Promise<Incident> {
  if (USE_FIXTURES) {
    const incident = await getIncident(id);
    const now = new Date().toISOString();
    incident.is_draft = false;
    incident.submitted_at = now;
    incident.incident_no = `INC-2026-${String(id).padStart(5, '0')}`;
    incident.actions = [...(incident.actions ?? []), { id: (incident.actions?.length ?? 0) + 1, action_type: 'incident_recorded', label: 'Incident recorded', notes: null, occurred_at: now, performed_by: 1, performer: { id: 1, name: 'Jordan Avery' } }];
    return fx.delay(incident);
  }
  try {
    const { data } = await api.post<{ data: Incident }>(`/admin/parking-incidents/${id}/submit`);
    return data.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function changeIncidentStatus(id: number, status: IncidentStatus): Promise<Incident> {
  if (USE_FIXTURES) {
    const incident = await getIncident(id);
    const now = new Date().toISOString();
    Object.assign(incident, { status, resolved_by: status === 'resolved' ? 1 : null, resolved_at: status === 'resolved' ? now : null, resolver: status === 'resolved' ? { id: 1, name: 'Jordan Avery' } : null, updated_at: now });
    return fx.delay(incident);
  }
  try {
    const { data } = await api.post<{ data: Incident }>(`/admin/parking-incidents/${id}/status`, { status });
    return data.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function uploadIncidentEvidence(id: number, asset: ImagePickerAsset): Promise<void> {
  const webpAsset = await convertEvidenceToWebp(asset);
  if (USE_FIXTURES) {
    const incident = await getIncident(id);
    const evidenceId = (incident.evidence?.reduce((max, item) => Math.max(max, item.id), 0) ?? 0) + 1;
    incident.evidence = [...(incident.evidence ?? []), { id: evidenceId, original_name: webpAsset.fileName ?? `evidence-${evidenceId}.webp`, mime_type: 'image/webp', size_bytes: webpAsset.fileSize ?? 0, captured_at: new Date().toISOString(), uploaded_by: 1, download_url: webpAsset.uri }];
    if (!(incident.actions ?? []).some((action) => action.action_type === 'photos_taken')) {
      incident.actions = [...(incident.actions ?? []), { id: (incident.actions?.length ?? 0) + 1, action_type: 'photos_taken', label: 'Photos taken', notes: null, occurred_at: new Date().toISOString(), performed_by: 1, performer: { id: 1, name: 'Jordan Avery' } }];
    }
    await fx.delay(null);
    return;
  }
  const form = new FormData();
  form.append('file', { uri: webpAsset.uri, name: webpAsset.fileName ?? 'incident-evidence.webp', type: 'image/webp' } as never);
  form.append('captured_at', new Date().toISOString());
  try {
    await api.post(`/admin/parking-incidents/${id}/evidence`, form);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function removeIncidentEvidence(id: number, evidenceId: number): Promise<void> {
  if (USE_FIXTURES) {
    const incident = await getIncident(id);
    incident.evidence = (incident.evidence ?? []).filter((item) => item.id !== evidenceId);
    await fx.delay(null);
    return;
  }
  try {
    await api.delete(`/admin/parking-incidents/${id}/evidence/${evidenceId}`);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getIncidentEvidenceBytes(id: number, evidenceId: number): Promise<ArrayBuffer> {
  try {
    const { data } = await api.get<ArrayBuffer>(`/admin/parking-incidents/${id}/evidence/${evidenceId}`, { responseType: 'arraybuffer' });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function addIncidentAction(id: number, input: { action_type: string; label?: string; notes?: string | null; occurred_at?: string }): Promise<IncidentAction> {
  if (USE_FIXTURES) {
    const incident = await getIncident(id);
    const action: IncidentAction = { id: (incident.actions?.length ?? 0) + 1, action_type: input.action_type, label: input.label ?? labels([input.action_type])[0].label, notes: input.notes ?? null, occurred_at: input.occurred_at ?? new Date().toISOString(), performed_by: 1, performer: { id: 1, name: 'Jordan Avery' } };
    incident.actions = [...(incident.actions ?? []), action];
    return fx.delay(action);
  }
  try {
    const { data } = await api.post<{ data: IncidentAction }>(`/admin/parking-incidents/${id}/actions`, input);
    return data.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function addIncidentNote(id: number, body: string): Promise<IncidentNote> {
  if (USE_FIXTURES) {
    const incident = await getIncident(id);
    const note: IncidentNote = { id: (incident.notes?.length ?? 0) + 1, body, created_at: new Date().toISOString(), created_by: 1, author: { id: 1, name: 'Jordan Avery' } };
    incident.notes = [...(incident.notes ?? []), note];
    return fx.delay(note);
  }
  try {
    const { data } = await api.post<{ data: IncidentNote }>(`/admin/parking-incidents/${id}/notes`, { body });
    return data.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getIncidentPdf(id: number): Promise<{ bytes: ArrayBuffer; filename: string }> {
  if (USE_FIXTURES) {
    const content = '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF';
    return fx.delay({ bytes: new TextEncoder().encode(content).buffer, filename: `incident-${id}.pdf` });
  }
  try {
    const response = await api.get<ArrayBuffer>(`/admin/parking-incidents/${id}/pdf`, { responseType: 'arraybuffer' });
    const disposition = String(response.headers['content-disposition'] ?? '');
    const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? `incident-${id}.pdf`;
    return { bytes: response.data, filename };
  } catch (error) {
    throw toApiError(error);
  }
}
