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
