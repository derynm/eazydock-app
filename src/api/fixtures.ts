/**
 * In-memory dataset used when EXPO_PUBLIC_API_URL is unset (USE_FIXTURES).
 * Shapes match api/types.ts exactly so screens behave like the live API.
 * Mutations persist for the session (kept in module-level arrays).
 */
import type {
  Booking,
  Building,
  Company,
  DashboardResponse,
  Driver,
  ParkingArea,
  ParkingSpace,
  Paginator,
  Tenant,
  Transaction,
  UserPayload,
  Vehicle,
} from './types';

export const PER_PAGE = 20;

const now = Date.now();
const iso = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString();
const isoAhead = (minsAhead: number) => new Date(now + minsAhead * 60_000).toISOString();

/* ---- Auth / company ---- */
export const companies: Company[] = [
  { id: 3, name: 'Acme Logistics', code: 'ACME' },
  { id: 4, name: 'Harbour Freight Co', code: 'HARB' },
];

const ALL_ACTIONS = { view: true, create: true, update: true, delete: true, export: true };
export const userPayload: UserPayload = {
  user: { id: 1, name: 'Jordan Avery', email: 'jordan@acme.test' },
  companies,
  is_super_admin: false,
  active_company_id: 3,
  permissions: {
    dashboard: { view: true },
    'operations.transactions': ALL_ACTIONS,
    'operations.bookings': ALL_ACTIONS,
    'people_vehicles.drivers': ALL_ACTIONS,
    'people_vehicles.vehicles': ALL_ACTIONS,
    'locations.tenants': { view: true, create: true, update: true, delete: false },
  },
};

/* ---- Locations ---- */
export const buildings: Building[] = [
  { id: 1, name: 'Riverside Tower' },
  { id: 2, name: 'Dock 7 Warehouse' },
  { id: 3, name: 'Central Plaza' },
];

export const parkingAreas: ParkingArea[] = [
  { id: 1, building_id: 1, name: 'Level B1' },
  { id: 2, building_id: 1, name: 'Level B2' },
  { id: 3, building_id: 2, name: 'Loading Bay A' },
  { id: 4, building_id: 2, name: 'Yard' },
  { id: 5, building_id: 3, name: 'Visitor Deck' },
];

export const parkingSpaces: ParkingSpace[] = parkingAreas.flatMap((area) =>
  Array.from({ length: 8 }).map((_, i) => ({
    id: area.id * 100 + i + 1,
    building_id: area.building_id,
    parking_area_id: area.id,
    space_code: `${area.name.split(' ').pop()}-${String(i + 1).padStart(2, '0')}`,
    occupancy_status: i % 3 === 0 ? 'occupied' : 'available',
  })),
);

/* ---- Generators ---- */
const FIRST = ['James', 'Mia', 'Liam', 'Noah', 'Ava', 'Ethan', 'Zoe', 'Lucas', 'Chloe', 'Owen', 'Aria', 'Leo', 'Ruby', 'Max', 'Ivy', 'Cole', 'Nina', 'Theo', 'Pia', 'Sam', 'Kai', 'Esme', 'Drew', 'Tara'];
const LAST = ['Walker', 'Nguyen', 'Patel', 'Kerr', 'Okafor', 'Rossi', 'Singh', 'Tan', 'Murphy', 'Costa', 'Brooks', 'Haines', 'Vargas', 'Lowe', 'Dimas', 'Ford', 'Yates', 'Bauer', 'Nash', 'Reid', 'Quinn', 'Marsh', 'Ito', 'Frost'];
const ORGS = ['Acme Logistics', 'Coastline Couriers', 'Metro Removals', 'Fresh Foods Co', 'BlueLine Freight', 'Northgate Supplies', null];
const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA'];
const MAKES: [string, string, string][] = [
  ['Toyota', 'HiAce', 'White'], ['Ford', 'Transit', 'Silver'], ['Isuzu', 'NPR', 'White'],
  ['Hyundai', 'iLoad', 'Blue'], ['Mercedes', 'Sprinter', 'Grey'], ['Mazda', 'BT-50', 'Black'],
  ['Volkswagen', 'Crafter', 'White'], ['Renault', 'Master', 'Red'],
];
const VTYPES = ['van', 'truck', 'ute', 'van', 'car', 'van', 'truck'] as const;
const plate = (i: number) => `${STATES[i % STATES.length]}${String(100 + i).slice(-3)}${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(67 + ((i * 7) % 20))}`;

export const drivers: Driver[] = Array.from({ length: 26 }).map((_, i) => {
  const full = `${FIRST[i % FIRST.length]} ${LAST[(i * 3) % LAST.length]}`;
  const status = i % 11 === 0 ? 'banned' : i % 7 === 0 ? 'inactive' : 'active';
  return {
    id: i + 1,
    full_name: full,
    phone: `04${String(10_000_000 + i * 137_911).slice(0, 8)}`,
    email: i % 4 === 0 ? null : `${full.toLowerCase().replace(/\s+/g, '.')}@mail.test`,
    company_name: ORGS[i % ORGS.length],
    license_no: i % 3 === 0 ? null : `DL${String(900_000 + i * 313)}`,
    status,
    notes: null,
    created_at: iso(60 * 24 * (i + 2)),
    updated_at: iso(60 * (i + 1)),
    vehicles: [],
  };
});

export const vehicles: Vehicle[] = Array.from({ length: 24 }).map((_, i) => {
  const [make, model, colour] = MAKES[i % MAKES.length];
  const status = i % 13 === 0 ? 'banned' : i % 9 === 0 ? 'inactive' : 'active';
  const p = plate(i);
  return {
    id: i + 1,
    plate_number: p,
    plate_number_normalized: p.replace(/[^A-Z0-9]/g, ''),
    plate_state: STATES[i % STATES.length],
    plate_country: 'Australia',
    status,
    notes: null,
    car_id: i + 1,
    vehicle_type: VTYPES[i % VTYPES.length],
    make,
    model,
    colour,
    created_at: iso(60 * 24 * (i + 1)),
    updated_at: iso(60 * (i + 2)),
    drivers: [],
  };
});

// cross-link a few drivers <-> vehicles for detail views
drivers.forEach((d, i) => {
  const v = vehicles[i % vehicles.length];
  d.vehicles = [{ id: v.id, plate_number: v.plate_number, plate_state: v.plate_state }];
  v.drivers = [...(v.drivers ?? []), { id: d.id, full_name: d.full_name, company_name: d.company_name }];
});

const TENANT_NAMES = ['Brightline Apparel', 'Cafe Mercato', 'Quill & Co Legal', 'Pixel Studio', 'GreenLeaf Florist', 'Vault Fitness', 'Harbor Dental', 'Stack Coworking', 'Nimbus IT', 'Bayside Pharmacy', 'Forge Hardware', 'Lumen Optics'];
const TENANT_TYPES = ['shop', 'office', 'tenant', 'contractor', 'delivery_partner', 'building_owner'] as const;

export const tenants: Tenant[] = TENANT_NAMES.map((name, i) => {
  const b = buildings[i % buildings.length];
  return {
    id: i + 1,
    building_id: b.id,
    name,
    code: `T-${String(101 + i)}`,
    tenant_type: TENANT_TYPES[i % TENANT_TYPES.length],
    contact_name: `${FIRST[(i * 2) % FIRST.length]} ${LAST[i % LAST.length]}`,
    contact_phone: `02${String(80_000_000 + i * 49_137).slice(0, 8)}`,
    contact_email: `hello@${name.toLowerCase().replace(/[^a-z]+/g, '')}.test`,
    suite_or_unit: `Suite ${i + 1}0${i % 5}`,
    floor: `${(i % 9) + 1}`,
    status: i % 8 === 0 ? 'inactive' : 'active',
    created_at: iso(60 * 24 * (i + 5)),
    updated_at: iso(60 * (i + 3)),
    building: { id: b.id, name: b.name },
  };
});

const DRIVER_TYPES = ['delivery', 'contractor', 'visitor', 'tenant', 'building_owner'] as const;

export const transactions: Transaction[] = Array.from({ length: 34 }).map((_, i) => {
  const active = i < 12; // first dozen are currently parked
  const overstay = active && i % 9 === 0;
  const area = parkingAreas[i % parkingAreas.length];
  const space = parkingSpaces.find((s) => s.parking_area_id === area.id)!;
  const driver = drivers[i % drivers.length];
  const vehicle = vehicles[i % vehicles.length];
  const tenant = tenants[i % tenants.length];
  const inMins = active ? 30 + i * 23 : 60 * 24 + i * 47;
  const dur = active ? Math.floor((now - (now - inMins * 60_000)) / 60_000) : 45 + (i % 6) * 30;
  const status = overstay ? 'overstay' : active ? 'active' : i % 13 === 0 ? 'cancelled' : 'completed';
  return {
    id: i + 1,
    transaction_no: `TXN-${String(10_420 + i)}`,
    status,
    driver_type: DRIVER_TYPES[i % DRIVER_TYPES.length],
    building_id: area.building_id,
    parking_area_id: area.id,
    parking_space_id: space.id,
    tenant_id: tenant.id,
    driver_id: driver.id,
    vehicle_id: vehicle.id,
    transaction_date: iso(inMins),
    car_in_at: iso(inMins),
    car_out_at: active || status === 'cancelled' ? null : iso(inMins - dur),
    duration_minutes: active ? null : dur,
    entry_method: 'manual_entry',
    exit_method: active ? null : 'manual_entry',
    entry_plate_number_raw: vehicle.plate_number,
    exit_plate_number_raw: active ? null : vehicle.plate_number,
    comments: i % 5 === 0 ? 'Refrigerated delivery — priority bay.' : null,
    vehicle_snapshot: { plate_number: vehicle.plate_number, make: vehicle.make ?? '', model: vehicle.model ?? '' },
    driver_snapshot: { full_name: driver.full_name, company_name: driver.company_name ?? '' },
    tenant_snapshot: { name: tenant.name },
    created_at: iso(inMins),
    building: { id: area.building_id, name: buildings.find((b) => b.id === area.building_id)!.name },
    parking_area: { id: area.id, name: area.name },
    parking_space: { id: space.id, space_code: space.space_code },
    tenant: { id: tenant.id, name: tenant.name },
    driver: { id: driver.id, full_name: driver.full_name },
    vehicle: { id: vehicle.id, plate_number: vehicle.plate_number },
    events: [
      { id: 1, type: 'check_in', description: `Checked in at ${space.space_code}`, created_at: iso(inMins) },
      ...(overstay ? [{ id: 2, type: 'overstay', description: 'Flagged as overstay', created_at: iso(inMins - 240) }] : []),
      ...(!active && status !== 'cancelled' ? [{ id: 3, type: 'check_out', description: 'Checked out', created_at: iso(inMins - dur) }] : []),
    ],
  };
});

const BOOKING_STATUS = ['confirmed', 'pending', 'confirmed', 'fulfilled', 'cancelled', 'pending', 'expired'] as const;

export const bookings: Booking[] = Array.from({ length: 18 }).map((_, i) => {
  const area = parkingAreas[i % parkingAreas.length];
  const space = parkingSpaces.find((s) => s.parking_area_id === area.id)!;
  const tenant = tenants[i % tenants.length];
  const driver = drivers[i % drivers.length];
  const vehicle = vehicles[i % vehicles.length];
  const startMin = (i - 6) * 180;
  return {
    id: i + 1,
    booking_no: `BK-${String(5_200 + i)}`,
    status: BOOKING_STATUS[i % BOOKING_STATUS.length],
    building_id: area.building_id,
    parking_area_id: area.id,
    parking_space_id: space.id,
    tenant_id: tenant.id,
    driver_id: driver.id,
    vehicle_id: vehicle.id,
    driver_type: DRIVER_TYPES[i % DRIVER_TYPES.length],
    plate_number_raw: vehicle.plate_number,
    contact_name: driver.full_name,
    contact_phone: driver.phone,
    starts_at: startMin >= 0 ? isoAhead(startMin) : iso(-startMin),
    ends_at: startMin >= 0 ? isoAhead(startMin + 120) : iso(-startMin - 120),
    notes: i % 4 === 0 ? 'Bulky furniture delivery.' : null,
    parking_transaction_id: i % 6 === 3 ? 1 : null,
    created_at: iso(60 * 24 * (i + 1)),
    building: { id: area.building_id, name: buildings.find((b) => b.id === area.building_id)!.name },
    parking_area: { id: area.id, name: area.name },
    parking_space: { id: space.id, space_code: space.space_code },
    tenant: { id: tenant.id, name: tenant.name },
  };
});

/* ---- Dashboard ---- */
export function dashboard(): DashboardResponse {
  const occupied = transactions.filter((t) => t.status === 'active' || t.status === 'overstay').length;
  const total = parkingSpaces.length;
  return {
    metrics: {
      buildings: buildings.length,
      tenants: tenants.length,
      areas: parkingAreas.length,
      total_spaces: total,
      active_spaces: total,
      occupied_spaces: occupied,
      available_spaces: total - occupied,
      occupancy_percentage: Math.round((occupied / total) * 100),
      currently_inside: occupied,
      visitor_inside: transactions.filter((t) => t.status === 'active' && t.driver_type === 'visitor').length,
      delivery_inside: transactions.filter((t) => t.status === 'active' && t.driver_type === 'delivery').length,
      today_transactions: 28,
      today_checkouts: 16,
      overstay_alerts: transactions.filter((t) => t.status === 'overstay').length,
      open_overstay_incidents: 2,
      plate_review_required: 3,
      flexible_allocation_quota: 40,
      flexible_allocation_used: 27,
      flexible_allocation_usage_percentage: 68,
    },
    active_vehicles: { data: transactions.filter((t) => t.status === 'active' || t.status === 'overstay') },
  };
}

/* ---- Helpers ---- */
export function paginate<T>(rows: T[], page = 1, perPage = PER_PAGE): Paginator<T> {
  const total = rows.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, page), lastPage);
  const start = (current - 1) * perPage;
  return {
    data: rows.slice(start, start + perPage),
    links: { first: '1', last: String(lastPage), prev: current > 1 ? String(current - 1) : null, next: current < lastPage ? String(current + 1) : null },
    meta: { current_page: current, last_page: lastPage, per_page: perPage, total },
  };
}

export function nextId(rows: { id: number }[]): number {
  return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
}

/** Simulated network latency so loading states are visible. */
export function delay<T>(value: T, ms = 320): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
