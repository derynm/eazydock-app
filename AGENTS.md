# eazydock-app — agent & contributor guide

The **eazydock staff/admin app**: an Expo / React Native app that brings the
parking-management dashboard to phone and tablet. One responsive codebase —
overlay sidebar on phone, pinned master–detail on tablet. Full plan in
[.claude/plan.md](.claude/plan.md); the live API contract is plan **§6A**.

> **Expo SDK 56 has changed a lot.** Read the exact versioned docs at
> https://docs.expo.dev/versions/v56.0.0/ before writing native/Expo code.
> Pin versions with `pnpm exec expo install <pkg>` (this repo uses **pnpm** on
> Node via nvm — do not use `npm`/`npx`).

## Commands

```bash
pnpm install            # deps
pnpm start              # Metro (then i / a / w)
pnpm ios | android | web
pnpm typecheck          # tsc --noEmit  ← run before every commit
pnpm lint               # expo lint
pnpm gen-assets         # regenerate brand icons (scripts/gen-assets.mjs)
```

## Architecture

```
src/
  app/                       # expo-router routes (file-based, typed)
    _layout.tsx              # providers: GestureHandler › SafeArea › QueryClient › Session › Theme
    index.tsx                # token? -> /dashboard : /login
    login.tsx
    (app)/                   # authed group; _layout.tsx = responsive shell (Slot)
      dashboard.tsx
      transactions/ bookings/ drivers/ vehicles/ tenants/   # index.tsx + [id].tsx (+ forms)
  api/                       # data layer (see below)
  auth/session.tsx           # SessionProvider: token, user, companies, permissions, switchCompany
  components/                # shell (app-sidebar, screen, responsive-list-detail) + ui/ design system
  components/ui/             # hand-rolled primitives — import via `@/components/ui`
  features/<resource>/       # per-resource detail panel + form (reused by tablet pane and phone route)
  constants/theme.ts         # design tokens (Colors, Spacing, Radius, FontSize, Shadow, Layout)
  hooks/                     # use-theme, use-responsive, use-permissions, use-paginated-list, …
  lib/                       # format, status, options, confirm, storage, zod-resolver
  navigation/mobile-menu.ts  # curated, permission-gated sidebar config (plan §4.6)
```

## Data layer (`src/api`)

- **Typed to the live contract** in plan §6A. `types.ts` mirrors the JSON
  resources field-for-field; `client.ts` is the axios instance with the
  Bearer + `X-Company-Id` interceptors and a normalized `ApiError`.
- **Fixtures fallback:** when `EXPO_PUBLIC_API_URL` is **unset**,
  `USE_FIXTURES` is true and every resource module serves in-memory data from
  `fixtures.ts` (with simulated latency) so the UI is fully demoable offline.
  Set `EXPO_PUBLIC_API_URL=https://host/api` to hit the real backend — no other
  change needed.
- Each resource module (`drivers.ts`, `transactions.ts`, …) exposes plain async
  functions and branches on `USE_FIXTURES`. Screens consume them through
  `@tanstack/react-query` (`use-paginated-list.ts` for lists).
- Forms use `react-hook-form` + a local `zodResolver` (`lib/zod-resolver.ts`)
  against `schemas.ts`, which mirrors backend validation. On a `422`, map
  `ApiError.errors` onto fields; the server is always the source of truth.

## Conventions

- **No UI kit** — compose screens from `@/components/ui` primitives. Never
  hard-code colors/spacing; pull from `useTheme()` and the `theme.ts` scales.
  Both light & dark must work (`useScheme()`).
- **Icons:** add to the map in `components/ui/icon.tsx` (SF Symbol + Material
  name), then use `<Icon name="…" />`. Material names must exist in
  `expo-symbols` `symbols.json`.
- **Responsive:** branch on `useResponsive()` (`isPhone`/`isTablet`/`isWide`,
  breakpoint 700/1100). List screens use `ResponsiveListDetail`; detail content
  lives in `features/<r>/<r>-detail.tsx` so the phone route and tablet pane share it.
- **Permissions:** gate every create/edit/delete control with
  `usePermissions().can(slug, action)` using the same slug the API enforces
  (see `mobile-menu.ts`). UI gating is convenience only.
- **New screen checklist:** add route file(s) under `app/(app)/<r>/`, an API
  module, react-query hooks, a `features/<r>/` detail + form, and the menu entry
  in `navigation/mobile-menu.ts`. Then `pnpm typecheck`.

## Scope

Phase 1 only (auth, company switch, dashboard, transactions, bookings, drivers,
vehicles, tenants). No OCR. Later phases in plan §8.
