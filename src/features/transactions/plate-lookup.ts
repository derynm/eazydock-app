/**
 * "Does this plate exist?" lookup for check-in prefill.
 *
 * Phase 1 has no single endpoint for it (plan §6A), so we compose documented
 * ones: `transactions/vehicle-search` (existence) + `transactions?search=<plate>`
 * (most recent visit → driver / tenant / location / driver_type), and
 * `vehicles/{id}` for make/model/colour. Returns a profile to prefill the form;
 * if the plate is unknown, `found: false` and the operator fills it in manually.
 */
import { api, USE_FIXTURES } from '@/api/client';
import * as fx from '@/api/fixtures';
import { listTransactions } from '@/api/transactions';
import type { DriverType, Transaction, VehicleType } from '@/api/types';
import { getVehicle } from '@/api/vehicles';

export type PlateProfile = {
  found: boolean;
  vehicleId?: number;
  make?: string | null;
  model?: string | null;
  colour?: string | null;
  vehicleType?: VehicleType;
  driverId?: number | null;
  driverName?: string;
  tenantId?: number | null;
  tenantName?: string;
  buildingId?: number;
  parkingAreaId?: number;
  driverType?: DriverType;
  lastVisitAt?: string | null;
};

const normalize = (plate: string) => plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

const newest = (rows: Transaction[]) =>
  [...rows].sort(
    (a, b) =>
      new Date(b.car_in_at ?? b.created_at).getTime() - new Date(a.car_in_at ?? a.created_at).getTime(),
  )[0];

function fromTransaction(last: Transaction | undefined): Partial<PlateProfile> {
  if (!last) return {};
  return {
    driverId: last.driver_id,
    driverName: last.driver?.full_name ?? last.driver_snapshot?.full_name,
    tenantId: last.tenant_id,
    tenantName: last.tenant?.name ?? last.tenant_snapshot?.name,
    buildingId: last.building_id,
    parkingAreaId: last.parking_area_id,
    driverType: last.driver_type,
    lastVisitAt: last.car_in_at,
  };
}

export async function lookupPlate(plate: string): Promise<PlateProfile> {
  const norm = normalize(plate);
  if (norm.length < 2) return { found: false };

  if (USE_FIXTURES) {
    const vehicle = fx.vehicles.find((v) => normalize(v.plate_number) === norm);
    if (!vehicle) return fx.delay({ found: false }, 200);
    const last = newest(fx.transactions.filter((t) => normalize(t.entry_plate_number_raw ?? '') === norm));
    return fx.delay(
      {
        found: true,
        vehicleId: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        colour: vehicle.colour,
        vehicleType: vehicle.vehicle_type,
        ...fromTransaction(last),
      },
      350,
    );
  }

  // Live: match the vehicle, then read its most recent transaction.
  const { data } = await api.get<{ vehicles: { id: number; car_id: number; plate_number: string }[] }>(
    '/admin/transactions/vehicle-search',
    { params: { q: plate.trim() } },
  );
  const match = data.vehicles.find((v) => normalize(v.plate_number) === norm) ?? data.vehicles[0];
  if (!match) return { found: false };

  const [history, vehicle] = await Promise.all([
    listTransactions({ search: plate.trim() }).catch(() => null),
    getVehicle(match.id).catch(() => null),
  ]);
  const last = history ? newest(history.data) : undefined;

  return {
    found: true,
    vehicleId: match.id,
    make: vehicle?.make,
    model: vehicle?.model,
    colour: vehicle?.colour,
    vehicleType: vehicle?.vehicle_type,
    ...fromTransaction(last),
  };
}
