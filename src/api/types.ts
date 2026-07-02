/**
 * Response / request types mirroring the live Phase 1 API (plan §6A).
 * Field names match the JSON contract exactly.
 */

/* ---- Envelopes ---- */
export type Paginator<T> = {
  data: T[];
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};
export type Single<T> = { data: T };

/* ---- Auth & company ---- */
export type User = { id: number; name: string; email: string };
export type Company = { id: number; name: string; code: string };

export type PermissionAction = 'view' | 'create' | 'update' | 'delete' | 'export';
export type PermissionMap = Record<string, Partial<Record<PermissionAction, boolean>>>;

export type UserPayload = {
  user: User;
  companies: Company[];
  is_super_admin: boolean;
  active_company_id: number | null;
  permissions: PermissionMap;
};

export type LoginRequest = { email: string; password: string; device_name?: string };
export type LoginResponse = UserPayload & { token: string };

/* ---- Shared enums ---- */
export type EntityStatus = 'active' | 'inactive' | 'banned';
export type VehicleType = 'car' | 'van' | 'truck' | 'motorcycle' | 'ute' | 'other';
export type TenantType =
  | 'building_owner'
  | 'tenant'
  | 'shop'
  | 'office'
  | 'contractor'
  | 'delivery_partner'
  | 'other';
export type DriverType = 'building_owner' | 'tenant' | 'contractor' | 'visitor' | 'delivery';
export type TransactionStatus = 'active' | 'completed' | 'cancelled' | 'overstay';
export type BookingStatus = 'pending' | 'confirmed' | 'fulfilled' | 'cancelled' | 'expired';
export type EntryMethod = 'browser_camera' | 'image_upload' | 'manual_entry';

/* ---- Resources ---- */
export type Driver = {
  id: number;
  full_name: string;
  phone: string | null;
  email: string | null;
  company_name: string | null;
  license_no: string | null;
  status: EntityStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vehicles?: { id: number; plate_number: string; plate_state: string | null }[];
};

export type Vehicle = {
  id: number;
  plate_number: string;
  plate_number_normalized: string;
  plate_state: string | null;
  plate_country: string | null;
  status: EntityStatus;
  notes: string | null;
  car_id: number | null;
  vehicle_type: VehicleType;
  make: string | null;
  model: string | null;
  colour: string | null;
  created_at: string;
  updated_at: string;
  drivers?: { id: number; full_name: string; company_name: string | null }[];
};

export type Tenant = {
  id: number;
  building_id: number;
  name: string;
  code: string | null;
  tenant_type: TenantType;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  suite_or_unit: string | null;
  floor: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  building?: { id: number; name: string };
};

export type TransactionEvent = {
  id: number;
  type: string;
  description: string;
  created_at: string;
};

export type Transaction = {
  id: number;
  transaction_no: string;
  status: TransactionStatus;
  driver_type: DriverType;
  building_id: number;
  parking_area_id: number;
  parking_space_id: number | null;
  tenant_id: number | null;
  driver_id: number | null;
  vehicle_id: number | null;
  transaction_date: string;
  car_in_at: string | null;
  car_out_at: string | null;
  duration_minutes: number | null;
  entry_method: EntryMethod | null;
  exit_method: string | null;
  entry_plate_number_raw: string | null;
  exit_plate_number_raw: string | null;
  comments: string | null;
  vehicle_snapshot: Record<string, string> | null;
  driver_snapshot: Record<string, string> | null;
  tenant_snapshot: Record<string, string> | null;
  created_at: string;
  // present on show
  building?: { id: number; name: string };
  parking_area?: { id: number; name: string };
  parking_space?: { id: number; space_code: string };
  tenant?: { id: number; name: string };
  driver?: { id: number; full_name: string };
  vehicle?: { id: number; plate_number: string };
  events?: TransactionEvent[];
};

export type Booking = {
  id: number;
  booking_no: string;
  status: BookingStatus;
  building_id: number;
  parking_area_id: number;
  parking_space_id: number;
  tenant_id: number | null;
  driver_id: number | null;
  vehicle_id: number | null;
  driver_type: DriverType;
  plate_number_raw: string;
  contact_name: string | null;
  contact_phone: string | null;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  parking_transaction_id: number | null;
  created_at: string;
  building?: { id: number; name: string };
  parking_area?: { id: number; name: string };
  parking_space?: { id: number; space_code: string };
  tenant?: { id: number; name: string };
  driver?: { id: number; full_name: string };
};

/* ---- Dashboard ---- */
export type DashboardMetrics = {
  buildings: number;
  tenants: number;
  areas: number;
  total_spaces: number;
  active_spaces: number;
  occupied_spaces: number;
  available_spaces: number;
  occupancy_percentage: number;
  currently_inside: number;
  visitor_inside: number;
  delivery_inside: number;
  today_transactions: number;
  today_checkouts: number;
  overstay_alerts: number;
  open_overstay_incidents: number;
  plate_review_required: number;
  flexible_allocation_quota: number;
  flexible_allocation_used: number;
  flexible_allocation_usage_percentage: number;
};

export type DashboardResponse = {
  metrics: DashboardMetrics;
  active_vehicles: { data: Transaction[] };
};

/* ---- Lookups ---- */
export type Building = { id: number; name: string };
export type ParkingArea = { id: number; building_id: number; name: string };
export type ParkingSpace = {
  id: number;
  building_id: number;
  parking_area_id: number;
  space_code: string;
  occupancy_status: string;
};

/* ---- List query params ---- */
export type ListParams = {
  page?: number;
  search?: string;
  status?: string;
  [key: string]: string | number | undefined;
};
