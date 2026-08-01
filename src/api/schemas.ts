/**
 * Zod schemas mirroring backend validation rules (plan §6A).
 * Used by react-hook-form; on a 422 the server's errors{} still win per field.
 */
import { z } from 'zod';

import { instantFromSydneyDateTimeValue } from '@/lib/sydney-time';

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
    driver_phone: optionalString(50),
    starts_at: z.string().min(1, 'Start time is required'),
    ends_at: z.string().min(1, 'End time is required'),
    notes: optionalString(2000),
  })
  .refine(
    (v) => {
      const start = instantFromSydneyDateTimeValue(v.starts_at);
      const end = instantFromSydneyDateTimeValue(v.ends_at);
      return !!start && !!end && end > start;
    },
    {
      message: 'End must be after start',
      path: ['ends_at'],
    },
  );
export type BookingForm = z.infer<typeof bookingSchema>;

/* ---- Phase 2 schemas ---- */

export const buildingSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  code: optionalString(50),
  building_type: optionalString(50),
  contact_name: optionalString(150),
  contact_phone: optionalString(50),
  contact_email: email,
  address_line_1: z.string().min(1, 'Address is required').max(255),
  address_line_2: optionalString(255),
  suburb: optionalString(100),
  state: optionalString(100),
  postal_code: optionalString(30),
  country: optionalString(100),
  status: z.enum(['active', 'inactive']),
});
export type BuildingForm = z.infer<typeof buildingSchema>;

export const parkingAreaSchema = z.object({
  building_id: z.number({ message: 'Select a building' }).int().positive('Select a building'),
  name: z.string().min(1, 'Name is required').max(150),
  code: optionalString(50),
  level: optionalString(50),
  area_type: z.enum(['standard', 'visitor', 'loading', 'contractor', 'mixed']),
  capacity: z.number({ message: 'Capacity is required' }).int().min(1, 'Capacity must be at least 1'),
  status: z.enum(['active', 'inactive', 'maintenance']),
  notes: optionalString(2000),
});
export type ParkingAreaForm = z.infer<typeof parkingAreaSchema>;

export const parkingSpaceSchema = z.object({
  parking_area_id: z.number({ message: 'Select a parking area' }).int().positive('Select a parking area'),
  space_code: z.string().min(1, 'Space code is required').max(80),
  space_type: z.enum(['standard', 'accessible', 'ev', 'motorcycle', 'loading', 'visitor']),
  default_usage: z.enum(['building_owner', 'tenant', 'contractor', 'visitor', 'delivery', 'flexible']),
  operational_status: z.enum(['active', 'inactive', 'maintenance', 'blocked']),
  notes: optionalString(2000),
});
export type ParkingSpaceForm = z.infer<typeof parkingSpaceSchema>;

export const bulkCreateSpacesSchema = z.object({
  parking_area_id: z.number({ message: 'Select a parking area' }).int().positive('Select a parking area'),
  prefix: z.string().min(1, 'Prefix is required'),
  start_number: z.number({ message: 'Start number is required' }).int().min(1),
  count: z.number({ message: 'Count is required' }).int().min(1).max(500, 'Max 500 spaces'),
  space_type: z.enum(['standard', 'accessible', 'ev', 'motorcycle', 'loading', 'visitor']),
  default_usage: z.enum(['building_owner', 'tenant', 'contractor', 'visitor', 'delivery', 'flexible']),
  operational_status: z.enum(['active', 'inactive', 'maintenance', 'blocked']),
});
export type BulkCreateSpacesForm = z.infer<typeof bulkCreateSpacesSchema>;

export const allocationSchema = z
  .object({
    building_id: z.number({ message: 'Select a building' }).int().positive('Select a building'),
    tenant_id: z.number().int().positive().nullable().optional(),
    parking_area_id: z.number().int().positive().nullable().optional(),
    allocation_type: z.enum(['flexible_quota', 'temporary_quota', 'visitor_quota', 'loading_quota']),
    user_category: z.enum(['building_owner', 'tenant', 'contractor', 'visitor', 'delivery']),
    quota: z.number({ message: 'Quota is required' }).int().min(1, 'Quota must be at least 1'),
    release_after_minutes: z.number().int().min(1).nullable().optional(),
    starts_at: optionalString(20),
    ends_at: optionalString(20),
    status: z.enum(['active', 'inactive', 'expired']),
    notes: optionalString(2000),
  })
  .refine(
    (v) => !v.starts_at || !v.ends_at || new Date(v.ends_at) >= new Date(v.starts_at),
    { message: 'End must be on or after start', path: ['ends_at'] },
  );
export type AllocationForm = z.infer<typeof allocationSchema>;

export const incidentSchema = z.object({
  parking_transaction_id: z.number().int().positive().nullable().optional(),
  parking_space_id: z.number().int().positive().nullable().optional(),
  incident_type: z.enum(['damage', 'unauthorised_vehicle', 'overstay', 'blocked_space', 'safety', 'other']),
  description: z.string().min(1, 'Description is required').max(2000),
  status: z.enum(['open', 'resolved', 'cancelled']).optional(),
});
export type IncidentForm = z.infer<typeof incidentSchema>;

export const markOverstaySchema = z.object({
  description: z.string().min(1, 'Description is required').max(1000),
});
export type MarkOverstayForm = z.infer<typeof markOverstaySchema>;

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
  driver_phone: optionalString(50),
  comments: optionalString(2000),
});
export type CheckInForm = z.infer<typeof checkInSchema>;

export const userCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  email: z.string().email('Enter a valid email').max(150),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role_id: z.number({ message: 'Select a role' }).int().positive('Select a role'),
  company_id: z.number().int().positive().nullable().optional(),
  status: z.enum(['active', 'inactive']),
});
export type UserCreateForm = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  email: z.string().email('Enter a valid email').max(150),
  role_id: z.number({ message: 'Select a role' }).int().positive('Select a role'),
  company_id: z.number().int().positive().nullable().optional(),
  status: z.enum(['active', 'inactive']),
});
export type UserUpdateForm = z.infer<typeof userUpdateSchema>;

export const resetPasswordSchema = z
  .object({
    old_password: z.string().min(1, 'Current password is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string().min(1, 'Confirm your new password'),
  })
  .refine((v) => v.password === v.password_confirmation, {
    message: 'Password confirmation does not match',
    path: ['password_confirmation'],
  });
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
