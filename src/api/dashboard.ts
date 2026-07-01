import { api, toApiError, USE_FIXTURES } from './client';
import * as fx from './fixtures';
import type { DashboardResponse } from './types';

export async function fetchDashboard(): Promise<DashboardResponse> {
  if (USE_FIXTURES) return fx.delay(fx.dashboard());
  try {
    const { data } = await api.get<DashboardResponse>('/admin/dashboard');
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}
