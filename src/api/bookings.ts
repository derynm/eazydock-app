import { api, toApiError, USE_FIXTURES } from './client';
import * as fx from './fixtures';
import type { Booking, BookingsBySpaceResponse, Building, DriverType, ListParams, Paginator, ParkingArea, ParkingSpace, Tenant } from './types';

export type BookingInput = {
  building_id: number;
  parking_area_id: number;
  parking_space_id: number;
  tenant_id?: number | null;
  driver_id?: number | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  driver_company_name?: string | null;
  vehicle_id?: number | null;
  driver_type: DriverType;
  plate_number: string;
  contact_name?: string | null;
  contact_phone?: string | null;
  starts_at: string;
  ends_at: string;
  notes?: string | null;
};

export type BookingFormData = {
  buildings: Building[];
  areas: ParkingArea[];
  spaces: ParkingSpace[];
  tenants: Pick<Tenant, 'id' | 'name'>[];
  drivers: { id: number; full_name: string }[];
};

export async function listBookings(params: ListParams = {}): Promise<Paginator<Booking>> {
  if (USE_FIXTURES) {
    const q = (params.search ?? '').toLowerCase();
    const rows = fx.bookings.filter(
      (b) =>
        (!params.status || b.status === params.status) &&
        (!params.parking_area_id || b.parking_area_id === Number(params.parking_area_id)) &&
        (!q ||
          b.booking_no.toLowerCase().includes(q) ||
          b.plate_number_raw.toLowerCase().includes(q) ||
          (b.contact_name ?? '').toLowerCase().includes(q)),
    );
    return fx.delay(fx.paginate(rows, Number(params.page) || 1));
  }
  try {
    const { data } = await api.get<BookingsBySpaceResponse>('/admin/bookings/by-space', { params });
    const bookings = data.data.flatMap((group) => group.bookings);
    return {
      data: bookings,
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, last_page: 1, per_page: bookings.length, total: bookings.length },
    };
  } catch (e) {
    throw toApiError(e);
  }
}

export async function getBooking(id: number): Promise<Booking> {
  if (USE_FIXTURES) {
    const found = fx.bookings.find((b) => b.id === id);
    if (!found) throw toApiError({ response: { status: 404, data: { message: 'Booking not found' } } });
    return fx.delay(found);
  }
  try {
    const { data } = await api.get<{ data: Booking }>(`/admin/bookings/${id}`);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function getBookingFormData(): Promise<BookingFormData> {
  if (USE_FIXTURES) {
    return fx.delay({
      buildings: fx.buildings,
      areas: fx.parkingAreas,
      spaces: fx.parkingSpaces,
      tenants: fx.tenants.map((t) => ({ id: t.id, name: t.name })),
      drivers: fx.drivers.map((d) => ({ id: d.id, full_name: d.full_name })),
    });
  }
  try {
    const { data } = await api.get<BookingFormData>('/admin/bookings/form-data');
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

function relations(input: BookingInput) {
  const building = fx.buildings.find((b) => b.id === input.building_id);
  const area = fx.parkingAreas.find((a) => a.id === input.parking_area_id);
  const space = fx.parkingSpaces.find((s) => s.id === input.parking_space_id);
  const tenant = input.tenant_id ? fx.tenants.find((t) => t.id === input.tenant_id) : undefined;
  return {
    building: building && { id: building.id, name: building.name },
    parking_area: area && { id: area.id, name: area.name },
    parking_space: space && { id: space.id, space_code: space.space_code },
    tenant: tenant && { id: tenant.id, name: tenant.name },
  };
}

function resolveFixtureDriverId(input: BookingInput): number | null {
  if (input.driver_id) return input.driver_id;
  if (!input.driver_name?.trim()) return null;

  const nowIso = new Date().toISOString();
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
  return created.id;
}

export async function createBooking(input: BookingInput): Promise<Booking> {
  if (USE_FIXTURES) {
    const driverId = resolveFixtureDriverId(input);
    const booking: Booking = {
      id: fx.nextId(fx.bookings),
      booking_no: `BK-${5_200 + fx.bookings.length + 1}`,
      status: 'pending',
      building_id: input.building_id,
      parking_area_id: input.parking_area_id,
      parking_space_id: input.parking_space_id,
      tenant_id: input.tenant_id ?? null,
      driver_id: driverId,
      vehicle_id: input.vehicle_id ?? null,
      driver_type: input.driver_type,
      plate_number_raw: input.plate_number.toUpperCase(),
      contact_name: input.contact_name ?? null,
      contact_phone: input.contact_phone ?? null,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      notes: input.notes ?? null,
      parking_transaction_id: null,
      created_at: new Date().toISOString(),
      ...relations(input),
    };
    fx.bookings.unshift(booking);
    return fx.delay(booking);
  }
  try {
    const { data } = await api.post<{ data: Booking }>('/admin/bookings', input);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function updateBooking(id: number, input: BookingInput): Promise<Booking> {
  if (USE_FIXTURES) {
    const idx = fx.bookings.findIndex((b) => b.id === id);
    if (idx < 0) throw toApiError({ response: { status: 404, data: { message: 'Booking not found' } } });
    const driverId = resolveFixtureDriverId(input);
    fx.bookings[idx] = {
      ...fx.bookings[idx],
      ...input,
      driver_id: driverId,
      plate_number_raw: input.plate_number.toUpperCase(),
      ...relations(input),
    };
    return fx.delay(fx.bookings[idx]);
  }
  try {
    const { data } = await api.put<{ data: Booking }>(`/admin/bookings/${id}`, input);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function fulfilBooking(id: number, entryMethod: string, comments?: string): Promise<void> {
  if (USE_FIXTURES) {
    const idx = fx.bookings.findIndex((b) => b.id === id);
    if (idx >= 0) fx.bookings[idx] = { ...fx.bookings[idx], status: 'fulfilled', parking_transaction_id: 1 };
    await fx.delay(null);
    return;
  }
  try {
    await api.post(`/admin/bookings/${id}/fulfil`, { entry_method: entryMethod, comments });
  } catch (e) {
    throw toApiError(e);
  }
}

export async function cancelBooking(id: number): Promise<void> {
  if (USE_FIXTURES) {
    const idx = fx.bookings.findIndex((b) => b.id === id);
    if (idx >= 0) fx.bookings[idx] = { ...fx.bookings[idx], status: 'cancelled' };
    await fx.delay(null);
    return;
  }
  try {
    await api.post(`/admin/bookings/${id}/cancel`);
  } catch (e) {
    throw toApiError(e);
  }
}

export async function deleteBooking(id: number): Promise<void> {
  if (USE_FIXTURES) {
    const idx = fx.bookings.findIndex((b) => b.id === id);
    if (idx >= 0) fx.bookings.splice(idx, 1);
    await fx.delay(null);
    return;
  }
  try {
    await api.delete(`/admin/bookings/${id}`);
  } catch (e) {
    throw toApiError(e);
  }
}
