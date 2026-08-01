# Mobile API Adjustments — Data Integrity & Guard Fixes (2026-07-09)

This documents backend changes from `AI/todo/2026-07-09-fix-data-integrity-and-guard-gaps.md` that affect the mobile app's JSON API calls (`app/Http/Controllers/Api/Admin/*`). All deletion in the system happens through these endpoints — the web admin has no delete buttons for any of the entities below — so this is the primary place the mobile app needs to handle the new behavior.

All new errors use Laravel's standard validation error shape and a **422** status code:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "<field>": ["<message>"]
  }
}
```

## 1. Deleting is now blocked when a record is still in use

Previously every `DELETE` endpoint below succeeded unconditionally. Now they return 422 in these cases:

| Endpoint | Blocked when | Error key |
|---|---|---|
| `DELETE /parking-spaces/{id}` | Space is occupied, has an active transaction, or an active/upcoming booking | `space` |
| `DELETE /drivers/{id}` | Driver has an active transaction | `driver` |
| `DELETE /vehicles/{id}` | Vehicle has an active transaction | `vehicle` |
| `DELETE /parking-areas/{id}` | Area still has parking spaces | `area` |
| `DELETE /buildings/{id}` | Building still has parking areas or tenants | `building` |
| `DELETE /tenants/{id}` | Tenant has an active transaction | `tenant` |
| `DELETE /parking-bookings/{id}` | Booking status is `fulfilled` (has a live linked transaction) | `booking` |
| Company delete (admin-only, not currently exposed on mobile) | Company still has buildings | `company` |

**Action needed:** any "delete" flow in the app should catch a 422 on these endpoints and show `errors.<key>[0]` to the user instead of assuming success.

## 2. Parking area `capacity` is now a hard limit

- `POST /parking-areas` and `PUT /parking-areas/{id}`: `capacity` is now **required, min 1** (previously allowed 0/optional in practice).
- `PUT /parking-areas/{id}`: capacity can no longer be set below the number of spaces already in that area. Error lands on `capacity`.
- `POST /parking-spaces`, `POST /parking-spaces/bulk`, and `PUT /parking-spaces/{id}` (when changing `parking_area_id`): creating/moving a space into an area that's already at capacity now fails. Error lands on `parking_area_id`, with a message stating the area's capacity and current space count.

**Action needed:** if the app pre-validates space creation client-side, it should account for area capacity, or just surface the new `parking_area_id` error message.

## 3. Parking area `code` uniqueness is now validated

`POST /parking-areas` and `PUT /parking-areas/{id}` previously let a duplicate `code` (within the same building) hit the database directly and 500. It's now a normal 422 on the `code` field.

## 4. Editing an occupied parking space is restricted

`PUT /parking-spaces/{id}`: if the space is currently occupied, you can no longer change `parking_area_id` or `space_code` in the same request — check the vehicle out first. Error lands on `parking_area_id`.

## 5. Vehicle check-in behavior with soft-deleted plates

`POST /parking-transactions/check-in` (and the kiosk equivalent): previously, checking in a plate that belonged to a vehicle deleted in admin would **crash** (raw DB error). It now transparently restores the old vehicle record and proceeds normally — no app-side change required, but this is worth knowing: a "deleted" vehicle isn't fully gone, and its history/notes come back if the plate is seen again.

## 6. Banned vehicles and drivers are now rejected at check-in

`POST /parking-transactions/check-in` and the kiosk check-in: if the selected/resolved vehicle or driver has `status = banned`, check-in now fails with a 422 instead of silently proceeding.

| Field | Error key |
|---|---|
| Vehicle banned | `vehicle_id` |
| Driver banned | `driver_id` |

**Action needed:** surface these as a clear "banned, see attendant"-style message rather than a generic error, since this is a deliberate business rule, not a bug.

## 7. Booking fulfilment: soft-deleted plates and banned status

`POST /parking-bookings/{id}/fulfil` had the same two gaps as check-in, now fixed to match:

- **Soft-deleted vehicle**: fulfilling a booking whose plate belongs to a vehicle deleted in admin used to crash (raw DB error). It now restores the vehicle transparently, same as check-in.
- **Banned vehicle/driver**: fulfilling a booking for a banned vehicle or driver now fails with a 422 instead of succeeding — previously this was a way to bypass the check-in ban entirely (book it, then fulfil it). Error lands on `booking` (not a per-field key, since the booking itself already picked the vehicle/driver at creation time).

**Action needed:** same as #6 — surface the `booking` error message from a failed fulfil call clearly.

## 8. Check-in and bookings now require the space to actually be in the submitted area

`POST /parking-transactions/check-in` and `POST /parking-bookings` (+ `PUT /parking-bookings/{id}`): `parking_space_id` must belong to the submitted `parking_area_id`. Previously these were validated independently, so a client could (accidentally or otherwise) submit an area and a space that don't match — that's now a 422 on `parking_space_id`.

## 9. Moving a transaction to another area's space now requires access to that area

`POST /parking-transactions/{id}/change-space`: if you move a transaction to a space that's in a *different* parking area than the transaction's current one, the transaction's `parking_area_id`/`building_id` now update to match (previously they silently stayed on the old area, which broke area-scoped reporting/quota). Also, area-restricted users (non-admin, assigned to specific areas via `ParkingAreaUser`) now get a 403 if they try to move a transaction into an area they don't have access to — this was previously unchecked for the destination area specifically (the existing `parking.area.access` middleware only ever covered the transaction's *starting* area).

**Action needed:** if the app lets area-restricted staff move cars between spaces, handle a possible 403 here distinctly from the space-availability 422 — it means "you don't have access to that area," not "that space is taken."

## 10. Parking allocations now require the tenant/area to belong to the chosen building

`POST /parking-allocations` and `PUT /parking-allocations/{id}`: if `tenant_id` and/or `parking_area_id` are submitted, they must belong to the submitted `building_id`. Previously each was validated independently (just "belongs to your company"), so a tenant or area from a *different* building than the one selected would silently save as a dead allocation that could never match any real transaction. Mismatch → 422 on `tenant_id` and/or `parking_area_id`.

## Not changed / no action needed

- Vehicles remain global (not scoped per company) — this was already the deliberate design and is unchanged, confirmed with the client to stay as-is. Any company can still view/edit vehicle details across companies.
- Vehicle duplicate risk via NULL `plate_state`: investigated, not fixed — flagged to the client as a narrow, admin-form-only edge case; deferred, no API behavior change.
- `GET` endpoints and existing successful-path response shapes are unchanged.
- Check-in, check-out, cancel, and mark-overstay were already correctly enforcing area access via the existing `parking.area.access` route middleware — no behavior change there.
- Dashboard metrics are unchanged — confirmed with the client this was a misunderstanding (capacity vs. live space count), not a bug.
