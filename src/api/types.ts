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
export type ResetPasswordRequest = { old_password: string; password: string; password_confirmation: string };

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
export type TransactionStatus = 'active' | 'completed' | 'cancelled';
export type BookingStatus = 'pending' | 'confirmed' | 'fulfilled' | 'cancelled' | 'expired';

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
  type?: string;
  event_type?: string;
  description?: string | null;
  comments?: string | null;
  created_at: string;
};

export type DriverLastVisit = {
  id: number;
  transaction_no: string;
  car_in_at: string | null;
  car_out_at: string | null;
  duration_minutes: number | null;
  tenant: { id: number; name: string } | null;
};

export type DriverVisitSummary = {
  total_visits: number;
  total_duration_minutes: number;
  last_visit: DriverLastVisit | null;
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
  parked_duration_minutes: number;
  parked_duration_label: string;
  effective_duration_minutes: number;
  parking_time_limit_minutes: number | null;
  overstay_minutes: number;
  is_overstay: boolean;
  comments: string | null;
  tenant_snapshot: Record<string, string | null> | null;
  created_at: string;
  // present on show
  building?: { id: number; name: string };
  parking_area?: { id: number; name: string };
  parking_space?: { id: number; space_code: string };
  tenant?: { id: number; name: string };
  driver?: {
    id: number;
    full_name: string;
    phone?: string | null;
    email?: string | null;
    company_name?: string | null;
  };
  vehicle?: { id: number; plate_number: string; plate_state?: string | null };
  events?: TransactionEvent[];
  driver_visit_summary?: DriverVisitSummary | null;
};

export type SpaceStatus = 'occupied' | 'booked' | 'available';

export type BookingsBySpaceGroup = {
  parking_space_id: number;
  space_code: string;
  status: SpaceStatus;
  bookings: Booking[];
};

export type BookingsBySpaceResponse = {
  data: BookingsBySpaceGroup[];
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
  starts_at: string;
  ends_at: string;
  notes: string | null;
  parking_transaction_id: number | null;
  created_at: string;
  building?: { id: number; name: string };
  parking_area?: { id: number; name: string };
  parking_space?: { id: number; space_code: string };
  tenant?: { id: number; name: string };
  driver?: {
    id: number;
    full_name: string;
    phone?: string | null;
    email?: string | null;
    company_name?: string | null;
  };
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
  maintenance_spaces: number;
  blocked_spaces: number;
  occupancy_percentage: number;
  currently_inside: number;
  visitor_inside: number;
  delivery_inside: number;
  today_transactions: number;
  today_checkouts: number;
  flexible_allocation_quota: number;
  flexible_allocation_used: number;
  flexible_allocation_usage_percentage: number;
  overstay_alerts: number;
  open_overstay_incidents: number;
  daily_utilisation_percentage: number;
  daily_utilised_minutes: number;
  daily_available_minutes: number;
};

export type DashboardOccupancy = {
  period: string;
  date: string;
  total_bays: number;
  occupied_bays: number;
  available_bays: number;
  percentage: number;
};

export type DashboardActiveVehicle = {
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
  car_in_at: string;
  car_out_at: string | null;
  duration_minutes: number | null;
  parked_duration_minutes: number;
  parked_duration_label: string;
  effective_duration_minutes: number;
  parking_time_limit_minutes: number | null;
  overstay_minutes: number;
  is_overstay: boolean;
  comments: string | null;
  tenant_snapshot: { id: number; name: string } | null;
  created_at: string;
  parking_area: { id: number; name: string } | null;
  parking_space: { id: number; space_code: string } | null;
  vehicle: { id: number; plate_number: string; plate_state: string | null } | null;
  events: TransactionEvent[];
};

export type DashboardBreakdown = {
  type: string;
  label: string;
  value: number;
};

export type DashboardDailyMovement = {
  date: string;
  label: string;
  car_in: number;
  car_out: number;
};

export type DashboardDailyParkingHours = {
  date: string;
  day: string;
  is_operating_day: boolean;
  active_bays: number;
  operating_hours_per_bay: number;
  total_capacity_minutes: number;
  total_capacity_hours: number;
  total_parked_minutes: number;
  total_parked_hours: number;
  occupancy_percentage: number;
};

export type DashboardVisitorTypeTrend = {
  date: string;
  label: string;
  booked: number;
  visitor: number;
  tenant: number;
  delivery: number;
};

export type DashboardDailyUtilisation = {
  date: string;
  label: string;
  percentage: number;
  utilised_minutes: number;
  available_minutes: number;
};

export type DashboardOccupancySnapshot = {
  date: string;
  snapshot_at: string;
  total_bays: number;
  occupied_bays: number;
  available_bays: number;
  percentage: number;
};

export type DashboardWeekOccupancy = {
  filters: {
    date_from: string;
    date_to: string;
    building_id: number | null;
    parking_area_id: number | null;
  };
  summary: DashboardOccupancySnapshot;
  daily: DashboardOccupancySnapshot[];
  meta: {
    occupancy_basis: string;
    capacity_basis: string;
  };
};

export type DashboardWeekParkingHours = {
  filters: {
    date_from: string;
    date_to: string;
    building_id: number | null;
    parking_area_id: number | null;
  };
  summary: {
    total_parked_minutes: number;
    total_parked_hours: number;
  };
  daily: DashboardDailyParkingHours[];
};

export type DashboardResponse = {
  filters: {
    building_id: number | null;
    parking_area_id: number | null;
  };
  metrics: DashboardMetrics;
  occupancy: DashboardOccupancy;
  active_vehicles: DashboardActiveVehicle[];
  visitor_type_trend: DashboardVisitorTypeTrend[];
  movement_summary: {
    last_24_hours: number;
    last_7_days: number;
    daily_average: number;
  };
  daily_movement_trend: DashboardDailyMovement[];
  weekly_movement_breakdown: DashboardBreakdown[];
  vehicle_breakdown: DashboardBreakdown[];
  previous_week_utilisation: DashboardDailyUtilisation[];
  current_week_parking_hours: DashboardWeekParkingHours;
  this_week_occupancy: DashboardWeekOccupancy;
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

/* ---- Phase 2 enums ---- */
export type AreaType = 'standard' | 'visitor' | 'loading' | 'contractor' | 'mixed';
export type SpaceType = 'standard' | 'accessible' | 'ev' | 'motorcycle' | 'loading' | 'visitor';
export type SpaceDefaultUsage = 'building_owner' | 'tenant' | 'contractor' | 'visitor' | 'delivery' | 'flexible';
export type SpaceOperationalStatus = 'active' | 'inactive' | 'maintenance' | 'blocked';
export type AllocationType = 'flexible_quota' | 'temporary_quota' | 'visitor_quota' | 'loading_quota';
export type UserCategory = 'building_owner' | 'tenant' | 'contractor' | 'visitor' | 'delivery';
export type IncidentType = 'damage' | 'unauthorised_vehicle' | 'overstay' | 'blocked_space' | 'safety' | 'other';
export type IncidentStatus = 'open' | 'resolved' | 'cancelled';
export type AreaStatus = 'active' | 'inactive' | 'maintenance';
export type OperatingDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';
export interface OperatingScheduleFields {
  operating_start_time: string | null;
  operating_end_time: string | null;
  operating_days: OperatingDay[] | null;
  parking_time_limit_minutes: number | null;
}

/* ---- Phase 2 resources ---- */

export type BuildingResource = OperatingScheduleFields & {
  id: number;
  name: string;
  code: string | null;
  building_type: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address_line_1: string;
  address_line_2: string | null;
  suburb: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

export type ParkingAreaResource = OperatingScheduleFields & {
  id: number;
  building_id: number;
  name: string;
  code: string | null;
  level: string | null;
  area_type: AreaType;
  capacity: number;
  status: AreaStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  inherits_building_operating_schedule: boolean;
  effective_operating_start_time: string | null;
  effective_operating_end_time: string | null;
  effective_operating_days: OperatingDay[];
  effective_parking_time_limit_minutes: number | null;
  building?: { id: number; name: string };
};

export type OperatingHoursResource = OperatingScheduleFields & {
  id: number;
  building_id: number;
  building: { id: number; name: string } & OperatingScheduleFields;
  name: string;
  code: string | null;
  active_bays_count: number;
  inherits_building_operating_schedule: boolean;
  effective_operating_start_time: string | null;
  effective_operating_end_time: string | null;
  effective_operating_days: OperatingDay[];
  effective_parking_time_limit_minutes: number | null;
  status: AreaStatus;
};

export type ParkingSpaceResource = {
  id: number;
  building_id: number;
  parking_area_id: number;
  space_code: string;
  space_type: SpaceType;
  default_usage: SpaceDefaultUsage;
  operational_status: SpaceOperationalStatus;
  occupancy_status: string;
  current_transaction_id: number | null;
  current_vehicle_id: number | null;
  occupied_since: string | null;
  sort_order: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  building?: { id: number; name: string };
  parking_area?: { id: number; name: string };
  current_transaction?: { id: number; transaction_no: string; car_in_at: string | null; status: string } | null;
  current_vehicle?: { id: number; plate_number: string } | null;
};

export type OccupancyGridResponse = {
  spaces: ParkingSpaceResource[];
  areas: { id: number; building_id: number; name: string }[];
  buildings: { id: number; name: string }[];
  summary: { total: number; available: number; occupied: number; active: number; maintenance: number; blocked: number; inactive: number };
};

export type Allocation = {
  id: number;
  building_id: number;
  tenant_id: number | null;
  parking_area_id: number | null;
  allocation_type: AllocationType;
  user_category: UserCategory;
  quota: number;
  release_after_minutes: number | null;
  starts_at: string | null;
  ends_at: string | null;
  status: 'active' | 'inactive' | 'expired';
  notes: string | null;
  created_at: string;
  updated_at: string;
  building?: { id: number; name: string };
  tenant?: { id: number; name: string } | null;
  parking_area?: { id: number; name: string } | null;
};


export type Incident = {
  id: number;
  parking_transaction_id: number | null;
  parking_space_id: number | null;
  incident_type: IncidentType;
  description: string;
  status: IncidentStatus;
  reported_by: number;
  resolved_by: number | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  parking_transaction?: { id: number; transaction_no: string } | null;
  parking_space?: { id: number; space_code: string } | null;
  reporter?: { id: number; name: string } | null;
};

/* ---- Users (§6D) ---- */
export type RoleResource = {
  id: number;
  name: string;
  slug: string;
  scope: 'system' | 'company';
  company_id: number | null;
};

export type CompanyUser = {
  id: number;
  company_id: number;
  role_id: number;
  status: 'active' | 'inactive';
  role: { id: number; name: string; slug: string };
};

export type UserResource = {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  company_users: CompanyUser[];
};
