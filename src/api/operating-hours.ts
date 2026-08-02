import { api, toApiError, USE_FIXTURES } from './client';
import * as fx from './fixtures';
import type { OperatingDay, OperatingHoursResource } from './types';

export type OperatingHoursInput = {
  inherits_building_operating_schedule: boolean;
  operating_start_time?: string | null;
  operating_end_time?: string | null;
  operating_days?: OperatingDay[] | null;
  parking_time_limit_minutes?: number | null;
};

export type OperatingHoursResponse = {
  data: OperatingHoursResource[];
  filters: { building_id: number | null };
};

function fixtureResource(area: (typeof fx.parkingAreaResources)[number]): OperatingHoursResource {
  const building = fx.buildingResources.find((candidate) => candidate.id === area.building_id);
  return {
    id: area.id,
    building_id: area.building_id,
    building: building ?? { id: area.building_id, name: 'Unknown building', operating_start_time: null, operating_end_time: null, operating_days: null, parking_time_limit_minutes: null },
    name: area.name,
    code: area.code,
    active_bays_count: fx.parkingSpaceResources.filter(
      (space) => space.parking_area_id === area.id && space.operational_status === 'active',
    ).length,
    inherits_building_operating_schedule: area.inherits_building_operating_schedule,
    operating_start_time: area.operating_start_time,
    operating_end_time: area.operating_end_time,
    operating_days: area.operating_days,
    parking_time_limit_minutes: area.parking_time_limit_minutes,
    effective_operating_start_time: area.effective_operating_start_time,
    effective_operating_end_time: area.effective_operating_end_time,
    effective_operating_days: area.effective_operating_days,
    effective_parking_time_limit_minutes: area.effective_parking_time_limit_minutes,
    status: area.status,
  };
}

export async function listOperatingHours(buildingId?: number): Promise<OperatingHoursResponse> {
  if (USE_FIXTURES) {
    const rows = fx.parkingAreaResources
      .filter((area) => !buildingId || area.building_id === buildingId)
      .map(fixtureResource)
      .sort((a, b) => a.building_id - b.building_id || a.name.localeCompare(b.name));
    return fx.delay({ data: rows, filters: { building_id: buildingId ?? null } });
  }
  try {
    const { data } = await api.get<OperatingHoursResponse>('/admin/operating-hours', {
      params: { building_id: buildingId },
    });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function updateOperatingHours(id: number, input: OperatingHoursInput): Promise<OperatingHoursResource> {
  if (USE_FIXTURES) {
    const area = fx.parkingAreaResources.find((candidate) => candidate.id === id);
    if (!area) throw toApiError({ response: { status: 404, data: { message: 'Parking Area not found' } } });
    area.inherits_building_operating_schedule = input.inherits_building_operating_schedule;
    if (!input.inherits_building_operating_schedule) {
      area.operating_start_time = input.operating_start_time ?? null;
      area.operating_end_time = input.operating_end_time ?? null;
      area.operating_days = input.operating_days ?? null;
      area.parking_time_limit_minutes = input.parking_time_limit_minutes ?? null;
    }
    const building = fx.buildingResources.find((candidate) => candidate.id === area.building_id);
    area.effective_operating_start_time = input.inherits_building_operating_schedule ? building?.operating_start_time ?? null : area.operating_start_time;
    area.effective_operating_end_time = input.inherits_building_operating_schedule ? building?.operating_end_time ?? null : area.operating_end_time;
    area.effective_operating_days = input.inherits_building_operating_schedule ? building?.operating_days ?? [] : area.operating_days ?? [];
    area.effective_parking_time_limit_minutes = input.inherits_building_operating_schedule ? building?.parking_time_limit_minutes ?? null : area.parking_time_limit_minutes;
    return fx.delay(fixtureResource(area));
  }
  try {
    const { data } = await api.put<{ data: OperatingHoursResource }>(`/admin/operating-hours/${id}`, input);
    return data.data;
  } catch (error) {
    throw toApiError(error);
  }
}
