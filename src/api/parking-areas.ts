import { api, toApiError, USE_FIXTURES } from './client';
import * as fx from './fixtures';
import type { AreaStatus, AreaType, ListParams, Paginator, ParkingAreaResource } from './types';

export type ParkingAreaInput = {
  building_id: number;
  name: string;
  code?: string | null;
  level?: string | null;
  area_type: AreaType;
  capacity: number;
  status: AreaStatus;
  notes?: string | null;
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
