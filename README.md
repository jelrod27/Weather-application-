# 16-Bit Weather

Retro-styled weather education platform that pairs live environmental data with a pixel-influenced interface, long-form learning content, and a US severe-warning alerting pipeline.

[Live site](https://www.16bitweather.co) · [Changelog](CHANGELOG.md) · [Security policy](SECURITY.md)

## What this is

A weather site for learners, hobbyists, and enthusiasts who want accurate data without a generic app layout. It combines forecasts, live hazard tools (severe, warnings, radar, aviation, space weather, stargazing), structured education content, an automated blog, and warning alerts you can subscribe to with or without an account.

Forecast data comes from Open-Meteo and needs no API key, so the app runs locally with almost no configuration. Accounts, saved locations, and alerts require Supabase.

## Features

**Forecasts and conditions** — current conditions, hourly and daily forecasts, per-city pages, air quality, and pollen. Saved locations and preferences for signed-in users.

**Warning alerts** — subscribe a place to US NWS warnings and receive email or web push when one covers it. Guests subscribe without an account through HMAC-signed manage links (`/alerts`); account holders manage places from the dashboard.

**Severe and winter** — SPC Day 1–3 convective outlooks, storm reports, an active NWS warnings hub, and winter-specific conditions.

**Radar** — RainViewer tiles proxied through the app, with severe overlays and shareable URL state.

**Aviation** — METARs, PIREPs, SIGMETs and AIRMETs, turbulence maps, flight briefs, airport delay scoring, and live aircraft lookup.

**Space weather** — Kp index, solar wind, X-ray flux, flare tracking, coronagraph and SDO imagery, the ENLIL solar wind model, and aurora forecasts.

**Stargazer** — observing scores built from cloud cover, moon phase, and astronomical twilight.

**Earth sciences and travel** — USGS earthquakes, NHC tropical outlooks, and interstate corridor driving scores.

**Education** — hub at `/education` with a cloud atlas, weather systems, phenomena, and a meteorology glossary. 29 entries have their own guide URLs; the long-form guides behind them are drafted one at a time by `scripts/education/` and merged through pull requests.

**Blog and newsletter** — posts in `content/blog/`, generated on a schedule by `scripts/newsletter/` and opened as PRs for human review before they ship.

**Themes** — six retro themes (`nord`, `daybreak`, `synthwave84`, `dracula`, `cyberpunk`, `matrix`) split into free and premium tiers, with a preview window and persistence for signed-in users.

## How it fits together

- **API proxying.** Keyed and rate-limited upstreams are proxied through `app/api/*` so their credentials stay server-side. New routes use the shared wrapper in `lib/api/with-api-route.ts`, which applies the rate-limit gate and turns thrown errors into logged, Sentry-visible responses. Basemap tiles, Supabase, Sentry, and IP geolocation are called from the browser directly — see the CSP note below.
- **Weather data flow.** `useWeatherSession` is the single load/cache/rate-limit hook; `useWeatherController` (home bootstrap) and `useCityWeatherSession` (city pages) are thin wrappers over it. Cache TTLs live in `lib/cache/weather-cache-policy.ts`. Do not add parallel fetch logic — extend the session hook.
- **Middleware and CSP.** `middleware.ts` handles Supabase session refresh, auth redirects, and builds the Content-Security-Policy. Any new external host the client calls must be added to `connect-src` there, or it fails silently in production.
- **Alerting pipeline.** Two every-minute Vercel crons (`vercel.json`) drive it: `bitwatch-ingest` leases a row, pulls NWS alert pages from a sliding watermark, and applies each source message to a warning event (VTEC parsing, geometry place matching); `severe-alerts` fans out to email via Resend and web push. Both authenticate with a timing-safe bearer check against `CRON_SECRET`. The domain vocabulary for this subsystem is defined in [CONTEXT.md](CONTEXT.md) — use those terms.
- **Theming.** Style with the CSS custom properties (`var(--bg)`, `var(--text)`, `var(--primary)`), never hardcoded colors. Read theme state from `@/components/theme-provider`, never from `next-themes` directly.

## Tech stack

- **Framework**: Next.js 16 (App Router), React 19
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS v4, shadcn-style UI primitives
- **Database and auth**: Supabase (PostgreSQL, Auth, RLS)
- **Maps**: MapLibre GL and OpenLayers
- **Email and push**: Resend, web-push (VAPID)
- **Monitoring**: Sentry
- **Testing**: Jest (unit), Playwright (E2E), Lighthouse CI, Knip (dead code)
- **Deployment**: Vercel

## Getting started

### Prerequisites

- Node.js 20.9 or newer
- npm (this repo is npm-only; do not switch package managers)
- [gitleaks](https://github.com/gitleaks/gitleaks) on your `PATH` — the husky `pre-commit` and `pre-push` hooks hard-fail without it

### Installation

```bash
git clone https://github.com/jelrod27/Weather-application-.git
cd Weather-application-
npm install
```

Copy `.env.example` to `.env.local`. **No variable is strictly required** — the
app boots without any of them, forecasts are keyless, and `lib/supabase/constants.ts`
substitutes placeholder credentials so unauthenticated browsing works. Set these to
get auth, saved locations, and alerts working:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Then start the dev server:

```bash
npm run dev
```

Open http://localhost:3000.

### Optional configuration

`.env.example` documents the rest. The ones that unlock whole features:

| Variable | Unlocks |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Cron jobs, webhooks, alert delivery |
| `CRON_SECRET` | Authenticated cron routes |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Alert and welcome emails |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web push delivery |
| `GOOGLE_POLLEN_API_KEY` | US pollen coverage (no keyless provider exists) |
| `NASA_API_KEY` | Higher-rate NASA imagery |
| `ANTHROPIC_API_KEY`, `NEWSLETTER_MODEL`, `EDUCATION_MODEL` | Blog and education generation scripts |
| `NEXT_PUBLIC_SENTRY_DSN` | Error monitoring |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Type-check app code |
| `npm run typecheck:tests` | Type-check the test project |
| `npm test` | Jest unit tests |
| `npm run test:ci` | Jest in CI mode |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run knip` | Dead code and unused dependency scan |
| `npm run analyze` | Bundle analysis |
| `npm run lighthouse` | Lighthouse CI |
| `npm run validate:pr` | Build, Playwright, and Lighthouse gate |
| `npm run validate:images` | Check blog images against the allowed-host list |
| `npm run validate:education-sources` | Check education citations against the source catalog |
| `npm run education:guide -- --list` | Show the education guide queue |

## Quality gates

CI (`.github/workflows/ci.yml`) runs `lint`, `typecheck`, `typecheck:tests`, `test:ci`, and `knip` in parallel, then `build` if all pass. **Knip failures break the build**, so remove orphaned exports, files, and dependencies as you go. E2E and Lighthouse run as separate workflows on pull requests.

Locally, `pre-commit` runs a gitleaks scan of the staged diff and `pre-push` scans unpushed commits and type-checks both TypeScript projects. The type check is skipped when `CI` is set, so the newsletter workflows that push from CI do not compile the repo twice; the secret scan always runs.

## Repo layout

```
app/            App Router routes and API handlers
components/     UI components
hooks/          Data and session hooks
lib/            Domain logic (bitwatch, education, radar, space-weather, ...)
content/        Markdown for blog posts and education guides
scripts/        tsx utilities, including newsletter and education generation
supabase/       Dated SQL migrations
tests/          Playwright E2E
__tests__/      Jest unit tests
planning/       Design notes, PRDs, and ADRs

middleware.ts   Supabase session refresh, auth redirects, and the CSP
instrumentation*.ts, sentry.*.config.ts, proxy.ts   Entry points outside the App Router
```

`@/*` maps to the project root, so imports read as `@/lib/`, `@/components/`, `@/hooks/`.

## Documentation

- [CODING.md](CODING.md) — engineering handbook: style, naming, error handling, security, PR workflow
- [CONTEXT.md](CONTEXT.md) — domain vocabulary for the alerting subsystem
- [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) — how the system fits together, for coding agents and IDEs
- [SECURITY.md](SECURITY.md) — vulnerability reporting
- [planning/](planning/) — design notes, PRDs for in-flight work, and ADRs
- [scripts/education/README.md](scripts/education/README.md) — education guide pipeline
- [CHANGELOG.md](CHANGELOG.md) — release history

## Data sources

**Weather and science data**: NOAA/NWS (`api.weather.gov`, SPC, NHC, SWPC, NESDIS),
Open-Meteo, RainViewer, Iowa Environmental Mesonet (NEXRAD), AviationWeather.gov, USGS,
NASA (SDO, SOHO), CelesTrak, ADS-B networks, and Google Pollen.

**Basemaps**: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors,
rendered through [CARTO](https://carto.com/) and OpenFreeMap. Geocoding uses OSM Nominatim;
IP geolocation falls back to ipapi.co and ipinfo.io.

All are used under their respective terms; imagery in blog posts is restricted to the
allowed-host list in `lib/blog/allowed-hosts.ts`.

## Releases

The site deploys continuously from `main`. Tagged releases use calendar
versioning (`YYYY.M.PATCH`) and are summarized in [CHANGELOG.md](CHANGELOG.md);
see "A note on versioning" there for why the older semver-shaped tags are not
ordered.

## License

Licensed under the Fair Source License, Version 0.9. See [LICENSE](LICENSE).
