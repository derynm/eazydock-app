export const SYDNEY_TIME_ZONE = 'Australia/Sydney';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const WALL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?/;
const HAS_TIME_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function parseInstant(value: string): Date | null {
  // JavaScript accepts milliseconds but some APIs return six fractional digits.
  const normalized = value.replace(/\.(\d{3})\d+(?=Z|[+-]\d{2}:?\d{2}$)/, '.$1');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sydneyParts(date: Date): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: SYDNEY_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
}

function wallPartsToInstant(parts: number[]): Date {
  const [year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0] = parts;
  const targetWallAsUtc = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  let instant = targetWallAsUtc;

  // Resolve the Sydney UTC offset for this exact wall time. A second pass
  // handles dates around daylight-saving offset changes.
  for (let pass = 0; pass < 2; pass += 1) {
    const displayed = sydneyParts(new Date(instant));
    const displayedAsUtc = Date.UTC(
      Number(displayed.year),
      Number(displayed.month) - 1,
      Number(displayed.day),
      Number(displayed.hour),
      Number(displayed.minute),
      second,
      millisecond,
    );
    instant += targetWallAsUtc - displayedAsUtc;
  }

  return new Date(instant);
}

/** Calendar date selected in a native picker, without UTC conversion. */
export function dateValueFromPicker(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Sydney wall-clock datetime selected in a native picker, sent without a timezone suffix. */
export function sydneyDateTimeValueFromPicker(date: Date): string {
  return `${dateValueFromPicker(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Normalizes an outbound datetime to Sydney wall time. Already timezone-free
 * values are treated as Sydney input; UTC/offset values are converted first.
 */
export function toSydneyDateTimeValue(value: string): string {
  if (!value || DATE_ONLY.test(value)) return value;

  const wallMatch = value.match(WALL_DATE_TIME);
  if (wallMatch && !HAS_TIME_ZONE.test(value)) {
    const [, year, month, day, hour, minute] = wallMatch;
    return `${year}-${month}-${day}T${hour}:${minute}`;
  }

  const instant = parseInstant(value);
  if (!instant) return value;
  const parts = sydneyParts(instant);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Parses a Sydney wall datetime into its real instant, mainly for fixture comparisons. */
export function instantFromSydneyDateTimeValue(value: string): Date | null {
  if (!value) return null;
  if (HAS_TIME_ZONE.test(value)) return parseInstant(value);

  const match = value.match(WALL_DATE_TIME) ?? value.match(DATE_ONLY);
  if (!match) return null;
  const [, year, month, day] = match;
  const hour = match.length > 4 ? Number(match[4]) : 0;
  const minute = match.length > 5 ? Number(match[5]) : 0;
  const second = match.length > 6 ? Number(match[6] ?? 0) : 0;
  const millisecond = match.length > 7 ? Number(String(match[7] ?? '0').padEnd(3, '0')) : 0;
  return wallPartsToInstant([Number(year), Number(month), Number(day), hour, minute, second, millisecond]);
}

/** Converts an API datetime into a local Date whose visible fields are Sydney wall time. */
export function pickerDateFromSydneyValue(value: string): Date {
  const normalized = toSydneyDateTimeValue(value);
  const match = normalized.match(WALL_DATE_TIME) ?? normalized.match(DATE_ONLY);
  if (!match) return new Date();

  const [, year, month, day] = match;
  const hour = match.length > 4 ? Number(match[4]) : 0;
  const minute = match.length > 5 ? Number(match[5]) : 0;
  return new Date(Number(year), Number(month) - 1, Number(day), hour, minute, 0, 0);
}

/** Current Sydney date/time represented as local picker fields. */
export function sydneyNowPickerDate(): Date {
  const parts = sydneyParts(new Date());
  return new Date(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    0,
    0,
  );
}
