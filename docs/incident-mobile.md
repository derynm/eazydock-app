# Mobile Incident Management Plan and API Contract

Date: 2026-08-17  
Audience: Expo/React Native mobile developers  
Backend base URL: `/api/admin`

This is the implementation contract for the incident screens supplied in the
reference: Create Incident Report, Incident Dashboard, and Incident Detail.
The workflow is Admin-first. There is no employee-to-manager approval process.
The same Admin may create, submit, investigate, annotate, resolve, reopen, and
download an incident report.

## 1. Authentication and common headers

Every endpoint below requires a staff Sanctum token and active company header:

```http
Authorization: Bearer <token>
X-Company-Id: <company-id>
Accept: application/json
```

JSON mutations also send `Content-Type: application/json`. Evidence upload uses
`multipart/form-data`; let Axios/React Native generate its boundary.

Permission slug: `operations.incidents`.

| Operation | Required action |
|---|---|
| Dashboard/list/detail/PDF/evidence preview | `view` |
| Form data, create, draft submit, evidence upload | `create` |
| Edit, status, actions, notes, evidence removal | `update` |

Admin can access all incident areas in the active company. A non-admin user can
only access incidents in active parking-area assignments. A private draft is
always visible only to its reporter. Existing Super Admin bypass remains
unchanged.

## 2. Mobile screen flow

### Incident Dashboard

1. Fetch `GET /parking-incidents`.
2. Render `summary` into Critical, High, Medium, Low, and Total cards.
3. Render `data` as cards on phone and table/list-detail on tablet.
4. Refetch with server filters when date, site, area, type, severity, status, or
   search changes.
5. Selecting a row navigates to Incident Detail using its numeric `id`.
6. `Report Incident` navigates to Create Incident Report.

### Create Incident Report

1. Fetch `GET /parking-incidents/form-data` for types, severity values, action
   presets, accessible locations, and evidence limits.
2. Search optional parking context through
   `GET /parking-incidents/transaction-options`.
3. If a transaction is selected, use its returned driver, vehicle, building,
   area, and space as the form preview. The backend is authoritative and fills
   those links/snapshots again on save.
4. For a reliable report with photos, first create a draft, upload evidence,
   then submit it. Direct submission is also supported.
5. After submission, navigate to the returned Incident Detail. There is no
   approval or pending screen.

### Incident Detail

1. Fetch `GET /parking-incidents/{id}`.
2. Display summary, vehicles, witnesses, description, evidence, actions, and
   append-only notes.
3. Use the dedicated status endpoint rather than replacing the whole incident.
4. Open evidence from its authenticated `download_url`, sending the same Bearer
   and company headers.
5. Download PDF as a binary/blob response.

## 3. Incident values

Incident types:

```text
damage
vehicle_collision
illegal_parking
loading_dock_issue
unauthorised_vehicle
overstay
blocked_space
safety
other
```

Severity: `critical | high | medium | low`.

Workflow status: `open | investigating | resolved | cancelled`.

Allowed transitions:

```text
open          -> investigating | resolved | cancelled
investigating -> open | resolved | cancelled
resolved      -> open
cancelled     -> open
```

Draft is not a workflow status. A record is a draft when `submitted_at` is
`null` and the resource returns `is_draft: true`.

Standard action types:

```text
security_notified
driver_notified
manager_notified
photos_taken
area_inspected
incident_recorded
```

`incident_recorded` is added automatically on submit. `photos_taken` is added
automatically on the first evidence upload.

## 4. API endpoints

### 4.1 Incident dashboard/list

```http
GET /api/admin/parking-incidents
```

Query parameters:

| Parameter | Format |
|---|---|
| `search` | Max 100 characters; matches number, description, location, rego, or driver. |
| `status` | Workflow status or `draft`. |
| `incident_type` | One supported incident type. |
| `severity` | One severity. |
| `building_id` | Integer. |
| `parking_area_id` | Integer. |
| `date_from`, `date_to` | Inclusive `YYYY-MM-DD` based on `occurred_at`. |
| `page` | Laravel pagination page. |
| `per_page` | 1–100; default 20. |

Example response:

```json
{
  "data": [
    {
      "id": 125,
      "incident_no": "INC-2026-00125",
      "parking_transaction_id": 901,
      "building_id": 4,
      "parking_area_id": 12,
      "parking_space_id": 44,
      "incident_type": "vehicle_collision",
      "severity": "high",
      "occurred_at": "2026-08-12T19:20:00.000000Z",
      "submitted_at": "2026-08-12T19:28:00.000000Z",
      "is_draft": false,
      "location_details": "Bay 4",
      "weather": "Fine",
      "shift": "Evening Shift",
      "description": "Vehicle collided with a bollard.",
      "status": "investigating",
      "reported_by": 18,
      "resolved_by": null,
      "resolved_at": null,
      "created_at": "2026-08-12T09:28:00.000000Z",
      "updated_at": "2026-08-12T09:30:00.000000Z",
      "building": { "id": 4, "name": "Harbour Logistics Centre", "code": "HLC" },
      "parking_area": { "id": 12, "name": "Loading Dock", "code": "DOCK" },
      "parking_space": { "id": 44, "space_code": "BAY-4" },
      "reporter": { "id": 18, "name": "Admin User" }
    }
  ],
  "links": {
    "first": "https://host/api/admin/parking-incidents?page=1",
    "last": "https://host/api/admin/parking-incidents?page=3",
    "prev": null,
    "next": "https://host/api/admin/parking-incidents?page=2"
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 3,
    "per_page": 20,
    "to": 20,
    "total": 42
  },
  "summary": {
    "critical": 2,
    "high": 5,
    "medium": 27,
    "low": 8,
    "total": 42
  },
  "filters": {
    "date_from": "2026-08-01",
    "date_to": "2026-08-17"
  }
}
```

The list resource may omit detail-only arrays because they are not loaded. The
summary applies search/date/site/area/type/status filters but intentionally
ignores `severity`, so selecting High still leaves the full severity card
distribution visible. Drafts never contribute to summary.

### 4.2 Form data

```http
GET /api/admin/parking-incidents/form-data
```

Response shape:

```json
{
  "incident_types": [{ "value": "vehicle_collision", "label": "Vehicle Collision" }],
  "severities": [{ "value": "high", "label": "High" }],
  "statuses": [{ "value": "investigating", "label": "Investigating" }],
  "action_presets": [{ "value": "manager_notified", "label": "Manager notified" }],
  "buildings": [{ "id": 4, "name": "Harbour Logistics Centre", "code": "HLC" }],
  "parking_areas": [{ "id": 12, "building_id": 4, "name": "Loading Dock", "code": "DOCK" }],
  "parking_spaces": [{ "id": 44, "building_id": 4, "parking_area_id": 12, "space_code": "BAY-4" }],
  "evidence_limits": {
    "max_files": 6,
    "max_size_kb": 10240,
    "mime_types": ["image/jpeg", "image/png", "image/webp"]
  }
}
```

### 4.3 Transaction options

```http
GET /api/admin/parking-incidents/transaction-options?search=ABC123&parking_area_id=12
```

Search and area are optional. At most 50 most-recent matches are returned.

```json
{
  "transactions": [
    {
      "id": 901,
      "transaction_no": "TXN-000901",
      "status": "active",
      "car_in_at": "2026-08-12T08:30:00.000000Z",
      "building": { "id": 4, "name": "Harbour Logistics Centre", "code": "HLC" },
      "parking_area": { "id": 12, "name": "Loading Dock", "code": "DOCK" },
      "parking_space": { "id": 44, "space_code": "BAY-4" },
      "vehicle": { "id": 77, "plate_number": "ABC123", "vehicle_type": "ute" },
      "driver": { "id": 31, "full_name": "John Smith", "phone": "0412345678", "company_name": "XYZ Logistics" }
    }
  ]
}
```

### 4.4 Create a draft or submitted incident

```http
POST /api/admin/parking-incidents
```

Recommended draft request:

```json
{
  "submission_state": "draft",
  "parking_transaction_id": 901,
  "incident_type": "vehicle_collision",
  "severity": "high",
  "occurred_at": "2026-08-12T19:20:00+10:00",
  "description": "Vehicle collided with a bollard while reversing.",
  "location_details": "Bay 4, right side",
  "weather": "Fine",
  "shift": "Evening Shift",
  "vehicles": [
    {
      "role": "other",
      "vehicle_id": 88,
      "driver_id": 42,
      "plate_number": "DEF456",
      "driver_name": "Michael Brown",
      "driver_contact": "0400111222",
      "company_name": "ABC Transport",
      "vehicle_type": "van"
    }
  ],
  "witnesses": [
    { "name": "Mike Johnson", "contact_number": "0400111222" }
  ]
}
```

For manual entry omit `parking_transaction_id` and send `building_id`, required
`parking_area_id`, and optional `parking_space_id`. A submitted request uses
`"submission_state": "submitted"`; type, severity, occurred time, description,
and area/transaction are required. A legacy request without `submission_state`
still accepts the old minimal type + description body.

Success: `201`, `{ "data": <IncidentDetailResource> }`.

### 4.5 Update incident details

```http
PUT /api/admin/parking-incidents/{id}
```

All fields are optional but validated when present. Send only changed fields.
`vehicles` or `witnesses`, when supplied, replace that complete participant
collection. Do not use this endpoint for normal status controls; use `/status`.

Success: `200`, `{ "data": <IncidentDetailResource> }`.

### 4.6 Submit draft

```http
POST /api/admin/parking-incidents/{id}/submit
```

Body: none. Only the original reporter may submit the draft. The backend checks
all required fields, assigns `incident_no`, sets `submitted_at`, opens the
incident, and appends `incident_recorded`.

Success: `200`, `{ "data": <IncidentDetailResource> }`.

### 4.7 Change status

```http
POST /api/admin/parking-incidents/{id}/status
Content-Type: application/json

{ "status": "investigating" }
```

Resolving sets `resolved_by` and `resolved_at`. Reopening a resolved incident
clears both. Every transition is activity-logged.

Success: `200`, `{ "data": <IncidentDetailResource> }`.

### 4.8 Evidence upload, preview, and removal

Upload one image per request:

```http
POST /api/admin/parking-incidents/{id}/evidence
Content-Type: multipart/form-data

file=<binary image>
captured_at=2026-08-12T19:23:00+10:00
```

Success: `201`:

```json
{
  "data": {
    "id": 55,
    "original_name": "rear-bumper.jpg",
    "mime_type": "image/jpeg",
    "size_bytes": 345678
  }
}
```

Refetch detail after upload to receive `download_url` and updated actions.

```http
GET    /api/admin/parking-incidents/{id}/evidence/{evidence-id}
DELETE /api/admin/parking-incidents/{id}/evidence/{evidence-id}
```

GET streams the private image inline. DELETE returns
`{ "message": "Evidence removed." }` and removes the private file plus its
active metadata record while retaining the audit event.

### 4.9 Actions taken

Preset action:

```http
POST /api/admin/parking-incidents/{id}/actions

{
  "action_type": "manager_notified",
  "notes": "Called the duty manager.",
  "occurred_at": "2026-08-12T19:25:00+10:00"
}
```

Custom action uses any custom `action_type` and must include `label`.

Success: `201`, `{ "data": <action-with-performer> }`.

### 4.10 Append manager note

```http
POST /api/admin/parking-incidents/{id}/notes

{ "body": "Review CCTV footage and confirm findings." }
```

Success: `201`, `{ "data": <note-with-author> }`. Notes cannot be edited or
deleted; corrections are appended as a new note.

### 4.11 Download PDF

```http
GET /api/admin/parking-incidents/{id}/pdf
```

Response is binary `application/pdf` with an attachment filename based on the
incident number. In Axios use `responseType: 'arraybuffer'` or the native file
download mechanism. Any user who can view the incident can download its PDF.

## 5. Full incident detail resource

Detail endpoints wrap this object in `{ "data": ... }`:

```json
{
  "id": 125,
  "incident_no": "INC-2026-00125",
  "parking_transaction_id": 901,
  "building_id": 4,
  "parking_area_id": 12,
  "parking_space_id": 44,
  "incident_type": "vehicle_collision",
  "severity": "high",
  "occurred_at": "2026-08-12T09:20:00.000000Z",
  "submitted_at": "2026-08-12T09:28:00.000000Z",
  "is_draft": false,
  "location_details": "Bay 4",
  "weather": "Fine",
  "shift": "Evening Shift",
  "location_snapshot": {
    "building": { "id": 4, "name": "Harbour Logistics Centre", "code": "HLC" },
    "parking_area": { "id": 12, "name": "Loading Dock", "code": "DOCK" },
    "parking_space": { "id": 44, "space_code": "BAY-4" }
  },
  "description": "Vehicle collided with a bollard while reversing.",
  "status": "investigating",
  "reported_by": 18,
  "resolved_by": null,
  "resolved_at": null,
  "created_at": "2026-08-12T09:28:00.000000Z",
  "updated_at": "2026-08-12T09:30:00.000000Z",
  "parking_transaction": { "id": 901, "transaction_no": "TXN-000901" },
  "building": { "id": 4, "name": "Harbour Logistics Centre", "code": "HLC" },
  "parking_area": { "id": 12, "name": "Loading Dock", "code": "DOCK" },
  "parking_space": { "id": 44, "space_code": "BAY-4" },
  "reporter": { "id": 18, "name": "Admin User" },
  "resolver": null,
  "vehicles": [
    {
      "id": 1,
      "role": "reporting",
      "vehicle_id": 77,
      "driver_id": 31,
      "plate_number": "ABC123",
      "driver_name": "John Smith",
      "driver_contact": "0412345678",
      "company_name": "XYZ Logistics",
      "vehicle_type": "ute"
    }
  ],
  "witnesses": [{ "id": 1, "name": "Mike Johnson", "contact_number": "0400111222" }],
  "evidence": [
    {
      "id": 55,
      "original_name": "rear-bumper.jpg",
      "mime_type": "image/jpeg",
      "size_bytes": 345678,
      "captured_at": "2026-08-12T09:23:00.000000Z",
      "uploaded_by": 18,
      "download_url": "https://host/api/admin/parking-incidents/125/evidence/55"
    }
  ],
  "actions": [
    {
      "id": 70,
      "action_type": "manager_notified",
      "label": "Manager notified",
      "notes": "Called duty manager.",
      "occurred_at": "2026-08-12T09:25:00.000000Z",
      "performed_by": 18,
      "performer": { "id": 18, "name": "Admin User" }
    }
  ],
  "notes": [
    {
      "id": 80,
      "body": "Review CCTV footage.",
      "created_at": "2026-08-12T09:30:00.000000Z",
      "created_by": 18,
      "author": { "id": 18, "name": "Admin User" }
    }
  ]
}
```

Relation objects can be `null`. Detail arrays are empty when no records exist.
Dates are JSON ISO-8601 timestamps; format them for the device locale/timezone.

## 6. Error contract

### 401 Unauthenticated

Token is absent, expired, or revoked:

```json
{ "message": "Unauthenticated." }
```

Mobile action: clear secure token and return to login.

### 403 Forbidden

Examples: missing menu action, creating in an unassigned area, or someone other
than the reporter attempting to submit a draft.

```json
{ "message": "This action is unauthorized." }
```

or a more specific message such as:

```json
{ "message": "You do not have access to this parking area." }
```

Mobile action: show the message, disable the forbidden control after permission
refresh, and do not retry automatically.

### 404 Not found or concealed

```json
{ "message": "Not Found" }
```

Used for missing incidents/evidence, another company, another user's draft, or
an existing incident outside the user's assigned areas. The API deliberately
does not disclose which access rule failed.

### 422 Validation error

Laravel validation shape:

```json
{
  "message": "The severity field is required. (and 1 more error)",
  "errors": {
    "severity": ["The severity field is required."],
    "parking_area_id": ["A parking area or parking transaction is required."]
  }
}
```

Important workflow errors include:

| Error key | Meaning |
|---|---|
| `submission_state` | Draft was already submitted. |
| `incident_type`, `severity`, `occurred_at`, `description`, `parking_area_id` | Required submission data is incomplete. |
| `building_id`, `parking_area_id`, `parking_space_id` | Location IDs conflict with each other or the selected transaction. |
| `status` | Requested workflow transition is invalid or the record is still a draft. |
| `file` | Evidence type/size is invalid or the six-file limit is reached. |
| `label` | Custom action omitted its display label. |

Mobile action: map `errors[field][0]` to the form field; show non-field errors in
an error banner. Preserve the user's unsaved form.

### 413 Payload too large

May be returned by the web server before Laravel when an upload exceeds server
limits. Mobile action: show the same 10 MB evidence guidance and let the user
choose/compress another image.

### 500/503 server or storage failure

Treat as retryable only for idempotent GET requests. Do not automatically retry
create, submit, action, note, or status mutations because the first request may
have committed. Refetch the incident before offering a manual retry.

## 7. Mobile state and cache rules

- Query keys should include company ID and every list filter.
- After create/update/submit/status/evidence/action/note, invalidate the incident
  detail and incident list/summary queries.
- Upload evidence sequentially so the app can show per-file progress and stop at
  the six-file server limit.
- Store unsent form state locally for network recovery, but treat the backend
  draft as authoritative after it has an `id`.
- Hide create/update controls using the permission map returned by auth, while
  still handling backend 403 responses.
- Do not infer approval state, manager ownership, or public storage URLs.
