import { api, toApiError, USE_FIXTURES } from './client';
import * as fx from './fixtures';
import type { ListParams, Paginator, Tenant, TenantType } from './types';

export type TenantInput = {
  building_id: number;
  name: string;
  code?: string | null;
  tenant_type: TenantType;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  suite_or_unit?: string | null;
  floor?: string | null;
  status: 'active' | 'inactive';
};

export async function listTenants(params: ListParams = {}): Promise<Paginator<Tenant>> {
  if (USE_FIXTURES) {
    const q = (params.search ?? '').toLowerCase();
    const rows = fx.tenants.filter(
      (t) =>
        (!params.status || t.status === params.status) &&
        (!params.building_id || t.building_id === Number(params.building_id)) &&
        (!params.tenant_type || t.tenant_type === params.tenant_type) &&
        (!q || t.name.toLowerCase().includes(q) || (t.code ?? '').toLowerCase().includes(q)),
    );
    return fx.delay(fx.paginate(rows, Number(params.page) || 1));
  }
  try {
    const { data } = await api.get<Paginator<Tenant>>('/admin/tenants', { params });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function getTenant(id: number): Promise<Tenant> {
  if (USE_FIXTURES) {
    const found = fx.tenants.find((t) => t.id === id);
    if (!found) throw toApiError({ response: { status: 404, data: { message: 'Tenant not found' } } });
    return fx.delay(found);
  }
  try {
    const { data } = await api.get<{ data: Tenant }>(`/admin/tenants/${id}`);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

function withBuilding(input: TenantInput) {
  const building = fx.buildings.find((b) => b.id === input.building_id);
  return building ? { id: building.id, name: building.name } : undefined;
}

export async function createTenant(input: TenantInput): Promise<Tenant> {
  if (USE_FIXTURES) {
    const tenant: Tenant = {
      id: fx.nextId(fx.tenants),
      building_id: input.building_id,
      name: input.name,
      code: input.code ?? null,
      tenant_type: input.tenant_type,
      contact_name: input.contact_name ?? null,
      contact_phone: input.contact_phone ?? null,
      contact_email: input.contact_email ?? null,
      suite_or_unit: input.suite_or_unit ?? null,
      floor: input.floor ?? null,
      status: input.status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      building: withBuilding(input),
    };
    fx.tenants.unshift(tenant);
    return fx.delay(tenant);
  }
  try {
    const { data } = await api.post<{ data: Tenant }>('/admin/tenants', input);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function updateTenant(id: number, input: TenantInput): Promise<Tenant> {
  if (USE_FIXTURES) {
    const idx = fx.tenants.findIndex((t) => t.id === id);
    if (idx < 0) throw toApiError({ response: { status: 404, data: { message: 'Tenant not found' } } });
    fx.tenants[idx] = {
      ...fx.tenants[idx],
      ...input,
      building: withBuilding(input),
      updated_at: new Date().toISOString(),
    };
    return fx.delay(fx.tenants[idx]);
  }
  try {
    const { data } = await api.put<{ data: Tenant }>(`/admin/tenants/${id}`, input);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function deleteTenant(id: number): Promise<void> {
  if (USE_FIXTURES) {
    const idx = fx.tenants.findIndex((t) => t.id === id);
    if (idx >= 0) fx.tenants.splice(idx, 1);
    await fx.delay(null);
    return;
  }
  try {
    await api.delete(`/admin/tenants/${id}`);
  } catch (e) {
    throw toApiError(e);
  }
}
