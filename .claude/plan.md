# Mobile App — eazypark-admin (staff/admin app) Plan

Date: 2026-06-28
Companion doc: `docs/mobile-backend-plan.md` (the JSON API this app consumes).

This is the **staff/admin mobile app**: a native Expo / React Native app that
gives the people who log into the **eazy-parking-management** web dashboard the
same functionality on a phone or tablet. It logs in a **user** (dashboard email +
password), not a device.

It is **separate from** the self-service kiosk app
(`docs/react-native-kiosk-app-plan.md`), which pairs a single device and only
does check-in/out.

---

## 1. Context & goals

- Staff currently can only use the dashboard from a desktop browser.
- Goal: run day-to-day operations from a phone/tablet, with a layout that
  **fits small screens** (phone) and uses the extra space on a **tablet**.
- Phase 1 focuses on the core daily work: **transactions, drivers, bookings,
  cars (vehicles), tenants** — plus login, company switching and a dashboard.
- **Login is the same as the website** (dashboard credentials).
- **OCR is out of scope for Phase 1** (manual plate entry; optional photo on
  check-in). It is a later phase.

## 2. Locked decisions / assumptions

> Recommended defaults — flag any to change before build.

- **Native Expo / React Native** (matches the existing kiosk app; real phone +
  tablet UX; keeps the camera path open for future OCR).
- **New standalone Expo project** `eazypark-admin` (not bolted onto the
  locked-down kiosk app).
- **Auth:** email + password → Sanctum bearer token, with company switcher.
  **No 2FA** (login is email + password only).
- **One responsive codebase:** layout adapts by screen width (phone + tablet).
- **Navigation = collapsible sidebar (drawer)**, not bottom tabs — overlay on
  phone, pinned on tablet (§4.6, §5).
- **Mobile menu is curated in the app** (hard-coded config filtered by
  permissions), not a copy of the web sidebar — recommended approach in §4.7.

---

## 3. Tech stack (mirror the kiosk app's proven choices)

| Package | Purpose |
|---|---|
| Expo SDK (latest) + Expo Router | App shell + typed file routing |
| `expo-router/drawer` + `@react-navigation/drawer` | **Collapsible sidebar** navigation (not bottom tabs) |
| `react-native-gesture-handler` + `react-native-reanimated` | Drawer gestures/animation (drawer deps) |
| `@tanstack/react-query` | Server state / caching / refetch |
| `axios` | HTTP client + interceptors (Bearer + `X-Company-Id`) |
| `expo-secure-store` | Persist the Sanctum token securely |
| `react-hook-form` + `zod` | Forms + validation mirroring backend rules |
| `expo-camera` / `expo-image-picker` | Optional check-in photo (no OCR yet) |
| UI kit (gluestack-ui or react-native-paper) | Responsive components |

Install with `npx expo install` so versions match the chosen SDK.

---

## 4. App architecture

### 4.1 Project structure

```
src/
  app/
    _layout.tsx              # Providers: QueryClient, AuthProvider, CompanyProvider
    index.tsx                # token? -> /(drawer)/dashboard : /login
    login.tsx
    (drawer)/
      _layout.tsx            # Drawer navigator + custom AppSidebar drawer content
      dashboard.tsx
      transactions/
        index.tsx            # list + filters (active / all)
        [id].tsx             # detail + actions
        check-in.tsx         # new check-in (optional photo)
      bookings/
        index.tsx
        [id].tsx
        create.tsx           # create / edit
      drivers/index.tsx, [id].tsx
      vehicles/index.tsx, [id].tsx
      tenants/index.tsx, [id].tsx
  api/
    client.ts                # axios instance + interceptors
    auth.ts companies.ts dashboard.ts lookups.ts
    transactions.ts bookings.ts drivers.ts vehicles.ts tenants.ts
    types.ts                 # response/request interfaces
    schemas.ts               # zod schemas mirroring backend validation
  navigation/
    mobileMenu.ts            # curated mobile nav config (item -> permission slug)
  auth/AuthContext.tsx       # token (SecureStore) + user + permission map
  company/CompanyContext.tsx # active company id + switcher (sets X-Company-Id)
  components/
    AppSidebar.tsx           # custom drawer content: nav items + company + logout
    ResponsiveListDetail.tsx # 1 column on phone, list+detail on tablet
    ListScreen.tsx           # search bar + paginated list + pull-to-refresh
    SearchSelect.tsx         # debounced type-ahead picker (driver/vehicle/space)
    FormField.tsx, StatCard.tsx, Confirm.tsx, EmptyState.tsx, ErrorBanner.tsx
  hooks/
    use-permissions.ts       # can(slug, action) from the permission map
    use-debounced-search.ts
    use-paginated-query.ts
```

### 4.2 API client (`src/api/client.ts`)

```ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,   // https://host/api
  headers: { Accept: 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('admin_token');
  const companyId = await SecureStore.getItemAsync('active_company_id');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (companyId) config.headers['X-Company-Id'] = companyId;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('admin_token');  // force re-login
    }
    return Promise.reject(error);
  },
);
```

### 4.3 Auth flow

```
Login (email/password)
  └─ POST /api/auth/login
       └─ { token, user }   -> store token -> Dashboard
Reset password -> POST /api/auth/reset-password -> clear token -> Login
Logout -> POST /api/auth/logout -> clear token -> Login
```

- Store the token in `expo-secure-store`; on app start, `index.tsx` routes to
  Dashboard if a token exists, else Login.
- On any `401`, clear the token and return to Login.
- After a successful password reset, clear the local token and return to Login
  because the backend revokes all of the user's Sanctum tokens.

### 4.4 Company switching

- After login, `GET /api/auth/user` returns the user's companies + the active
  one. Store `active_company_id` in SecureStore; the interceptor sends it as
  `X-Company-Id`.
- The **drawer footer** (in `AppSidebar.tsx`) has the company picker (from
  `GET /api/companies` — outside company scope, callable before one is chosen),
  the current user, and **Logout**. Switching company
  updates `active_company_id` and **invalidates all react-query caches** so every
  list reloads for the new company.

### 4.5 Permissions in the UI

- `GET /api/auth/user` returns a permission map (`menuSlug -> [actions]`).
- `use-permissions.ts` exposes `can('operations.transactions', 'create')`.
- Hide/disable create/edit/delete buttons the user can't perform. The **server
  still enforces** every action (`menu.access`), so the UI gate is convenience
  only.

### 4.6 Navigation & the mobile menu (sidebar)

Navigation is a **collapsible sidebar (drawer)** — not bottom tabs. Built with
Expo Router's Drawer (`expo-router/drawer` → `@react-navigation/drawer`) with a
**custom drawer content** component (`AppSidebar.tsx`) so it looks like the web
sidebar: grouped nav items on top, company switcher + user + logout pinned to the
footer. A header hamburger / chevron toggles it open/closed.

**The mobile menu is curated, not a copy of the web sidebar.** It is defined as a
static config the app owns — recommended approach (see §4.7):

```ts
// src/navigation/mobileMenu.ts
export const MOBILE_MENU = [
  { key: 'dashboard',    label: 'Dashboard',    route: '/(drawer)/dashboard',    icon: 'home',    slug: 'dashboard' },
  { key: 'transactions', label: 'Transactions', route: '/(drawer)/transactions', icon: 'car',     slug: 'operations.transactions' },
  { key: 'bookings',     label: 'Bookings',     route: '/(drawer)/bookings',     icon: 'calendar',slug: 'operations.bookings' },
  { key: 'drivers',      label: 'Drivers',      route: '/(drawer)/drivers',      icon: 'user',    slug: 'people_vehicles.drivers' },
  { key: 'vehicles',     label: 'Vehicles',     route: '/(drawer)/vehicles',     icon: 'truck',   slug: 'people_vehicles.vehicles' },
  { key: 'tenants',      label: 'Tenants',      route: '/(drawer)/tenants',      icon: 'building', slug: 'locations.tenants' },
] as const;
```

`AppSidebar.tsx` renders `MOBILE_MENU.filter(i => can(i.slug, 'view'))` — so the
sidebar = **your curated list ∩ this user's permissions**. You can freely add,
remove, reorder or group items here without touching the backend; each item is
still permission-gated by the same slug the API enforces.

> The `MOBILE_MENU` above is the **Phase 1** slice (6 items) — that's all the
> screens Phase 1 ships. The menu **grows one group at a time as each phase
> lands**; the full target sidebar is below.

#### Full sidebar across all phases (target)

Grouped like the web sidebar; each row is added when its phase ships. Slugs are
the same `menu.access` slugs the backend enforces (`routes/admin.php`).

| Group | Item | Permission slug | Phase |
|---|---|---|---|
| — | Dashboard | `dashboard` | 1 |
| **Operations** | Transactions (+ dock board, check-in) | `operations.transactions` | 1 |
| | Bookings | `operations.bookings` | 1 |
| | Incidents | `operations.incidents` | 2 |
| | Plate review | `operations.plate_review` | 5 |
| **People & Vehicles** | Drivers | `people_vehicles.drivers` | 1 |
| | Vehicles (cars) | `people_vehicles.vehicles` | 1 |
| **Locations** | Tenants | `locations.tenants` | 1 |
| | Buildings | `locations.buildings` | 2 |
| | Parking areas | `locations.parking_areas` | 2 |
| | Parking spaces (+ occupancy grid) | `locations.spaces` | 2 |
| | Allocations | `locations.allocations` | 2 |
| **Reports** | Occupancy / utilisation / overstay / history… | `reports.*` | 3 |
| | Activity logs | `administration.activity_logs` | 3 |
| **Administration** | Users | `administration.users` | 2 (pulled forward) |
| | Roles & permissions | `administration.roles`, `administration.role_permissions` | 4 |
| | Menus | `administration.menu_management` | 4 |
| | Companies | `administration.companies` | 4 |
| | Kiosk devices | `administration.kiosk_devices` | 4 |

`MOBILE_MENU` becomes a grouped structure (sections with child items); the Phase
1 list is the first slice of it. Groups whose every child is permission-denied are
hidden entirely.

### 4.7 Why a curated (hard-coded) mobile menu — DECISION: A

Two ways to decide the mobile menu; **chosen: A (curate in the app)**.

- **A — Curated config in the app (recommended).** `mobileMenu.ts` above,
  filtered by the permission map. Simplest, gives tight control over mobile UX
  (order, grouping, icons), and needs **no backend change**.
- **B — Data-driven from the `Menu` table** (add `show_on_mobile` / `mobile_order`
  columns + expose them on `GET /api/auth/user`, manage in the Menu admin UI).

**Why A:** a data-driven menu can only ever *hide* items — it can't surface a
screen the app binary doesn't ship, and adding a new screen needs an app release
regardless. Permissions already hide what a user can't access. So B's only real
benefit (admins toggling visibility) is mostly already covered by permissions,
while A is faster and keeps mobile UX a deliberate design choice. Revisit B later
only if non-developers must reorder/hide mobile modules per company without a
release.

---

## 5. Responsive layout (phone + tablet)

One codebase, layout decided by `useWindowDimensions()` width breakpoint. The
**sidebar (drawer)** adapts to screen size:

- **Phone (< ~700px):** drawer is an **overlay** — hidden by default, opened with
  the header hamburger and dismissed by tapping the scrim (`drawerType: 'front'`).
  List screens are single-column; tapping a row **pushes** a detail route; forms
  are full-screen.
- **Tablet (≥ ~700px):** drawer is **persistent/pinned** beside the content
  (`drawerType: 'permanent'`), with a collapse toggle to hide it for more room.
  `ResponsiveListDetail` shows the **list and detail side-by-side** (master–detail);
  forms open in a modal / right pane.

The same `AppSidebar.tsx` content renders in both modes — only the drawer's
`drawerType` changes with width. All screens are written once against
`ResponsiveListDetail` / `ListScreen` so the
two layouts share logic and only differ in presentation.

---

## 6. Phase 1 screens (detail)

| Screen | Reads | Writes / actions |
|---|---|---|
| **Login** | — | `POST /auth/login` (email + password) |
| **Dashboard** | `GET /admin/dashboard` | — (KPIs, occupancy, quick links) |
| **Transactions · list** | `GET /admin/transactions`, `/active-vehicles` | filter active/all, search |
| **Transactions · detail** | `GET /admin/transactions/{id}` | check-out, change-space, cancel (`correct`/`mark-overstay` are a later pass) |
| **Check-in** | `plate-lookup` (prefill on full plate), `vehicle-search`/`car-search`/`driver-search`, lookups | `POST /admin/transactions/check-in` — optional photo; **driver: pick existing (search) or type a new name → auto-created**; new car make/model/colour saved too |
| **Bookings · list** | `GET /admin/bookings` | filter by status, area, date range (`date_from`/`date_to`), search |
| **Bookings · create/edit** | `GET /admin/bookings/form-data` | `POST` / `PUT /admin/bookings`; **driver: pick existing or type a new name → auto-created** |
| **Bookings · detail** | `GET /admin/bookings/{id}` | fulfil, cancel, delete |
| **Drivers** | `GET /admin/drivers` | create / edit / delete |
| **Vehicles (cars)** | `GET /admin/vehicles` | create / edit / delete; link drivers |
| **Tenants** | `GET /admin/tenants` | create / edit / delete |
| **Sidebar footer** | `GET /companies`, `/auth/user` | switch company, logout (in the drawer, §4.6) |

- Forms use `react-hook-form` + `zod` schemas in `src/api/schemas.ts` that
  **mirror the backend validation rules** (e.g. driver `full_name` required
  max:150; booking `ends_at` after `starts_at`). On `422`, map `errors{}` keys to
  the matching fields.
- Type-ahead pickers (`SearchSelect`) reuse the search endpoints
  (`transactions/vehicle-search`, `transactions/car-search`,
  `transactions/driver-search`, `transactions/company-search`, `lookups/drivers`)
  debounced ~250 ms, ≥ 2 chars.
- **Check-in driver/car handling:** the form never blocks on "the driver/car
  doesn't exist yet". The driver field is a search box → pick an existing driver
  (`driver_id`) **or** type a new name and submit it as `driver_name`
  (+ optional phone/company) — the backend creates + links the driver. Likewise
  a new plate's `vehicle_make/model/colour` are saved against the car.
- **Booking driver handling:** use the same driver input pattern as check-in.
  Submit `driver_id` for an existing driver, or `driver_name` (+ optional
  `driver_phone` / `driver_company_name`) to create a company-scoped driver.
  The backend stores it on the booking and links it to the vehicle immediately
  when `vehicle_id` is present, or when fulfilment later resolves the vehicle.

---

## 6A. API reference (Phase 1 — all live ✅)

> All Phase 1 endpoints below are **built, tested and committed** (branch
> `feat/mobile-admin-api`). This is the exact contract the app codes against.

### Conventions

- **Base URL:** `EXPO_PUBLIC_API_URL` = `https://<host>/api`. Paths below are
  relative to that (so `/auth/login` = `POST https://<host>/api/auth/login`).
- **Headers (every request):** `Accept: application/json`. **Authed requests:**
  `Authorization: Bearer <token>`. **Company-scoped requests (everything under
  `/admin/*`):** also `X-Company-Id: <id>`.
- **Token:** Sanctum, **expires in 7 days** → on `401`, clear token and re-login.
- **List envelope (Laravel paginator):**
  ```jsonc
  { "data": [ /* resources */ ],
    "links": { "first": "...", "last": "...", "prev": null, "next": "..." },
    "meta": { "current_page": 1, "last_page": 3, "per_page": 20, "total": 45 } }
  ```
  Lists take `?page=`. Page size is **20**.
- **Single resource:** `{ "data": { /* resource */ } }`.
- **Errors:** `422 { "message", "errors": { "field": ["..."] } }` ·
  `401 { "message": "Unauthenticated." }` · `403` (no permission / wrong company
  on a write) · `404` (record not in your company / missing).

### Auth & company  (no `X-Company-Id` needed)

| Method · Path | Request | Response |
|---|---|---|
| `POST /auth/login` | `{ email, password, device_name? }` | `200 { token, ...userPayload }` · bad creds → `422` (`errors.email`) |
| `POST /auth/logout` | — (Bearer) | `200 { message }` (revokes the calling token) |
| `GET /auth/user` | (Bearer; `X-Company-Id` optional → drives `permissions`) | `200 userPayload` |
| `GET /companies` | (Bearer) | `200 { companies: [{ id, name, code }] }` |

**`userPayload`** (returned by login & `/auth/user`):
```jsonc
{
  "user": { "id": 1, "name": "Jane", "email": "jane@acme.test" },
  "companies": [ { "id": 3, "name": "Acme", "code": "ACME" } ],
  "is_super_admin": false,
  "active_company_id": 3,            // null if multi-company & no X-Company-Id yet
  "permissions": {                    // slug -> { view, create, update, delete, export }
    "operations.transactions": { "view": true, "create": true, "update": true, "delete": false, "export": false }
  }
}
```
> `can(slug, action)` = `is_super_admin || permissions[slug]?.[action]`.

### Dashboard & lookups  (under `/admin`, need `X-Company-Id`)

| Method · Path | Notes |
|---|---|
| `GET /admin/dashboard` | `{ metrics: {...}, active_vehicles: { data:[…] } }`. `metrics` keys: `buildings, tenants, areas, total_spaces, active_spaces, occupied_spaces, available_spaces, occupancy_percentage, currently_inside, visitor_inside, delivery_inside, today_transactions, today_checkouts, overstay_alerts, open_overstay_incidents, plate_review_required, flexible_allocation_{quota,used,usage_percentage}`. Needs `dashboard,view`. |
| `GET /admin/lookups/buildings` | `{ buildings: [{ id, name }] }` |
| `GET /admin/lookups/parking-areas?building_id=` | `{ parking_areas: [{ id, building_id, name }] }` |
| `GET /admin/lookups/parking-spaces?parking_area_id=&available_only=1` | `{ parking_spaces: [{ id, building_id, parking_area_id, space_code, occupancy_status }] }` |
| `GET /admin/lookups/tenants?building_id=` | `{ tenants: [{ id, building_id, name }] }` |
| `GET /admin/lookups/drivers?q=` | `{ drivers: [{ id, full_name, phone, company_name }] }` |

> Lookups are **not** menu-gated (any authed company user can load pickers).

### Drivers  (`menu.access: people_vehicles.drivers`)

| Method · Path | Action | Body |
|---|---|---|
| `GET /admin/drivers?search=&status=&page=` | view | — |
| `POST /admin/drivers` | create | driver fields ↓ |
| `GET /admin/drivers/{id}` | view | — (includes `vehicles[]`) |
| `PUT /admin/drivers/{id}` | update | driver fields ↓ |
| `DELETE /admin/drivers/{id}` | delete | — |

**Driver fields / rules:** `full_name`* (max 150), `phone` (max 50), `email`
(email, 150), `company_name` (max 150), `license_no` (max 100), `status`* (`active|inactive|banned`), `notes`.
**Resource:** `{ id, full_name, phone, email, company_name, license_no, status, notes, created_at, updated_at, vehicles?: [{ id, plate_number, plate_state }] }`.

### Vehicles  (`people_vehicles.vehicles`) — global, not company-scoped

| Method · Path | Action |
|---|---|
| `GET /admin/vehicles?search=&status=&vehicle_type=&page=` | view |
| `POST /admin/vehicles` · `GET/PUT/DELETE /admin/vehicles/{id}` | create/view/update/delete |

**Fields / rules:** `plate_number`* (max 50), `plate_state` (max 50),
`plate_country` (max 100, default `Australia`), `vehicle_type`*
(`car|van|truck|motorcycle|ute|other`), `make`/`model` (max 100), `colour`
(max 50), `status`* (`active|inactive|banned`), `notes`. Duplicate plate
(normalized + state + country) → `422 errors.plate_number`.
**Resource:** `{ id, plate_number, plate_number_normalized, plate_state, plate_country, status, notes, car_id, vehicle_type, make, model, colour, created_at, updated_at, drivers?: [{ id, full_name, company_name }] }` (make/model/colour/type are flattened from the linked car).

### Driver–vehicle links  (`people_vehicles.drivers`)

| Method · Path | Body |
|---|---|
| `GET /admin/driver-vehicles?driver_id=&vehicle_id=&status=&page=` | — |
| `POST /admin/driver-vehicles` | `{ driver_id*, vehicle_id*, relationship_type* (primary\|occasional\|unknown), status* (active\|inactive) }` |
| `PUT /admin/driver-vehicles/{id}` | `{ relationship_type*, status* }` |
| `DELETE /admin/driver-vehicles/{id}` | — |

Duplicate (same driver+vehicle) → `422 errors.driver_id`. **Resource:**
`{ id, driver_id, vehicle_id, relationship_type, status, first_seen_at, last_seen_at, created_at, driver?: { id, full_name }, vehicle?: { id, plate_number, plate_state } }`.

### Tenants  (`locations.tenants`)

| Method · Path | Action |
|---|---|
| `GET /admin/tenants?search=&building_id=&tenant_type=&page=` · `POST` · `GET/PUT/DELETE /{id}` | full CRUD |

**Fields / rules:** `building_id`* (must be in company), `name`* (max 150),
`code` (max 50, unique per building), `tenant_type`* (`building_owner|tenant|shop|office|contractor|delivery_partner|other`), `contact_name` (150), `contact_phone` (50), `contact_email` (email 150), `suite_or_unit` (100), `floor` (50), `status`* (`active|inactive`).
**Resource:** `{ id, building_id, name, code, tenant_type, contact_name, contact_phone, contact_email, suite_or_unit, floor, status, created_at, updated_at, building?: { id, name } }`.

### Transactions  (`operations.transactions`)

| Method · Path | Action | Notes |
|---|---|---|
| `GET /admin/transactions?search=&status=&building_id=&tenant_id=&parking_area_id=&date_from=&date_to=&page=` | view | all transactions; `date_from`/`date_to` are `YYYY-MM-DD`, inclusive, filter on the **entry date** (`car_in_at`) |
| `GET /admin/transactions/active-vehicles?search=&parking_area_id=&driver_type=&page=` | view | active only (area-restricted for non-admins) |
| `GET /admin/transactions/vehicle-search?q=` | view | type-ahead: `{ vehicles: [{ id, car_id, plate_number }] }` (q ≥ 1) |
| `GET /admin/transactions/driver-search?q=` | view | `{ drivers: [{ id, full_name, phone, email, company_name }] }` |
| `GET /admin/transactions/company-search?q=` | view | driver-company type-ahead: `{ driver_companies: [{ id, name }] }` — suggests existing company names for `driver_company_name` |
| `GET /admin/transactions/car-search?q=` | view | distinct cars: `{ cars: [{ id, vehicle_type, make, model, colour }] }` (fills check-in car fields) |
| `GET /admin/transactions/plate-lookup?plate=` | view | **full-plate prefill for check-in** (shape ↓) |
| `GET /admin/transactions/{id}` | view | includes relations + `events[]` |
| `POST /admin/transactions/check-in` | create | **`multipart/form-data`** (optional `image`) → **201** |
| `POST /admin/transactions/{id}/check-out` | update | multipart (optional `image`) → 200 |
| `POST /admin/transactions/{id}/change-space` | update | `{ parking_space_id*, comments? }` |
| `POST /admin/transactions/{id}/cancel` | delete | — |

**check-in body:** `building_id`* · `parking_area_id`* · `parking_space_id`
(omit → server auto-assigns next available bay) · `tenant_id` · `vehicle_id`
(existing) · `plate_number`* · `vehicle_make/model/colour` · `vehicle_type` (enum)
· `driver_type`* (`building_owner|tenant|contractor|visitor|delivery`)
· `entry_method`* (`browser_camera|image_upload|manual_entry`) · `contact_name`
(max 150) · `contact_phone` (max 50) · `comments` · `image` (jpg/jpeg/png/webp,
≤10 MB). **Driver (optional):** send `driver_id` for an existing driver, **or**
`driver_name` (+ optional `driver_phone`, `driver_company_name`) to
**auto-create and link the driver** during check-in; send neither for no
driver. `driver_company_name` can be typed freely or picked from
`transactions/company-search` suggestions — either way a new name is added to
the company's driver-company list automatically. **Sending `driver_id` for an
existing driver *also* syncs `driver_company_name`/`driver_phone` onto that
driver's stored `company_name`/`phone`** — only when non-blank (blank/omitted
values never wipe what's already stored), so re-typing a driver's company at
check-in updates their one canonical record in place rather than creating a
duplicate driver. Vehicle already active → `422`; banned → `422`; area full →
`422 errors.parking_space_id`.
**check-out body:** `exit_method`* (enum) · `plate_number` · `comments` · `image`.

**`plate-lookup` — the check-in prefill flow.** App sends the full plate; if the
vehicle is known it returns its details + history-based prefill + any active
session; if unknown, everything is `null` and the app fills the form manually.
```jsonc
// GET /admin/transactions/plate-lookup?plate=ABC123
{
  "normalized_plate": "ABC123",
  "vehicle": { "id": 5, "car_id": 9, "plate_number": "ABC-123", "plate_state": "NSW",
               "status": "active", "vehicle_type": "van", "make": "Ford", "model": "Transit", "colour": "White" },
  "active_transaction": { "id": 12, "transaction_no": "TXN-…", "car_in_at": "…",
                           "parking_space_id": 3, "driver_type": "contractor", "parking_space": {…},
                           "contact_name": "Jane Doe", "contact_phone": "…" },
  "prefill": {                                  // from the vehicle's last visit
    "suggested_driver": { "id": 7, "full_name": "Jane Doe", "phone": "…", "company_name": "…" },
    "last_driver_type": "contractor",
    "last_tenant_id": 4,
    "last_tenant": { "id": 4, "name": "Acme Co" },  // who they last visited
    "last_contact_name": "Jane Doe",
    "last_contact_phone": "…"
  },
  "recent_visits": [ { "id", "transaction_no", "status", "driver_type", "driver_name",
                       "tenant_id", "tenant_name", "car_in_at", "car_out_at", "duration_minutes",
                       "contact_name", "contact_phone" } ]
}
```
> Check-in screen flow: type plate → on full entry call `plate-lookup` → if
> `vehicle` non-null, prefill `vehicle_*`, `driver_id` (= `suggested_driver.id`),
> `driver_type` (= `last_driver_type`), `tenant_id` (= `last_tenant_id`),
> `contact_name`/`contact_phone` (= `last_contact_name`/`last_contact_phone`) —
> all editable; if `active_transaction` non-null, warn "already inside / check
> out instead". If `vehicle` is null, leave the form blank for manual entry. The
> driver field stays editable either way: keep the `suggested_driver` (sends
> `driver_id`) or clear it and type a new name (sends `driver_name` → the backend
> creates + links the driver on submit). `company_name` on `suggested_driver` is
> the driver's own record — keeping `driver_id` and typing a different
> `driver_company_name`/`driver_phone` **updates that same driver in place**
> (see the driver-record note in §6A Transactions), it does not create a
> duplicate.

**Resource:** `{ id, transaction_no, status, driver_type, building_id, parking_area_id, parking_space_id, tenant_id, driver_id, vehicle_id, transaction_date, car_in_at, car_out_at, duration_minutes, entry_method, exit_method, entry_plate_number_raw, exit_plate_number_raw, comments, vehicle_snapshot, driver_snapshot, tenant_snapshot, contact_name, contact_phone, created_at, + (on show) building, parking_area, parking_space, tenant, driver, vehicle, events[] }`.
`contact_name`/`contact_phone` are set from the check-in body directly, or copied from the
booking when a booking is fulfilled into a transaction (§ Bookings below) — they are
plain fields on the transaction, not part of any snapshot.

### Bookings  (`operations.bookings`)

| Method · Path | Action | Body / notes |
|---|---|---|
| `GET /admin/bookings?search=&status=&parking_area_id=&date_from=&date_to=&page=` | view | `date_from` / `date_to` are `YYYY-MM-DD`; filter on `starts_at` |
| `GET /admin/bookings/by-space?date=&building_id=&parking_area_id=&status=&search=` | view | **not paginated** — every space in scope for that day (**including spaces with zero bookings**), each with a derived `status`. Powers a per-space day board. |
| `GET /admin/bookings/form-data` | view | `{ buildings, areas, spaces, tenants, drivers }` pickers |
| `POST /admin/bookings` | create | booking fields ↓ → 201 |
| `GET /admin/bookings/{id}` | view | — |
| `PUT /admin/bookings/{id}` | update | booking fields ↓ (only `pending`/`confirmed`, else 422) |
| `POST /admin/bookings/{id}/fulfil` | update | `{ entry_method* (enum), comments? }` → **201** (returns the created **transaction**) |
| `POST /admin/bookings/{id}/cancel` | update | — |
| `DELETE /admin/bookings/{id}` | delete | — |

**`by-space` day board.** Returns **every** parking space in scope for `date`
(filtered by `building_id`/`parking_area_id` like any other space list) — not
just spaces that happen to have a booking. Each row carries a derived
`status`, in this priority order:
1. **`occupied`** — the space's live `occupancy_status` is `occupied` (a
   vehicle is physically parked there right now). This is always **real-time**
   — there's no historical/future occupancy record, so for a `date` other
   than today this only reflects what's true *right now*, not what will be
   true on that date.
2. **`booked`** — not currently occupied, but has an active (`pending`/
   `confirmed`) booking covering `date`.
3. **`available`** — neither of the above.

`?status=available|booked|occupied` filters the returned rows to just that
status. `?search=` still narrows which bookings appear in each row's
`bookings[]` array (matching `booking_no`/plate/`contact_name`), but does
**not** hide a space or change its computed `status` — a space's `status` is
independent of the search term.
```jsonc
// GET /admin/bookings/by-space?date=2026-07-10&parking_area_id=4
{
  "data": [
    { "parking_space_id": 12, "space_code": "A-01", "status": "occupied", "bookings": [] },
    { "parking_space_id": 13, "space_code": "A-02", "status": "booked", "bookings": [ /* ParkingBookingResource[] */ ] },
    { "parking_space_id": 14, "space_code": "A-03", "status": "available", "bookings": [] }
  ]
}
```

**Booking fields / rules:** `building_id`* · `parking_area_id`* ·
`parking_space_id`* (operational) · `tenant_id` · `vehicle_id` · `driver_type`*
(enum) · `plate_number`* (max 50) · `contact_name` (150) · `contact_phone` (50) ·
`starts_at`* (date) · `ends_at`* (date, after `starts_at`) · `notes`.
**Driver (optional):** send `driver_id` for an existing driver, or `driver_name`
(max 150) with optional `driver_phone` (max 50) and `driver_company_name`
(max 150) to auto-create a company-scoped driver; send neither for no driver.
When both are supplied, `driver_id` takes precedence — and `driver_phone`/
`driver_company_name` sent alongside it **sync onto that existing driver**
in place (non-blank values only; same behaviour as check-in). The driver is
linked to an existing `vehicle_id` immediately, or to the vehicle created/
resolved when the booking is fulfilled. Overlapping the same bay/time →
`422 errors.parking_space_id`. **Immediate bookings on an occupied space are
also rejected:** if `starts_at` is now or in the past *and* the space's live
`occupancy_status` isn't `available` → `422 errors.parking_space_id`
("This space is currently occupied and cannot be booked to start
immediately."). Future-dated bookings are **not** checked against current
occupancy (only against other bookings' time windows) — the space may well be
vacated by then; occupancy is re-checked for real at fulfil time.
**Resource:** `{ id, booking_no, status, building_id, parking_area_id, parking_space_id, tenant_id, driver_id, vehicle_id, driver_type, plate_number_raw, contact_name, contact_phone, starts_at, ends_at, notes, parking_transaction_id, created_at, + building, parking_area, parking_space, tenant, driver? }`.
`driver` (when linked): `{ id, full_name, phone, email, company_name }`.
**On fulfil:** the booking's `contact_name`/`contact_phone` are copied onto the
resulting transaction (not just left on the booking), so check-out/reporting
screens reading the transaction still have them.

---

## 6B. Phase 2 screens (detail)

| Screen | Reads | Writes / actions |
|---|---|---|
| **Buildings** | `GET /admin/buildings?search=&page=` | create / edit / delete |
| **Parking areas** | `GET /admin/parking-areas?search=&building_id=&page=` | create / edit / delete — **no assignments editor at all** (see decision below) |
| **Parking spaces** | `GET /admin/parking-spaces?search=&parking_area_id=&space_type=&operational_status=&page=` | create / edit / delete; **bulk-create** (`prefix` + `start_number` + `count`) |
| **Occupancy grid** | `GET /admin/parking-spaces/occupancy-grid?building_id=&parking_area_id=&occupancy_status=&operational_status=` | read-only grid view + summary counts (available/occupied/maintenance/blocked/inactive) — no pagination, no writes |
| **Allocations** | `GET /admin/parking-allocations?building_id=&tenant_id=&allocation_type=&status=&page=` | create / edit / delete |
| **Incidents** | `GET /admin/parking-incidents?status=&incident_type=&page=` | create / edit — **no delete** (matches the backend; once reported an incident is only ever updated to `resolved`/`cancelled`) |
| **Transaction detail (existing Phase 1 screen)** | — | new **"Mark overstay"** action → `POST /admin/transactions/{id}/mark-overstay` |
| **Transactions list (existing Phase 1 screen)** | — | new **"Export"** action → download **Excel** or **PDF** of the current filtered list via `GET /admin/transactions/export?format=excel\|pdf` |
| **Users** *(pulled forward from Phase 4)* | `GET /admin/users?search=&page=` | create / edit / remove-from-company (`DELETE` only unlinks the user from the active company — the account itself isn't deleted); see §6D for the full, non-trivial contract |
| **Security / password reset** | — | reset current user's password with old password confirmation via `POST /auth/reset-password`; on success, clear token and return to Login |

**Decision: no parking-area-user assignment management in the app.** There is
**no** Parking-area users screen and **no** inline assignments editor on the
Parking area form. A standalone `/parking-area-users` API + web screen was
built during Phase 2 (mirroring an existing but unlinked web feature — a
company-wide cross-area assignment list), then **removed from both web and
API** as unneeded: the underlying `ParkingAreaUser` assignments still exist and
are still used for `parking.area.access` restrictions on transaction writes,
but they're managed only via the web's inline "Area Assignments" panel on the
Parking Area edit form — a flow the mobile app does not need to replicate for
Phase 2. If assignment management is wanted on mobile later, that's a fresh
scoping decision, not a resurrection of the removed screen.

- Forms use the same `react-hook-form` + `zod` pattern as Phase 1, mirroring the
  enums/rules below.
- `SearchSelect` pickers reuse `lookups/buildings`, `lookups/parking-areas?building_id=`
  for the Parking area / Parking space / Allocation forms.
- The Incidents "resolve" action is just `PUT .../{id}` with `status: 'resolved'`;
  the app does not send `resolved_by`/`resolved_at` — the backend sets both
  server-side on that transition.
- "Mark overstay" only appears on an **active** transaction; submitting on a
  non-active one returns `422 { errors: { transaction: [...] } }`.

---

## 6C. API reference (Phase 2 — all live ✅)

All endpoints below are **built, tested and committed**. Same conventions as
§6A (base URL, headers, token, list envelope, error shapes). Most Phase 2
routes sit under `/admin` and need both `Authorization` and `X-Company-Id`; the
password reset endpoint is auth-only and does **not** need `X-Company-Id`.

### Auth / security

| Method · Path | Action |
|---|---|
| `POST /auth/reset-password` | reset current user's password; request `{ old_password*, password*, password_confirmation* }` → `200 { message }`; wrong old password → `422 errors.old_password`; successful reset revokes all of the user's API tokens |

### Buildings  (`locations.buildings`)

| Method · Path | Action |
|---|---|
| `GET /admin/buildings?search=&page=` · `POST` · `GET/PUT/DELETE /{id}` | full CRUD |

**Fields / rules:** `name`* (max 150), `code` (max 50, unique per company),
`building_type` (max 50), `contact_name` (150), `contact_phone` (50),
`contact_email` (email, 150), `address_line_1`* (255), `address_line_2` (255),
`suburb` (100), `state` (100), `postal_code` (30), `country` (100),
`latitude`/`longitude` (numeric), `status`* (`active|inactive`).
**Resource:** `{ id, name, code, building_type, contact_name, contact_phone, contact_email, address_line_1, address_line_2, suburb, state, postal_code, country, latitude, longitude, status, created_at, updated_at }`.

### Parking areas  (`locations.parking_areas`)

| Method · Path | Action |
|---|---|
| `GET /admin/parking-areas?search=&building_id=&page=` · `POST` · `GET/PUT/DELETE /{id}` | full CRUD — **no assignment management at all** (see §6B decision; `/parking-area-users` does not exist as an API) |

**Fields / rules:** `building_id`* (must be in company), `name`* (max 150),
`code` (max 50), `level` (max 50), `area_type`*
(`standard|visitor|loading|contractor|mixed`), `capacity`* (int, min 1),
`status`* (`active|inactive|maintenance`), `notes`.
**Resource:** `{ id, building_id, name, code, level, area_type, capacity, status, notes, created_at, updated_at, building?: { id, name } }`.

### Parking spaces  (`locations.spaces`)

| Method · Path | Action | Notes |
|---|---|---|
| `GET /admin/parking-spaces?search=&parking_area_id=&space_type=&operational_status=&page=` | view | page size **50** (not 20) |
| `GET /admin/parking-spaces/occupancy-grid?building_id=&parking_area_id=&occupancy_status=&operational_status=` | view | **not paginated** — full result set + summary |
| `POST /admin/parking-spaces` | create | `building_id` is derived server-side from `parking_area_id` — don't send it |
| `POST /admin/parking-spaces/bulk` | create | `{ parking_area_id*, prefix*, start_number* (int min 1), count* (int min 1, max 500), space_type*, default_usage*, operational_status* }` → `{ created, skipped }` (skips codes that already exist in that area) |
| `GET/PUT/DELETE /admin/parking-spaces/{id}` | view/update/delete | delete can return `422 errors.space` if the space is occupied, has an active transaction, or has a pending/confirmed booking |

**Fields / rules (store/update):** `parking_area_id`* (in company),
`space_code`* (max 80, unique **within that parking area**), `space_type`*
(`standard|accessible|ev|motorcycle|loading|visitor`), `default_usage`*
(`building_owner|tenant|contractor|visitor|delivery|flexible`),
`operational_status`* (`active|inactive|maintenance|blocked`), `notes`.
**Delete:** `DELETE /admin/parking-spaces/{id}` soft-deletes the space and
releases its `space_code` for reuse. It is blocked with `422 errors.space` when
the space is occupied, has an active transaction, or has a pending/confirmed
booking.
**Resource:** `{ id, building_id, parking_area_id, space_code, space_type, default_usage, operational_status, occupancy_status, current_transaction_id, current_vehicle_id, occupied_since, sort_order, notes, created_at, updated_at, building?, parking_area?, current_transaction?: { id, transaction_no, car_in_at, status } | null, current_vehicle?: { id, plate_number } | null }`.

**Occupancy grid response shape:**
```jsonc
// GET /admin/parking-spaces/occupancy-grid
{
  "spaces": { "data": [ /* ParkingSpaceResource[], with building/parking_area/current_transaction/current_vehicle loaded */ ] },
  "areas": [ { "id": 1, "building_id": 2, "name": "Basement B1" } ],   // areas present in the result, for the filter picker
  "buildings": [ { "id": 2, "name": "Tower A" } ],                     // buildings present in the result
  "summary": { "total": 40, "available": 25, "occupied": 15, "active": 38, "maintenance": 1, "blocked": 1, "inactive": 0 }
}
```

### Parking allocations  (`locations.allocations`)

| Method · Path | Action |
|---|---|
| `GET /admin/parking-allocations?building_id=&tenant_id=&allocation_type=&status=&page=` · `POST` · `GET/PUT/DELETE /{id}` | full CRUD |

**Fields / rules:** `building_id`* (in company), `tenant_id` (nullable, in
company), `parking_area_id` (nullable, in company), `allocation_type`*
(`flexible_quota|temporary_quota|visitor_quota|loading_quota`), `user_category`*
(`building_owner|tenant|contractor|visitor|delivery`), `quota`* (int, min 1),
`release_after_minutes` (int, min 1), `starts_at` (date), `ends_at` (date,
`after_or_equal:starts_at`), `status`* (`active|inactive|expired`), `notes`.
**Note:** `starts_at`/`ends_at` are normalised server-side to start-of-day /
end-of-day — send plain `YYYY-MM-DD` dates, the time component you send is
discarded.
**Resource:** `{ id, building_id, tenant_id, parking_area_id, allocation_type, user_category, quota, release_after_minutes, starts_at, ends_at, status, notes, created_at, updated_at, building?, tenant?, parking_area? }` (relation keys are `null` when not set, not omitted).

### Parking incidents  (`operations.incidents`) — CRU only, no delete

| Method · Path | Action | Body |
|---|---|---|
| `GET /admin/parking-incidents?status=&incident_type=&page=` | view | — |
| `POST /admin/parking-incidents` | create | `{ parking_transaction_id?, parking_space_id?, incident_type* (damage\|unauthorised_vehicle\|overstay\|blocked_space\|safety\|other), description* }` → 201 |
| `GET /admin/parking-incidents/{id}` | view | — |
| `PUT /admin/parking-incidents/{id}` | update | `{ incident_type*, description*, status* (open\|resolved\|cancelled) }` |

`reported_by` is set server-side from the authed user on create.
Transitioning `status` to `resolved` sets `resolved_by`/`resolved_at`
server-side — don't send them.
**Resource:** `{ id, parking_transaction_id, parking_space_id, incident_type, description, status, reported_by, resolved_by, resolved_at, created_at, updated_at, parking_transaction?: { id, transaction_no } | null, parking_space?: { id, space_code } | null, reporter?: { id, name } | null }`.

### Mark overstay  (`operations.incidents,create` + area access) — on transactions

| Method · Path | Body |
|---|---|
| `POST /admin/transactions/{id}/mark-overstay` | `{ description* (max 1000) }` → **201**, returns the created incident (`ParkingIncidentResource`) |

Only valid for an **active** transaction — otherwise `422 errors.transaction`
("Overstay can only be logged for an active transaction."). Same
`parking.area.access` restriction as check-out/change-space/cancel (non-admins
need an active `ParkingAreaUser` assignment for that transaction's area).

### Transactions export  (`operations.transactions,export`) — file download

One endpoint downloads the transactions list as a spreadsheet or a printable
report, chosen by the **`format`** query param. It takes the **same query
filters as `GET /admin/transactions`** (`search`, `status`, `building_id`,
`tenant_id`, `parking_area_id`, `date_from`, `date_to`) and exports **every row that matches those
filters** (not just the current page, and not just active). Gated by the
**`export`** action on `operations.transactions` (distinct from `view` — a user
can be allowed to read the list but not export it).

| Method · Path | Returns |
|---|---|
| `GET /admin/transactions/export?format=excel&search=&status=&building_id=&tenant_id=&parking_area_id=&date_from=&date_to=` | `.xlsx` file (`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) |
| `GET /admin/transactions/export?format=pdf&…same filters…` | `.pdf` file (`Content-Type: application/pdf`, A4 landscape) |

- **`format`** is `excel` (default when omitted) or `pdf`. Any other/blank value
  falls back to `excel`.
- **`date_from` / `date_to`** are `YYYY-MM-DD` and **inclusive**, filtering on
  the **entry date** (`car_in_at`). Send either or both (e.g. `date_from` alone =
  everything from that day onward).

- **Not JSON.** The response body is the **binary file**, with
  `Content-Disposition: attachment; filename="transactions-YYYYMMDD-His.xlsx"`
  (or `.pdf`). There is no `{ data: … }` envelope.
- **Excel columns:** Transaction No, Status, Driver Type, Building, Parking Area,
  Space, Plate Number, Driver, Contact Name, Contact Phone, Car In, Car Out,
  Duration (min), Entry Method, Exit Method.
- **PDF columns** (fits landscape): Transaction No, Status, Type, Area, Space,
  Plate, Driver, Car In, Car Out, Duration.
- **Downloading on the app:** these need the same `Authorization: Bearer` +
  `X-Company-Id` headers as every `/admin/*` call, so a plain `<a href>` /
  `Linking.openURL` won't carry auth. Fetch the file as a blob/arraybuffer
  through the authed `axios` client (`responseType: 'blob'` / `'arraybuffer'`),
  write it to a temp file (`expo-file-system`), then open/share it
  (`expo-sharing`) or save it (`Sharing.shareAsync` / the OS share sheet). Gate
  the Export button behind `can('operations.transactions', 'export')`.

---

## 6D. Users (`administration.users`) — pulled forward from Phase 4

Users are **not** plain CRUD like the rest of Phase 2 — a "user" spans two
models (`User` + one `CompanyUser` pivot per company) with super-admin
branching. Read this before building the screen.

| Method · Path | Action | Body |
|---|---|---|
| `GET /admin/users?search=&page=` | view | — |
| `POST /admin/users` | create | `{ name*, email* (unique), password* (min 8), role_id*, company_id?, status* (active\|inactive) }` → 201 |
| `GET /admin/users/{id}` | view | — |
| `PUT /admin/users/{id}` | update | `{ name*, email* (unique, ignoring self), role_id*, company_id?, status* }` — **no `password` field, there is no change-password flow on this screen** |
| `DELETE /admin/users/{id}` | delete | — **removes the user from the active company only** (deletes the `CompanyUser` pivot row); the `User` account itself is never deleted |
| `GET /admin/lookups/roles` | — | picker: assignable roles for the acting user (see below) — no menu gate |

**How `company_id` / `role_id` resolve (same for create and update):**
- **Non-super-admin:** always forced onto their own active company —
  whatever `company_id` you send is ignored.
- **Super admin:** may send an explicit `company_id` (any active company —
  pick it from `GET /companies`), or omit it.
- **Either way:** if the selected `role_id`'s role has `slug === 'super_admin'`,
  the server **forces `company_id` to `null`** (a global super-admin user)
  regardless of what was submitted.
- If, after the above, there is still no target company for a **non**-`super_admin`
  role → `422 { errors: { company_id: [...] } }`.
- If the selected role doesn't belong to the target company (a `scope: 'company'`
  role from a different company) → `422 { errors: { role_id: [...] } }`.
- `GET /admin/lookups/roles` returns only the roles actually assignable given
  the caller's admin/super-admin status and active company — **populate the
  role picker from this endpoint so the client never offers an invalid
  combination**; still handle the two 422 shapes above defensively.

**Resource:** `{ id, name, email, created_at, updated_at, company_users: [{ id, company_id, role_id, status, role: { id, name, slug } }] }`.
`company_users` is normally a single-element array — the one pivot row for
the company you're viewing as. A super admin viewing/editing a user may see
more than one row (that user's memberships across companies); when building
the edit form, use `company_users[0]` (matching the web dashboard's own
convention) unless you need to disambiguate.

**Roles lookup response:** `{ roles: [{ id, name, slug, scope, company_id }] }`
— `scope: 'system'` roles (e.g. `admin`, `manager`, `supervisor`, `operation`,
`employee`, `account`, and `super_admin` for super admins only) are always
assignable; `scope: 'company'` roles are only included when they belong to
the company you're currently creating/editing the user for.

- Cross-company access (viewing/editing a user not linked to your active
  company, as a non-super-admin) → `404`, not `403` (same divergence as every
  other Phase 2 resource).
- The Users form only exists in **Phase 2** for this screen's flat CRUD needs —
  Roles/Role-Permissions/Menus management itself is still Phase 4; this screen
  only needs a `role_id` picker, not a role editor.

---

## 7. Error & offline handling

| Source | App behaviour |
|---|---|
| Field validation `422` | Inline message under the field (map `errors{}`). |
| `401` invalid/expired token | Clear token → Login. |
| `403` (permission / wrong company) | "You don't have access" toast; hide action. |
| `404` | "Not found / no longer available" → back to list. |
| Network/timeout | Retry button + banner; react-query keeps last cached data. |
| Pull-to-refresh | On every list to re-fetch. |

---

## 8. Phasing (full feature coverage)

**Phase 1 — core operations (this build)**
Auth (login + logout, no 2FA), company switcher, dashboard, and the screens in §6:
Transactions, Bookings, Drivers, Vehicles, Tenants. Manual plate entry, optional
photo, **no OCR**.

**Phase 2 — locations & people admin — backend live ✅**
Buildings, parking areas, parking spaces (+ occupancy grid), allocations,
incidents, **Users management (pulled forward from Phase 4)**. Full API
contract in §6C/§6D.

**Phase 3 — reports & oversight**
Occupancy / tenant-utilisation / overstay / vehicle-history / space-history
reports as mobile-friendly read views with export links; activity logs.

**Phase 4 — administration**
Roles, role-permissions, menus, companies, kiosk-device management. (Users
moved to Phase 2.)

**Phase 5 — OCR & camera**
Capture the plate from the phone camera and auto-fill check-in (reuse the web
`onnxruntime` model or a server recogniser); plate-review queue.

> Phase 1 builds the reusable scaffolding (auth, company scope, permission gating,
> responsive list/detail, react-query data layer), so Phases 2–4 are mostly
> "add an API module + a list/detail screen" with the same pattern.

---

## 9. Milestones (Phase 1)

1. **A-M1 — Skeleton:** Expo project, deps, `client.ts`, Auth/Company providers,
   Login + authed/unauthed routing, **collapsible sidebar (`AppSidebar` + drawer,
   responsive overlay/pinned) driven by `mobileMenu.ts`**, company switcher +
   logout in the drawer footer.
2. **A-M2 — Dashboard + simple CRUD:** Dashboard KPIs; `ResponsiveListDetail` /
   `ListScreen`; Drivers, Tenants, Vehicles CRUD.
3. **A-M3 — Operations:** Bookings (create/edit/fulfil/cancel, including inline
   **new-driver auto-create**); Transactions
   (active list, detail, check-out, change-space, cancel). **Check-in** with:
   `plate-lookup` prefill on full plate, `car-search`/`driver-search` type-ahead,
   inline **new-driver auto-create** (type a name when none exists), and an
   optional photo.
4. **A-M4 — Polish & ship:** permission-gated UI, error/offline matrix, tablet
   master–detail, EAS build, install on a phone + a tablet.

Backend milestones B-M1..B-M3 in `docs/mobile-backend-plan.md` are **done and
committed** (branch `feat/mobile-admin-api`) — the full Phase 1 API in §6A is
live, so A-M1 → A-M4 are unblocked.

---

## 9A. Milestones (Phase 2)

Backend milestones P2-M1/P2-M2/P2-M3 in `docs/mobile-backend-plan.md` are
**done** — the full Phase 2 API in §6C/§6D is live, so the app-side milestones
below are unblocked. Same "add an API module + a list/detail screen" pattern
as Phase 1 for most of these; Users (A-M6) is the exception — see §6D.

1. **A-M5 — Locations CRUD:** Buildings, Parking areas, Parking spaces (+
   bulk-create + occupancy grid), Allocations screens, reusing
   `ResponsiveListDetail` / `ListScreen`; add the four groups to `mobileMenu.ts`
   under **Locations**.
2. **A-M6 — Incidents & Users:** Incidents list/detail (create + resolve, no
   delete); "Mark overstay" action added to the existing Transaction detail
   screen; **Export (Excel/PDF)** action added to the existing Transactions
   list screen (authed blob download → share/save, gated by
   `can('operations.transactions', 'export')` — see §6C Transactions export);
   add **Incidents** to the **Operations** menu group. (No
   parking-area-user assignment screen — see §6B decision.) Users list/create/edit
   screen per §6D — role picker sourced from `GET /admin/lookups/roles`,
   company picker (super admin only) from `GET /companies`; handle the two
   `422` shapes (`company_id`, `role_id`) as field-level errors like any other
   form; "delete" button should read as **"Remove from company"**, not
   "Delete user", to match what the API actually does. Add **Users** to the
   **Administration** menu group (a new group, one item, pulled forward from
   Phase 4).
3. **A-M7 — Polish:** permission-gate every new screen/action via `can()`,
   extend the error/offline matrix (§7) to the new endpoints, confirm the
   occupancy grid renders sensibly on both phone (scrollable list) and tablet
   (grid layout).

---

## 10. Verification

- **Auth:** log in with dashboard credentials against a local backend; verify
  logout returns to Login and the token is cleared.
- **Company scope:** as a multi-company user, switch company from the **sidebar
  footer** and confirm every list reloads with that company's data only.
- **Permissions:** log in as a user without `operations.transactions,create` and
  confirm the check-in button is hidden and the API rejects a forced call.
- **Core cycle:** create a driver → create a booking → fulfil it (creates a
  transaction) → check the vehicle out; confirm the same records appear in the
  **web** dashboard.
- **Responsive:** confirm the layout is single-column on a phone and master–detail
  on a tablet/large screen.

---

## 11. Open questions

1. App type — native Expo (assumed) vs responsive PWA of the existing dashboard?
2. New standalone project (assumed) vs extend the kiosk app?
3. Any later-phase resource (parking spaces, incidents) wanted in Phase 1?
4. Preferred UI kit (gluestack-ui vs react-native-paper vs hand-rolled)?
