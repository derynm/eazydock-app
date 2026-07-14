import { api, ApiError, toApiError, USE_FIXTURES } from './client';
import * as fx from './fixtures';
import type { Company, LoginRequest, LoginResponse, ResetPasswordRequest, UserPayload } from './types';

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  if (USE_FIXTURES) {
    if (!payload.email || !payload.password) {
      throw toApiError({
        response: { status: 422, data: { message: 'These credentials do not match our records.', errors: { email: ['These credentials do not match our records.'] } } },
      });
    }
    return fx.delay({ token: 'fixture-token', ...fx.userPayload }, 500);
  }
  try {
    const { data } = await api.post<LoginResponse>('/auth/login', payload);
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function logout(): Promise<void> {
  if (USE_FIXTURES) {
    await fx.delay(null, 150);
    return;
  }
  try {
    await api.post('/auth/logout');
  } catch (e) {
    throw toApiError(e);
  }
}

export async function resetPassword(payload: ResetPasswordRequest): Promise<void> {
  if (USE_FIXTURES) {
    const errors: Record<string, string[]> = {};
    if (!payload.old_password) errors.old_password = ['Enter your current password'];
    if (payload.password.length < 8) errors.password = ['Password must be at least 8 characters'];
    if (payload.password !== payload.password_confirmation) errors.password_confirmation = ['Password confirmation does not match'];
    if (Object.keys(errors).length > 0) {
      throw new ApiError('The given data was invalid.', 422, errors);
    }
    await fx.delay(null, 300);
    return;
  }
  try {
    await api.post('/auth/reset-password', payload);
  } catch (e) {
    throw toApiError(e);
  }
}

export async function fetchUser(): Promise<UserPayload> {
  if (USE_FIXTURES) return fx.delay(fx.userPayload);
  try {
    const { data } = await api.get<UserPayload>('/auth/user');
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function fetchCompanies(): Promise<Company[]> {
  if (USE_FIXTURES) return fx.delay(fx.companies);
  try {
    const { data } = await api.get<{ companies: Company[] }>('/companies');
    return data.companies;
  } catch (e) {
    throw toApiError(e);
  }
}
