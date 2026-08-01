# PDF Deck Generation Prompt - Eazydock Staff/Admin App

Copy the prompt below into the tool you want to use to generate a PDF slide deck
or presentation document.

```text
You are a senior product storyteller, pitch deck writer, and visual presentation
designer. Create a polished client-facing PDF presentation for the Eazydock
staff/admin mobile app.

Audience:
- Client stakeholders evaluating the mobile app.
- Parking operations managers, building/facility managers, and business owners.
- They care about operational value, usability, security, readiness, and how the
  app connects to the existing Eazydock parking-management platform.

Presentation goal:
Explain what the app is, why it matters, what has been built, how staff will use
it day to day, and why it is ready to demo or move toward production rollout.
Make it feel like a practical operations product, not a marketing landing page.

Output format:
- Produce a 16:9 landscape PDF slide deck.
- Target 14 to 16 slides.
- Use concise slide copy with clear section titles.
- Include speaker notes under each slide, written in a natural client
  presentation voice.
- Use professional product visuals. If real screenshots are not supplied, create
  clean annotated mobile/tablet mockup placeholders that describe what should be
  shown.
- Keep visual style modern, operational, and trustworthy.

Brand and visual direction:
- Product name: Eazydock.
- Primary brand color: #208AEF.
- Deep sidebar/splash color: #0B1F33.
- Supporting palette: white, light grey, slate text, success green, warning
  amber, danger red.
- Visual tone: clean admin dashboard, mobile operations, parking/vehicle
  management, logistics, building facilities.
- Prefer real app UI screenshots or realistic device frames over abstract
  illustrations.
- Use phone and tablet frames to emphasize the responsive design.
- Do not use decorative gimmicks, overly playful visuals, or generic stock
  business imagery.

Important accuracy rules:
- Do not claim the app is already published in the App Store or Play Store unless
  explicitly told.
- Do not call it a kiosk app. It is a staff/admin app used by authenticated
  dashboard users.
- Do not describe OCR as the only check-in path. The app supports manual entry
  and scan-assisted plate entry.
- Do not mention internal file names, branches, hidden planning docs, or code
  implementation details unless they are useful as high-level architecture.
- Avoid overpromising automation. Present the product as a practical mobile
  companion to the existing parking-management dashboard.

Core app positioning:
Eazydock Staff/Admin is a native Expo/React Native mobile and tablet app for
parking operations teams. It brings the core web dashboard workflows to staff
who are working on site: checking vehicles in and out, seeing occupancy,
managing bookings, handling incidents, and maintaining operational data such as
drivers, vehicles, tenants, buildings, parking areas, spaces, allocations, and
users.

Key value proposition:
- Run daily parking operations from a phone or tablet.
- Give staff a mobile-first workflow instead of forcing desktop dashboard use.
- Keep the same backend permissions, companies, buildings, and API contract as
  the existing Eazydock platform.
- Speed up check-in and check-out with plate lookup, prefill, optional camera
  scanning, and auto-assignment of available bays.
- Improve visibility with live occupancy KPIs, active vehicles, bookings by
  space, overstay alerts, and incidents.
- Support demos without a backend through built-in fixture data, while switching
  to the real backend through an API URL environment setting.

Product facts to include:
- Native app built with Expo SDK 56 and React Native.
- Uses Expo Router for typed file-based navigation.
- One responsive codebase:
  - On phone: overlay sidebar drawer and single-column screens.
  - On tablet: pinned/collapsible sidebar and master-detail split views.
- Authentication:
  - Staff sign in with Eazydock dashboard email and password.
  - Token-based authenticated API access.
  - Secure token storage on device.
  - Company switching.
  - Building selection for the current work context.
- Permissions:
  - Sidebar items and create/edit/delete/export actions are filtered by the same
    permission slugs enforced by the backend.
  - UI gating improves usability, while the server remains the source of truth.
- Data:
  - Typed API layer mirrors the live JSON contract.
  - Axios client sends Bearer token and X-Company-Id headers.
  - React Query handles server state, caching, refresh, and invalidation.
  - Built-in fixture mode runs when no API URL is set, allowing offline demos.
- Forms:
  - React Hook Form plus Zod validation.
  - Backend validation errors are mapped to fields.
- Device/native features:
  - Camera-based plate scanner using Expo Camera and ONNX Runtime.
  - Manual plate entry remains available.
  - Transaction export download/share flow supports Excel and PDF from the live
    backend.
- Release readiness:
  - Local Android and iOS build scripts exist.
  - Production builds default to https://app.eazydock.com.au/api unless an
    explicit API URL is supplied.

Implemented modules and workflows:
1. Login and work context
   - Welcome/sign-in screen.
   - Staff use dashboard credentials.
   - Forgot-password link opens the web app.
   - After login, staff select the building they are working at.
   - Sidebar includes building chip, company switcher, signed-in user, and
     logout.

2. Dashboard
   - Shows the selected company/building context.
   - KPI cards for currently inside, occupancy, available bays, today's
     check-ins, and overstay alerts.
   - Chart carousel for operational metrics.
   - Quick actions for new check-in and new booking.
   - "On site now" list with active vehicles and duration on site.

3. Activity / Transactions
   - On-site and all-transaction scopes.
   - Search by plate, reference, or driver.
   - Card/list view and table-style view.
   - New check-in action.
   - Check-out from list/table or detail.
   - Detail view shows plate, transaction ref, status, location, visit details,
     contact, timeline events, comments, and actions.
   - Actions include check out, move bay, mark overstay, and cancel transaction
     based on permissions and status.
   - Export sheet supports Excel/PDF and filters by status, parking area, driver
     type, and date.

4. New check-in
   - Plate number entry with type-ahead suggestions.
   - Optional scan button opens a full-screen camera plate scanner.
   - Plate lookup finds returning vehicles and prefills known vehicle, driver,
     tenant, and contact information.
   - Warns when the vehicle is already inside.
   - Parking area selection and optional bay selection.
   - If bay is left blank, backend can auto-assign the next available bay.
   - Staff can select an existing driver or type a new driver name.
   - Driver company suggestions are available, but a new company name can be
     typed freely.
   - Tenant, contact phone, and comments are captured.

5. Bookings
   - Booking board organized by parking space and day.
   - Date navigation: previous day, today, next day, and date picker.
   - Time grid from midnight to midnight with bookings displayed as duration
     blocks.
   - Filter by search, parking area, and status.
   - New booking creation.
   - Booking detail includes schedule, location, contact, notes, and status.
   - Actions include fulfil booking, edit, cancel, and delete based on
     permissions/status.
   - Fulfilment creates a check-in transaction.

6. Parking spaces and occupancy
   - List view for spaces with search and filters.
   - Grid/occupancy view for fast operational scanning.
   - Create single parking spaces.
   - Bulk create spaces by prefix, start number, and count.
   - Detail shows occupancy, current transaction/vehicle when occupied,
     building, area, space type, default usage, operational status, and notes.

7. Locations and allocation management
   - Buildings: create, edit, delete, and view address/contact/details.
   - Parking areas: create, edit, delete, capacity, level, status, notes.
   - Tenants: create, edit, delete, contacts, suite/unit, floor, type, status.
   - Allocations: create/edit/delete quotas by building, area, tenant, category,
     allocation type, period, release time, status, and notes.

8. People and vehicles
   - Drivers: create/edit/delete, status, contact details, license number,
     company, notes, linked vehicles.
   - Vehicles: create/edit/delete, plate, state, country, type, make/model,
     colour, status, notes, linked drivers.

9. Incidents and overstay
   - Incidents list with status/type filters.
   - Report or update incidents.
   - Transaction detail can mark active vehicles as overstay, creating an
     incident when permission allows.
   - Incident detail shows description, type, reporter, related transaction,
     related space, status, and resolution details.

10. Users/admin
   - Invite/create users.
   - Edit name, email, role, status, and password for new users.
   - Remove a user from the active company without deleting the global account.

Recommended slide structure:

Slide 1 - Cover
Title: "Eazydock Staff/Admin Mobile App"
Subtitle: "Parking operations from phone and tablet"
Visual: Phone and tablet device mockups with dashboard/activity screens.
Speaker note: Introduce this as the mobile companion to the existing Eazydock
dashboard.

Slide 2 - The Operational Problem
Message: Parking teams need to act in the car park, lobby, loading bay, or
building site, not only from a desktop.
Bullets:
- Staff need fast check-in/check-out at the point of operation.
- Live occupancy and overstay visibility are critical.
- Bookings, tenants, drivers, vehicles, and spaces change during the day.
- Desktop-only workflows slow down on-site teams.

Slide 3 - Product Overview
Message: One mobile app for daily parking administration.
Bullets:
- Secure staff login.
- Company and building context.
- Live dashboard.
- Activity/transactions.
- Check-in/check-out.
- Bookings.
- Spaces, tenants, vehicles, drivers, incidents, allocations, and users.

Slide 4 - Designed For Phone And Tablet
Message: One responsive app, two operational layouts.
Bullets:
- Phone: overlay sidebar and focused single-screen flows.
- Tablet: pinned sidebar and master-detail views.
- Shared workflows across both devices.
Visual: Side-by-side phone and tablet layout diagrams.

Slide 5 - Secure Staff Access
Message: The mobile app respects the same operational boundaries as the web
dashboard.
Bullets:
- Dashboard credentials.
- Secure token storage.
- Company switching.
- Building selection.
- Permission-gated navigation and actions.
Visual: Login, building selection, sidebar with company switcher.

Slide 6 - Live Operations Dashboard
Message: Staff start with the state of the site.
Bullets:
- Currently inside.
- Occupancy percentage.
- Available bays.
- Today's check-ins/check-outs.
- Overstay alerts.
- Active vehicles list.
Visual: Dashboard KPI cards and "On site now" list.

Slide 7 - Activity And Transactions
Message: A live operating board for vehicles.
Bullets:
- Switch between on-site and all transactions.
- Search by plate, reference, or driver.
- Card and table views.
- Check out, move bay, cancel, or mark overstay.
- Timeline view preserves operational history.
Visual: Activity list/table plus transaction detail.

Slide 8 - Fast Check-In Workflow
Message: Designed to reduce typing while keeping staff in control.
Bullets:
- Plate type-ahead.
- Optional camera plate scanner.
- Returning vehicle lookup and prefill.
- Driver and company suggestions.
- New drivers can be created inline.
- Auto-assign bay when no specific bay is selected.
Visual: Check-in flow with numbered callouts.

Slide 9 - Bookings Board
Message: Bookings are shown in the way parking staff think: by day, time, and
space.
Bullets:
- Day navigation and date picker.
- Space columns with time grid.
- Booked and occupied blocks.
- Filter by area, search, and status.
- Fulfil booking into a live transaction.
Visual: Booking board grid.

Slide 10 - Parking Space Control
Message: Maintain and monitor the physical parking inventory.
Bullets:
- Parking-space list and occupancy grid.
- Operational status: active, inactive, maintenance, blocked.
- Space type and default usage.
- Bulk create spaces for faster setup.
- Current occupied transaction shown in detail.
Visual: Occupancy grid and parking-space detail.

Slide 11 - Master Data On The Move
Message: Operational data can be maintained without returning to a desktop.
Bullets:
- Drivers and vehicles.
- Tenants.
- Buildings and parking areas.
- Allocations and quotas.
- Users and roles.
Visual: A grid of module screenshots or icon-led cards.

Slide 12 - Incidents And Overstay Handling
Message: Operational issues can be logged as they happen.
Bullets:
- Report incidents from mobile.
- Mark active transactions as overstay.
- View linked transaction and space.
- Track open, resolved, and cancelled statuses.
Visual: Incident detail and mark-overstay modal.

Slide 13 - Architecture And Integration
Message: Built to connect cleanly to the existing Eazydock backend.
Bullets:
- Expo/React Native native app.
- Typed API layer aligned to the live JSON contract.
- Bearer token and X-Company-Id request headers.
- React Query caching and refresh.
- Offline fixture mode for demo and development.
- Production API configured for release builds.
Visual: Simple architecture diagram: Mobile App -> API -> Eazydock backend/data.

Slide 14 - Client Demo Flow
Message: Show a realistic day in operations.
Demo sequence:
1. Sign in and select building.
2. Review dashboard occupancy.
3. Search active vehicles.
4. Check in a returning vehicle.
5. Move bay or check out a vehicle.
6. Create or fulfil a booking.
7. View occupancy grid.
8. Report an incident or mark overstay.
9. Export transactions.

Slide 15 - Business Benefits
Message: Mobile operations improve speed, visibility, and consistency.
Bullets:
- Faster on-site action.
- Less dependency on desktop access.
- Better real-time occupancy awareness.
- Cleaner data capture at the source.
- Same permissions and backend rules as the dashboard.
- Scalable to phone and tablet operations.

Slide 16 - Closing / Next Steps
Message: Ready for client review and rollout planning.
Bullets:
- Validate demo flow with client stakeholders.
- Confirm production API environment.
- Review permission profiles and building/company access.
- Capture feedback on mobile workflows.
- Plan pilot rollout and device testing.

Writing style:
- Keep slide titles short and confident.
- Use client-friendly language, not developer jargon.
- Prefer "staff can..." and "operations teams can..." phrasing.
- Make the app sound robust and practical.
- Mention technical stack only when it supports trust, integration, or readiness.

Suggested speaker-note tone:
- Conversational and confident.
- Explain why each workflow matters operationally.
- Tie every feature back to faster parking management, fewer delays, cleaner
  data, or better visibility.

Optional screenshot checklist:
- Login screen.
- Building selection.
- Sidebar with company switcher.
- Dashboard KPI cards.
- Activity list/table.
- Transaction detail.
- New check-in with plate lookup/scanner.
- Bookings day board.
- Parking-space occupancy grid.
- Driver/vehicle/tenant detail.
- Incident detail or mark-overstay flow.
- Export transactions sheet.

Final deliverable:
Create the PDF deck with all slide content, visual placeholders or generated
mockups, and speaker notes. The deck should be ready to present to a client as
an overview of the Eazydock staff/admin mobile app.
```

