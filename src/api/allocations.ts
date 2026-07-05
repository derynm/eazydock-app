import { api, toApiError, USE_FIXTURES } from './client';
import * as fx from './fixtures';
import type { Allocation, AllocationType, ListParams, Paginator, UserCategory } from './types';

export type AllocationInput = {
  building_id: number;
  tenant_id?: number | null;
  parking_area_id?: number | null;
  allocation_type: AllocationType;
  user_category: UserCategory;
  quota: number;
  release_after_minutes?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  status: 'active' | 'inactive' | 'expired';
  notes?: string | null;
};

export async function listAllocations(params: ListParams = {}): Promise<Paginator<Allocation>> {
  if (USE_FIXTURES) {
    const rows = fx.allocations.filter(
      (a) =>
        (!params.building_id || a.building_id === Number(params.building_id)) &&
        (!params.tenant_id || a.tenant_id === Number(params.tenant_id)) &&
        (!params.allocation_type || a.allocation_type === params.allocation_type) &&
        (!params.status || a.status === params.status),
    );
    return fx.delay(fx.paginate(rows, Number(params.page) || 1));
  }
  try {
    const { data } = await api.get<Paginator<Allocation>>('/admin/parking-allocations', { params });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function getAllocation(id: number): Promise<Allocation> {
  if (USE_FIXTURES) {
    const found = fx.allocations.find((a) => a.id === id);
    if (!found) throw toApiError({ response: { status: 404, data: { message: 'Allocation not found' } } });
    return fx.delay(found);
  }
  try {
    const { data } = await api.get<{ data: Allocation }>(`/admin/parking-allocations/${id}`);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

function withRelations(input: AllocationInput): Pick<Allocation, 'building' | 'tenant' | 'parking_area'> {
  const building = fx.buildingResources.find((b) => b.id === input.building_id);
  const tenant = input.tenant_id ? fx.tenants.find((t) => t.id === input.tenant_id) : null;
  const area = input.parking_area_id ? fx.parkingAreaResources.find((a) => a.id === input.parking_area_id) : null;
  return {
    building: building ? { id: building.id, name: building.name } : undefined,
    tenant: tenant ? { id: tenant.id, name: tenant.name } : null,
    parking_area: area ? { id: area.id, name: area.name } : null,
  };
}

export async function createAllocation(input: AllocationInput): Promise<Allocation> {
  if (USE_FIXTURES) {
    const allocation: Allocation = {
      id: fx.nextId(fx.allocations),
      building_id: input.building_id,
      tenant_id: input.tenant_id ?? null,
      parking_area_id: input.parking_area_id ?? null,
      allocation_type: input.allocation_type,
      user_category: input.user_category,
      quota: input.quota,
      release_after_minutes: input.release_after_minutes ?? null,
      starts_at: input.starts_at ?? null,
      ends_at: input.ends_at ?? null,
      status: input.status,
      notes: input.notes ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...withRelations(input),
    };
    fx.allocations.unshift(allocation);
    return fx.delay(allocation);
  }
  try {
    const { data } = await api.post<{ data: Allocation }>('/admin/parking-allocations', input);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function updateAllocation(id: number, input: AllocationInput): Promise<Allocation> {
  if (USE_FIXTURES) {
    const idx = fx.allocations.findIndex((a) => a.id === id);
    if (idx < 0) throw toApiError({ response: { status: 404, data: { message: 'Allocation not found' } } });
    fx.allocations[idx] = { ...fx.allocations[idx], ...input, ...withRelations(input), updated_at: new Date().toISOString() };
    return fx.delay(fx.allocations[idx]);
  }
  try {
    const { data } = await api.put<{ data: Allocation }>(`/admin/parking-allocations/${id}`, input);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function deleteAllocation(id: number): Promise<void> {
  if (USE_FIXTURES) {
    const idx = fx.allocations.findIndex((a) => a.id === id);
    if (idx >= 0) fx.allocations.splice(idx, 1);
    await fx.delay(null);
    return;
  }
  try {
    await api.delete(`/admin/parking-allocations/${id}`);
  } catch (e) {
    throw toApiError(e);
  }
}
