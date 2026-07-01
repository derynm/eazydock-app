import { type AxiosError, create, isAxiosError } from 'axios';

import { storage, StorageKeys } from '@/lib/storage';

/**
 * Base URL resolution:
 * - `EXPO_PUBLIC_API_URL` (from env / dotenv) always wins when set.
 * - In a **release** build with no env set, fall back to production so an
 *   Xcode/EAS archive never ships pointed at localhost or fixtures.
 * - In **dev** with nothing set, stays empty → in-memory fixtures.
 * Keep localhost dev overrides in `.env.development.local` (never `.env.local`,
 * which Expo also loads in production).
 */
const PRODUCTION_API_URL = 'https://eazydoc.eazycab.au/api';
const ENV_API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();

export const API_URL = ENV_API_URL || (__DEV__ ? '' : PRODUCTION_API_URL);
export const USE_FIXTURES = API_URL.length === 0;

export const api = create({
  baseURL: API_URL,
  headers: { Accept: 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await storage.get(StorageKeys.token);
  const companyId = await storage.get(StorageKeys.companyId);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (companyId) config.headers['X-Company-Id'] = companyId;
  return config;
});

/** Notifies the app to drop the session on a 401 (wired by AuthContext). */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await storage.remove(StorageKeys.token);
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

/* ------------------------------------------------------------------ *
 * Normalized error surface for the UI (plan §7).
 * ------------------------------------------------------------------ */
export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  status: number;
  errors: FieldErrors;
  constructor(message: string, status: number, errors: FieldErrors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
  /** First message for a given field, if any. */
  field(name: string): string | undefined {
    return this.errors[name]?.[0];
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (isAxiosError(err)) {
    const status = err.response?.status ?? 0;
    const data = err.response?.data as { message?: string; errors?: FieldErrors } | undefined;
    const message =
      data?.message ??
      (status === 0 ? 'Network error — check your connection and try again.' : 'Something went wrong.');
    return new ApiError(message, status, data?.errors ?? {});
  }
  return new ApiError(err instanceof Error ? err.message : 'Unexpected error', 0);
}
