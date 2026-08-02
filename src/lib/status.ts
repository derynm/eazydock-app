import type { Tone } from '@/components/ui';
import { titleCase } from '@/lib/format';

export type StatusMeta = { label: string; tone: Tone };

const TONES: Record<string, Tone> = {
  // generic entity
  active: 'success',
  inactive: 'neutral',
  banned: 'danger',
  // transactions
  completed: 'neutral',
  cancelled: 'danger',
  overstay: 'warning',
  // bookings
  pending: 'warning',
  confirmed: 'info',
  fulfilled: 'success',
  expired: 'neutral',
  // parking areas
  maintenance: 'warning',
  // parking spaces
  blocked: 'danger',
  available: 'success',
  occupied: 'info',
  booked: 'warning',
  // incidents
  open: 'warning',
  resolved: 'success',
};

/** Maps any domain status string to a badge tone + readable label. */
export function statusMeta(status?: string | null): StatusMeta {
  if (!status) return { label: '—', tone: 'neutral' };
  return { label: titleCase(status), tone: TONES[status] ?? 'neutral' };
}

/** Transaction status remains separate from derived conditions such as overstay. */
export function transactionStatusMeta(status?: string | null): StatusMeta {
  return statusMeta(status);
}
