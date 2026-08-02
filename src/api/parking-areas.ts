import { api, toApiError, USE_FIXTURES } from './client';
import * as fx from './fixtures';
import type { AreaStatus, AreaType, ListParams, OperatingDay, Paginator, ParkingAreaResource } from './types';

export type ParkingAreaInput = {
  building_id: number;
  name: string;
  code?: string | null;
  level?: string | null;
  area_type: AreaType;
  capacity: number;
  status: AreaStatus;
  notes?: string | null;
  inherits_building_operating_schedule: boolean;
  operating_start_time?: string | null;
  operating_end_time?: string | null;
  operating_days?: OperatingDay[] | null;
  parking_time_limit_minutes?: number | null;
};

export async function listParkingAreas(params: ListParams = {}): Promise<Paginator<ParkingAreaResource>> {
  if (USE_FIXTURES) {
    const q = (params.search ?? '').toLowerCase();
    const rows = fx.parkingAreaResources.filter(
      (a) =>
        (!params.status || a.status === params.status) &&
        (!params.building_id || a.building_id === Number(params.building_id)) &&
        (!q || a.name.toLowerCase().includes(q) || (a.code ?? '').toLowerCase().includes(q)),
    );
    return fx.delay(fx.paginate(rows, Number(params.page) || 1));
  }
  try {
    const { data } = await api.get<Paginator<ParkingAreaResource>>('/admin/parking-areas', { params });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function listAllParkingAreasForBuilding(buildingId: number): Promise<ParkingAreaResource[]> {
  const rows: ParkingAreaResource[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    const response = await listParkingAreas({ building_id: buildingId, page });
    rows.push(...response.data);
    lastPage = response.meta.last_page;
    page += 1;
  } while (page <= lastPage);
  return rows;
}

export async function getParkingArea(id: number): Promise<ParkingAreaResource> {
  if (USE_FIXTURES) {
    const found = fx.parkingAreaResources.find((a) => a.id === id);
    if (!found) throw toApiError({ response: { status: 404, data: { message: 'Parking area not found' } } });
    return fx.delay(found);
  }
  try {
    const { data } = await api.get<{ data: ParkingAreaResource }>(`/admin/parking-areas/${id}`);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function createParkingArea(input: ParkingAreaInput): Promise<ParkingAreaResource> {
  if (USE_FIXTURES) {
    const building = fx.buildingResources.find((b) => b.id === input.building_id);
    const area: ParkingAreaResource = {
      id: fx.nextId(fx.parkingAreaResources),
      building_id: input.building_id,
      name: input.name,
      code: input.code ?? null,
      level: input.level ?? null,
      area_type: input.area_type,
      capacity: input.capacity,
      status: input.status,
      notes: input.notes ?? null,
      inherits_building_operating_schedule: input.inherits_building_operating_schedule,
      operating_start_time: input.operating_start_time ?? null,
      operating_end_time: input.operating_end_time ?? null,
      operating_days: input.operating_days ?? null,
      parking_time_limit_minutes: input.parking_time_limit_minutes ?? null,
      effective_operating_start_time: input.inherits_building_operating_schedule ? building?.operating_start_time ?? null : input.operating_start_time ?? null,
      effective_operating_end_time: input.inherits_building_operating_schedule ? building?.operating_end_time ?? null : input.operating_end_time ?? null,
      effective_operating_days: input.inherits_building_operating_schedule ? building?.operating_days ?? [] : input.operating_days ?? [],
      effective_parking_time_limit_minutes: input.inherits_building_operating_schedule ? building?.parking_time_limit_minutes ?? null : input.parking_time_limit_minutes ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      building: building ? { id: building.id, name: building.name } : undefined,
    };
    fx.parkingAreaResources.unshift(area);
    return fx.delay(area);
  }
  try {
    const { data } = await api.post<{ data: ParkingAreaResource }>('/admin/parking-areas', input);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function updateParkingArea(id: number, input: ParkingAreaInput): Promise<ParkingAreaResource> {
  if (USE_FIXTURES) {
    const idx = fx.parkingAreaResources.findIndex((a) => a.id === id);
    if (idx < 0) throw toApiError({ response: { status: 404, data: { message: 'Parking area not found' } } });
    const building = fx.buildingResources.find((b) => b.id === input.building_id);
    fx.parkingAreaResources[idx] = {
      ...fx.parkingAreaResources[idx],
      ...input,
      building: building ? { id: building.id, name: building.name } : fx.parkingAreaResources[idx].building,
      updated_at: new Date().toISOString(),
    };
    const updated = fx.parkingAreaResources[idx];
    updated.effective_operating_start_time = input.inherits_building_operating_schedule ? building?.operating_start_time ?? null : input.operating_start_time ?? null;
    updated.effective_operating_end_time = input.inherits_building_operating_schedule ? building?.operating_end_time ?? null : input.operating_end_time ?? null;
    updated.effective_operating_days = input.inherits_building_operating_schedule ? building?.operating_days ?? [] : input.operating_days ?? [];
    updated.effective_parking_time_limit_minutes = input.inherits_building_operating_schedule ? building?.parking_time_limit_minutes ?? null : input.parking_time_limit_minutes ?? null;
    return fx.delay(fx.parkingAreaResources[idx]);
  }
  try {
    const { data } = await api.put<{ data: ParkingAreaResource }>(`/admin/parking-areas/${id}`, input);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function deleteParkingArea(id: number): Promise<void> {
  if (USE_FIXTURES) {
    const idx = fx.parkingAreaResources.findIndex((a) => a.id === id);
    if (idx >= 0) fx.parkingAreaResources.splice(idx, 1);
    await fx.delay(null);
    return;
  }
  try {
    await api.delete(`/admin/parking-areas/${id}`);
  } catch (e) {
    throw toApiError(e);
  }
}
