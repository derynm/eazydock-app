/**
 * In-memory dataset used when EXPO_PUBLIC_API_URL is unset (USE_FIXTURES).
 * Shapes match api/types.ts exactly so screens behave like the live API.
 * Mutations persist for the session (kept in module-level arrays).
 */
import type {
  Allocation,
  Booking,
  Building,
  BuildingResource,
  Company,
  DashboardResponse,
  Driver,
  Incident,
  ParkingArea,
  ParkingAreaResource,
  ParkingSpace,
  ParkingSpaceResource,
  Paginator,
  RoleResource,
  Tenant,
  Transaction,
  UserPayload,
  UserResource,
  Vehicle,
} from './types';

export const PER_PAGE = 20;

const now = Date.now();
const iso = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString();
const isoAhead = (minsAhead: number) => new Date(now + minsAhead * 60_000).toISOString();
const durationLabel = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `${hours}h${remainder > 0 ? ` ${remainder}m` : ''}` : `${remainder}m`;
};

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
    'operations.incidents': ALL_ACTIONS,
    'people_vehicles.drivers': ALL_ACTIONS,
    'people_vehicles.vehicles': ALL_ACTIONS,
    'locations.tenants': { view: true, create: true, update: true, delete: false },
    'locations.buildings': ALL_ACTIONS,
    'locations.parking_areas': ALL_ACTIONS,
    'locations.operating_hours': { view: true, create: false, update: true, delete: false },
    'locations.spaces': ALL_ACTIONS,
    'locations.allocations': ALL_ACTIONS,
    'administration.users': ALL_ACTIONS,
  },
};

export const roles: RoleResource[] = [
  { id: 1, name: 'Admin', slug: 'admin', scope: 'system', company_id: null },
  { id: 2, name: 'Manager', slug: 'manager', scope: 'system', company_id: null },
  { id: 3, name: 'Supervisor', slug: 'supervisor', scope: 'system', company_id: null },
  { id: 4, name: 'Operation', slug: 'operation', scope: 'system', company_id: null },
  { id: 5, name: 'Employee', slug: 'employee', scope: 'system', company_id: null },
];

export const users: UserResource[] = [
  { id: 1, name: 'Jordan Avery', email: 'jordan@acme.test', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), company_users: [{ id: 1, company_id: 3, role_id: 1, status: 'active', role: { id: 1, name: 'Admin', slug: 'admin' } }] },
  { id: 2, name: 'Sam Taylor', email: 'sam@acme.test', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), company_users: [{ id: 2, company_id: 3, role_id: 2, status: 'active', role: { id: 2, name: 'Manager', slug: 'manager' } }] },
  { id: 3, name: 'Alex Kim', email: 'alex@acme.test', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), company_users: [{ id: 3, company_id: 3, role_id: 4, status: 'inactive', role: { id: 4, name: 'Operation', slug: 'operation' } }] },
];

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
  const status = active ? 'active' : i % 13 === 0 ? 'cancelled' : 'completed';
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
    parked_duration_minutes: dur,
    parked_duration_label: durationLabel(dur),
    effective_duration_minutes: dur,
    parking_time_limit_minutes: i % 4 === 0 ? 120 : null,
    overstay_minutes: overstay ? Math.max(1, dur - 120) : 0,
    is_overstay: overstay,
    comments: i % 5 === 0 ? 'Refrigerated delivery — priority bay.' : null,
    tenant_snapshot: { name: tenant.name },
    created_at: iso(inMins),
    building: { id: area.building_id, name: buildings.find((b) => b.id === area.building_id)!.name },
    parking_area: { id: area.id, name: area.name },
    parking_space: { id: space.id, space_code: space.space_code },
    tenant: { id: tenant.id, name: tenant.name },
    driver: { id: driver.id, full_name: driver.full_name, phone: driver.phone, email: driver.email, company_name: driver.company_name },
    vehicle: { id: vehicle.id, plate_number: vehicle.plate_number, plate_state: vehicle.plate_state },
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
    starts_at: startMin >= 0 ? isoAhead(startMin) : iso(-startMin),
    ends_at: startMin >= 0 ? isoAhead(startMin + 120) : iso(-startMin - 120),
    notes: i % 4 === 0 ? 'Bulky furniture delivery.' : null,
    parking_transaction_id: i % 6 === 3 ? 1 : null,
    created_at: iso(60 * 24 * (i + 1)),
    building: { id: area.building_id, name: buildings.find((b) => b.id === area.building_id)!.name },
    parking_area: { id: area.id, name: area.name },
    parking_space: { id: space.id, space_code: space.space_code },
    tenant: { id: tenant.id, name: tenant.name },
    driver: { id: driver.id, full_name: driver.full_name, phone: driver.phone, email: driver.email, company_name: driver.company_name },
  };
});

/* ---- Phase 2 fixtures ---- */

export const buildingResources: BuildingResource[] = [
  { id: 1, name: 'Riverside Tower', code: 'RIV', building_type: 'office', contact_name: 'Sam Walsh', contact_phone: '0291230001', contact_email: 'sam@riverside.test', address_line_1: '1 Riverside Drive', address_line_2: null, suburb: 'Sydney', state: 'NSW', postal_code: '2000', country: 'Australia', latitude: -33.8688, longitude: 151.2093, status: 'active', operating_start_time: '07:00', operating_end_time: '20:00', operating_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], parking_time_limit_minutes: 240, created_at: iso(60 * 24 * 30), updated_at: iso(60 * 24 * 5) },
  { id: 2, name: 'Dock 7 Warehouse', code: 'D7W', building_type: 'warehouse', contact_name: 'Riley Park', contact_phone: '0291230002', contact_email: 'riley@dock7.test', address_line_1: '7 Dock Street', address_line_2: null, suburb: 'Pyrmont', state: 'NSW', postal_code: '2009', country: 'Australia', latitude: -33.8714, longitude: 151.1945, status: 'active', operating_start_time: '20:00', operating_end_time: '07:00', operating_days: null, parking_time_limit_minutes: 180, created_at: iso(60 * 24 * 25), updated_at: iso(60 * 24 * 3) },
  { id: 3, name: 'Central Plaza', code: 'CPZ', building_type: 'mixed', contact_name: 'Morgan Lee', contact_phone: '0291230003', contact_email: 'morgan@centralplaza.test', address_line_1: '50 Central Avenue', address_line_2: 'Level 1', suburb: 'Melbourne', state: 'VIC', postal_code: '3000', country: 'Australia', latitude: -37.8136, longitude: 144.9631, status: 'active', operating_start_time: null, operating_end_time: null, operating_days: null, parking_time_limit_minutes: null, created_at: iso(60 * 24 * 20), updated_at: iso(60 * 24 * 2) },
];

export const parkingAreaResources: ParkingAreaResource[] = [
  { id: 1, building_id: 1, name: 'Level B1', code: 'B1', level: 'B1', area_type: 'standard', capacity: 40, status: 'active', notes: null, inherits_building_operating_schedule: true, operating_start_time: '06:00', operating_end_time: '23:00', operating_days: ['monday', 'tuesday', 'wednesday'], parking_time_limit_minutes: 300, effective_operating_start_time: '07:00', effective_operating_end_time: '20:00', effective_operating_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], effective_parking_time_limit_minutes: 240, created_at: iso(60 * 24 * 28), updated_at: iso(60 * 24 * 4), building: { id: 1, name: 'Riverside Tower' } },
  { id: 2, building_id: 1, name: 'Level B2', code: 'B2', level: 'B2', area_type: 'visitor', capacity: 20, status: 'active', notes: 'Visitor parking only', inherits_building_operating_schedule: false, operating_start_time: '00:00', operating_end_time: '23:59', operating_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], parking_time_limit_minutes: null, effective_operating_start_time: '00:00', effective_operating_end_time: '23:59', effective_operating_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], effective_parking_time_limit_minutes: null, created_at: iso(60 * 24 * 28), updated_at: iso(60 * 24 * 4), building: { id: 1, name: 'Riverside Tower' } },
  { id: 3, building_id: 2, name: 'Loading Bay A', code: 'LBA', level: 'Ground', area_type: 'loading', capacity: 8, status: 'active', notes: null, inherits_building_operating_schedule: true, operating_start_time: null, operating_end_time: null, operating_days: null, parking_time_limit_minutes: null, effective_operating_start_time: '20:00', effective_operating_end_time: '07:00', effective_operating_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], effective_parking_time_limit_minutes: 180, created_at: iso(60 * 24 * 23), updated_at: iso(60 * 24 * 2), building: { id: 2, name: 'Dock 7 Warehouse' } },
  { id: 4, building_id: 2, name: 'Yard', code: 'YRD', level: null, area_type: 'contractor', capacity: 15, status: 'maintenance', notes: 'Resurfacing in progress', inherits_building_operating_schedule: false, operating_start_time: null, operating_end_time: null, operating_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], parking_time_limit_minutes: 90, effective_operating_start_time: null, effective_operating_end_time: null, effective_operating_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], effective_parking_time_limit_minutes: 90, created_at: iso(60 * 24 * 23), updated_at: iso(60 * 24 * 1), building: { id: 2, name: 'Dock 7 Warehouse' } },
  { id: 5, building_id: 3, name: 'Visitor Deck', code: 'VD1', level: 'Roof', area_type: 'visitor', capacity: 30, status: 'active', notes: null, inherits_building_operating_schedule: false, operating_start_time: '06:00', operating_end_time: '22:00', operating_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], parking_time_limit_minutes: null, effective_operating_start_time: '06:00', effective_operating_end_time: '22:00', effective_operating_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], effective_parking_time_limit_minutes: null, created_at: iso(60 * 24 * 18), updated_at: iso(60 * 24 * 1), building: { id: 3, name: 'Central Plaza' } },
];

const SPACE_TYPES_FX = ['standard', 'accessible', 'ev', 'visitor', 'standard', 'standard', 'loading', 'motorcycle'] as const;
const USAGE_FX = ['tenant', 'visitor', 'flexible', 'visitor', 'building_owner', 'contractor', 'delivery', 'tenant'] as const;
const OP_STATUS_FX = ['active', 'active', 'active', 'active', 'active', 'active', 'maintenance', 'blocked'] as const;

export const parkingSpaceResources: ParkingSpaceResource[] = parkingAreaResources.flatMap((area) =>
  Array.from({ length: 8 }).map<ParkingSpaceResource>((_, i) => {
    const isOccupied = i % 3 === 0;
    const txn = isOccupied ? transactions[i % 12] : null;
    return {
      id: area.id * 100 + i + 1,
      building_id: area.building_id,
      parking_area_id: area.id,
      space_code: `${area.code}-${String(i + 1).padStart(2, '0')}`,
      space_type: SPACE_TYPES_FX[i % SPACE_TYPES_FX.length],
      default_usage: USAGE_FX[i % USAGE_FX.length],
      operational_status: OP_STATUS_FX[i % OP_STATUS_FX.length],
      occupancy_status: isOccupied ? 'occupied' : 'available',
      current_transaction_id: txn?.id ?? null,
      current_vehicle_id: txn?.vehicle_id ?? null,
      occupied_since: txn?.car_in_at ?? null,
      sort_order: i + 1,
      notes: null,
      created_at: iso(60 * 24 * 25),
      updated_at: iso(60 * 2),
      building: { id: area.building_id, name: buildingResources.find((b) => b.id === area.building_id)?.name ?? '' },
      parking_area: { id: area.id, name: area.name },
      current_transaction: txn ? { id: txn.id, transaction_no: txn.transaction_no, car_in_at: txn.car_in_at, status: txn.status } : null,
      current_vehicle: txn?.vehicle ? { id: txn.vehicle.id, plate_number: txn.vehicle.plate_number } : null,
    };
  }),
);

export const allocations: Allocation[] = [
  { id: 1, building_id: 1, tenant_id: 1, parking_area_id: 1, allocation_type: 'flexible_quota', user_category: 'tenant', quota: 10, release_after_minutes: 30, starts_at: null, ends_at: null, status: 'active', notes: null, created_at: iso(60 * 24 * 15), updated_at: iso(60 * 24 * 5), building: { id: 1, name: 'Riverside Tower' }, tenant: { id: 1, name: 'Brightline Apparel' }, parking_area: { id: 1, name: 'Level B1' } },
  { id: 2, building_id: 1, tenant_id: null, parking_area_id: 2, allocation_type: 'visitor_quota', user_category: 'visitor', quota: 20, release_after_minutes: 60, starts_at: null, ends_at: null, status: 'active', notes: 'General visitor slots', created_at: iso(60 * 24 * 12), updated_at: iso(60 * 24 * 3), building: { id: 1, name: 'Riverside Tower' }, tenant: null, parking_area: { id: 2, name: 'Level B2' } },
  { id: 3, building_id: 2, tenant_id: 3, parking_area_id: 3, allocation_type: 'loading_quota', user_category: 'delivery', quota: 4, release_after_minutes: null, starts_at: null, ends_at: null, status: 'active', notes: null, created_at: iso(60 * 24 * 10), updated_at: iso(60 * 24 * 2), building: { id: 2, name: 'Dock 7 Warehouse' }, tenant: { id: 3, name: 'Quill & Co Legal' }, parking_area: { id: 3, name: 'Loading Bay A' } },
  { id: 4, building_id: 3, tenant_id: null, parking_area_id: null, allocation_type: 'temporary_quota', user_category: 'contractor', quota: 6, release_after_minutes: null, starts_at: new Date(now - 30 * 86400_000).toISOString().slice(0, 10), ends_at: new Date(now + 60 * 86400_000).toISOString().slice(0, 10), status: 'active', notes: 'Construction crew', created_at: iso(60 * 24 * 8), updated_at: iso(60 * 24 * 1), building: { id: 3, name: 'Central Plaza' }, tenant: null, parking_area: null },
];


const INCIDENT_TYPES_FX = ['overstay', 'damage', 'blocked_space', 'unauthorised_vehicle', 'safety', 'other'] as const;
const INCIDENT_STATUS_FX = ['open', 'open', 'resolved', 'open', 'cancelled', 'resolved'] as const;

export const incidents: Incident[] = Array.from({ length: 10 }).map((_, i) => {
  const txn = transactions[i % 12];
  const space = parkingSpaceResources[i % parkingSpaceResources.length];
  const resolved = INCIDENT_STATUS_FX[i % INCIDENT_STATUS_FX.length] === 'resolved';
  const resolvedAt = resolved ? iso(60 * (i + 1)) : null;
  return {
    id: i + 1,
    parking_transaction_id: i % 3 === 0 ? txn.id : null,
    parking_space_id: i % 2 === 0 ? space.id : null,
    incident_type: INCIDENT_TYPES_FX[i % INCIDENT_TYPES_FX.length],
    description: [
      'Vehicle has exceeded maximum stay time.',
      'Front bumper damage observed on parked van.',
      'Bay blocked by unidentified vehicle.',
      'Unregistered vehicle found in reserved area.',
      'Oil spill in bay — hazmat cleanup needed.',
      'Space occupied outside of allocated hours.',
    ][i % 6],
    status: INCIDENT_STATUS_FX[i % INCIDENT_STATUS_FX.length],
    reported_by: 1,
    resolved_by: resolved ? 1 : null,
    resolved_at: resolvedAt,
    created_at: iso(60 * 24 * (i + 1)),
    updated_at: resolvedAt ?? iso(60 * 24 * i),
    parking_transaction: i % 3 === 0 ? { id: txn.id, transaction_no: txn.transaction_no } : null,
    parking_space: i % 2 === 0 ? { id: space.id, space_code: space.space_code } : null,
    reporter: { id: 1, name: 'Jordan Avery' },
  };
});

/* ---- Dashboard ---- */
export function dashboard(params: { building_id?: number; parking_area_id?: number } = {}): DashboardResponse {
  const activeVehicles = [transactions[0], transactions[2]]
    .filter(
      (transaction) =>
        (!params.building_id || transaction.building_id === params.building_id) &&
        (!params.parking_area_id || transaction.parking_area_id === params.parking_area_id),
    )
    .map((transaction) => {
      const parkedMinutes = Math.max(
        0,
        Math.floor((now - new Date(transaction.car_in_at ?? now).getTime()) / 60_000),
      );
      const vehicle = vehicles.find((item) => item.id === transaction.vehicle_id);
      const tenant = tenants.find((item) => item.id === transaction.tenant_id);

      return {
        id: transaction.id,
        transaction_no: transaction.transaction_no,
        status: 'active' as const,
        driver_type: transaction.driver_type,
        building_id: transaction.building_id,
        parking_area_id: transaction.parking_area_id,
        parking_space_id: transaction.parking_space_id,
        tenant_id: transaction.tenant_id,
        driver_id: transaction.driver_id,
        vehicle_id: transaction.vehicle_id,
        transaction_date: transaction.transaction_date,
        car_in_at: transaction.car_in_at ?? new Date(now).toISOString(),
        car_out_at: null,
        duration_minutes: null,
        parked_duration_minutes: parkedMinutes,
        parked_duration_label: durationLabel(parkedMinutes),
        effective_duration_minutes: parkedMinutes,
        parking_time_limit_minutes: transaction.parking_time_limit_minutes,
        overstay_minutes: transaction.overstay_minutes,
        is_overstay: transaction.is_overstay,
        comments: transaction.comments,
        tenant_snapshot: tenant ? { id: tenant.id, name: tenant.name } : null,
        created_at: transaction.created_at,
        parking_area: transaction.parking_area ?? null,
        parking_space: transaction.parking_space ?? null,
        vehicle: vehicle
          ? { id: vehicle.id, plate_number: vehicle.plate_number, plate_state: vehicle.plate_state }
          : null,
        events: transaction.events ?? [],
      };
    });

  return {
    filters: {
      building_id: params.building_id ?? null,
      parking_area_id: params.parking_area_id ?? null,
    },
    metrics: {
      buildings: 1,
      tenants: 4,
      areas: 1,
      total_spaces: 15,
      active_spaces: 15,
      occupied_spaces: 2,
      available_spaces: 13,
      maintenance_spaces: 0,
      blocked_spaces: 0,
      occupancy_percentage: 13.3,
      currently_inside: 2,
      visitor_inside: 1,
      delivery_inside: 1,
      today_transactions: 5,
      today_checkouts: 3,
      flexible_allocation_quota: 10,
      flexible_allocation_used: 2,
      flexible_allocation_usage_percentage: 20,
      overstay_alerts: 0,
      open_overstay_incidents: 0,
      daily_utilisation_percentage: 13.3,
      daily_utilised_minutes: 2873,
      daily_available_minutes: 21600,
    },
    occupancy: {
      period: 'today',
      date: new Date(now).toISOString().slice(0, 10),
      total_bays: 15,
      occupied_bays: 2,
      available_bays: 13,
      percentage: 13.3,
    },
    active_vehicles: activeVehicles,
    visitor_type_trend: [],
    movement_summary: {
      last_24_hours: 5,
      last_7_days: 24,
      daily_average: 3.4,
    },
    daily_movement_trend: [
      { date: '2026-07-26', label: 'Sun', car_in: 28, car_out: 25 },
      { date: '2026-07-27', label: 'Mon', car_in: 49, car_out: 46 },
      { date: '2026-07-28', label: 'Tue', car_in: 52, car_out: 50 },
      { date: '2026-07-29', label: 'Wed', car_in: 50, car_out: 48 },
      { date: '2026-07-30', label: 'Thu', car_in: 61, car_out: 57 },
      { date: '2026-07-31', label: 'Fri', car_in: 59, car_out: 55 },
      { date: '2026-08-01', label: 'Sat', car_in: 47, car_out: 25 },
    ],
    weekly_movement_breakdown: [
      { type: 'car_in', label: 'Car in', value: 5 },
      { type: 'car_out', label: 'Car out', value: 3 },
    ],
    vehicle_breakdown: [],
    previous_week_utilisation: [],
    current_week_parking_hours: {
      filters: {
        date_from: '2026-07-27',
        date_to: '2026-08-02',
        building_id: params.building_id ?? null,
        parking_area_id: params.parking_area_id ?? null,
      },
      summary: {
        total_parked_minutes: 36540,
        total_parked_hours: 609,
      },
      daily: [
        { date: '2026-07-27', day: 'Monday', is_operating_day: true, active_bays: 14, operating_hours_per_bay: 10, total_capacity_minutes: 8400, total_capacity_hours: 140, total_parked_minutes: 5100, total_parked_hours: 85, occupancy_percentage: 60.7 },
        { date: '2026-07-28', day: 'Tuesday', is_operating_day: true, active_bays: 14, operating_hours_per_bay: 10, total_capacity_minutes: 8400, total_capacity_hours: 140, total_parked_minutes: 7380, total_parked_hours: 123, occupancy_percentage: 87.9 },
        { date: '2026-07-29', day: 'Wednesday', is_operating_day: true, active_bays: 14, operating_hours_per_bay: 10, total_capacity_minutes: 8400, total_capacity_hours: 140, total_parked_minutes: 5520, total_parked_hours: 92, occupancy_percentage: 65.7 },
        { date: '2026-07-30', day: 'Thursday', is_operating_day: true, active_bays: 14, operating_hours_per_bay: 10, total_capacity_minutes: 8400, total_capacity_hours: 140, total_parked_minutes: 5700, total_parked_hours: 95, occupancy_percentage: 67.9 },
        { date: '2026-07-31', day: 'Friday', is_operating_day: true, active_bays: 14, operating_hours_per_bay: 10, total_capacity_minutes: 8400, total_capacity_hours: 140, total_parked_minutes: 4740, total_parked_hours: 79, occupancy_percentage: 56.4 },
        { date: '2026-08-01', day: 'Saturday', is_operating_day: true, active_bays: 14, operating_hours_per_bay: 10, total_capacity_minutes: 8400, total_capacity_hours: 140, total_parked_minutes: 8100, total_parked_hours: 135, occupancy_percentage: 96.4 },
        { date: '2026-08-02', day: 'Sunday', is_operating_day: false, active_bays: 14, operating_hours_per_bay: 0, total_capacity_minutes: 0, total_capacity_hours: 0, total_parked_minutes: 0, total_parked_hours: 0, occupancy_percentage: 0 },
      ],
    },
    this_week_occupancy: {
      filters: {
        date_from: '2026-07-27',
        date_to: '2026-08-01',
        building_id: 1,
        parking_area_id: params.parking_area_id ?? null,
      },
      summary: {
        date: '2026-08-01',
        snapshot_at: '2026-08-01T11:22:00+10:00',
        total_bays: 15,
        occupied_bays: 2,
        available_bays: 13,
        percentage: 13.3,
      },
      daily: [
        { date: '2026-07-27', snapshot_at: '2026-07-27T23:59:59+10:00', total_bays: 15, occupied_bays: 5, available_bays: 10, percentage: 33.3 },
        { date: '2026-07-28', snapshot_at: '2026-07-28T23:59:59+10:00', total_bays: 15, occupied_bays: 7, available_bays: 8, percentage: 46.7 },
        { date: '2026-07-29', snapshot_at: '2026-07-29T23:59:59+10:00', total_bays: 15, occupied_bays: 6, available_bays: 9, percentage: 40 },
        { date: '2026-07-30', snapshot_at: '2026-07-30T23:59:59+10:00', total_bays: 15, occupied_bays: 9, available_bays: 6, percentage: 60 },
        { date: '2026-07-31', snapshot_at: '2026-07-31T23:59:59+10:00', total_bays: 15, occupied_bays: 8, available_bays: 7, percentage: 53.3 },
        { date: '2026-08-01', snapshot_at: '2026-08-01T11:22:00+10:00', total_bays: 15, occupied_bays: 2, available_bays: 13, percentage: 13.3 },
      ],
      meta: {
        occupancy_basis: 'assigned_transactions_at_snapshot',
        capacity_basis: 'active_bays_at_snapshot',
      },
    },
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
