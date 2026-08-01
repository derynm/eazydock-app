# Eazydock Staff & Admin App — User Guide

> **Guide status:** Draft based on the current app implementation. Add the screenshots marked **Screenshot needed** before publishing.
>
> **Audience:** Reception staff, parking operators, building managers, company administrators, and support staff using Eazydock on a phone or tablet.

## Contents

1. [About Eazydock](#1-about-eazydock)
2. [Before you begin](#2-before-you-begin)
3. [Sign in and select a building](#3-sign-in-and-select-a-building)
4. [Navigate the app](#4-navigate-the-app)
5. [Dashboard](#5-dashboard)
6. [Activity: vehicle check-in and check-out](#6-activity-vehicle-check-in-and-check-out)
7. [Bookings](#7-bookings)
8. [Incidents](#8-incidents)
9. [Drivers](#9-drivers)
10. [Vehicles](#10-vehicles)
11. [Tenants](#11-tenants)
12. [Buildings](#12-buildings)
13. [Parking areas](#13-parking-areas)
14. [Parking spaces](#14-parking-spaces)
15. [Allocations](#15-allocations)
16. [Users](#16-users)
17. [Profile, appearance, and security](#17-profile-appearance-and-security)
18. [Common controls and messages](#18-common-controls-and-messages)
19. [Troubleshooting](#19-troubleshooting)
20. [Screenshot production checklist](#20-screenshot-production-checklist)

## 1. About Eazydock

Eazydock is the staff and administration app for managing vehicle arrivals, departures, bookings, parking occupancy, people, and parking locations. It uses the same data as the Eazydock dashboard and is designed for both phones and tablets.

The app changes its layout to fit the device:

- **Phone:** Tap the menu icon in the top-left corner to open the navigation drawer. Selecting a record opens a separate detail screen.
- **Tablet:** The navigation sidebar stays visible. List screens use a master–detail layout: select an item on the left to see its details on the right.
- **Large tablet:** The sidebar can be collapsed into an icon rail to give the current screen more room.

The menus and buttons you see depend on your permissions. For example, a user may be allowed to view bookings but not create, edit, cancel, or delete them. If a feature in this guide is missing from your app, contact your administrator.

> **Screenshot needed — UG-01:** Phone and tablet shown side by side on the same feature. On the phone, show the open navigation drawer. On the tablet, show the pinned sidebar and master–detail layout. Use demo data and blur any real personal details.

## 2. Before you begin

You need:

- An active Eazydock account.
- Your account email address and password.
- Access to at least one company.
- Permission to use the features required for your role.
- Network access when the app is connected to the live Eazydock service.
- Camera permission if you want to scan a number plate during check-in.

### Important terms

| Term | Meaning |
| --- | --- |
| Company | The organisation whose parking operation and records you are managing. |
| Building | The site you are working at. The selected building scopes operational screens such as Activity and Bookings. |
| Parking area | A group of bays, such as Level B1, Visitor Parking, or Loading Dock. |
| Parking space / bay | An individual place where a vehicle can park. |
| Activity / transaction | A vehicle visit, beginning with check-in and normally ending with check-out. |
| Booking | A parking space reservation for a defined start and end time. |
| Allocation | A quota that reserves parking capacity for a user category or tenant. |

### Feature overview

The features work together rather than as separate address books. The table below explains the role of each feature and its main connections.

| Feature | What it is for | How it connects to other features |
| --- | --- | --- |
| Dashboard | A live operational summary for the current company and building. It helps staff spot occupancy, arrivals, available bays, and overstays without opening several screens. | Summarises Activity, Parking Spaces, and Incidents, and provides shortcuts to check-in and booking creation. |
| Activity | The visit log for vehicles entering and leaving the site. Use it for live on-site control and historical visit records. | A check-in can use Vehicle, Driver, Tenant, Parking Area, and Parking Space records. It can be created by fulfilling a Booking and can create an overstay Incident. |
| Bookings | The reservation calendar for assigning a bay to a vehicle during a future time window. | Uses Vehicles, Drivers, Tenants, Parking Areas, and Parking Spaces. Fulfilment creates an Activity transaction. |
| Incidents | The issue register for operational events that need attention or an audit trail. | May be linked to an Activity transaction or Parking Space. Marking an Activity as overstay creates an incident. |
| Drivers | Reusable contact and identity information for people who drive vehicles to the site. | Drivers can be selected during check-in and booking creation and can be linked to Vehicles. |
| Vehicles | Reusable number-plate and vehicle information. | Plate lookup uses these records during check-in and booking creation; vehicles may be linked to Drivers and visit history. |
| Tenants | Organisations or occupants based in a building and visited by drivers. | Tenants belong to Buildings and can be selected in Bookings, Activity, and Allocations. |
| Buildings | The physical sites managed by the company. | Buildings contain Tenants, Parking Areas, Parking Spaces, Bookings, Activity, and Allocations. The selected working building scopes day-to-day operations. |
| Parking Areas | Logical sections of parking within a building, such as Visitor Parking or Level B1. | Areas belong to Buildings and group Parking Spaces. They are used to filter and assign Bookings and Activity. |
| Parking Spaces | Individual bays and their live occupancy/operational condition. | Spaces belong to Parking Areas, receive Bookings, and are occupied by active Activity transactions. |
| Allocations | Capacity rules that reserve a number of spaces for a user category or tenant. | Allocations apply to a Building and may be restricted to a Parking Area or Tenant. |
| Users | Staff accounts, company membership, roles, and access status. | A role determines which menu items and actions a user can access for the selected company. |
| Profile | The signed-in user’s account, appearance, security, company, and building context. | Controls theme, password reset, and sign-out; displays the operational context used elsewhere in the app. |

## 3. Sign in and select a building

### 3.1 Sign in

1. Open Eazydock.
2. Enter your **Email**.
3. Enter your **Password**.
4. Tap **Sign in**.
5. After successful authentication, the building-selection screen opens.

If the credentials are incorrect or the service cannot be reached, the app displays an error near the top of the form. Correct the details and try again.

To recover a forgotten password, tap **Forgot password?**. The app opens the Eazydock password-recovery page in a browser. If you still cannot sign in, contact your administrator.

> **Screenshot needed — UG-02:** Login screen with empty Email and Password fields, **Forgot password?**, and **Sign in** visible. Capture phone portrait. A second optional image may show the wider tablet login layout.
>
> **Screenshot needed — UG-03:** Login error state using a safe demo account. Show the error banner or field error without displaying a real password.

### 3.2 Select the working building

1. On **Select your building**, review the available buildings.
2. Tap the building where you are working today.
3. The selected building is saved and the Dashboard opens.

The building selection affects operational records and location choices. Always confirm the current building before recording a vehicle arrival.

> **Screenshot needed — UG-04:** Building-selection screen with at least three demo buildings and one selected building showing the check mark.

### 3.3 Change building later

1. Open the navigation sidebar.
2. Tap the building chip beneath the Eazydock logo.
3. Select a different building.
4. The app returns to the Dashboard using the newly selected building.

> **Screenshot needed — UG-05:** Open sidebar with the current building chip highlighted by an annotation. Do not crop out the Eazydock logo or menu context.

## 4. Navigate the app

### 4.1 Main menu

Depending on your permissions, the sidebar can contain:

- **Dashboard**
- **Operations:** Activity, Bookings, Incidents
- **People & Vehicles:** Drivers, Vehicles
- **Locations:** Tenants, Buildings, Parking Areas, Parking Spaces, Allocations
- **Administration:** Users

The bottom of the sidebar contains the company selector, your profile, and the sign-out control.

### 4.2 Open and close the menu

- On a phone, tap the menu icon in the top-left. Tap a menu item or tap outside the drawer to close it.
- On a tablet, the menu remains pinned. Tap the sidebar control near the logo to collapse it. Tap the sidebar icon in a screen header to expand it again.

### 4.3 Switch company

If your account belongs to more than one company:

1. Open the sidebar.
2. Tap the current company at the bottom.
3. Select a company from **Switch company**.
4. Wait while permissions and data refresh for the selected company.
5. Confirm that the company name in the sidebar and Dashboard header is correct.

The company control is not interactive when your account has only one company.

> **Screenshot needed — UG-06:** Full phone navigation drawer with menu groups, building, company, profile, and logout controls visible.
>
> **Screenshot needed — UG-07:** **Switch company** dialog with two or more demo companies and the current company selected.

### 4.4 Open a record

- On a phone, tap a row or card to open the record’s detail screen. Use the back arrow to return.
- On a tablet, tap a row on the left. Its details appear on the right without leaving the list.

Lists load more records as you scroll. Pull down on a list or dashboard to refresh it.

## 5. Dashboard

The Dashboard summarises the selected company’s current parking operation.

### What this feature does

Dashboard is the operator’s starting point and health check. It does not create a separate type of record; instead, it combines current information from transactions, spaces, and incidents. Reception staff can use it to see how busy the site is, while a manager can use it to identify high occupancy or unresolved overstay conditions.

The figures are snapshots. Refresh the screen before making a capacity decision, especially if several staff members are checking vehicles in and out at the same time. Tapping a dashboard item opens the underlying operational record, where the full detail and available actions are shown.

### 5.1 Read the summary

The KPI cards can show:

- **Currently inside**, including visitor and delivery counts.
- **Occupancy**, showing the occupied and total bay count.
- **Available bays**, including the number of parking areas.
- **Today’s check-ins**, including today’s check-outs.
- **Overstay alerts**, including open overstay incidents.

On a phone, swipe the KPI row horizontally. On a tablet, the cards appear in a grid.

The dashboard also contains operational charts, quick actions, and **On site now**, which lists up to six active vehicles. Tap a vehicle to open its activity details, or tap **See all** to open Activity.

### 5.2 Use quick actions

If permitted, use:

- **New check-in** to record an arriving vehicle.
- **New booking** to reserve a bay.
- **View all transactions** to open Activity.

Pull down to refresh Dashboard data. If loading fails, tap **Retry** in the error message.

> **Screenshot needed — UG-08:** Dashboard with all KPI types, chart panel, quick actions, and at least two vehicles in **On site now**. Use a tablet for the complete layout.
>
> **Screenshot needed — UG-09:** Phone Dashboard showing the horizontal KPI rail and compact quick actions.

## 6. Activity: vehicle check-in and check-out

Activity is the operational record of vehicle visits.

### What this feature does

Activity answers two important questions: **Who is on site now?** and **What happened during a previous visit?** Each transaction begins at check-in. It remains active while the vehicle is inside and normally becomes completed at check-out. A transaction can instead be marked as overstay or cancelled when appropriate.

The transaction preserves the operational facts of the visit: vehicle plate, driver, location, arrival/departure times, duration, tenant being visited, and timeline events. This makes Activity the source of truth for live occupancy and visit history. Editing a Driver or Vehicle later does not replace the need to keep the transaction itself accurate.

### 6.1 Browse activity

1. Open **Activity** from the sidebar.
2. Select **On site** to see active visits or **All** to see the full history.
3. Search by plate, transaction reference, or driver.
4. Switch between card and table views when needed.
5. Tap a record to see its details.

Rows show the plate, area/bay, driver, status, and active or completed duration. In table view, users with update permission can check out an active vehicle directly.

> **Screenshot needed — UG-10:** Activity in **On site** card view with search, scope selector, view toggle, status badges, durations, export, and check-in actions visible.
>
> **Screenshot needed — UG-11:** Activity table view with an active row and its quick check-out action visible.

### 6.2 Check in a vehicle

1. From Dashboard or Activity, tap **New check-in** or **Check in**.
2. In **Plate number**, type the full number plate. You can select a matching known vehicle from the suggestions.
3. Alternatively, tap the scan icon to scan the number plate with the device camera. Allow camera access when prompted and verify the result before continuing.
4. Tap **Look up plate**.
5. Review the result:
   - **Returning vehicle:** Previous driver, tenant, and visit information may be filled automatically.
   - **New vehicle:** Complete the visit information manually.
   - **Already inside:** Do not create a duplicate check-in. Open the existing activity and check the vehicle out if appropriate.
6. Select the **Parking area**.
7. Select a **Bay**, or leave it blank to auto-assign the next available bay.
8. Select the **Driver type**.
9. Complete or confirm the driver, phone, company, tenant being visited, and optional comments.
10. Tap **Check in vehicle**.
11. After a successful check-in, the activity detail screen opens.

The selected building is fixed by the building chosen for the session. If the required area or tenant is missing, check the current building.

> **Screenshot needed — UG-12:** New check-in before lookup, showing the Plate number field, scan icon, and **Look up plate** button.
>
> **Screenshot needed — UG-13:** Returning-vehicle lookup result with the prefilled visit information. Use fictional driver and tenant data.
>
> **Screenshot needed — UG-14:** **Already inside** warning. Show the transaction reference and bay so the warning is self-explanatory.
>
> **Screenshot needed — UG-15:** Completed check-in form just before submission, showing Location and Visit sections. Never show real phone numbers.
>
> **Screenshot needed — UG-16:** Camera plate-scanner screen with a demo or printed test plate, plus a separate result frame if the recognized plate appears in a confirmation state.

### 6.3 Review activity details

The detail screen shows:

- Plate and transaction reference.
- Visit status and driver type.
- Building, parking area, bay, and tenant.
- Driver, company, check-in/check-out times, duration, and phone.
- Timeline events and comments when present.

For an active visit, permitted actions can include **Check out**, **Move bay**, **Mark overstay**, and **Cancel transaction**.

> **Screenshot needed — UG-17:** Active transaction detail with plate, badges, action buttons, Location, and Visit sections. Tablet master–detail is preferred.

### 6.4 Check out a vehicle

Use either method:

- **Quick check-out:** In Activity table view, tap the row’s check-out action and confirm.
- **Detail check-out:** Open the active transaction, tap **Check out**, add optional comments, then tap **Check out** again to submit.

After completion, the visit status changes and the check-out time and final duration become available.

> **Screenshot needed — UG-18:** **Check out vehicle** sheet with the optional Comments field and submit button.
>
> **Screenshot needed — UG-19:** Completed transaction detail showing completed status, check-in time, check-out time, and duration.

### 6.5 Move an active vehicle to another bay

1. Open the active transaction.
2. Tap **Move bay**.
3. Select the **New bay**.
4. Add optional comments explaining the move.
5. Submit the change.

Only eligible bays are offered. If access to the parking area is denied, contact an administrator.

> **Screenshot needed — UG-20:** **Move to another bay** sheet with several bay choices and occupancy hints.

### 6.6 Mark a vehicle as overstay

1. Open an active transaction.
2. Tap **Mark overstay**.
3. Enter a useful description for operations staff.
4. Submit the form.

This action creates an overstay incident linked to the transaction and changes the operational state shown in Activity.

> **Screenshot needed — UG-21:** **Mark as overstay** form with a safe example description, followed by an optional image of the Overstay badge on the transaction.

### 6.7 Cancel a transaction

Use **Cancel transaction** only when the check-in should be voided, such as a duplicate or incorrect entry. Open the active transaction, tap **Cancel transaction**, and confirm the destructive action.

Cancellation is different from check-out: check-out records a completed visit, while cancellation voids the check-in.

> **Screenshot needed — UG-22:** Cancellation confirmation dialog with the destructive action clearly visible.

### 6.8 Export transactions

Users with export permission can tap the download icon in Activity.

1. Choose **Excel** or **PDF**.
2. Select a status or leave **All statuses**.
3. Select a parking area or leave **All areas**.
4. Select a driver type or leave **All driver types**.
5. Choose **Single day** or **Date range**.
6. Select the date or From/To dates.
7. Tap **Download**.
8. Use the device share sheet to save or send the exported file.

The app rejects a date range where **From** is later than **To**. On an iOS Simulator, the app saves the file but cannot open the normal share sheet; real devices share normally.

> **Screenshot needed — UG-23:** Export sheet with PDF selected and a date range entered. Include status, area, and driver-type filters in the frame.
>
> **Screenshot needed — UG-24:** Native share sheet on a real device using non-sensitive demo data.

## 7. Bookings

Bookings reserve individual bays for a scheduled period.

### What this feature does

Bookings are for planned arrivals. They help staff prevent scheduling conflicts and see which bay is expected to be used at each time of day. The calendar is organised by time vertically and parking space horizontally, so a booking block shows both its duration and assigned bay.

A booking is not proof that the vehicle is currently on site. When the vehicle actually arrives, fulfil the booking to create a check-in transaction. Cancelling a booking releases the reservation without creating a visit. Deleting should be reserved for records that must be removed rather than ordinary changes of plan.

### 7.1 Read the booking calendar

1. Open **Bookings**.
2. Use the left and right arrows to change day.
3. Tap the displayed date to return to today.
4. Tap the calendar icon to choose a date.
5. Scroll vertically through the hours and horizontally through parking-space columns.
6. Tap a booking block to open its details.

The legend identifies available, booked, and occupied periods. The current hour is highlighted when viewing today.

Use the filter button to search by plate, reference, or contact and filter by parking area and status.

> **Screenshot needed — UG-25:** Booking calendar with time labels, multiple space columns, booking blocks, current-time highlight, date controls, and legend.
>
> **Screenshot needed — UG-26:** Booking filter sheet with search, area, and status controls.

### 7.2 Create a booking

1. Tap **New booking**.
2. Enter or choose the **Plate number**.
3. Tap **Look up plate**.
4. Review whether the plate belongs to a returning or new vehicle. If it is currently checked in, review the warning before proceeding.
5. Set **Starts at** and **Ends at**.
6. Select the **Parking area** and **Bay**.
7. Select the **Driver type**.
8. Complete or confirm the driver, contact phone, company, tenant being visited, and optional notes.
9. Tap **Create booking**.

The building comes from the building selected for the session. End time must be after start time, and the chosen bay must be available for the requested period.

> **Screenshot needed — UG-27:** New booking plate-lookup section and returning/new vehicle result.
>
> **Screenshot needed — UG-28:** New booking Schedule, Location, and Visit sections with fictional data and the **Create booking** button.
>
> **Screenshot needed — UG-29:** Date and time picker used by either Starts at or Ends at.

### 7.3 Review, edit, fulfil, cancel, or delete a booking

Open a booking to review its schedule, location, contact, tenant, status, and notes.

- **Edit:** Available for pending or confirmed bookings when you have update permission. Change the details and tap **Save changes**.
- **Fulfil:** Tap **Fulfil**, choose an entry method, add optional comments, and submit. Fulfilment creates a check-in transaction from the booking.
- **Cancel booking:** Use this when the reservation should remain in the audit trail but no longer be used.
- **Delete booking:** Permanently removes the booking when your permission and the booking state allow it.

> **Screenshot needed — UG-30:** Booking detail showing status, schedule, location, contact, and available action buttons.
>
> **Screenshot needed — UG-31:** **Fulfil booking** sheet with Entry method and Comments.
>
> **Screenshot needed — UG-32:** Booking cancellation confirmation. An optional second image may show the Cancelled status after completion.

## 8. Incidents

Incidents record operational issues such as damage, unauthorised vehicles, overstays, blocked spaces, and safety issues.

### What this feature does

Incidents provide a shared queue and audit trail for exceptions that normal check-in/check-out processing cannot describe on its own. The status shows whether an issue still needs action. The description should be specific enough that another staff member can understand the situation and continue the response.

An incident can stand alone or be connected to a transaction or space. For example, marking an active transaction as overstay creates a linked overstay incident. Resolving an incident records that the issue has been handled; it does not automatically check out a vehicle or make a blocked bay active unless the related operational action is also completed.

### 8.1 Browse incidents

1. Open **Incidents**.
2. By default, review open incidents.
3. Tap the filter button to filter by incident type or status.
4. Tap an incident to see its description, reporter, reported time, and linked transaction or space.

Resolved incidents also show resolution time and resolver information.

> **Screenshot needed — UG-33:** Incident list with at least one open overstay and one safety incident, including filter control and status badges.

### 8.2 Report an incident

1. Tap **Report incident**.
2. Select the **Incident type**.
3. Enter a detailed **Description**: what happened, where, when, and what action has already been taken.
4. Tap **Report incident** to submit.

### 8.3 Update or resolve an incident

1. Open an open incident.
2. Tap **Update incident**.
3. Update its type, description, or status.
4. Choose **Resolved** when the issue has been handled, or **Cancelled** when the record is not valid.
5. Tap **Save changes**.

> **Screenshot needed — UG-34:** Report Incident form with Incident type and a useful fictional Description.
>
> **Screenshot needed — UG-35:** Incident detail with linked transaction/space, followed by the edit form with **Resolved** selected.

## 9. Drivers

Drivers are reusable people records that can be selected during check-in and booking creation.

### What this feature does

Drivers reduce repeated typing and keep commonly used contact information consistent. A driver record can store a name, company, phone, email, licence number, status, notes, and linked vehicles. Type-ahead suggestions in check-in and booking forms come from these saved records.

Setting a driver to Inactive or Banned is preferable to deleting the record when the person should remain in history but should not be treated as a normal active driver. Follow your organisation’s privacy and retention rules when recording identity or contact information.

### 9.1 Find and review a driver

1. Open **Drivers**.
2. Search by name, company, or phone.
3. Filter by status.
4. Tap a driver to review contact details, company, licence number, linked vehicles, notes, and date added.

> **Screenshot needed — UG-36:** Driver list with search, status filter, avatars, company names, and status badges.
>
> **Screenshot needed — UG-37:** Driver detail showing Contact and linked Vehicles sections.

### 9.2 Create or edit a driver

1. Tap **New driver**, or open a driver and tap **Edit driver**.
2. Complete **Full name** (required).
3. Add phone, email, company, licence number, status, and notes as applicable.
4. Tap **Create driver** or **Save changes**.

To delete a driver, open Edit, tap **Delete driver**, and confirm. Delete only when the driver record is not required for operational history.

> **Screenshot needed — UG-38:** New Driver form with all fields visible across one or two vertically joined captures. Include the required marker on Full name.

## 10. Vehicles

Vehicles are reusable records that can be found by number plate during check-in and booking creation.

### What this feature does

Vehicles provide the reusable identity of a car, van, truck, motorcycle, ute, or other vehicle. The number plate is the main lookup value; make, model, colour, plate state, type, status, notes, and linked drivers help staff verify that the correct vehicle has been found.

The vehicle record is different from an Activity transaction. A vehicle can visit many times, while each transaction represents one visit. Correct plate data is particularly important because lookup, duplicate-arrival warnings, and visit history depend on it.

### 10.1 Find and review a vehicle

1. Open **Vehicles**.
2. Search by plate, make, or model.
3. Filter by status.
4. Tap a vehicle to review plate details, type, make/model/colour, linked drivers, notes, and date added.

> **Screenshot needed — UG-39:** Vehicle list showing plates, make/model, type, and statuses.
>
> **Screenshot needed — UG-40:** Vehicle detail with Details and linked Drivers sections.

### 10.2 Create or edit a vehicle

1. Tap **New vehicle**, or open a vehicle and tap **Edit vehicle**.
2. Enter **Plate number** and select **Vehicle type** (required).
3. Add plate state, make, model, colour, status, and notes.
4. Tap **Create vehicle** or **Save changes**.

To delete a vehicle, open Edit, tap **Delete vehicle**, and confirm.

> **Screenshot needed — UG-41:** Vehicle form populated with a fictional plate and vehicle details.

## 11. Tenants

Tenants represent the organisations or occupants associated with a building.

### What this feature does

Tenants identify who occupies or operates from a building and who a visitor may be coming to see. The term can cover a building owner, tenant, shop, office, contractor, delivery partner, or another organisation. Contact and suite/floor details help reception direct arrivals correctly.

Tenant records appear as choices in bookings and check-ins for the selected building. They can also be used to restrict an allocation. A tenant must therefore be assigned to the correct building before operators can select it in building-scoped workflows.

### 11.1 Find and review a tenant

1. Open **Tenants**.
2. Search by tenant name or code.
3. Filter by active or inactive status.
4. Tap a tenant to review contact and location information.

### 11.2 Create or edit a tenant

1. Tap **New tenant**, or open a tenant and tap **Edit tenant**.
2. Enter **Name** and select **Building** and **Tenant type**.
3. Add code, contact name, phone, email, suite/unit, floor, and status.
4. Tap **Create tenant** or **Save changes**.

To delete, use **Delete tenant** in the edit form and confirm.

> **Screenshot needed — UG-42:** Tenant list and one tablet detail selection showing Contact and Location.
>
> **Screenshot needed — UG-43:** New Tenant form showing required Building and Tenant type fields plus contact/location fields.

## 12. Buildings

Buildings define the sites used throughout the app.

### What this feature does

A Building is the top-level physical location for day-to-day parking operations. It stores site identity, address, type, contact details, and status. Parking areas, tenants, spaces, bookings, and transactions are organised beneath a building.

The building chosen after login becomes the working context for operational screens. Building administration should be performed carefully because changing or deleting a building can affect many dependent records. Mark a temporarily unused site Inactive when retaining its history is important.

### 12.1 Find and review a building

1. Open **Buildings**.
2. Search by building name or code.
3. Filter by status.
4. Tap a building to review its address, contact, code, type, status, and date added.

### 12.2 Create or edit a building

1. Tap **New building**, or open a building and tap **Edit building**.
2. Enter a **Name** and **Address**.
3. Add code, building type, second address line, suburb, state, postal code, country, contact details, and status.
4. Tap **Create building** or **Save changes**.

Deleting a building can affect its related data. Use **Delete building** only after confirming the site is no longer required.

> **Screenshot needed — UG-44:** Building list with search and status filter, plus one selected building detail on tablet.
>
> **Screenshot needed — UG-45:** Building form showing address and contact fields. Use a fictional address.

## 13. Parking areas

Parking areas group individual spaces within a building.

### What this feature does

Parking Areas model meaningful sections of a site, such as a level, visitor zone, loading dock, contractor area, or mixed-use area. They make large sites easier to manage and provide a useful scope for filters, bookings, check-ins, occupancy, exports, and allocations.

Capacity describes the intended number of spaces in the area, while individual Parking Space records represent the actual bays. Keep these values aligned so occupancy reporting remains understandable. Status can be used to indicate an active, inactive, or maintenance area.

### 13.1 Find and review an area

1. Open **Parking Areas**.
2. Search by area name or code.
3. Filter by status.
4. Tap an area to review its building, area type, capacity, level, code, notes, status, and date added.

### 13.2 Create or edit an area

1. Tap **New area**, or open an area and tap **Edit area**.
2. Enter **Name**.
3. Select **Building** and **Area type**.
4. Enter **Capacity**.
5. Add code, level, status, and notes.
6. Tap **Create area** or **Save changes**.

To delete, use **Delete area** in the edit form and confirm.

> **Screenshot needed — UG-46:** Parking Areas list and filter state.
>
> **Screenshot needed — UG-47:** New Parking Area form showing Name, Building, Area type, Capacity, Code, and Level.

## 14. Parking spaces

Parking Spaces manages individual bays and provides a visual occupancy grid.

### What this feature does

Each Parking Space represents one assignable bay. It has a unique code within the operating context, a type, default usage, occupancy status, and operational status. Occupancy answers whether a vehicle is currently using it; operational status answers whether staff are allowed to use it normally.

These are separate concepts: an available bay can still be blocked or in maintenance, and an active bay can be occupied. The occupancy grid combines both so operators can make quick assignment decisions. Occupancy is normally driven by check-in, bay move, and check-out actions rather than manually changed on the space record.

### 14.1 Use list view

1. Open **Parking Spaces**.
2. Search by space code.
3. Filter by parking area and operational status: Active, Inactive, Maintenance, or Blocked.
4. Tap a space to review occupancy, operational status, type, building, area, default usage, notes, and date added.

If occupied, the detail shows the current transaction, parked-since time, and vehicle.

> **Screenshot needed — UG-48:** Parking Space list with occupancy and operational-status badges, search, filters, and view toggle.
>
> **Screenshot needed — UG-49:** Occupied parking-space detail showing Current transaction, vehicle, and parked-since time.

### 14.2 Use occupancy grid

1. Tap the view toggle to change from list to grid.
2. Read the summary tiles: Total, Available, Occupied, and Other.
3. Review the spaces grouped by parking area.
4. Use the filters to restrict the grid to an area or operational status.

Grid colours distinguish free, occupied, and unavailable spaces. **Other** combines maintenance, blocked, and inactive spaces.

> **Screenshot needed — UG-50:** Full occupancy grid with all four summary tiles and at least two parking-area groups. Include free, occupied, maintenance, and blocked examples.

### 14.3 Create or edit one space

1. Tap **New space**. On a phone, tap the add icon and choose **New space**.
2. Enter the **Space code**.
3. Select a **Building**, then a **Parking area**.
4. Select **Space type**, **Default usage**, and **Operational status**.
5. Add optional notes.
6. Tap **Create space**.

To edit, open a space and tap **Edit space**. To delete, use **Delete space** and confirm. An occupied or otherwise protected space may not be deletable.

> **Screenshot needed — UG-51:** Create Spaces action menu on a phone showing **New space** and **Bulk create**.
>
> **Screenshot needed — UG-52:** New Parking Space form with all selectors populated.

### 14.4 Bulk-create spaces

Use bulk creation for a sequence such as B1-01 through B1-20.

1. Tap **Bulk create**. On a phone, use the add menu.
2. Select the **Building** and **Parking area**.
3. Enter a **Prefix**, such as `B1-`.
4. Enter the **Start number** and **Count**.
5. Select space type, default usage, and operational status.
6. Tap **Create spaces**.
7. Review the result. Existing duplicate codes are skipped and reported.

> **Screenshot needed — UG-53:** Bulk Create Spaces form using a safe example sequence.
>
> **Screenshot needed — UG-54:** Successful bulk-create result showing created and skipped counts.

## 15. Allocations

Allocations reserve a quota of spaces for a category or tenant, optionally for a limited date range or parking area.

### What this feature does

Allocations express capacity policy rather than reserving a particular bay at a particular time. For example, an allocation can make ten spaces available to tenants, create a temporary contractor quota, or reserve visitor capacity across an entire building or one area.

The quota is the number of spaces covered. Optional start/end dates control when the rule applies, and release-after minutes can define when unused capacity becomes available under the organisation’s allocation policy. Use a Booking when a specific vehicle needs a specific bay and time; use an Allocation when a group needs access to a pool of capacity.

### 15.1 Find and review an allocation

1. Open **Allocations**.
2. Filter by allocation type and status.
3. Tap an allocation to review building, area restriction, tenant, quota, release period, dates, notes, and status.

> **Screenshot needed — UG-55:** Allocation list with several allocation types/statuses and the filter sheet open.
>
> **Screenshot needed — UG-56:** Allocation detail showing Allocation and Period sections.

### 15.2 Create or edit an allocation

1. Tap **New allocation**, or open one and tap **Edit allocation**.
2. Select **Building**.
3. Select **Allocation type** and **User category**.
4. Enter the **Quota**.
5. Optionally restrict it to a parking area or tenant.
6. Optionally enter release-after minutes, start/end dates in `YYYY-MM-DD` format, and notes.
7. Select the status.
8. Tap **Create allocation** or **Save changes**.

Use **Delete allocation** in the edit form to remove an allocation after confirmation.

> **Screenshot needed — UG-57:** Allocation form with quota, optional restrictions, release period, and dates visible.

## 16. Users

Users controls who can access the selected company. It is normally available only to administrators.

### What this feature does

Users manages staff access, not drivers or visitors. A user account can belong to a company with a role and an Active or Inactive status. The role supplies permissions that determine which navigation items and view/create/update/delete/export actions appear.

Changing a user’s role can immediately change what company data they can access. Setting the membership Inactive preserves it for later reactivation, while **Remove from company** revokes that company membership. If a person should no longer use Eazydock at all, follow the organisation’s broader account-offboarding process as well.

### 16.1 Find and review a user

1. Open **Users**.
2. Search by name or email.
3. Tap a user to see email, role, status, and membership date.

> **Screenshot needed — UG-58:** Users list with fictional names, roles, and statuses.
>
> **Screenshot needed — UG-59:** User detail showing Account information and administrator actions.

### 16.2 Invite or edit a user

1. Tap **Invite user**.
2. Enter **Full name**, **Email**, and an initial **Password**.
3. Select the user’s **Role** and **Status**.
4. Tap **Create user**.
5. Share the credentials using your organisation’s approved secure method and ask the user to reset the password after signing in.

To edit a member, open the user, tap **Edit user**, update name, email, role, or status, and tap **Save changes**. The password field is used only when creating the user.

To revoke company access, tap **Remove from company** and confirm. This removes the company membership; it is not the same as temporarily setting the user to Inactive.

> **Screenshot needed — UG-60:** Invite User form. Keep Password blank or fully masked and use a fictional email address.
>
> **Screenshot needed — UG-61:** Remove-from-company confirmation dialog.

## 17. Profile, appearance, and security

### What this feature does

Profile is the signed-in user’s personal settings and context screen. It confirms which account, company, and building are active; controls the app’s visual theme; provides password reset; and offers a deliberate sign-out action. It does not edit the user’s company role or permissions—an administrator manages those from Users.

### 17.1 Open Profile

Open the sidebar and tap your name or avatar. Profile shows your name, email, current company, and selected building.

### 17.2 Change appearance

In **Appearance**, choose:

- **System:** Follow the device appearance.
- **Light:** Always use the light theme.
- **Dark:** Always use the dark theme.

The Light/Dark quick button immediately switches the current appearance.

### 17.3 Reset your password

1. In **Security**, tap **Reset**.
2. Enter the current password.
3. Enter the new password.
4. Enter it again in **Confirm new password**.
5. Tap **Reset password**.

A successful password reset signs you out and returns you to Login. Sign in again with the new password.

### 17.4 Sign out

Tap **Sign out** on Profile, or use the logout icon in the sidebar. Signing out clears the locally saved session, company, and building selection from the device.

> **Screenshot needed — UG-62:** Profile screen showing Appearance, Security, company/building details, and Sign out.
>
> **Screenshot needed — UG-63:** The same Profile screen in dark mode to demonstrate theme support.
>
> **Screenshot needed — UG-64:** Reset Password sheet with all three password fields empty or masked.

## 18. Common controls and messages

### 18.1 Search and filters

- Search starts after a short pause while typing.
- A dot or highlighted filter icon indicates that filters are active.
- Status selectors narrow a list without changing the underlying records.
- If no results appear, clear the search and reset filters before assuming data is missing.

### 18.2 Refresh and pagination

- Pull down to refresh Dashboard and list screens.
- Long lists load additional pages automatically near the bottom.
- A loading indicator at the bottom means more records are being retrieved.

### 18.3 Forms

- A required marker means the field must be completed.
- Some dropdowns depend on an earlier choice. For example, choose Building before Parking Area and Parking Area before Bay.
- Validation messages appear next to the affected field.
- A message at the top of a form usually indicates a service, permission, or other non-field error.
- While a form is submitting, wait for completion and avoid tapping the submit button repeatedly.

### 18.4 Status badges

Common operational statuses include:

| Status | Meaning |
| --- | --- |
| Active / On site | The record or visit is currently active. |
| Completed | A visit has been checked out normally. |
| Overstay | A vehicle remains beyond the expected period and has been flagged. |
| Pending / Confirmed | A booking exists but has not yet been fulfilled. |
| Cancelled | The record was voided and should not be acted on. |
| Available / Occupied | Current bay occupancy. |
| Maintenance / Blocked / Inactive | The bay should not be assigned for normal parking. |
| Resolved | An incident has been handled. |

### 18.5 Destructive actions

Cancel, delete, remove, and similar actions display a confirmation. Read the title and message carefully before continuing. If the intention is only to finish a vehicle visit, use **Check out**, not **Cancel transaction**.

> **Screenshot needed — UG-65:** One representative field-validation state with two field messages and a top-level banner.
>
> **Screenshot needed — UG-66:** One representative empty-list state and one load-error state with **Retry**. These can be used in the troubleshooting section.

## 19. Troubleshooting

### I cannot see a menu item or action button

Your company permissions control view, create, update, delete, and export actions. Confirm the selected company, then contact an administrator if access is required.

### The wrong records or locations are showing

Check both the selected **Company** and **Building** in the sidebar. Change them if necessary, then pull down to refresh.

### A parking area, bay, or tenant is missing from a form

Confirm the building first. Area choices depend on the building; bay choices depend on the area; tenant choices also depend on the building. The bay may also be unavailable, inactive, blocked, or in maintenance.

### A plate is already inside

Do not submit another check-in. Open **Activity**, search for the plate under **On site**, and check out or correct the existing transaction.

### A booking cannot be fulfilled

Confirm that it is still pending or confirmed, its bay is valid, and the vehicle is not already inside. If the service returns a conflict, review the booking and current Activity before trying again.

### Export does not open a share sheet

Confirm that sharing is available on the device. The file may still be saved locally. iOS Simulator cannot share an app-sandboxed export like a physical iPhone or iPad; use a real device for acceptance testing.

### Camera scanning is unavailable

Allow Eazydock to use the camera in device settings. Use a clear, well-lit plate and verify the recognised text. You can always enter the plate manually.

### The app says it could not load data

Check network access and pull down to refresh, or tap **Retry**. If the issue continues, note the company, building, screen, approximate time, and error message, then contact support.

### I changed my password and was signed out

This is expected. Sign in again using the new password and reselect the working building if requested.

## 20. Screenshot production checklist

Use this checklist while preparing the final illustrated guide.

### Capture standards

- Use a dedicated demo company with fictional people, email addresses, phone numbers, plates, and addresses.
- Never capture passwords, authentication tokens, real personal data, or confidential incident descriptions.
- Use a consistent phone model/orientation for phone captures and a consistent tablet model/orientation for tablet captures.
- Prefer phone portrait for step-by-step forms and tablet landscape for dashboards and master–detail screens.
- Capture light mode for the primary guide. Include dark mode only where requested.
- Set the same company and building across related screenshots so the flow is coherent.
- Keep the device clock, locale, and date format consistent.
- Crop to the app frame but retain headers and navigation context.
- Add arrows or numbered callouts during document production, not inside the app.
- For long forms, use two labelled captures or a vertically stitched image; do not shrink text until it is unreadable.
- Add concise alt text to every final image.

### Required capture inventory

| IDs | Feature / flow | Recommended device | Minimum images |
| --- | --- | --- | ---: |
| UG-01 | Responsive phone/tablet overview | Phone + tablet | 2 |
| UG-02–05 | Login and building selection | Phone | 4 |
| UG-06–07 | Navigation and company switch | Phone | 2 |
| UG-08–09 | Dashboard | Tablet + phone | 2 |
| UG-10–24 | Activity, check-in/out, actions, export | Phone + tablet | 15 |
| UG-25–32 | Bookings | Tablet + phone | 8 |
| UG-33–35 | Incidents | Phone or tablet | 3 |
| UG-36–38 | Drivers | Tablet + phone | 3 |
| UG-39–41 | Vehicles | Tablet + phone | 3 |
| UG-42–43 | Tenants | Tablet + phone | 2 |
| UG-44–45 | Buildings | Tablet + phone | 2 |
| UG-46–47 | Parking areas | Phone or tablet | 2 |
| UG-48–54 | Parking spaces and occupancy | Tablet + phone | 7 |
| UG-55–57 | Allocations | Tablet + phone | 3 |
| UG-58–61 | Users | Phone or tablet | 4 |
| UG-62–64 | Profile, theme, password | Phone | 3 |
| UG-65–66 | Validation, empty, and error states | Phone | 3 |

The full inventory contains approximately **68 captures** because some IDs request two device layouts or two UI states. For a shorter guide, prioritise UG-02, UG-04, UG-06, UG-08, UG-10, UG-12, UG-15, UG-17–18, UG-23, UG-25, UG-28, UG-30, UG-33–34, UG-36–41, UG-42–47, UG-48, UG-50, UG-52–53, UG-55–60, and UG-62–64.

---

**Document owner:** _Add owner_  
**Product version/build:** _Add version_  
**Last reviewed:** _Add review date_  
**Support contact:** _Add support email or service desk URL_
