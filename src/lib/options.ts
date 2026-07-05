import type { Option } from '@/components/ui';
import { titleCase } from '@/lib/format';

const opt = <T extends string>(values: readonly T[]): Option<T>[] =>
  values.map((v) => ({ label: titleCase(v), value: v }));

export const ENTITY_STATUS = opt(['active', 'inactive', 'banned'] as const);
export const TENANT_STATUS = opt(['active', 'inactive'] as const);
export const VEHICLE_TYPES = opt(['car', 'van', 'truck', 'motorcycle', 'ute', 'other'] as const);
export const TENANT_TYPES = opt([
  'building_owner',
  'tenant',
  'shop',
  'office',
  'contractor',
  'delivery_partner',
  'other',
] as const);
export const DRIVER_TYPES = opt(['building_owner', 'tenant', 'contractor', 'visitor', 'delivery'] as const);
export const ENTRY_METHODS: Option<string>[] = [
  { label: 'Manual entry', value: 'manual_entry' },
  { label: 'Image upload', value: 'image_upload' },
  { label: 'Browser camera', value: 'browser_camera' },
];

/* ---- Phase 2 options ---- */
export const BUILDING_STATUS = opt(['active', 'inactive'] as const);
export const AREA_TYPES = opt(['standard', 'visitor', 'loading', 'contractor', 'mixed'] as const);
export const AREA_STATUS = opt(['active', 'inactive', 'maintenance'] as const);
export const SPACE_TYPES = opt(['standard', 'accessible', 'ev', 'motorcycle', 'loading', 'visitor'] as const);
export const SPACE_USAGE = opt(['building_owner', 'tenant', 'contractor', 'visitor', 'delivery', 'flexible'] as const);
export const SPACE_OPERATIONAL_STATUS = opt(['active', 'inactive', 'maintenance', 'blocked'] as const);
export const ALLOCATION_TYPES = opt(['flexible_quota', 'temporary_quota', 'visitor_quota', 'loading_quota'] as const);
export const USER_CATEGORIES = opt(['building_owner', 'tenant', 'contractor', 'visitor', 'delivery'] as const);
export const INCIDENT_TYPES = opt(['damage', 'unauthorised_vehicle', 'overstay', 'blocked_space', 'safety', 'other'] as const);
export const INCIDENT_STATUS = opt(['open', 'resolved', 'cancelled'] as const);
export const USER_STATUS = opt(['active', 'inactive'] as const);
