import { api, toApiError, USE_FIXTURES } from './client';
import * as fx from './fixtures';
import type { ListParams, Paginator, Vehicle, VehicleType } from './types';

export type VehicleInput = {
  plate_number: string;
  plate_state?: string | null;
  plate_country?: string | null;
  vehicle_type: VehicleType;
  make?: string | null;
  model?: string | null;
  colour?: string | null;
  status: Vehicle['status'];
  notes?: string | null;
};

export async function listVehicles(params: ListParams = {}): Promise<Paginator<Vehicle>> {
  if (USE_FIXTURES) {
    const q = (params.search ?? '').toLowerCase();
    const rows = fx.vehicles.filter(
      (v) =>
        (!params.status || v.status === params.status) &&
        (!params.vehicle_type || v.vehicle_type === params.vehicle_type) &&
        (!q ||
          v.plate_number.toLowerCase().includes(q) ||
          (v.make ?? '').toLowerCase().includes(q) ||
          (v.model ?? '').toLowerCase().includes(q)),
    );
    return fx.delay(fx.paginate(rows, Number(params.page) || 1));
  }
  try {
    const { data } = await api.get<Paginator<Vehicle>>('/admin/vehicles', { params });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function getVehicle(id: number): Promise<Vehicle> {
  if (USE_FIXTURES) {
    const found = fx.vehicles.find((v) => v.id === id);
    if (!found) throw toApiError({ response: { status: 404, data: { message: 'Vehicle not found' } } });
    return fx.delay(found);
  }
  try {
    const { data } = await api.get<{ data: Vehicle }>(`/admin/vehicles/${id}`);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function createVehicle(input: VehicleInput): Promise<Vehicle> {
  if (USE_FIXTURES) {
    const plate = input.plate_number.toUpperCase();
    const vehicle: Vehicle = {
      id: fx.nextId(fx.vehicles),
      plate_number: plate,
      plate_number_normalized: plate.replace(/[^A-Z0-9]/g, ''),
      plate_state: input.plate_state ?? null,
      plate_country: input.plate_country ?? 'Australia',
      status: input.status,
      notes: input.notes ?? null,
      car_id: fx.nextId(fx.vehicles),
      vehicle_type: input.vehicle_type,
      make: input.make ?? null,
      model: input.model ?? null,
      colour: input.colour ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      drivers: [],
    };
    fx.vehicles.unshift(vehicle);
    return fx.delay(vehicle);
  }
  try {
    const { data } = await api.post<{ data: Vehicle }>('/admin/vehicles', input);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function updateVehicle(id: number, input: VehicleInput): Promise<Vehicle> {
  if (USE_FIXTURES) {
    const idx = fx.vehicles.findIndex((v) => v.id === id);
    if (idx < 0) throw toApiError({ response: { status: 404, data: { message: 'Vehicle not found' } } });
    const plate = input.plate_number.toUpperCase();
    fx.vehicles[idx] = {
      ...fx.vehicles[idx],
      ...input,
      plate_number: plate,
      plate_number_normalized: plate.replace(/[^A-Z0-9]/g, ''),
      updated_at: new Date().toISOString(),
    };
    return fx.delay(fx.vehicles[idx]);
  }
  try {
    const { data } = await api.put<{ data: Vehicle }>(`/admin/vehicles/${id}`, input);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function deleteVehicle(id: number): Promise<void> {
  if (USE_FIXTURES) {
    const idx = fx.vehicles.findIndex((v) => v.id === id);
    if (idx >= 0) fx.vehicles.splice(idx, 1);
    await fx.delay(null);
    return;
  }
  try {
    await api.delete(`/admin/vehicles/${id}`);
  } catch (e) {
    throw toApiError(e);
  }
}
