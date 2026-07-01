import { api, toApiError, USE_FIXTURES } from './client';
import * as fx from './fixtures';
import type { Driver, ListParams, Paginator } from './types';

export type DriverInput = {
  full_name: string;
  phone?: string | null;
  email?: string | null;
  company_name?: string | null;
  license_no?: string | null;
  status: Driver['status'];
  notes?: string | null;
};

export async function listDrivers(params: ListParams = {}): Promise<Paginator<Driver>> {
  if (USE_FIXTURES) {
    const q = (params.search ?? '').toLowerCase();
    const rows = fx.drivers.filter(
      (d) =>
        (!params.status || d.status === params.status) &&
        (!q ||
          d.full_name.toLowerCase().includes(q) ||
          (d.company_name ?? '').toLowerCase().includes(q) ||
          (d.phone ?? '').includes(q)),
    );
    return fx.delay(fx.paginate(rows, Number(params.page) || 1));
  }
  try {
    const { data } = await api.get<Paginator<Driver>>('/admin/drivers', { params });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function getDriver(id: number): Promise<Driver> {
  if (USE_FIXTURES) {
    const found = fx.drivers.find((d) => d.id === id);
    if (!found) throw toApiError({ response: { status: 404, data: { message: 'Driver not found' } } });
    return fx.delay(found);
  }
  try {
    const { data } = await api.get<{ data: Driver }>(`/admin/drivers/${id}`);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function createDriver(input: DriverInput): Promise<Driver> {
  if (USE_FIXTURES) {
    const driver: Driver = {
      id: fx.nextId(fx.drivers),
      full_name: input.full_name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      company_name: input.company_name ?? null,
      license_no: input.license_no ?? null,
      status: input.status,
      notes: input.notes ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      vehicles: [],
    };
    fx.drivers.unshift(driver);
    return fx.delay(driver);
  }
  try {
    const { data } = await api.post<{ data: Driver }>('/admin/drivers', input);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function updateDriver(id: number, input: DriverInput): Promise<Driver> {
  if (USE_FIXTURES) {
    const idx = fx.drivers.findIndex((d) => d.id === id);
    if (idx < 0) throw toApiError({ response: { status: 404, data: { message: 'Driver not found' } } });
    fx.drivers[idx] = { ...fx.drivers[idx], ...input, updated_at: new Date().toISOString() };
    return fx.delay(fx.drivers[idx]);
  }
  try {
    const { data } = await api.put<{ data: Driver }>(`/admin/drivers/${id}`, input);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function deleteDriver(id: number): Promise<void> {
  if (USE_FIXTURES) {
    const idx = fx.drivers.findIndex((d) => d.id === id);
    if (idx >= 0) fx.drivers.splice(idx, 1);
    await fx.delay(null);
    return;
  }
  try {
    await api.delete(`/admin/drivers/${id}`);
  } catch (e) {
    throw toApiError(e);
  }
}
