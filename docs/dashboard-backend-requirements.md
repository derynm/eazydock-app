# Dashboard revamp — backend verification

The redesigned dashboard can render today's values from the existing
`GET /admin/dashboard` response. Week and month occupancy charts use the
existing `GET /admin/dashboard/occupancy` endpoint.

No new backend endpoint is required for this dashboard revamp if the existing
occupancy endpoint supports the request and response shape below.

## Existing occupancy history endpoint

```http
GET /admin/dashboard/occupancy?date_from=2026-07-01&date_to=2026-07-18&building_id=12
Authorization: Bearer <token>
X-Company-Id: <company-id>
```

Query parameters:

| Parameter | Required | Notes |
| --- | --- | --- |
| `date_from` | Yes | Inclusive date in `YYYY-MM-DD` format. |
| `date_to` | Yes | Inclusive date in `YYYY-MM-DD` format; reject dates before `date_from`. |
| `building_id` | No | When supplied, scope every value to that accessible building. Use the same access rules as `GET /admin/dashboard`. |

The endpoint is expected to require the existing `dashboard:view` permission
and the same company/building access checks as the main dashboard endpoint.
Invalid filters should use the standard Laravel `422` validation response.

Expected response:

```json
{
  "filters": {
    "date_from": "2026-07-01",
    "date_to": "2026-07-18",
    "building_id": 12
  },
  "summary": {
    "date": "2026-07-18",
    "snapshot_at": "2026-07-18T14:30:00+07:00",
    "total_bays": 15,
    "occupied_bays": 2,
    "available_bays": 13,
    "percentage": 13.3
  },
  "daily": [
    {
      "date": "2026-07-01",
      "snapshot_at": "2026-07-01T23:59:59+07:00",
      "total_bays": 15,
      "occupied_bays": 4,
      "available_bays": 11,
      "percentage": 26.7
    }
  ],
  "meta": {
    "occupancy_basis": "assigned_transactions_at_snapshot",
    "capacity_basis": "active_bays_at_snapshot"
  }
}
```

Implementation details that matter to the UI:

- Return one item per calendar day, ordered oldest to newest. Days with zero
  occupancy must still be present so charts do not have misleading gaps.
- Past days should represent end-of-day occupancy. For the current day, use the
  latest live snapshot and expose its actual time in `snapshot_at`.
- `total_bays` should reflect the capacity basis used for that specific day.
  This keeps historical percentages correct when bays are added or disabled.
- Keep `summary` equal to the last item in `daily` so today's ring and the
  history series use consistent numbers.

## Items to verify

- `GET /admin/dashboard/occupancy` accepts the optional `building_id` filter,
  so its Week/Month results match the selected building's KPI cards.
- `GET /admin/dashboard` accepts the same optional `building_id` filter.
- The occupancy response contains ordered daily points and includes zero-value
  days rather than omitting them.

No new dashboard response fields are required; the current metrics and
`active_vehicles` payload cover the KPI cards and on-site list.

## Fixture fallback

The mobile app keeps a fixture implementation for offline demos. Production
Week and Month data always comes from the existing occupancy endpoint rather
than fabricated client-side history.
