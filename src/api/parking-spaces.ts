import { api, toApiError, USE_FIXTURES } from './client';
import * as fx from './fixtures';
import type {
  ListParams,
  OccupancyGridResponse,
  Paginator,
  ParkingSpaceResource,
  SpaceDefaultUsage,
  SpaceOperationalStatus,
  SpaceType,
} from './types';

export const SPACE_PAGE_SIZE = 50;

export type ParkingSpaceInput = {
  parking_area_id: number;
  space_code: string;
  space_type: SpaceType;
  default_usage: SpaceDefaultUsage;
  operational_status: SpaceOperationalStatus;
  notes?: string | null;
};

export type BulkCreateInput = {
  parking_area_id: number;
  prefix: string;
  start_number: number;
  count: number;
  space_type: SpaceType;
  default_usage: SpaceDefaultUsage;
  operational_status: SpaceOperationalStatus;
};

export type BulkCreateResult = { created: number; skipped: number };

export async function listParkingSpaces(params: ListParams = {}): Promise<Paginator<ParkingSpaceResource>> {
  if (USE_FIXTURES) {
    const q = (params.search ?? '').toLowerCase();
    const rows = fx.parkingSpaceResources.filter(
      (s) =>
        (!params.parking_area_id || s.parking_area_id === Number(params.parking_area_id)) &&
        (!params.space_type || s.space_type === params.space_type) &&
        (!params.operational_status || s.operational_status === params.operational_status) &&
        (!q || s.space_code.toLowerCase().includes(q)),
    );
    return fx.delay(fx.paginate(rows, Number(params.page) || 1, SPACE_PAGE_SIZE));
  }
  try {
    const { data } = await api.get<Paginator<ParkingSpaceResource>>('/admin/parking-spaces', { params });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function getOccupancyGrid(params: {
  building_id?: number;
  parking_area_id?: number;
  occupancy_status?: string;
  operational_status?: string;
} = {}): Promise<OccupancyGridResponse> {
  if (USE_FIXTURES) {
    const spaces = fx.parkingSpaceResources.filter(
      (s) =>
        (!params.building_id || s.building_id === params.building_id) &&
        (!params.parking_area_id || s.parking_area_id === params.parking_area_id) &&
        (!params.occupancy_status || s.occupancy_status === params.occupancy_status) &&
        (!params.operational_status || s.operational_status === params.operational_status),
    );
    const areaIds = [...new Set(spaces.map((s) => s.parking_area_id))];
    const buildingIds = [...new Set(spaces.map((s) => s.building_id))];
    const total = spaces.length;
    const occupied = spaces.filter((s) => s.occupancy_status === 'occupied').length;
    const available = spaces.filter((s) => s.occupancy_status === 'available').length;
    const active = spaces.filter((s) => s.operational_status === 'active').length;
    const maintenance = spaces.filter((s) => s.operational_status === 'maintenance').length;
    const blocked = spaces.filter((s) => s.operational_status === 'blocked').length;
    const inactive = spaces.filter((s) => s.operational_status === 'inactive').length;
    return fx.delay({
      spaces,
      areas: fx.parkingAreaResources.filter((a) => areaIds.includes(a.id)).map((a) => ({ id: a.id, building_id: a.building_id, name: a.name })),
      buildings: fx.buildingResources.filter((b) => buildingIds.includes(b.id)).map((b) => ({ id: b.id, name: b.name })),
      summary: { total, available, occupied, active, maintenance, blocked, inactive },
    });
  }
  try {
    const { data } = await api.get<OccupancyGridResponse>('/admin/parking-spaces/occupancy-grid', { params });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function getParkingSpace(id: number): Promise<ParkingSpaceResource> {
  if (USE_FIXTURES) {
    const found = fx.parkingSpaceResources.find((s) => s.id === id);
    if (!found) throw toApiError({ response: { status: 404, data: { message: 'Parking space not found' } } });
    return fx.delay(found);
  }
  try {
    const { data } = await api.get<{ data: ParkingSpaceResource }>(`/admin/parking-spaces/${id}`);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function createParkingSpace(input: ParkingSpaceInput): Promise<ParkingSpaceResource> {
  if (USE_FIXTURES) {
    const area = fx.parkingAreaResources.find((a) => a.id === input.parking_area_id);
    const building = area ? fx.buildingResources.find((b) => b.id === area.building_id) : null;
    const space: ParkingSpaceResource = {
      id: fx.nextId(fx.parkingSpaceResources),
      building_id: area?.building_id ?? 0,
      parking_area_id: input.parking_area_id,
      space_code: input.space_code,
      space_type: input.space_type,
      default_usage: input.default_usage,
      operational_status: input.operational_status,
      occupancy_status: 'available',
      current_transaction_id: null,
      current_vehicle_id: null,
      occupied_since: null,
      sort_order: fx.parkingSpaceResources.length + 1,
      notes: input.notes ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      building: building ? { id: building.id, name: building.name } : undefined,
      parking_area: area ? { id: area.id, name: area.name } : undefined,
      current_transaction: null,
      current_vehicle: null,
    };
    fx.parkingSpaceResources.unshift(space);
    return fx.delay(space);
  }
  try {
    const { data } = await api.post<{ data: ParkingSpaceResource }>('/admin/parking-spaces', input);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function bulkCreateParkingSpaces(input: BulkCreateInput): Promise<BulkCreateResult> {
  if (USE_FIXTURES) {
    let created = 0;
    let skipped = 0;
    const area = fx.parkingAreaResources.find((a) => a.id === input.parking_area_id);
    const building = area ? fx.buildingResources.find((b) => b.id === area.building_id) : null;
    for (let i = 0; i < input.count; i++) {
      const code = `${input.prefix}${String(input.start_number + i).padStart(2, '0')}`;
      const exists = fx.parkingSpaceResources.some((s) => s.parking_area_id === input.parking_area_id && s.space_code === code);
      if (exists) { skipped++; continue; }
      fx.parkingSpaceResources.push({
        id: fx.nextId(fx.parkingSpaceResources),
        building_id: area?.building_id ?? 0,
        parking_area_id: input.parking_area_id,
        space_code: code,
        space_type: input.space_type,
        default_usage: input.default_usage,
        operational_status: input.operational_status,
        occupancy_status: 'available',
        current_transaction_id: null,
        current_vehicle_id: null,
        occupied_since: null,
        sort_order: fx.parkingSpaceResources.length + 1,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        building: building ? { id: building.id, name: building.name } : undefined,
        parking_area: area ? { id: area.id, name: area.name } : undefined,
        current_transaction: null,
        current_vehicle: null,
      });
      created++;
    }
    return fx.delay({ created, skipped });
  }
  try {
    const { data } = await api.post<BulkCreateResult>('/admin/parking-spaces/bulk', input);
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function updateParkingSpace(id: number, input: ParkingSpaceInput): Promise<ParkingSpaceResource> {
  if (USE_FIXTURES) {
    const idx = fx.parkingSpaceResources.findIndex((s) => s.id === id);
    if (idx < 0) throw toApiError({ response: { status: 404, data: { message: 'Parking space not found' } } });
    fx.parkingSpaceResources[idx] = { ...fx.parkingSpaceResources[idx], ...input, updated_at: new Date().toISOString() };
    return fx.delay(fx.parkingSpaceResources[idx]);
  }
  try {
    const { data } = await api.put<{ data: ParkingSpaceResource }>(`/admin/parking-spaces/${id}`, input);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function deleteParkingSpace(id: number): Promise<void> {
  if (USE_FIXTURES) {
    const idx = fx.parkingSpaceResources.findIndex((s) => s.id === id);
    if (idx >= 0) fx.parkingSpaceResources.splice(idx, 1);
    await fx.delay(null);
    return;
  }
  try {
    await api.delete(`/admin/parking-spaces/${id}`);
  } catch (e) {
    throw toApiError(e);
  }
}
