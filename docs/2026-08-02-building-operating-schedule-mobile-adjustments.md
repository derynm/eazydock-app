# Mobile Adjustments: Building and Parking Area Operating Schedule

Date: 2026-08-02

## Goal

Update the mobile application so an operating schedule can be configured at building level and selectively inherited by parking areas. Every parking area must still be able to switch to its own custom schedule afterward.

The schedule consists of:

- Operation days.
- Operation start and end time.
- Parking time limit in minutes.

Operation days are optional in the backend for backward compatibility. A missing or `null` value means all seven days are active. The mobile UI should normalize this to all seven selected days so users always see an explicit state.

## Required Behavior

### Building schedule

- Building create/edit exposes operation days, operation time, and parking time limit.
- On building edit, the user can select exactly which parking areas will inherit the building schedule.
- Do not expose only an `Apply to all` action. Provide a multi-select list with `Select all` and `Clear all` shortcuts.
- The submitted parking area ID list is the complete desired inheritance membership, not only newly selected IDs.
- A parking area selected in this list uses the building schedule.
- A previously selected area that is removed from the list becomes custom and keeps the previous effective building schedule as its custom values.
- A custom parking area that is not selected remains unchanged.

### Parking area override

- Parking area create/edit and Operating Hours edit expose a `Use building schedule` switch.
- A selected/inherited parking area can later disable the switch and define its own days, hours, and time limit.
- When inheritance is enabled, custom schedule controls are disabled or hidden and the effective building values are shown.
- When inheritance is disabled, the area's custom values become editable.
- Always submit `inherits_building_operating_schedule` explicitly from parking-area forms. The backend may infer a custom schedule when raw schedule fields are present, so relying on omission can produce the wrong mode.

### Display rules

- Cards, summaries, validation explanations, and parking calculations must display `effective_*` values.
- Raw area fields are the area's saved custom values and are primarily form state.
- Display a source badge such as `Building schedule` or `Custom schedule`.
- Format operation days compactly, for example `Mon–Fri` or `Every day`.
- Overnight parking does not automatically make a closed day active. The backend owns the final parking-time calculation; mobile should display the returned effective schedule and not reproduce billing/time-limit calculations locally.

## API Types

Update `src/api/types.ts` with a shared weekday type:

```ts
export type OperatingDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface OperatingScheduleFields {
  operating_start_time: string | null;
  operating_end_time: string | null;
  operating_days: OperatingDay[] | null;
  parking_time_limit_minutes: number | null;
}
```

Add the raw building schedule fields to `BuildingResource`.

Add these fields to `ParkingAreaResource` and `OperatingHoursResource`:

```ts
inherits_building_operating_schedule: boolean;

// Saved custom values on the parking area
operating_start_time: string | null;
operating_end_time: string | null;
operating_days: OperatingDay[] | null;
parking_time_limit_minutes: number | null;

// Values currently enforced by the backend
effective_operating_start_time: string | null;
effective_operating_end_time: string | null;
effective_operating_days: OperatingDay[];
effective_parking_time_limit_minutes: number | null;
```

The nested `building` object returned by Operating Hours endpoints also contains the building schedule fields. Do not assume the nested building object returned by every parking-area endpoint is equally detailed; fetch the building resource when its schedule is needed in a form.

## API and Schema Adjustments

### `src/api/buildings.ts`

Extend `BuildingInput`:

```ts
operating_start_time?: string | null;
operating_end_time?: string | null;
operating_days?: OperatingDay[] | null;
parking_time_limit_minutes?: number | null;
operating_schedule_parking_area_ids?: number[];
```

Important update semantics:

- Omit `operating_schedule_parking_area_ids` when inheritance membership must not change.
- Send `[]` to detach all currently inherited areas.
- Send the complete selected ID list to synchronize membership.
- Continue submitting the existing required building fields, including `name`, `address_line_1`, and `status`.
- Do not use the legacy `apply_operating_schedule_to_all_areas` field in new mobile code.

### `src/api/parking-areas.ts`

Extend create/update input with `inherits_building_operating_schedule` and the raw schedule fields. Make the inheritance boolean explicit in every create/update payload.

The building selector currently returns only identity fields in some responses. When the user enables inheritance, fetch the selected building detail or use an already cached full `BuildingResource` to preview the inherited schedule.

### `src/api/operating-hours.ts`

Extend `OperatingHoursInput`:

```ts
inherits_building_operating_schedule: boolean;
operating_start_time?: string | null;
operating_end_time?: string | null;
operating_days?: OperatingDay[] | null;
parking_time_limit_minutes?: number | null;
```

When inheritance is `true`, the raw custom fields may be omitted. When it is `false`, submit the complete custom schedule currently shown in the form.

### `src/api/schemas.ts`

- Add all schedule fields and the area ID selection to the building schema.
- Add inheritance and custom schedule fields to parking-area and operating-hours schemas.
- Validate that selected operation days contain at least one day when a custom schedule is enabled.
- Validate time strings in `HH:mm` 24-hour format.
- Validate time limit as a positive integer when present.
- Disable or bypass custom-schedule validation while inheritance is enabled.
- Normalize `null`/missing operation days from API responses to all seven days for form state.

### `src/api/fixtures.ts`

Update building, parking-area, and operating-hours fixtures to include:

- A building with a Monday–Friday schedule.
- An area inheriting that schedule.
- An area with a custom seven-day schedule.
- Raw and effective fields that demonstrate the difference.

## Screen Adjustments

### `src/features/buildings/building-form.tsx`

Add:

- Seven-day multi-select control.
- Start/end time controls.
- Optional parking time-limit control.
- Parking-area multi-select shown on edit.
- `Select all` and `Clear all` shortcuts.
- Selected count and a clear explanation of what removing an inherited area does.

Load all pages from `GET /admin/parking-areas?building_id={id}` before constructing the membership selector; the endpoint is paginated. Initially select areas where `inherits_building_operating_schedule === true`.

The selector should make custom areas selectable as well. Selecting one converts it to building inheritance after save.

### `src/features/buildings/building-detail.tsx`

Show operation days, hours, and time limit. Include a clear empty-state label when no time limit is configured.

### `src/features/parking-areas/parking-area-form.tsx`

Add the inheritance switch and custom schedule controls. Preserve locally entered custom values when the switch is toggled on and off before submission.

When the area is inherited, show a read-only preview of the selected building's schedule. After saving an override, refetch both the area and Operating Hours data.

### `src/app/(app)/operating-hours/index.tsx`

- Render `effective_*` values on cards.
- Show the schedule source badge.
- Add the inheritance switch to the editor.
- Add operation-day selection.
- Disable custom fields while inherited.
- Show the building schedule as the inherited preview.

### Shared UI

Prefer one reusable operation-day selector/formatter for all three forms. Keep touch targets usable on narrow screens and allow day chips to wrap without overlapping adjacent controls.

## Query Invalidation

After a building schedule or membership update, invalidate/refetch:

- Building detail and building list.
- Parking-area list for the building and affected area details.
- Operating Hours list/details.
- Dashboard data if it displays schedule-derived information.

After a single parking-area override, invalidate/refetch the area detail/list and Operating Hours queries. Server responses are the source of truth for `effective_*` values.

## Payload and Response Examples

The examples below show the relevant contract. Existing resources may contain additional fields.

### 1. Get building schedule

`GET /api/admin/buildings/12`

Response:

```json
{
  "data": {
    "id": 12,
    "name": "Central Tower",
    "code": "CT-01",
    "building_type": "commercial",
    "address_line_1": "Jl. Sudirman No. 10",
    "status": "active",
    "operating_start_time": "05:00",
    "operating_end_time": "20:00",
    "operating_days": [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday"
    ],
    "parking_time_limit_minutes": 180
  }
}
```

### 2. Load all parking areas for the building selector

`GET /api/admin/parking-areas?building_id=12&page=1`

Response:

```json
{
  "data": [
    {
      "id": 41,
      "name": "Basement A",
      "building_id": 12,
      "inherits_building_operating_schedule": true,
      "operating_start_time": "06:00",
      "operating_end_time": "23:00",
      "operating_days": ["monday", "tuesday", "wednesday"],
      "parking_time_limit_minutes": 240,
      "effective_operating_start_time": "05:00",
      "effective_operating_end_time": "20:00",
      "effective_operating_days": [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday"
      ],
      "effective_parking_time_limit_minutes": 180,
      "building": {
        "id": 12,
        "name": "Central Tower"
      }
    },
    {
      "id": 42,
      "name": "Outdoor Lot",
      "building_id": 12,
      "inherits_building_operating_schedule": false,
      "operating_start_time": "00:00",
      "operating_end_time": "23:59",
      "operating_days": [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday"
      ],
      "parking_time_limit_minutes": null,
      "effective_operating_start_time": "00:00",
      "effective_operating_end_time": "23:59",
      "effective_operating_days": [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday"
      ],
      "effective_parking_time_limit_minutes": null,
      "building": {
        "id": 12,
        "name": "Central Tower"
      }
    }
  ],
  "links": {
    "first": "...page=1",
    "last": "...page=2",
    "prev": null,
    "next": "...page=2"
  },
  "meta": {
    "current_page": 1,
    "last_page": 2,
    "per_page": 20,
    "total": 24
  }
}
```

Continue loading until `meta.current_page === meta.last_page` before showing the complete selector.

### 3. Update a building and selectively apply its schedule

`PUT /api/admin/buildings/12`

Payload:

```json
{
  "name": "Central Tower",
  "code": "CT-01",
  "building_type": "commercial",
  "address_line_1": "Jl. Sudirman No. 10",
  "status": "active",
  "operating_start_time": "05:00",
  "operating_end_time": "20:00",
  "operating_days": [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday"
  ],
  "parking_time_limit_minutes": 180,
  "operating_schedule_parking_area_ids": [41, 43]
}
```

Response:

```json
{
  "data": {
    "id": 12,
    "name": "Central Tower",
    "code": "CT-01",
    "building_type": "commercial",
    "address_line_1": "Jl. Sudirman No. 10",
    "status": "active",
    "operating_start_time": "05:00",
    "operating_end_time": "20:00",
    "operating_days": [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday"
    ],
    "parking_time_limit_minutes": 180
  }
}
```

The response does not echo the selected area IDs. Refetch the filtered parking-area list after success. Areas `41` and `43` now inherit. Any previously inherited area omitted from the submitted list becomes custom and retains the building schedule that was effective before this update.

To update only the building fields without changing membership, omit `operating_schedule_parking_area_ids`. To detach all inherited areas, explicitly send:

```json
{
  "operating_schedule_parking_area_ids": []
}
```

Include the other required building update fields in the actual request.

### 4. Change one parking area to building inheritance

`PUT /api/admin/operating-hours/42`

Payload:

```json
{
  "inherits_building_operating_schedule": true
}
```

Response:

```json
{
  "data": {
    "id": 42,
    "name": "Outdoor Lot",
    "inherits_building_operating_schedule": true,
    "operating_start_time": "00:00",
    "operating_end_time": "23:59",
    "operating_days": [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday"
    ],
    "parking_time_limit_minutes": null,
    "effective_operating_start_time": "05:00",
    "effective_operating_end_time": "20:00",
    "effective_operating_days": [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday"
    ],
    "effective_parking_time_limit_minutes": 180,
    "building": {
      "id": 12,
      "name": "Central Tower",
      "operating_start_time": "05:00",
      "operating_end_time": "20:00",
      "operating_days": [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday"
      ],
      "parking_time_limit_minutes": 180
    }
  }
}
```

Raw custom values remain stored, but the UI must display the effective building values.

### 5. Override one inherited parking area

`PUT /api/admin/operating-hours/41`

Payload:

```json
{
  "inherits_building_operating_schedule": false,
  "operating_start_time": "06:00",
  "operating_end_time": "22:00",
  "operating_days": [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
  ],
  "parking_time_limit_minutes": 240
}
```

Response:

```json
{
  "data": {
    "id": 41,
    "name": "Basement A",
    "inherits_building_operating_schedule": false,
    "operating_start_time": "06:00",
    "operating_end_time": "22:00",
    "operating_days": [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday"
    ],
    "parking_time_limit_minutes": 240,
    "effective_operating_start_time": "06:00",
    "effective_operating_end_time": "22:00",
    "effective_operating_days": [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday"
    ],
    "effective_parking_time_limit_minutes": 240,
    "building": {
      "id": 12,
      "name": "Central Tower",
      "operating_start_time": "05:00",
      "operating_end_time": "20:00",
      "operating_days": [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday"
      ],
      "parking_time_limit_minutes": 180
    }
  }
}
```

This confirms that an area selected from building edit can still be changed individually later.

### 6. Create a parking area that inherits immediately

`POST /api/admin/parking-areas`

Payload excerpt:

```json
{
  "building_id": 12,
  "name": "Basement C",
  "code": "B-C",
  "status": "active",
  "inherits_building_operating_schedule": true
}
```

Response excerpt:

```json
{
  "data": {
    "id": 44,
    "building_id": 12,
    "name": "Basement C",
    "code": "B-C",
    "status": "active",
    "inherits_building_operating_schedule": true,
    "operating_start_time": null,
    "operating_end_time": null,
    "operating_days": null,
    "parking_time_limit_minutes": null,
    "effective_operating_start_time": "05:00",
    "effective_operating_end_time": "20:00",
    "effective_operating_days": [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday"
    ],
    "effective_parking_time_limit_minutes": 180
  }
}
```

Submit all other fields required by the existing parking-area form; this example only highlights schedule-related fields.

### 7. Validation error examples

Invalid area selection or weekday values return Laravel validation errors:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "operating_schedule_parking_area_ids.0": [
      "The selected parking area is invalid for this building."
    ],
    "operating_days.1": [
      "The selected operation day is invalid."
    ]
  }
}
```

Map nested keys back to the area selector or day selector and also show a form-level error when the invalid item is not directly visible.

## Acceptance Checklist

- [ ] A building can save days, hours, and an optional time limit.
- [ ] Missing/null operation days render as all seven days.
- [ ] Building edit loads every parking-area page and preselects all currently inherited areas.
- [ ] The user can select individual areas, select all, or clear all.
- [ ] Saving sends the complete selected ID list.
- [ ] An inherited area displays effective building values.
- [ ] An inherited area can later switch to custom and save its own schedule.
- [ ] A custom area can switch back to inheritance.
- [ ] Cards use `effective_*` fields and visibly identify their source.
- [ ] Forms always send the inheritance boolean explicitly.
- [ ] Query caches are refreshed after building membership and area override changes.
- [ ] Fixtures cover both inherited and custom modes.
- [ ] Form validation and API error mapping cover weekdays, hours, time limit, and invalid area IDs.
- [ ] Layout is verified on narrow phones and wider tablet screens.

## Suggested Implementation Order

1. Update API types, schemas, inputs, and fixtures.
2. Add the reusable operation-day selector and formatter.
3. Update parking-area and Operating Hours forms for inheritance/custom mode.
4. Update the building form and paginated area-membership selector.
5. Update detail cards to use effective values and source badges.
6. Add focused tests for normalization, payload construction, selection synchronization, and override behavior.
7. Run `pnpm run lint:check` and `pnpm run types:check`, then manually verify responsive layouts.
