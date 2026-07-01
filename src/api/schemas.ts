/**
 * Zod schemas mirroring backend validation rules (plan §6A).
 * Used by react-hook-form; on a 422 the server's errors{} still win per field.
 */
import { z } from 'zod';

const optionalString = (max: number) =>
  z
    .string()
    .max(max, `Must be ${max} characters or fewer`)
    .optional()
    .or(z.literal(''));

const email = z
  .string()
  .email('Enter a valid email')
  .max(150)
  .optional()
  .or(z.literal(''));

export const driverSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(150),
  phone: optionalString(50),
  email,
  company_name: optionalString(150),
  license_no: optionalString(100),
  status: z.enum(['active', 'inactive', 'banned']),
  notes: optionalString(2000),
});
export type DriverForm = z.infer<typeof driverSchema>;

export const vehicleSchema = z.object({
  plate_number: z.string().min(1, 'Plate number is required').max(50),
  plate_state: optionalString(50),
  plate_country: optionalString(100),
  vehicle_type: z.enum(['car', 'van', 'truck', 'motorcycle', 'ute', 'other']),
  make: optionalString(100),
  model: optionalString(100),
  colour: optionalString(50),
  status: z.enum(['active', 'inactive', 'banned']),
  notes: optionalString(2000),
});
export type VehicleForm = z.infer<typeof vehicleSchema>;

export const tenantSchema = z.object({
  building_id: z.number({ message: 'Select a building' }).int().positive('Select a building'),
  name: z.string().min(1, 'Name is required').max(150),
  code: optionalString(50),
  tenant_type: z.enum(['building_owner', 'tenant', 'shop', 'office', 'contractor', 'delivery_partner', 'other']),
  contact_name: optionalString(150),
  contact_phone: optionalString(50),
  contact_email: email,
  suite_or_unit: optionalString(100),
  floor: optionalString(50),
  status: z.enum(['active', 'inactive']),
});
export type TenantForm = z.infer<typeof tenantSchema>;

export const bookingSchema = z
  .object({
    building_id: z.number().int().positive('Select a building'),
    parking_area_id: z.number().int().positive('Select a parking area'),
    parking_space_id: z.number().int().positive('Select a parking space'),
    tenant_id: z.number().int().positive().nullable().optional(),
    driver_id: z.number().int().positive().nullable().optional(),
    vehicle_id: z.number().int().positive().nullable().optional(),
    driver_type: z.enum(['building_owner', 'tenant', 'contractor', 'visitor', 'delivery']),
    plate_number: z.string().min(1, 'Plate number is required').max(50),
    contact_name: optionalString(150),
    contact_phone: optionalString(50),
    starts_at: z.string().min(1, 'Start time is required'),
    ends_at: z.string().min(1, 'End time is required'),
    notes: optionalString(2000),
  })
  .refine((v) => new Date(v.ends_at) > new Date(v.starts_at), {
    message: 'End must be after start',
    path: ['ends_at'],
  });
export type BookingForm = z.infer<typeof bookingSchema>;

export const checkInSchema = z.object({
  building_id: z.number().int().positive('Select a building'),
  parking_area_id: z.number().int().positive('Select a parking area'),
  parking_space_id: z.number().int().positive().nullable().optional(),
  tenant_id: z.number().int().positive().nullable().optional(),
  driver_id: z.number().int().positive().nullable().optional(),
  vehicle_id: z.number().int().positive().nullable().optional(),
  plate_number: z.string().min(1, 'Plate number is required').max(50),
  vehicle_make: optionalString(100),
  vehicle_model: optionalString(100),
  vehicle_colour: optionalString(50),
  driver_type: z.enum(['building_owner', 'tenant', 'contractor', 'visitor', 'delivery']),
  entry_method: z.enum(['browser_camera', 'image_upload', 'manual_entry']),
  comments: optionalString(2000),
});
export type CheckInForm = z.infer<typeof checkInSchema>;
