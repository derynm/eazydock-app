import { api, toApiError, USE_FIXTURES } from './client';
import * as fx from './fixtures';
import type { DriverType, EntryMethod, ListParams, Paginator, Transaction } from './types';

export async function listTransactions(params: ListParams = {}): Promise<Paginator<Transaction>> {
  if (USE_FIXTURES) {
    const q = (params.search ?? '').toLowerCase();
    const rows = fx.transactions.filter(
      (t) =>
        (!params.status || t.status === params.status) &&
        (!params.parking_area_id || t.parking_area_id === Number(params.parking_area_id)) &&
        (!q ||
          t.transaction_no.toLowerCase().includes(q) ||
          (t.entry_plate_number_raw ?? '').toLowerCase().includes(q) ||
          (t.driver?.full_name ?? '').toLowerCase().includes(q)),
    );
    return fx.delay(fx.paginate(rows, Number(params.page) || 1));
  }
  try {
    const { data } = await api.get<Paginator<Transaction>>('/admin/transactions', { params });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function listActiveVehicles(params: ListParams = {}): Promise<Paginator<Transaction>> {
  if (USE_FIXTURES) {
    const q = (params.search ?? '').toLowerCase();
    const rows = fx.transactions.filter(
      (t) =>
        (t.status === 'active' || t.status === 'overstay') &&
        (!params.parking_area_id || t.parking_area_id === Number(params.parking_area_id)) &&
        (!params.driver_type || t.driver_type === params.driver_type) &&
        (!q ||
          t.transaction_no.toLowerCase().includes(q) ||
          (t.entry_plate_number_raw ?? '').toLowerCase().includes(q) ||
          (t.driver?.full_name ?? '').toLowerCase().includes(q)),
    );
    return fx.delay(fx.paginate(rows, Number(params.page) || 1));
  }
  try {
    const { data } = await api.get<Paginator<Transaction>>('/admin/transactions/active-vehicles', { params });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export type VehicleSearchResult = { id: number; car_id: number | null; plate_number: string };

/** Type-ahead over existing vehicles by plate (plan §6A: vehicle-search). */
export async function searchVehicles(q: string): Promise<VehicleSearchResult[]> {
  if (USE_FIXTURES) {
    const term = q.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    if (term.length < 1) return fx.delay([]);
    return fx.delay(
      fx.vehicles
        .filter((v) => v.plate_number.replace(/[^A-Za-z0-9]/g, '').toLowerCase().includes(term))
        .slice(0, 10)
        .map((v) => ({ id: v.id, car_id: v.car_id, plate_number: v.plate_number })),
    );
  }
  try {
    const { data } = await api.get<{ vehicles: VehicleSearchResult[] }>('/admin/transactions/vehicle-search', {
      params: { q },
    });
    return data.vehicles;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function getTransaction(id: number): Promise<Transaction> {
  if (USE_FIXTURES) {
    const found = fx.transactions.find((t) => t.id === id);
    if (!found) throw toApiError({ response: { status: 404, data: { message: 'Transaction not found' } } });
    return fx.delay(found);
  }
  try {
    const { data } = await api.get<{ data: Transaction }>(`/admin/transactions/${id}`);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export type CheckInInput = {
  building_id: number;
  parking_area_id: number;
  parking_space_id?: number | null;
  tenant_id?: number | null;
  driver_id?: number | null;
  // New (unlinked) driver — backend creates + links it during check-in.
  driver_name?: string | null;
  driver_phone?: string | null;
  driver_company_name?: string | null;
  vehicle_id?: number | null;
  plate_number: string;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_colour?: string | null;
  vehicle_type?: string | null;
  driver_type: DriverType;
  entry_method: EntryMethod;
  comments?: string | null;
  imageUri?: string | null;
};

function buildCheckInForm(input: CheckInInput): FormData {
  const form = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (key === 'imageUri' || value == null) return;
    form.append(key, String(value));
  });
  if (input.imageUri) {
    form.append('image', {
      uri: input.imageUri,
      name: 'check-in.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
  }
  return form;
}

export async function checkIn(input: CheckInInput): Promise<Transaction> {
  if (USE_FIXTURES) {
    const area = fx.parkingAreas.find((a) => a.id === input.parking_area_id) ?? fx.parkingAreas[0];
    const space =
      fx.parkingSpaces.find((s) => s.id === input.parking_space_id) ??
      fx.parkingSpaces.find((s) => s.parking_area_id === area.id)!;
    const nowIso = new Date().toISOString();

    // Simulate the backend creating + linking a new driver during check-in.
    let driverId = input.driver_id ?? null;
    let driverName: string | undefined;
    if (!driverId && input.driver_name?.trim()) {
      const created = {
        id: fx.nextId(fx.drivers),
        full_name: input.driver_name.trim(),
        phone: input.driver_phone ?? null,
        email: null,
        company_name: input.driver_company_name ?? null,
        license_no: null,
        status: 'active' as const,
        notes: null,
        created_at: nowIso,
        updated_at: nowIso,
        vehicles: [],
      };
      fx.drivers.unshift(created);
      driverId = created.id;
      driverName = created.full_name;
    } else if (driverId) {
      driverName = fx.drivers.find((d) => d.id === driverId)?.full_name;
    }

    const txn: Transaction = {
      id: fx.nextId(fx.transactions),
      transaction_no: `TXN-${10_420 + fx.transactions.length + 1}`,
      status: 'active',
      driver_type: input.driver_type,
      building_id: input.building_id,
      parking_area_id: area.id,
      parking_space_id: space.id,
      tenant_id: input.tenant_id ?? null,
      driver_id: driverId,
      vehicle_id: input.vehicle_id ?? null,
      transaction_date: nowIso,
      car_in_at: nowIso,
      car_out_at: null,
      duration_minutes: null,
      entry_method: input.entry_method,
      exit_method: null,
      entry_plate_number_raw: input.plate_number.toUpperCase(),
      exit_plate_number_raw: null,
      comments: input.comments ?? null,
      vehicle_snapshot: { plate_number: input.plate_number.toUpperCase(), make: input.vehicle_make ?? '', model: input.vehicle_model ?? '' },
      driver_snapshot: driverName ? { full_name: driverName } : null,
      tenant_snapshot: null,
      created_at: nowIso,
      building: { id: input.building_id, name: fx.buildings.find((b) => b.id === input.building_id)?.name ?? '' },
      parking_area: { id: area.id, name: area.name },
      parking_space: { id: space.id, space_code: space.space_code },
      vehicle: { id: input.vehicle_id ?? 0, plate_number: input.plate_number.toUpperCase() },
      driver: driverId && driverName ? { id: driverId, full_name: driverName } : undefined,
      events: [{ id: 1, type: 'check_in', description: `Checked in at ${space.space_code}`, created_at: nowIso }],
    };
    fx.transactions.unshift(txn);
    return fx.delay(txn);
  }
  try {
    const { data } = await api.post<{ data: Transaction }>('/admin/transactions/check-in', buildCheckInForm(input), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function checkOut(id: number, exitMethod: string, comments?: string): Promise<Transaction> {
  if (USE_FIXTURES) {
    const idx = fx.transactions.findIndex((t) => t.id === id);
    if (idx < 0) throw toApiError({ response: { status: 404, data: { message: 'Transaction not found' } } });
    const t = fx.transactions[idx];
    const nowIso = new Date().toISOString();
    const dur = t.car_in_at ? Math.floor((Date.now() - new Date(t.car_in_at).getTime()) / 60_000) : 0;
    fx.transactions[idx] = {
      ...t,
      status: 'completed',
      car_out_at: nowIso,
      duration_minutes: dur,
      exit_method: exitMethod,
      comments: comments ?? t.comments,
      events: [...(t.events ?? []), { id: (t.events?.length ?? 0) + 1, type: 'check_out', description: 'Checked out', created_at: nowIso }],
    };
    return fx.delay(fx.transactions[idx]);
  }
  try {
    const form = new FormData();
    form.append('exit_method', exitMethod);
    if (comments) form.append('comments', comments);
    const { data } = await api.post<{ data: Transaction }>(`/admin/transactions/${id}/check-out`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function changeSpace(id: number, parkingSpaceId: number, comments?: string): Promise<Transaction> {
  if (USE_FIXTURES) {
    const idx = fx.transactions.findIndex((t) => t.id === id);
    if (idx < 0) throw toApiError({ response: { status: 404, data: { message: 'Transaction not found' } } });
    const space = fx.parkingSpaces.find((s) => s.id === parkingSpaceId);
    const nowIso = new Date().toISOString();
    fx.transactions[idx] = {
      ...fx.transactions[idx],
      parking_space_id: parkingSpaceId,
      parking_space: space ? { id: space.id, space_code: space.space_code } : fx.transactions[idx].parking_space,
      events: [
        ...(fx.transactions[idx].events ?? []),
        { id: (fx.transactions[idx].events?.length ?? 0) + 1, type: 'change_space', description: `Moved to ${space?.space_code ?? 'new bay'}`, created_at: nowIso },
      ],
    };
    return fx.delay(fx.transactions[idx]);
  }
  try {
    const { data } = await api.post<{ data: Transaction }>(`/admin/transactions/${id}/change-space`, {
      parking_space_id: parkingSpaceId,
      comments,
    });
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function cancelTransaction(id: number): Promise<void> {
  if (USE_FIXTURES) {
    const idx = fx.transactions.findIndex((t) => t.id === id);
    if (idx >= 0) fx.transactions[idx] = { ...fx.transactions[idx], status: 'cancelled', car_out_at: new Date().toISOString() };
    await fx.delay(null);
    return;
  }
  try {
    await api.post(`/admin/transactions/${id}/cancel`);
  } catch (e) {
    throw toApiError(e);
  }
}
