/**
 * Full-plate prefill for check-in (plan §6A: `transactions/plate-lookup`).
 * Returns `found: false` when the plate is unknown so the operator fills the
 * form in manually.
 */
import { api, USE_FIXTURES } from '@/api/client';
import * as fx from '@/api/fixtures';
import type { DriverType, EntityStatus, VehicleType } from '@/api/types';

export type ActiveTransaction = {
  id: number;
  transactionNo: string;
  carInAt: string | null;
  parkingSpaceId: number | null;
  parkingSpaceCode?: string;
};

export type RecentVisit = {
  id: number;
  transactionNo: string;
  status: string;
  driverType: DriverType;
  driverName: string | null;
  tenantId: number | null;
  tenantName: string | null;
  carInAt: string | null;
  carOutAt: string | null;
  durationMinutes: number | null;
};

export type PlateProfile = {
  found: boolean;
  vehicleId?: number;
  make?: string | null;
  model?: string | null;
  colour?: string | null;
  vehicleType?: VehicleType;
  vehicleStatus?: EntityStatus;
  driverId?: number | null;
  driverName?: string;
  driverCompanyName?: string | null;
  tenantId?: number | null;
  tenantName?: string;
  driverType?: DriverType;
  /** Non-null → the vehicle is currently checked in; check-in should warn instead of proceeding. */
  activeTransaction?: ActiveTransaction | null;
  /** Most recent visits, newest first (plan §6A `recent_visits`). */
  recentVisits: RecentVisit[];
};

const normalize = (plate: string) => plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

export async function lookupPlate(plate: string): Promise<PlateProfile> {
  const norm = normalize(plate);
  if (norm.length < 2) return { found: false, recentVisits: [] };

  if (USE_FIXTURES) {
    const vehicle = fx.vehicles.find((v) => normalize(v.plate_number) === norm);
    if (!vehicle) return fx.delay({ found: false, recentVisits: [] }, 200);

    const history = fx.transactions
      .filter((t) => t.vehicle_id === vehicle.id)
      .sort((a, b) => new Date(b.car_in_at ?? b.created_at).getTime() - new Date(a.car_in_at ?? a.created_at).getTime());
    const active = history.find((t) => t.status === 'active' || t.status === 'overstay');
    const last = history[0];
    const suggestedDriver = last?.driver_id ? fx.drivers.find((d) => d.id === last.driver_id) : undefined;

    return fx.delay(
      {
        found: true,
        vehicleId: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        colour: vehicle.colour,
        vehicleType: vehicle.vehicle_type,
        vehicleStatus: vehicle.status,
        driverId: suggestedDriver?.id ?? null,
        driverName: suggestedDriver?.full_name,
        driverCompanyName: suggestedDriver?.company_name ?? null,
        tenantId: last?.tenant_id ?? null,
        tenantName: last?.tenant?.name ?? last?.tenant_snapshot?.name ?? undefined,
        driverType: last?.driver_type,
        activeTransaction: active
          ? {
              id: active.id,
              transactionNo: active.transaction_no,
              carInAt: active.car_in_at,
              parkingSpaceId: active.parking_space_id,
              parkingSpaceCode: active.parking_space?.space_code,
            }
          : null,
        recentVisits: history.slice(0, 5).map((t) => ({
          id: t.id,
          transactionNo: t.transaction_no,
          status: t.status,
          driverType: t.driver_type,
          driverName: t.driver?.full_name ?? null,
          tenantId: t.tenant_id,
          tenantName: t.tenant?.name ?? t.tenant_snapshot?.name ?? null,
          carInAt: t.car_in_at,
          carOutAt: t.car_out_at,
          durationMinutes: t.duration_minutes,
        })),
      },
      350,
    );
  }

  type Response = {
    normalized_plate: string;
    vehicle: {
      id: number;
      car_id: number | null;
      plate_number: string;
      plate_state: string | null;
      status: EntityStatus;
      vehicle_type: VehicleType;
      make: string | null;
      model: string | null;
      colour: string | null;
    } | null;
    active_transaction: {
      id: number;
      transaction_no: string;
      car_in_at: string | null;
      parking_space_id: number | null;
      driver_type: DriverType;
      parking_space?: { id: number; space_code: string } | null;
    } | null;
    prefill: {
      suggested_driver: { id: number; full_name: string; phone: string | null; company_name: string | null } | null;
      last_driver_type: DriverType | null;
      last_tenant_id: number | null;
      last_tenant: { id: number; name: string } | null;
    } | null;
    recent_visits: {
      id: number;
      transaction_no: string;
      status: string;
      driver_type: DriverType;
      driver_name: string | null;
      tenant_id: number | null;
      tenant_name: string | null;
      car_in_at: string | null;
      car_out_at: string | null;
      duration_minutes: number | null;
    }[];
  };

  const { data } = await api.get<Response>('/admin/transactions/plate-lookup', { params: { plate: plate.trim() } });
  if (!data.vehicle) return { found: false, recentVisits: [] };

  return {
    found: true,
    vehicleId: data.vehicle.id,
    make: data.vehicle.make,
    model: data.vehicle.model,
    colour: data.vehicle.colour,
    vehicleType: data.vehicle.vehicle_type,
    vehicleStatus: data.vehicle.status,
    driverId: data.prefill?.suggested_driver?.id ?? null,
    driverName: data.prefill?.suggested_driver?.full_name,
    driverCompanyName: data.prefill?.suggested_driver?.company_name ?? null,
    tenantId: data.prefill?.last_tenant_id ?? null,
    tenantName: data.prefill?.last_tenant?.name,
    driverType: data.prefill?.last_driver_type ?? undefined,
    activeTransaction: data.active_transaction
      ? {
          id: data.active_transaction.id,
          transactionNo: data.active_transaction.transaction_no,
          carInAt: data.active_transaction.car_in_at,
          parkingSpaceId: data.active_transaction.parking_space_id,
          parkingSpaceCode: data.active_transaction.parking_space?.space_code,
        }
      : null,
    recentVisits: (data.recent_visits ?? []).map((v) => ({
      id: v.id,
      transactionNo: v.transaction_no,
      status: v.status,
      driverType: v.driver_type,
      driverName: v.driver_name,
      tenantId: v.tenant_id,
      tenantName: v.tenant_name,
      carInAt: v.car_in_at,
      carOutAt: v.car_out_at,
      durationMinutes: v.duration_minutes,
    })),
  };
}
