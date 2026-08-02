/** Display helpers — dates, durations, plates, enum labels. */

import { toSydneyDateTimeValue } from '@/lib/sydney-time';

export function titleCase(value?: string | null): string {
  if (!value) return '';
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatPlate(plate?: string | null): string {
  return (plate ?? '').toUpperCase();
}

const dtf = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(undefined, opts);

function displayDate(value: string): Date {
  const normalized = toSydneyDateTimeValue(value);
  // Date-only and timezone-free values are Sydney wall-clock values. Build a
  // local Date with the same visible fields so Intl cannot shift them using
  // the device timezone after normalization.
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(normalized) ? `${normalized}T00:00:00` : normalized);
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = displayDate(iso);
  if (isNaN(d.getTime())) return '—';
  return dtf({ day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = displayDate(iso);
  if (isNaN(d.getTime())) return '—';
  return dtf({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
}

export function formatTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = displayDate(iso);
  if (isNaN(d.getTime())) return '—';
  return dtf({ hour: '2-digit', minute: '2-digit' }).format(d);
}

/** "2h 14m" from a minute count. */
export function formatDuration(minutes?: number | null): string {
  if (minutes == null || minutes < 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Elapsed time since an ISO timestamp, compact. */
export function durationSince(iso?: string | null): string {
  if (!iso) return '—';
  const start = new Date(iso).getTime();
  if (isNaN(start)) return '—';
  return formatDuration(Math.floor((Date.now() - start) / 60000));
}

/** "3 min ago" relative time. */
export function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const secs = Math.floor((Date.now() - then) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}
