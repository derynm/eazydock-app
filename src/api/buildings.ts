import { api, toApiError, USE_FIXTURES } from './client';
import * as fx from './fixtures';
import type { BuildingResource, ListParams, Paginator } from './types';

export type BuildingInput = {
  name: string;
  code?: string | null;
  building_type?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  address_line_1: string;
  address_line_2?: string | null;
  suburb?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  status: 'active' | 'inactive';
};

export async function listBuildings(params: ListParams = {}): Promise<Paginator<BuildingResource>> {
  if (USE_FIXTURES) {
    const q = (params.search ?? '').toLowerCase();
    const rows = fx.buildingResources.filter(
      (b) =>
        (!params.status || b.status === params.status) &&
        (!q || b.name.toLowerCase().includes(q) || (b.code ?? '').toLowerCase().includes(q) || (b.suburb ?? '').toLowerCase().includes(q)),
    );
    return fx.delay(fx.paginate(rows, Number(params.page) || 1));
  }
  try {
    const { data } = await api.get<Paginator<BuildingResource>>('/admin/buildings', { params });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function getBuilding(id: number): Promise<BuildingResource> {
  if (USE_FIXTURES) {
    const found = fx.buildingResources.find((b) => b.id === id);
    if (!found) throw toApiError({ response: { status: 404, data: { message: 'Building not found' } } });
    return fx.delay(found);
  }
  try {
    const { data } = await api.get<{ data: BuildingResource }>(`/admin/buildings/${id}`);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function createBuilding(input: BuildingInput): Promise<BuildingResource> {
  if (USE_FIXTURES) {
    const building: BuildingResource = {
      id: fx.nextId(fx.buildingResources),
      name: input.name,
      code: input.code ?? null,
      building_type: input.building_type ?? null,
      contact_name: input.contact_name ?? null,
      contact_phone: input.contact_phone ?? null,
      contact_email: input.contact_email ?? null,
      address_line_1: input.address_line_1,
      address_line_2: input.address_line_2 ?? null,
      suburb: input.suburb ?? null,
      state: input.state ?? null,
      postal_code: input.postal_code ?? null,
      country: input.country ?? null,
      latitude: null,
      longitude: null,
      status: input.status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    fx.buildingResources.unshift(building);
    return fx.delay(building);
  }
  try {
    const { data } = await api.post<{ data: BuildingResource }>('/admin/buildings', input);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function updateBuilding(id: number, input: BuildingInput): Promise<BuildingResource> {
  if (USE_FIXTURES) {
    const idx = fx.buildingResources.findIndex((b) => b.id === id);
    if (idx < 0) throw toApiError({ response: { status: 404, data: { message: 'Building not found' } } });
    fx.buildingResources[idx] = { ...fx.buildingResources[idx], ...input, updated_at: new Date().toISOString() };
    return fx.delay(fx.buildingResources[idx]);
  }
  try {
    const { data } = await api.put<{ data: BuildingResource }>(`/admin/buildings/${id}`, input);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function deleteBuilding(id: number): Promise<void> {
  if (USE_FIXTURES) {
    const idx = fx.buildingResources.findIndex((b) => b.id === id);
    if (idx >= 0) fx.buildingResources.splice(idx, 1);
    await fx.delay(null);
    return;
  }
  try {
    await api.delete(`/admin/buildings/${id}`);
  } catch (e) {
    throw toApiError(e);
  }
}
