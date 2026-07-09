import { api, toApiError, USE_FIXTURES } from './client';
import * as fx from './fixtures';
import type { DashboardResponse } from './types';

export async function fetchDashboard(): Promise<DashboardResponse> {
  if (USE_FIXTURES) return fx.delay(fx.dashboard());
  try {
    const { data } = await api.get<DashboardResponse>('/admin/dashboard');
    // API sends active_vehicles as a plain array; tolerate a { data: [...] }
    // wrapper too in case the backend shape changes.
    const active_vehicles = Array.isArray(data.active_vehicles)
      ? data.active_vehicles
      : ((data.active_vehicles as unknown as { data: DashboardResponse['active_vehicles'] })?.data ?? []);
    return { ...data, active_vehicles };
  } catch (e) {
    throw toApiError(e);
  }
}
