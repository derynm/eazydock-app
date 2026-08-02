import type { OperatingDay } from '@/api/types';

export const ALL_OPERATING_DAYS: OperatingDay[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

const SHORT: Record<OperatingDay, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

export function normalizeOperatingDays(days: OperatingDay[] | null | undefined): OperatingDay[] {
  return days?.length ? [...days] : [...ALL_OPERATING_DAYS];
}

export function formatOperatingDays(days: OperatingDay[] | null | undefined): string {
  const selected = normalizeOperatingDays(days);
  const indexes = ALL_OPERATING_DAYS.map((day, index) => selected.includes(day) ? index : -1).filter((index) => index >= 0);
  if (indexes.length === 7) return 'Every day';
  const groups: number[][] = [];
  for (const index of indexes) {
    const last = groups.at(-1);
    if (last && index === last.at(-1)! + 1) last.push(index);
    else groups.push([index]);
  }
  return groups.map((group) => {
    const first = SHORT[ALL_OPERATING_DAYS[group[0]]];
    const last = SHORT[ALL_OPERATING_DAYS[group.at(-1)!]];
    return group.length >= 3 ? `${first}–${last}` : group.map((index) => SHORT[ALL_OPERATING_DAYS[index]]).join(', ');
  }).join(', ');
}

export function formatOperatingHours(start: string | null | undefined, end: string | null | undefined): string {
  if (!start || !end) return 'Full elapsed duration';
  const from = start.slice(0, 5);
  const to = end.slice(0, 5);
  return `${from}–${to}${to < from ? ' · overnight' : ''}`;
}
