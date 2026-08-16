# Mobile Change: Transaction Driver and Vehicle Contract

Date: 2026-08-01

## Summary

The backend no longer stores copied driver contact fields, driver/vehicle
snapshots, or plate-capture fields on `parking_transactions`. Mobile must read
current driver and plate data from the relations returned by the API:

- Driver phone: `transaction.driver?.phone`
- Driver name: `transaction.driver?.full_name`
- Vehicle plate: `transaction.vehicle?.plate_number`

A camera or OCR scanner is only an input helper. It may fill `plate_number` in
the check-in form, but it does not change the backend payload and no image,
capture method, confidence, or scan snapshot is stored.

## Removed Transaction Fields

Remove these fields from the mobile `Transaction` type, fixtures, rendering,
and request builders:

```text
entry_method
exit_method
entry_plate_number_raw
entry_plate_number_normalized
entry_plate_confidence
entry_plate_image_path
entry_plate_snapshot
exit_plate_number_raw
exit_plate_number_normalized
exit_plate_confidence
exit_plate_image_path
exit_plate_snapshot
driver_snapshot
vehicle_snapshot
contact_name
contact_phone
```

This does not remove `plate_number_raw` from a booking. A booking can exist
before a vehicle is resolved, so booking resources continue to expose their
booking plate. Once fulfilled, the created transaction uses its linked
`vehicle`.

Building and tenant contact fields are unrelated and must not be removed.

## API Request Changes

### Check in

`POST /api/admin/transactions/check-in` now uses the normal JSON form fields.
Do not send `entry_method`, `image`, `contact_name`, or `contact_phone`.

```json
{
  "building_id": 1,
  "parking_area_id": 2,
  "parking_space_id": 10,
  "tenant_id": 4,
  "vehicle_id": 5,
  "plate_number": "ABC-123",
  "driver_type": "visitor",
  "driver_id": 7,
  "comments": "Front desk visit"
}
```

For a new driver, omit `driver_id` and send `driver_name` plus optional
`driver_phone` and `driver_company_name`. These values are stored directly on
the new `drivers` record. They are not copied onto the transaction.

### Check out

`POST /api/admin/transactions/{id}/check-out` accepts only optional comments.
Do not send `exit_method`, `plate_number`, or `image`.

```json
{
  "comments": "Checked out by reception"
}
```

An empty JSON body is valid:

```json
{}
```

### Fulfil booking

`POST /api/admin/bookings/{id}/fulfil` accepts only optional comments. Do not
send `entry_method`.

```json
{
  "comments": "Arrived as booked"
}
```

## Detail Endpoints

### Transaction detail

`GET /api/admin/transactions/{id}` reads its contact and plate values from the
linked records:

- Phone: `data.driver.phone`
- Name: `data.driver.full_name`
- Plate: `data.vehicle.plate_number`

It does not return `contact_name`, `contact_phone`, copied plate fields, capture
methods, or snapshots.

### Transaction response

List, detail, check-in, check-out, and booking-fulfil responses use the same
relation-based source for driver and plate data.

```json
{
  "data": {
    "id": 123,
    "transaction_no": "TXN-AB12CD34",
    "status": "active",
    "driver_type": "visitor",
    "building_id": 1,
    "parking_area_id": 2,
    "parking_space_id": 10,
    "tenant_id": 4,
    "driver_id": 7,
    "vehicle_id": 5,
    "transaction_date": "2026-08-01T00:00:00.000000Z",
    "car_in_at": "2026-08-01T01:30:00.000000Z",
    "car_out_at": null,
    "duration_minutes": null,
    "comments": "Front desk visit",
    "tenant_snapshot": {
      "name": "Acme Pty Ltd",
      "code": "ACME"
    },
    "driver": {
      "id": 7,
      "full_name": "Jane Driver",
      "phone": "0400 000 111",
      "company_name": "Acme Pty Ltd"
    },
    "vehicle": {
      "id": 5,
      "plate_number": "ABC-123",
      "plate_state": "NSW"
    }
  }
}
```

The removed fields are not returned. Use a safe fallback only for a genuinely
missing relation:

```ts
const plate = transaction.vehicle?.plate_number ?? 'Unknown plate';
const driverName = transaction.driver?.full_name ?? 'Unknown driver';
const driverPhone = transaction.driver?.phone ?? undefined;
```

The backend loads soft-deleted vehicles for historical transactions, so old
transactions can still return their linked vehicle plate.

### Booking detail

`GET /api/admin/bookings/{id}` reads driver contact data from the linked driver:

- Phone: `data.driver.phone`
- Name: `data.driver.full_name`
- Booking plate: `data.plate_number_raw`

The booking plate intentionally remains on the booking. `vehicle_id` is
optional while creating a future reservation, so a booking can exist before a
Vehicle record is selected or created. The booking plate is resolved to a
Vehicle when the booking is fulfilled; the fulfil response is then a
transaction and exposes the plate as `data.vehicle.plate_number`.

```json
{
  "data": {
    "id": 45,
    "booking_no": "BKG-EF56GH78",
    "status": "confirmed",
    "driver_type": "visitor",
    "building_id": 1,
    "parking_area_id": 2,
    "parking_space_id": 10,
    "tenant_id": 4,
    "driver_id": 7,
    "vehicle_id": null,
    "plate_number_raw": "ABC-123",
    "starts_at": "2026-08-01T03:00:00.000000Z",
    "ends_at": "2026-08-01T05:00:00.000000Z",
    "notes": "Reserved by reception",
    "parking_transaction_id": null,
    "driver": {
      "id": 7,
      "full_name": "Jane Driver",
      "phone": "0400 000 111",
      "email": "jane@example.com",
      "company_name": "Acme Pty Ltd"
    }
  }
}
```

The mobile detail screens already follow this split:

```ts
const transactionPlate = transaction.vehicle?.plate_number;
const bookingPlate = booking.plate_number_raw;
const transactionPhone = transaction.driver?.phone;
const bookingPhone = booking.driver?.phone;
```

## Transaction Date Behaviour

`GET /api/admin/transactions` has these rules:

- Without `date_from` and `date_to`, it defaults to the current Sydney day.
- Active transactions remain included even when their check-in is outside the
  selected date range.
- `status=completed` filters and orders by `car_out_at`.
- Other statuses and the All view filter the dated portion by `car_in_at`.
- Explicit ranges are inclusive. Continue sending UTC instants when the mobile
  picker represents Sydney-local boundaries.

Bookings keep their own plate and schedule semantics:

- `GET /api/admin/bookings` filters booking time (`starts_at`).
- `GET /api/admin/bookings/by-space?date=YYYY-MM-DD` remains a Sydney calendar
  day board and returns all spaces in scope.

## Required Mobile Code Adjustments

### API and types

- `src/api/types.ts`
  - Remove `EntryMethod` if nothing else uses it.
  - Remove all transaction fields listed above.
  - Keep `vehicle` and `driver` relations in `Transaction`.
- `src/api/transactions.ts`
  - Search fixtures through `t.vehicle?.plate_number`.
  - Remove `entry_method` and `imageUri` from `CheckInInput`.
  - Delete the multipart `buildCheckInForm`; send JSON only.
  - Build fixture transaction plate data in `vehicle`, not copied fields.
  - Change `checkOut(id, exitMethod, comments)` to `checkOut(id, comments?)` and
    send `{ comments }` as JSON.
- `src/api/bookings.ts`
  - Change `fulfilBooking(id, entryMethod, comments)` to
    `fulfilBooking(id, comments?)`.
- `src/api/schemas.ts`
  - Remove `entry_method` from `checkInSchema`.
- `src/api/fixtures.ts`
  - Remove obsolete transaction capture/snapshot fields.
  - Ensure every transaction fixture has the correct `vehicle` relation.
- `src/features/transactions/plate-lookup.ts`
  - Find fixture history by `vehicle_id`, not transaction plate copies.

### Screens and components

Replace every transaction plate fallback with `transaction.vehicle?.plate_number`
in:

- `src/app/(app)/dashboard.tsx`
- `src/app/(app)/transactions/index.tsx`
- `src/features/transactions/transaction-detail.tsx`
- `src/features/transactions/transaction-table.tsx`

Also update:

- `src/app/(app)/transactions/check-in.tsx`
  - Remove `entry_method` from default form values and submit mapping.
  - A future scanner should only call `setValue('plate_number', detectedPlate)`.
- `src/features/transactions/transaction-detail.tsx`
  - Call `checkOut(transactionId, comments?)` without a method.
- `src/features/bookings/booking-detail.tsx`
  - Call `fulfilBooking(bookingId, comments?)` without a method.
- `.claude/plan.md`
  - Update the documented request/response contract after implementation.

Do not change building/tenant forms just because they contain `contact_name` or
`contact_phone`; those fields belong to those resources, not transactions.

## Verification Checklist

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] With fixtures: transaction list, detail, dashboard, check-in, check-out,
      and booking fulfil all show the vehicle plate.
- [ ] With live API: check-in succeeds with JSON and no method/image.
- [ ] With live API: check-out succeeds with `{}` and detail still shows plate.
- [ ] With live API: booking fulfil succeeds without `entry_method` and the
      returned transaction contains `vehicle.plate_number`.
- [ ] Completed date filtering follows checkout time; active transactions stay
      visible in the All view.

## Rollout Note

Deploy the mobile adjustment with or before the backend schema removal. Old
mobile requests contain extra fields that Laravel currently ignores, so writes
remain compatible, but old screens read `entry_plate_number_raw`; after the
backend change that value is absent and those screens would show a blank plate
until they are updated to use `vehicle.plate_number`.
