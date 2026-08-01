import { api, toApiError, USE_FIXTURES } from './client';
import { toSydneyDateTimeValue } from '@/lib/sydney-time';
import * as fx from './fixtures';
import type { Booking, BookingsBySpaceGroup, BookingsBySpaceResponse, Building, DriverType, ListParams, Paginator, ParkingArea, ParkingSpace, SpaceStatus, Tenant, Transaction } from './types';

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

function withSydneyDateTimes(input: BookingInput): BookingInput {
  return {
    ...input,
    starts_at: toSydneyDateTimeValue(input.starts_at),
    ends_at: toSydneyDateTimeValue(input.ends_at),
  };
}

export type BookingsBySpaceParams = {
  date: string;
  status?: SpaceStatus | '';
  building_id?: number;
  parking_area_id?: number;
  search?: string;
};

export async function listBookings(params: ListParams = {}): Promise<Paginator<Booking>> {
  if (USE_FIXTURES) {
    const query = String(params.search ?? '').toLowerCase();
    const rows = fx.bookings
      .filter((booking) => {
        const startsOn = booking.starts_at.slice(0, 10);
        const matchesSearch =
          !query ||
          booking.booking_no.toLowerCase().includes(query) ||
          booking.plate_number_raw.toLowerCase().includes(query) ||
          (booking.driver?.full_name ?? '').toLowerCase().includes(query) ||
          (booking.tenant?.name ?? '').toLowerCase().includes(query);

        return (
          matchesSearch &&
          (!params.status || booking.status === params.status) &&
          (!params.building_id || booking.building_id === Number(params.building_id)) &&
          (!params.parking_area_id || booking.parking_area_id === Number(params.parking_area_id)) &&
          (!params.date_from || startsOn >= String(params.date_from)) &&
          (!params.date_to || startsOn <= String(params.date_to))
        );
      })
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

    return fx.delay(fx.paginate(rows, Number(params.page) || 1));
  }

  try {
    const { data } = await api.get<Paginator<Booking>>('/admin/bookings', { params });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** One row per parking space — occupied/booked spaces carry their booking(s), available spaces are returned empty. */
export async function listBookingsBySpace(params: BookingsBySpaceParams): Promise<BookingsBySpaceGroup[]> {
  if (USE_FIXTURES) {
    const q = (params.search ?? '').toLowerCase();
    const dateStr = params.date;

    const scopedSpaces = fx.parkingSpaces.filter(
      (s) =>
        (!params.building_id || s.building_id === Number(params.building_id)) &&
        (!params.parking_area_id || s.parking_area_id === Number(params.parking_area_id)),
    );

    const groups: BookingsBySpaceGroup[] = scopedSpaces.map((space) => {
      const spaceBookings = fx.bookings.filter((b) => {
        if (b.parking_space_id !== space.id) return false;
        if (dateStr) {
          const startDate = b.starts_at.slice(0, 10);
          const endDate = b.ends_at.slice(0, 10);
          if (startDate > dateStr || endDate < dateStr) return false;
        }
        if (q && !(
          b.booking_no.toLowerCase().includes(q) ||
          b.plate_number_raw.toLowerCase().includes(q) ||
          (b.driver?.full_name ?? '').toLowerCase().includes(q)
        )) return false;
        return true;
      });

      const isOccupied = fx.transactions.some(
        (t) => t.parking_space_id === space.id && (t.status === 'active' || t.status === 'overstay'),
      );
      const hasActiveBooking = spaceBookings.some((b) => b.status === 'pending' || b.status === 'confirmed');
      const spaceStatus: SpaceStatus = isOccupied ? 'occupied' : hasActiveBooking ? 'booked' : 'available';

      return { parking_space_id: space.id, space_code: space.space_code, status: spaceStatus, bookings: spaceBookings };
    });

    const filteredGroups = params.status ? groups.filter((g) => g.status === params.status) : groups;
    return fx.delay(filteredGroups);
  }
  try {
    const { data } = await api.get<BookingsBySpaceResponse>('/admin/bookings/by-space', { params });
    return data.data;
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
  if (input.driver_id) {
    // Non-blank company_name syncs onto the existing driver in place (plan §6A).
    const existing = fx.drivers.find((d) => d.id === input.driver_id);
    if (existing && input.driver_phone?.trim()) {
      existing.phone = input.driver_phone.trim();
    }
    if (existing && input.driver_company_name?.trim()) {
      existing.company_name = input.driver_company_name.trim();
    }
    return input.driver_id;
  }
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
  const payload = withSydneyDateTimes(input);
  if (USE_FIXTURES) {
    const driverId = resolveFixtureDriverId(payload);
    const driver = driverId ? fx.drivers.find((candidate) => candidate.id === driverId) : undefined;
    const booking: Booking = {
      id: fx.nextId(fx.bookings),
      booking_no: `BK-${5_200 + fx.bookings.length + 1}`,
      status: 'pending',
      building_id: payload.building_id,
      parking_area_id: payload.parking_area_id,
      parking_space_id: payload.parking_space_id,
      tenant_id: payload.tenant_id ?? null,
      driver_id: driverId,
      vehicle_id: payload.vehicle_id ?? null,
      driver_type: payload.driver_type,
      plate_number_raw: payload.plate_number.toUpperCase(),
      starts_at: payload.starts_at,
      ends_at: payload.ends_at,
      notes: payload.notes ?? null,
      parking_transaction_id: null,
      created_at: new Date().toISOString(),
      ...relations(payload),
      driver: driver
        ? { id: driver.id, full_name: driver.full_name, phone: driver.phone, email: driver.email, company_name: driver.company_name }
        : undefined,
    };
    fx.bookings.unshift(booking);
    return fx.delay(booking);
  }
  try {
    const { data } = await api.post<{ data: Booking }>('/admin/bookings', payload);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function updateBooking(id: number, input: BookingInput): Promise<Booking> {
  const payload = withSydneyDateTimes(input);
  if (USE_FIXTURES) {
    const idx = fx.bookings.findIndex((b) => b.id === id);
    if (idx < 0) throw toApiError({ response: { status: 404, data: { message: 'Booking not found' } } });
    const driverId = resolveFixtureDriverId(payload);
    const driver = driverId ? fx.drivers.find((candidate) => candidate.id === driverId) : undefined;
    fx.bookings[idx] = {
      ...fx.bookings[idx],
      ...payload,
      driver_id: driverId,
      plate_number_raw: payload.plate_number.toUpperCase(),
      ...relations(payload),
      driver: driver
        ? { id: driver.id, full_name: driver.full_name, phone: driver.phone, email: driver.email, company_name: driver.company_name }
        : undefined,
    };
    return fx.delay(fx.bookings[idx]);
  }
  try {
    const { data } = await api.put<{ data: Booking }>(`/admin/bookings/${id}`, payload);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function fulfilBooking(id: number, comments?: string): Promise<Transaction> {
  if (USE_FIXTURES) {
    const idx = fx.bookings.findIndex((b) => b.id === id);
    if (idx < 0) throw toApiError({ response: { status: 404, data: { message: 'Booking not found' } } });
    const booking = fx.bookings[idx];
    const nowIso = new Date().toISOString();
    const normalizedPlate = booking.plate_number_raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    let vehicle = fx.vehicles.find((candidate) =>
      candidate.id === booking.vehicle_id || candidate.plate_number_normalized === normalizedPlate,
    );
    if (!vehicle) {
      vehicle = {
        id: fx.nextId(fx.vehicles),
        plate_number: booking.plate_number_raw.toUpperCase(),
        plate_number_normalized: normalizedPlate,
        plate_state: null,
        plate_country: null,
        status: 'active',
        notes: null,
        car_id: null,
        vehicle_type: 'other',
        make: null,
        model: null,
        colour: null,
        created_at: nowIso,
        updated_at: nowIso,
        drivers: [],
      };
      fx.vehicles.unshift(vehicle);
    }
    const driver = booking.driver_id
      ? fx.drivers.find((candidate) => candidate.id === booking.driver_id)
      : undefined;
    const transaction: Transaction = {
      id: fx.nextId(fx.transactions),
      transaction_no: `TXN-${10_420 + fx.transactions.length + 1}`,
      status: 'active',
      driver_type: booking.driver_type,
      building_id: booking.building_id,
      parking_area_id: booking.parking_area_id,
      parking_space_id: booking.parking_space_id,
      tenant_id: booking.tenant_id,
      driver_id: booking.driver_id,
      vehicle_id: vehicle.id,
      transaction_date: nowIso,
      car_in_at: nowIso,
      car_out_at: null,
      duration_minutes: null,
      parked_duration_minutes: 0,
      parked_duration_label: '0m',
      comments: comments ?? null,
      tenant_snapshot: booking.tenant ? { name: booking.tenant.name } : null,
      created_at: nowIso,
      building: booking.building,
      parking_area: booking.parking_area,
      parking_space: booking.parking_space,
      tenant: booking.tenant,
      driver: driver
        ? { id: driver.id, full_name: driver.full_name, phone: driver.phone, email: driver.email, company_name: driver.company_name }
        : undefined,
      vehicle: { id: vehicle.id, plate_number: vehicle.plate_number, plate_state: vehicle.plate_state },
      events: [{ id: 1, type: 'check_in', description: 'Booking fulfilled', created_at: nowIso }],
    };
    fx.transactions.unshift(transaction);
    fx.bookings[idx] = { ...booking, status: 'fulfilled', parking_transaction_id: transaction.id, vehicle_id: vehicle.id };
    return fx.delay(transaction);
  }
  try {
    const { data } = await api.post<{ data: Transaction }>(`/admin/bookings/${id}/fulfil`, comments ? { comments } : {});
    return data.data;
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
