# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Active Feature Work

Product specs (PRDs) live under **`planning/prds/`** — see [`planning/prds/README.md`](planning/prds/README.md) for the index and any legacy paths not in the tree. PRDs are removed once their work ships (the open-meteo migration, Stargazer, and newsletter redesign are complete); recover shipped specs from git history if needed.

## Project Overview

16-Bit Weather is a retro-styled weather education platform built with Next.js 16 (App Router) and React 19. It combines real-time weather data with pixel-influenced visuals, educational content, global weather tracking, aviation and space weather tools, and stargazing forecasts. Live at 16bitweather.co, deployed on Vercel. (The AI chat subsystem was removed; if it returns, re-audit that surface first.)

## Common Commands

```bash
# Development
npm run dev              # Start development server (localhost:3000)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint
npm run typecheck        # TypeScript type-check (same gate as CI's tsc --noEmit)
npm run analyze          # Bundle analysis (ANALYZE=true build)

# Unit Testing (Jest)
npm test                 # Run all unit tests
npm test -- weather-utils.test.ts                    # Single test file
npm test -- --testNamePattern="should convert 0°C"   # Single test by name
npm run test:watch       # Jest in watch mode
npm run test:ci          # Jest for CI (sequential, --runInBand)

# E2E Testing (Playwright)
npx playwright test                                  # All E2E tests
npx playwright test --project=chromium               # Single browser
npx playwright test tests/e2e/weather-app.spec.ts    # Single test file

# PR Validation
npm run validate:pr      # Build + E2E + Lighthouse CI (run manually before PR; CI also runs these)

# Dead Code Detection (Knip)
npm run knip             # Find unused files, dependencies, and exports
npm run knip:fix         # Auto-remove unused exports and dependencies
npm run lighthouse       # Lighthouse CI only
```

## Git Hooks (husky)

Hooks live in `.husky/` (installed via the `prepare` script):
- `pre-commit` — gitleaks secret scan of the staged diff
- `pre-push` — gitleaks secret scan of unpushed commits

E2E (Playwright) and Lighthouse CI run in GitHub Actions
(`.github/workflows/`), not in local hooks. Lighthouse config: `lighthouserc.js`.

## Architecture

### Next.js App Router Structure

- **`app/`** - Routes using Next.js 16 App Router conventions
  - Server Components by default, `"use client"` for interactivity
  - `api/` - API routes that proxy external services (keeps API keys server-side)
  - Dynamic routes: `weather/[city]`, `gfs-model/[region]/[run]`

### API Route Groups

- **Weather**: `api/weather/{current,forecast,geocoding,air-quality,uv,pollen,precipitation-history,alerts,spc-outlook,storm-reports,wis}`
- **Open-Meteo**: `api/open-meteo/{forecast,air-quality}` (primary weather source)
- **Aviation**: `api/aviation/{alerts,metar,pireps,flight-lookup,turbulence,airport-misery}`
- **Space Weather**: `api/space-weather/{kp-index,aurora,coronagraph,enlil,flares,alerts,solar-wind,magnetometer,plasma,proton-flux,sdo-image,xray-flux,sunspots,scales}`
- **News**: `api/news/rss` (keyless RSS/Atom aggregation)
- **Radar**: `api/weather/{noaa-wms,iowa-nexrad,iowa-nexrad-tiles,radar}`
- **Other**: `api/{stargazer,travel,gfs-image,earth-sciences,storm-reports,locations,user,dashboard-weather,og,cron}`

### Key Directories

- **`lib/`** - Core business logic
  - `location-service.ts` - Geolocation with GPS, IP fallback, and reverse geocoding
  - `user-cache-service.ts` - Client-side caching (10-min weather TTL)
  - `theme-config.ts` - Theme definitions (6 themes with CSS custom properties)
  - `env-validation.ts` - Environment variable validation
  - `supabase/` - Database client, auth, middleware, SQL schemas
  - `services/` - Domain services (news/RSS, GFS models, aviation, space weather, USGS earthquakes, volcanoes, flight lookup, rate limiting)
  - `weather/` - Weather data modules (current, forecast, geocoding, utils)
  - `validations/` - Zod validation schemas
  - `stargazer/` - Astronomy calculations (moon, planets, ISS passes, sky scoring)

- **`components/`** - React components
  - `ui/` - shadcn/ui primitives
  - `dashboard/` - Dashboard cards, modals, theme selector
  - `aviation/` - Flight conditions terminal, turbulence map
  - `space-weather/` - Aurora forecast, Kp index, solar wind, coronagraph
  - `news/` - News grid, cards, filters
  - `stargazer/` - Sky conditions, moon, planets, ISS passes
  - `location-context.tsx` - Location state provider

- **`hooks/`** - Custom React hooks
  - `useWeatherController.ts` - Weather data orchestration
  - `useTurbulenceData.ts` - Aviation turbulence data
  - `useDemoMode.ts` - Demo mode state
  - `use-theme-preview.ts` - Theme preview

### Data Flow

1. API keys are never exposed to client (no `NEXT_PUBLIC_` prefix on sensitive keys)
2. All external API calls go through `app/api/` routes
3. Weather data cached client-side via `user-cache-service.ts`
4. Auth state managed via Supabase with Row-Level Security

### External Services

- **Open-Meteo** - Primary weather data, forecasts, air quality, UV (keyless)
- **Supabase** - PostgreSQL database, authentication
- **NOAA MRMS** - High-resolution US radar via WMS (nowcoast.noaa.gov)
- **USGS** - Earthquake data
- **NASA** - Space/climate data
- **Sentry** - Error monitoring
- **OpenLayers** - Map rendering (~400KB, code-split)

### Context Providers

Three main contexts wrap the app in `app/layout.tsx`:
- `LocationContext` - Current location state
- `AuthContext` - Supabase auth session
- `ThemeContext` - 6 available themes with persistence

### Path Aliases

`@/*` maps to project root (configured in `tsconfig.json`). Use `@/lib/`, `@/components/`, `@/hooks/`, etc.

### Repo layout notes

- `_archive/` — historical plans and legacy code; excluded from search/build flows.
- `tempest/` — legacy E2E scripts not run in CI; current E2E is in `tests/e2e/`.
- `scripts/` — one-off TypeScript utilities run via `tsx` (e.g. `npm run test:profile`).
- `planning/` — in-progress design notes (e.g. `aviation-uplift.md`) and **`planning/prds/`** for product requirement docs.
- `proxy.ts` — top-level proxy entry, separate from the Next.js app.

## Testing

**Unit tests** in `__tests__/` with `.test.ts` suffix (Jest + jsdom).
**E2E tests** in `tests/e2e/` with `.spec.ts` suffix (Playwright).

Playwright config supports hybrid mode: local browsers for development, Kernel cloud browsers for CI. Auto-starts dev server locally unless `PLAYWRIGHT_TEST_BASE_URL` is set.

## Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Code Patterns

- TypeScript strict mode
- Zod for form validation (schemas in `lib/validations/`)
- Tailwind CSS v4 with CSS custom properties for theming (`var(--bg)`, `var(--text)`, `var(--primary)`)
- `cn()` utility from `@/lib/utils` for conditional Tailwind classes
- React Hook Form for forms
- Sonner for toast notifications
- Prefer `type` imports: `import type { MyType } from './types'`
- API routes return JSON with consistent error format: `{ error: string }`
- Console logging: `console.error('[context]', error)` with context prefix
- Props interfaces named `{ComponentName}Props`

## Pull Requests

Use the GitHub CLI (`gh`). Always create descriptive titles. Never include emojis in PR descriptions.

## Dead Code Hygiene

- Before completing a feature or ending a session, run `npm run knip` to check for orphaned exports, unused files, and dead dependencies left behind by refactoring.
- Remove anything flagged as unused, but ask for confirmation before deleting files.
- Config: `knip.json` at project root; `scripts/`, `tempest/`, `public/` are excluded.

## Planning Notes

In-progress design notes live in `planning/`. Add new notes there when a task warrants written context beyond the conversation.
