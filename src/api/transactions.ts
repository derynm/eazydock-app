import { File, Paths } from 'expo-file-system';

import { dateValueFromPicker, instantFromSydneyDateTimeValue, sydneyNowPickerDate } from '@/lib/sydney-time';

import { api, toApiError, USE_FIXTURES } from './client';
import * as fx from './fixtures';
import type { DriverType, DriverVisitSummary, Incident, ListParams, Paginator, Transaction, VehicleType } from './types';

function dateBoundary(value: string | number | undefined, endOfDay: boolean): number | null {
  if (!value) return null;
  const raw = String(value);
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? `${raw}T${endOfDay ? '23:59:59.999' : '00:00:00'}`
    : raw;
  return instantFromSydneyDateTimeValue(normalized)?.getTime() ?? null;
}

function transactionFilterTime(transaction: Transaction): number {
  const value = transaction.status === 'completed' ? transaction.car_out_at : transaction.car_in_at;
  return new Date(value ?? transaction.transaction_date).getTime();
}

function transactionDateBounds(params: ListParams): [number | null, number | null] {
  if (params.date_from || params.date_to) {
    return [dateBoundary(params.date_from, false), dateBoundary(params.date_to, true)];
  }
  const today = dateValueFromPicker(sydneyNowPickerDate());
  return [dateBoundary(today, false), dateBoundary(today, true)];
}

function isWithinTransactionDates(transaction: Transaction, dateFrom: number | null, dateTo: number | null): boolean {
  if (transaction.status === 'active') return true;
  const time = transactionFilterTime(transaction);
  return (dateFrom === null || time >= dateFrom) && (dateTo === null || time <= dateTo);
}

function formatParkedDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `${hours}h${remainder > 0 ? ` ${remainder}m` : ''}` : `${remainder}m`;
}

export async function listTransactions(params: ListParams = {}): Promise<Paginator<Transaction>> {
  if (USE_FIXTURES) {
    const q = (params.search ?? '').toLowerCase();
    const [dateFrom, dateTo] = transactionDateBounds(params);
    const rows = fx.transactions.filter(
      (t) => {
        return (!params.building_id || t.building_id === Number(params.building_id)) &&
          (!params.status || t.status === params.status) &&
          (!params.parking_area_id || t.parking_area_id === Number(params.parking_area_id)) &&
          (!params.driver_type || t.driver_type === params.driver_type) &&
          isWithinTransactionDates(t, dateFrom, dateTo) &&
          (!q ||
            t.transaction_no.toLowerCase().includes(q) ||
            (t.vehicle?.plate_number ?? '').toLowerCase().includes(q) ||
            (t.driver?.full_name ?? '').toLowerCase().includes(q));
      },
    ).sort((a, b) => transactionFilterTime(b) - transactionFilterTime(a));
    return fx.delay(fx.paginate(rows, Number(params.page) || 1));
  }
  try {
    const { data } = await api.get<Paginator<Transaction>>('/admin/transactions', { params });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function listActiveVehicles(params: ListParams = {}): Promise<Paginator<Transaction>> {
  if (USE_FIXTURES) {
    const q = (params.search ?? '').toLowerCase();
    const [dateFrom, dateTo] = transactionDateBounds(params);
    const rows = fx.transactions.filter(
      (t) => {
        return (
          (!params.building_id || t.building_id === Number(params.building_id)) &&
          t.status === 'active' &&
          (!params.parking_area_id || t.parking_area_id === Number(params.parking_area_id)) &&
          (!params.driver_type || t.driver_type === params.driver_type) &&
          isWithinTransactionDates(t, dateFrom, dateTo) &&
          (!q ||
            t.transaction_no.toLowerCase().includes(q) ||
            (t.vehicle?.plate_number ?? '').toLowerCase().includes(q) ||
            (t.driver?.full_name ?? '').toLowerCase().includes(q))
        );
      },
    );
    return fx.delay(fx.paginate(rows, Number(params.page) || 1));
  }
  try {
    const { data } = await api.get<Paginator<Transaction>>('/admin/transactions/active-vehicles', { params });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export type VehicleSearchResult = { id: number; car_id: number | null; plate_number: string };

/** Type-ahead over existing vehicles by plate (plan §6A: vehicle-search). */
export async function searchVehicles(q: string): Promise<VehicleSearchResult[]> {
  if (USE_FIXTURES) {
    const term = q.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    if (term.length < 1) return fx.delay([]);
    return fx.delay(
      fx.vehicles
        .filter((v) => v.plate_number.replace(/[^A-Za-z0-9]/g, '').toLowerCase().includes(term))
        .slice(0, 10)
        .map((v) => ({ id: v.id, car_id: v.car_id, plate_number: v.plate_number })),
    );
  }
  try {
    const { data } = await api.get<{ vehicles: VehicleSearchResult[] }>('/admin/transactions/vehicle-search', {
      params: { q },
    });
    return data.vehicles;
  } catch (e) {
    throw toApiError(e);
  }
}

export type DriverCompanySearchResult = { id: number; name: string };

/** Type-ahead over existing driver-company names (plan §6A: company-search). */
export async function searchDriverCompanies(q: string): Promise<DriverCompanySearchResult[]> {
  if (USE_FIXTURES) {
    const term = q.toLowerCase();
    const names = Array.from(new Set(fx.drivers.map((d) => d.company_name).filter((n): n is string => !!n)));
    return fx.delay(
      names
        .filter((n) => n.toLowerCase().includes(term))
        .slice(0, 10)
        .map((n, i) => ({ id: i + 1, name: n })),
    );
  }
  try {
    const { data } = await api.get<{ driver_companies: DriverCompanySearchResult[] }>(
      '/admin/transactions/company-search',
      { params: { q } },
    );
    return data.driver_companies;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function getTransaction(id: number): Promise<Transaction> {
  if (USE_FIXTURES) {
    const found = fx.transactions.find((t) => t.id === id);
    if (!found) throw toApiError({ response: { status: 404, data: { message: 'Transaction not found' } } });
    let driverVisitSummary: DriverVisitSummary | null = null;
    if (found.driver_id) {
      const visits = fx.transactions.filter(
        (transaction) =>
          transaction.driver_id === found.driver_id &&
          (transaction.status === 'active' || transaction.status === 'completed'),
      );
      const lastVisit = visits
        .filter((transaction) => transaction.id !== found.id && transaction.status === 'completed')
        .sort((a, b) => new Date(b.car_in_at ?? 0).getTime() - new Date(a.car_in_at ?? 0).getTime())[0];

      driverVisitSummary = {
        total_visits: visits.length,
        total_duration_minutes: visits.reduce(
          (total, transaction) => total + (transaction.status === 'completed' ? transaction.duration_minutes ?? 0 : 0),
          0,
        ),
        last_visit: lastVisit
          ? {
              id: lastVisit.id,
              transaction_no: lastVisit.transaction_no,
              car_in_at: lastVisit.car_in_at,
              car_out_at: lastVisit.car_out_at,
              duration_minutes: lastVisit.duration_minutes,
              tenant: lastVisit.tenant ?? null,
            }
          : null,
      };
    }
    return fx.delay({ ...found, driver_visit_summary: driverVisitSummary });
  }
  try {
    const { data } = await api.get<{ data: Transaction }>(`/admin/transactions/${id}`);
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export type CheckInInput = {
  building_id: number;
  parking_area_id: number;
  parking_space_id?: number | null;
  tenant_id?: number | null;
  driver_id?: number | null;
  // New (unlinked) driver — backend creates + links it during check-in.
  driver_name?: string | null;
  driver_phone?: string | null;
  driver_company_name?: string | null;
  vehicle_id?: number | null;
  plate_number: string;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_colour?: string | null;
  vehicle_type?: VehicleType | null;
  driver_type: DriverType;
  comments?: string | null;
};

function buildCheckInJson(input: CheckInInput): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value != null),
  );
}

export async function checkIn(input: CheckInInput): Promise<Transaction> {
  if (USE_FIXTURES) {
    const area = fx.parkingAreas.find((a) => a.id === input.parking_area_id) ?? fx.parkingAreas[0];
    const space =
      fx.parkingSpaces.find((s) => s.id === input.parking_space_id) ??
      fx.parkingSpaces.find((s) => s.parking_area_id === area.id)!;
    const nowIso = new Date().toISOString();

    // Simulate the backend creating + linking a new driver during check-in.
    let driverId = input.driver_id ?? null;
    let driverName: string | undefined;
    if (!driverId && input.driver_name?.trim()) {
      const created = {
        id: fx.nextId(fx.drivers),
        full_name: input.driver_name.trim(),
        phone: input.driver_phone ?? null,
        email: null,
        company_name: input.driver_company_name ?? null,
        license_no: null,
        status: 'active' as const,
        notes: null,
        created_at: nowIso,
        updated_at: nowIso,
        vehicles: [],
      };
      fx.drivers.unshift(created);
      driverId = created.id;
      driverName = created.full_name;
    } else if (driverId) {
      const existing = fx.drivers.find((d) => d.id === driverId);
      driverName = existing?.full_name;
      if (existing && input.driver_phone?.trim()) {
        existing.phone = input.driver_phone.trim();
      }
      // Non-blank company_name syncs onto the existing driver in place (plan §6A).
      if (existing && input.driver_company_name?.trim()) {
        existing.company_name = input.driver_company_name.trim();
      }
    }

    const resolvedDriver = driverId ? fx.drivers.find((driver) => driver.id === driverId) : undefined;
    let resolvedVehicle = input.vehicle_id
      ? fx.vehicles.find((vehicle) => vehicle.id === input.vehicle_id)
      : undefined;
    if (!resolvedVehicle) {
      const plateNumber = input.plate_number.trim().toUpperCase();
      resolvedVehicle = {
        id: fx.nextId(fx.vehicles),
        plate_number: plateNumber,
        plate_number_normalized: plateNumber.replace(/[^A-Z0-9]/g, ''),
        plate_state: null,
        plate_country: null,
        status: 'active',
        notes: null,
        car_id: null,
        vehicle_type: input.vehicle_type ?? 'other',
        make: input.vehicle_make ?? null,
        model: input.vehicle_model ?? null,
        colour: input.vehicle_colour ?? null,
        created_at: nowIso,
        updated_at: nowIso,
        drivers: [],
      };
      fx.vehicles.unshift(resolvedVehicle);
    }
    const txn: Transaction = {
      id: fx.nextId(fx.transactions),
      transaction_no: `TXN-${10_420 + fx.transactions.length + 1}`,
      status: 'active',
      driver_type: input.driver_type,
      building_id: input.building_id,
      parking_area_id: area.id,
      parking_space_id: space.id,
      tenant_id: input.tenant_id ?? null,
      driver_id: driverId,
      vehicle_id: resolvedVehicle.id,
      transaction_date: nowIso,
      car_in_at: nowIso,
      car_out_at: null,
      duration_minutes: null,
      parked_duration_minutes: 0,
      parked_duration_label: '0m',
      effective_duration_minutes: 0,
      parking_time_limit_minutes: null,
      overstay_minutes: 0,
      is_overstay: false,
      comments: input.comments ?? null,
      tenant_snapshot: null,
      created_at: nowIso,
      building: { id: input.building_id, name: fx.buildings.find((b) => b.id === input.building_id)?.name ?? '' },
      parking_area: { id: area.id, name: area.name },
      parking_space: { id: space.id, space_code: space.space_code },
      vehicle: { id: resolvedVehicle.id, plate_number: resolvedVehicle.plate_number, plate_state: resolvedVehicle.plate_state },
      driver: driverId && driverName
        ? { id: driverId, full_name: driverName, phone: resolvedDriver?.phone, company_name: resolvedDriver?.company_name }
        : undefined,
      events: [{ id: 1, type: 'check_in', description: `Checked in at ${space.space_code}`, created_at: nowIso }],
    };
    fx.transactions.unshift(txn);
    return fx.delay(txn);
  }
  try {
    const { data } = await api.post<{ data: Transaction }>('/admin/transactions/check-in', buildCheckInJson(input));
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function checkOut(id: number, comments?: string): Promise<Transaction> {
  if (USE_FIXTURES) {
    const idx = fx.transactions.findIndex((t) => t.id === id);
    if (idx < 0) throw toApiError({ response: { status: 404, data: { message: 'Transaction not found' } } });
    const t = fx.transactions[idx];
    const nowIso = new Date().toISOString();
    const dur = t.car_in_at ? Math.floor((Date.now() - new Date(t.car_in_at).getTime()) / 60_000) : 0;
    fx.transactions[idx] = {
      ...t,
      status: 'completed',
      car_out_at: nowIso,
      duration_minutes: dur,
      parked_duration_minutes: dur,
      parked_duration_label: formatParkedDuration(dur),
      comments: comments ?? t.comments,
      events: [...(t.events ?? []), { id: (t.events?.length ?? 0) + 1, type: 'check_out', description: 'Checked out', created_at: nowIso }],
    };
    return fx.delay(fx.transactions[idx]);
  }
  try {
    const { data } = await api.post<{ data: Transaction }>(
      `/admin/transactions/${id}/check-out`,
      comments ? { comments } : {},
    );
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function changeSpace(id: number, parkingSpaceId: number, comments?: string): Promise<Transaction> {
  if (USE_FIXTURES) {
    const idx = fx.transactions.findIndex((t) => t.id === id);
    if (idx < 0) throw toApiError({ response: { status: 404, data: { message: 'Transaction not found' } } });
    const space = fx.parkingSpaces.find((s) => s.id === parkingSpaceId);
    const nowIso = new Date().toISOString();
    fx.transactions[idx] = {
      ...fx.transactions[idx],
      parking_space_id: parkingSpaceId,
      parking_space: space ? { id: space.id, space_code: space.space_code } : fx.transactions[idx].parking_space,
      events: [
        ...(fx.transactions[idx].events ?? []),
        { id: (fx.transactions[idx].events?.length ?? 0) + 1, type: 'change_space', description: `Moved to ${space?.space_code ?? 'new bay'}`, created_at: nowIso },
      ],
    };
    return fx.delay(fx.transactions[idx]);
  }
  try {
    const { data } = await api.post<{ data: Transaction }>(`/admin/transactions/${id}/change-space`, {
      parking_space_id: parkingSpaceId,
      comments,
    });
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function cancelTransaction(id: number): Promise<void> {
  if (USE_FIXTURES) {
    const idx = fx.transactions.findIndex((t) => t.id === id);
    if (idx >= 0) fx.transactions[idx] = { ...fx.transactions[idx], status: 'cancelled', car_out_at: new Date().toISOString() };
    await fx.delay(null);
    return;
  }
  try {
    await api.post(`/admin/transactions/${id}/cancel`);
  } catch (e) {
    throw toApiError(e);
  }
}

export async function markOverstay(id: number, description: string): Promise<Incident> {
  if (USE_FIXTURES) {
    const txn = fx.transactions.find((t) => t.id === id);
    if (!txn) throw toApiError({ response: { status: 404, data: { message: 'Transaction not found' } } });
    if (txn.status !== 'active') {
      throw toApiError({ response: { status: 422, data: { message: 'Validation failed', errors: { transaction: ['Overstay can only be logged for an active transaction.'] } } } });
    }
    const nowIso = new Date().toISOString();
    const incident: Incident = {
      id: fx.nextId(fx.incidents),
      parking_transaction_id: txn.id,
      parking_space_id: txn.parking_space_id,
      incident_type: 'overstay',
      description,
      status: 'open',
      reported_by: 1,
      resolved_by: null,
      resolved_at: null,
      created_at: nowIso,
      updated_at: nowIso,
      parking_transaction: { id: txn.id, transaction_no: txn.transaction_no },
      parking_space: txn.parking_space ? { id: txn.parking_space.id, space_code: txn.parking_space.space_code } : null,
      reporter: { id: 1, name: 'Jordan Avery' },
    };
    fx.incidents.unshift(incident);
    const txnIdx = fx.transactions.findIndex((t) => t.id === id);
    if (txnIdx >= 0) {
      fx.transactions[txnIdx] = {
        ...fx.transactions[txnIdx],
        is_overstay: true,
        events: [...(fx.transactions[txnIdx].events ?? []), { id: Date.now(), type: 'overstay', description: 'Flagged as overstay', created_at: nowIso }],
      };
    }
    return fx.delay(incident);
  }
  try {
    const { data } = await api.post<{ data: Incident }>(`/admin/transactions/${id}/mark-overstay`, { description });
    return data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/* ------------------------------------------------------------------ *
 * Export (download → share). Backend: GET /admin/transactions/export
 * returns the raw file bytes for the given `format` + list filters.
 * ------------------------------------------------------------------ */
export type ExportFormat = 'excel' | 'pdf';

/** A downloaded export saved locally, ready to hand to `Sharing.shareAsync`. */
export type ExportResult = { uri: string; filename: string; mimeType: string; uti: string };

const EXPORT_META: Record<ExportFormat, { ext: string; mimeType: string; uti: string }> = {
  excel: {
    ext: 'xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    uti: 'org.openxmlformats.spreadsheetml.sheet',
  },
  pdf: { ext: 'pdf', mimeType: 'application/pdf', uti: 'com.adobe.pdf' },
};

/** Extracts and sanitizes a download name from a Content-Disposition header. */
function filenameFromContentDisposition(header: unknown): string | null {
  if (typeof header !== 'string') return null;

  const encoded = header.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i)?.[1];
  const plain = header.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i);
  const raw = encoded ?? plain?.[1] ?? plain?.[2];
  if (!raw) return null;

  let decoded = raw.trim().replace(/^['"]|['"]$/g, '');
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Keep the server-provided value when it is not URI encoded.
  }

  const safe = decoded.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return safe || null;
}

/**
 * Writes bytes/text to a fresh file and returns its `file://` URI. Uses the
 * **Documents** dir, not Caches — iOS's share sheet runs the picked app/
 * extension in a separate process that frequently can't read the sandboxed
 * Caches directory (fails with NSOSStatusErrorDomain -10814), while Documents
 * is reliably exposed to it.
 */
function writeShareableFile(filename: string, content: Uint8Array | string): string {
  const file = new File(Paths.document, filename);
  file.create({ overwrite: true });
  file.write(content);
  return file.uri;
}

const csvCell = (value: unknown): string => `"${String(value ?? '').replace(/"/g, '""')}"`;

/** Fixtures-only: a small CSV of the current rows so the share flow is demoable offline. */
function transactionsCsv(rows: Transaction[]): string {
  const header = ['Ref', 'Status', 'Plate', 'Driver', 'Area', 'Space', 'Checked in', 'Checked out', 'Duration (min)'];
  const lines = rows.map((t) =>
    [
      t.transaction_no,
      t.status,
      t.vehicle?.plate_number ?? '',
      t.driver?.full_name ?? '',
      t.parking_area?.name ?? '',
      t.parking_space?.space_code ?? '',
      t.car_in_at ?? '',
      t.car_out_at ?? '',
      t.duration_minutes ?? '',
    ]
      .map(csvCell)
      .join(','),
  );
  return [header.map(csvCell).join(','), ...lines].join('\n');
}

/**
 * Downloads the current transaction list as PDF or Excel and returns a local
 * file URI. Honours the same `ListParams` filters as `listTransactions` so the
 * export matches whatever the user selected. On fixtures (no backend) it emits
 * a CSV of the in-memory rows instead so the download + share flow still works.
 */
export async function exportTransactions(format: ExportFormat, params: ListParams = {}): Promise<ExportResult> {
  const meta = EXPORT_META[format];
  const stamp = dateValueFromPicker(sydneyNowPickerDate());

  if (USE_FIXTURES) {
    const q = (params.search ?? '').toString().toLowerCase();
    const [dateFrom, dateTo] = transactionDateBounds(params);
    const rows = fx.transactions.filter(
      (t) => {
        return (
          (!params.building_id || t.building_id === Number(params.building_id)) &&
          (!params.status || t.status === params.status) &&
          (!params.parking_area_id || t.parking_area_id === Number(params.parking_area_id)) &&
          (!params.driver_type || t.driver_type === params.driver_type) &&
          isWithinTransactionDates(t, dateFrom, dateTo) &&
          (!q ||
            t.transaction_no.toLowerCase().includes(q) ||
            (t.vehicle?.plate_number ?? '').toLowerCase().includes(q) ||
            (t.driver?.full_name ?? '').toLowerCase().includes(q))
        );
      },
    );
    const filename = `transactions-${stamp}.csv`;
    const uri = writeShareableFile(filename, transactionsCsv(rows));
    await fx.delay(null);
    return { uri, filename, mimeType: 'text/csv', uti: 'public.comma-separated-values-text' };
  }

  try {
    const { data, headers } = await api.get<ArrayBuffer>('/admin/transactions/export', {
      params: { ...params, format },
      responseType: 'arraybuffer',
    });
    const filename =
      filenameFromContentDisposition(headers['content-disposition']) ?? `transactions-${stamp}.${meta.ext}`;
    const uri = writeShareableFile(filename, new Uint8Array(data));
    return { uri, filename, mimeType: meta.mimeType, uti: meta.uti };
  } catch (e) {
    throw toApiError(e);
  }
}
