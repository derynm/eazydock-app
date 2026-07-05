import { api, USE_FIXTURES } from './client';
import * as fx from './fixtures';
import type { Building, Driver, ParkingArea, ParkingSpace, RoleResource, Tenant } from './types';

export async function lookupBuildings(): Promise<Building[]> {
  if (USE_FIXTURES) return fx.delay(fx.buildings);
  const { data } = await api.get<{ buildings: Building[] }>('/admin/lookups/buildings');
  return data.buildings;
}

export async function lookupParkingAreas(buildingId?: number): Promise<ParkingArea[]> {
  if (USE_FIXTURES) {
    return fx.delay(fx.parkingAreas.filter((a) => !buildingId || a.building_id === buildingId));
  }
  const { data } = await api.get<{ parking_areas: ParkingArea[] }>('/admin/lookups/parking-areas', {
    params: { building_id: buildingId },
  });
  return data.parking_areas;
}

export async function lookupParkingSpaces(areaId?: number, availableOnly = false): Promise<ParkingSpace[]> {
  if (USE_FIXTURES) {
    return fx.delay(
      fx.parkingSpaces.filter(
        (s) => (!areaId || s.parking_area_id === areaId) && (!availableOnly || s.occupancy_status === 'available'),
      ),
    );
  }
  const { data } = await api.get<{ parking_spaces: ParkingSpace[] }>('/admin/lookups/parking-spaces', {
    params: { parking_area_id: areaId, available_only: availableOnly ? 1 : undefined },
  });
  return data.parking_spaces;
}

export async function lookupTenants(buildingId?: number): Promise<Pick<Tenant, 'id' | 'building_id' | 'name'>[]> {
  if (USE_FIXTURES) {
    return fx.delay(
      fx.tenants.filter((t) => !buildingId || t.building_id === buildingId).map((t) => ({ id: t.id, building_id: t.building_id, name: t.name })),
    );
  }
  const { data } = await api.get<{ tenants: Pick<Tenant, 'id' | 'building_id' | 'name'>[] }>('/admin/lookups/tenants', {
    params: { building_id: buildingId },
  });
  return data.tenants;
}

export async function lookupRoles(): Promise<RoleResource[]> {
  if (USE_FIXTURES) return fx.delay(fx.roles);
  const { data } = await api.get<{ roles: RoleResource[] }>('/admin/lookups/roles');
  return data.roles;
}

export async function searchDrivers(q: string): Promise<Pick<Driver, 'id' | 'full_name' | 'phone' | 'company_name'>[]> {
  if (USE_FIXTURES) {
    const term = q.toLowerCase();
    return fx.delay(
      fx.drivers
        .filter((d) => d.full_name.toLowerCase().includes(term))
        .slice(0, 10)
        .map((d) => ({ id: d.id, full_name: d.full_name, phone: d.phone, company_name: d.company_name })),
    );
  }
  const { data } = await api.get<{ drivers: Pick<Driver, 'id' | 'full_name' | 'phone' | 'company_name'>[] }>(
    '/admin/lookups/drivers',
    { params: { q } },
  );
  return data.drivers;
}
