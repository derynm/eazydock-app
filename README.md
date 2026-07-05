# eazydock-app

Staff/admin mobile app for the **eazydock** parking-management platform — built
with Expo (SDK 56) + Expo Router. One responsive codebase: an overlay sidebar on
phones and a pinned master–detail layout on tablets.

**Phase 1:** login & company switching, dashboard KPIs, transactions (check-in /
check-out / move bay / cancel), bookings (create / fulfil / cancel), and CRUD for
drivers, vehicles and tenants.

## Quick start

```bash
pnpm install
pnpm start          # then press i (iOS), a (Android), or w (web)
```

The app runs **out of the box with built-in demo data** — sign in with any email
and password. To point it at a real backend, set the API base URL:

```bash
EXPO_PUBLIC_API_URL=https://your-host/api pnpm start
```

When that variable is unset, the app serves in-memory fixtures so the full UI is
explorable without a server. The data layer is typed to the live API contract
(see `.claude/plan.md` §6A), so flipping to live needs only the env var.

## Project layout & conventions

See **[AGENTS.md](AGENTS.md)** for architecture, the data layer, the hand-rolled
design system, and the checklist for adding a screen.

```bash
pnpm typecheck   # tsc --noEmit
pnpm lint        # expo lint
```

## Local production builds

Local release builds use the production API at
`https://app.eazydock.com.au/api`, regardless of the development value in
`.env.local`. The build scripts disable Expo dotenv loading and inject this
value directly:

```bash
pnpm build:android             # release APK, arm64 by default
pnpm build:android -- debug    # debug APK
pnpm build:ios                 # Release build
pnpm build:ios -- debug        # Debug build
pnpm build:ios -- release --device
```

The scripts install the locked pnpm dependencies, clear Metro's cache and verify
the API embedded in a production bundle, run a clean Expo prebuild, then compile
with the local Android SDK or Xcode. To target another server for one build,
provide `API_URL` explicitly:

```bash
API_URL=https://staging.example.com/api pnpm build:android
```
