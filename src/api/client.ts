import { type AxiosError, type InternalAxiosRequestConfig, create, isAxiosError } from 'axios';

import { storage, StorageKeys } from '@/lib/storage';

/** Renders a request as a copy-pasteable curl command for debugging (dev only). */
function toCurl(config: InternalAxiosRequestConfig): string {
  const url = `${config.baseURL ?? ''}${config.url ?? ''}`;
  const query = config.params ? `?${new URLSearchParams(config.params).toString()}` : '';
  const rawHeaders = (config.headers?.toJSON?.() ?? config.headers ?? {}) as Record<string, unknown>;
  const headerFlags = Object.entries(rawHeaders)
    .filter(([, v]) => v != null)
    .map(([key, value]) => {
      const v = key.toLowerCase() === 'authorization' ? `${String(value).slice(0, 16)}…` : String(value);
      return `-H '${key}: ${v}'`;
    })
    .join(' ');

  let body = '';
  if (config.data instanceof FormData) {
    const parts = (config.data as unknown as { _parts?: [string, unknown][] })._parts ?? [];
    body = parts
      .map(([key, value]) => {
        if (value && typeof value === 'object' && 'uri' in (value as Record<string, unknown>)) {
          const f = value as { uri: string; name?: string; type?: string };
          return `-F '${key}=@${f.uri};type=${f.type ?? ''};filename=${f.name ?? ''}'`;
        }
        return `-F '${key}=${value}'`;
      })
      .join(' ');
  } else if (config.data) {
    body = `--data '${JSON.stringify(config.data)}'`;
  }

  return [`curl -X ${(config.method ?? 'get').toUpperCase()}`, `'${url}${query}'`, headerFlags, body]
    .filter(Boolean)
    .join(' ');
}

/**
 * Base URL resolution:
 * - `EXPO_PUBLIC_API_URL` (from env / dotenv) always wins when set.
 * - In a **release** build with no env set, fall back to production so an
 *   Xcode/EAS archive never ships pointed at localhost or fixtures.
 * - In **dev** with nothing set, stays empty → in-memory fixtures.
 * Keep localhost dev overrides in `.env.development.local` (never `.env.local`,
 * which Expo also loads in production).
 */
const PRODUCTION_API_URL = 'https://app.eazydock.com.au/api';
const ENV_API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();

export const API_URL = ENV_API_URL || (__DEV__ ? '' : PRODUCTION_API_URL);
export const USE_FIXTURES = API_URL.length === 0;

/**
 * Web app origin (the dashboard the API belongs to) — the API base with its
 * trailing `/api` stripped. Used for links back into the web app such as the
 * forgot-password flow. Falls back to production when running on fixtures.
 */
export const APP_URL = (API_URL || PRODUCTION_API_URL).replace(/\/api\/?$/, '');

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
  console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.params ?? '');
  if (__DEV__) console.log(`[API] curl: ${toCurl(config)}`);
  return config;
});

/** Notifies the app to drop the session on a 401 (wired by AuthContext). */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (r) => {
    console.log(`[API] ✓ ${r.status} ${r.config.url}`);
    return r;
  },
  async (error: AxiosError) => {
    console.warn(`[API] ✗ ${error.response?.status ?? 0} ${error.config?.url}`, error.message, error.response?.data ?? '');
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
