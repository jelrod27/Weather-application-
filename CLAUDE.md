# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation map

This repo keeps its durable rules in dedicated files. Read them rather than re-deriving:

- **`CODING.md`** — engineering handbook: style, naming, imports, error handling, security, PR workflow. It is the source of truth for *how to write code here*; this file covers *how the system fits together*.
- **`AGENTS.md`** — shared model-facing entrypoint (also read by Codex/other agents). Includes an auto-generated `nextjs-agent-rules` block written by `next dev`: Next.js 16 differs from training data, so consult `node_modules/next/dist/docs/` before writing App Router code. That block reappears if deleted — commit it with your work.
- **`CONTEXT.md`** — the alerting domain vocabulary (Subscriber, Protected Place, Warning Event, Source Message, Event Action, Place Match, Freshness State, Delivery). Use these exact terms in alerting code, schemas, and copy; each entry lists the words to *avoid*.
- **`planning/prds/README.md`** — product specs for in-flight work (Bitwatch, radar v2, condition alerts, news overhaul). Shipped PRDs are deleted; recover from git history.
- **`planning/`** — design notes for in-progress work. Add new notes here when a task needs written context beyond the conversation.

## Project Overview

16-Bit Weather is a retro-styled weather education platform built with Next.js 16 (App Router) and React 19. It combines Open-Meteo forecasts, educational content, live hazard tools (severe, warnings, radar, space weather, aviation, stargazer), an automated blog/newsletter, and a US NWS warning alerting pipeline. Live at 16bitweather.co, deployed on Vercel.

The AI chat subsystem and weather arcade/games were removed; if either returns, re-audit that surface first.

## Common Commands

```bash
# Development
npm run dev              # Dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit against tsconfig.json
npm run typecheck:tests  # tsc --noEmit against tsconfig.tests.json
npm run analyze          # Bundle analysis (ANALYZE=true build)

# Unit tests (Jest + jsdom)
npm test
npm test -- weather-utils.test.ts                    # Single file
npm test -- --testNamePattern="should convert 0°C"   # Single test
npm run test:watch
npm run test:ci                                      # CI mode (--runInBand)

# E2E (Playwright)
npx playwright test
npx playwright test --project=chromium
npx playwright test tests/e2e/weather-app.spec.ts

# Quality gates
npm run knip             # Dead code / unused deps (CI-blocking)
npm run knip:fix
npm run lighthouse
npm run validate:pr      # build + E2E + Lighthouse
```

`npm` only — do not switch package managers. Node 22 (`.nvmrc`; matches the Vercel project's 22.x. Next.js 16's floor is 20.9).

### What CI actually gates

`.github/workflows/ci.yml` runs, in parallel: `lint`, `typecheck` **and** `typecheck:tests`, `test:ci`, and `knip` — then `build` if all pass. **Knip failures break the build**, so remove orphaned exports/files/deps as you go rather than at the end. E2E (`e2e-pr.yml`, `e2e-preview.yml`) and Lighthouse (`lighthouse-pr.yml`) run as separate workflows.

## Architecture

### API routes

All external API calls proxy through `app/api/*` so keys stay server-side. Route groups:

- **Weather**: `weather/{geocoding,alerts,air-quality,pollen,precipitation-history,spc-outlook,storm-reports,wis,noaa-wms,iowa-nexrad,iowa-nexrad-tiles}` — note current/forecast now live under `open-meteo/{forecast,air-quality}` (primary source, keyless)
- **Radar (v2)**: `radar/{manifest,metadata,tile/[...path]}` — RainViewer tiles proxied through `lib/services/tile-proxy-cors.ts`
- **Aviation**: `aviation/{metar,pireps,alerts,turbulence,flight-brief,flight-lookup,airport-misery,aircraft,aircraft/{callsign,photo,route}}`
- **Space weather**: `space-weather/{kp-index,solar-wind,aurora,flares,alerts,coronagraph,enlil,magnetometer,plasma,proton-flux,sdo-image,xray-flux,sunspots,scales}`
- **Alerting**: `alerts/{guest-subscribe,guest-manage}`, `push/{subscribe,vapid-public}`, `user/alerts`, `webhooks/new-user`, `auth/welcome-email`
- **Cron**: `cron/{severe-alerts,bitwatch-ingest,keep-alive,aeroapi-usage}`
- **Other**: `news/rss`, `earth-sciences/earthquakes`, `travel/{corridors,trip-score}`, `stargazer`, `locations`, `dashboard-weather`, `user/preferences`, `gfs-image`, `og`

### Shared route wrapper — `lib/api/with-api-route.ts`

New API routes should use `withApiRoute(request, handler, options)`. It applies the rate-limit gate, and converts anything the handler throws into a logged, Sentry-visible `{ error: string }` response. Throw `ApiError(status, message)` for *expected* outcomes (bad input, upstream 404) — those return the status without Sentry noise. It deliberately does not normalize per-route status/message wording; pass those via options. Roughly 26 of 64 route files have adopted it; the rest hand-roll the same gate, and plain `console.error` there is invisible to Sentry — prefer `logRouteError(context, error)` from `lib/error-utils.ts`.

### Bitwatch — NWS warning alerting pipeline

The most intricate subsystem, driven by two **every-minute** Vercel crons (`vercel.json`) with `maxDuration = 55` — work must fit inside one minute or lease/watermark cleanly for the next tick.

- `app/api/cron/bitwatch-ingest` → `lib/bitwatch/ingest.ts`: leases the ingest row (50s lease), pulls NWS alert pages from a sliding watermark with 15-minute overlap (2-hour cold lookback), content-hashes each `Source Message`, chunks upserts (PostgREST URL limits — see recent commit history), and advances the watermark. Freshness is `fresh | delayed | unavailable`.
- `lib/bitwatch/`: `lifecycle.ts` (apply a Source Message to a Warning Event), `vtec.ts` (VTEC parsing), `match.ts`/`coverage.ts` (Place Match geometry), `motion.ts`, `priority.ts`, `delivery-policy.ts`, `outbox.ts`, `scout.ts`/`scout-nowcast.ts`, `radar-crop.ts`.
- `app/api/cron/severe-alerts` → `lib/services/severe-alert-monitor.ts` fans out to email (Resend, via `severe-alert-email-delivery` / `guest-alert-email-delivery`) and web push (`lib/push/send.ts`).
- Guests subscribe without an account: `lib/alerts/guest-tokens.ts` issues/verifies HMAC-signed manage tokens; UI at `app/alerts/{page,verify,manage}`.
- Both cron routes authenticate with `verifyCronBearer` (`lib/cron/verify-cron-auth.ts`, timing-safe compare against `CRON_SECRET`) and use `createServiceRoleSupabaseClient()`. Cron routes must **not** be rate-limited by caller identity.

Use `CONTEXT.md` terminology throughout this subsystem.

### Weather data flow

`useWeatherSession` (`hooks/`) is the core load/cache/rate-limit hook. Two thin wrappers drive it: `useWeatherController` (home bootstrap — auto-locate with 5s GPS timeout, IP fallback, last-displayed restore) and `useCityWeatherSession` (city-page seed). Do not duplicate fetch logic into new hooks; extend the session hook.

Caching layers: `lib/weather-session-cache.ts` (in-tab), `lib/user-cache-service.ts` (client persistence), TTLs centralized in `lib/cache/weather-cache-policy.ts` (weather 10 min, search 5 min, location 24 h). Client-side search limits live in `lib/weather-rate-limit.ts`; server-side in `lib/services/weather-rate-limiter.ts`.

### Providers and theming

`app/layout.tsx` nests `AuthProvider` (`@/lib/auth`) → `AppThemeProvider` (`app/providers/ThemeProvider.tsx`) → `LocationProvider` (`components/location-context.tsx`).

Six themes (`lib/theme-config.ts`): `nord`, `daybreak` (default), `synthwave84`, `dracula`, `cyberpunk`, `matrix`, split into free/premium tiers by `lib/theme-tiers.ts` with a 30s preview window (`hooks/use-theme-preview.ts`). Read theme state from `@/components/theme-provider` (`useTheme`) — **never** `next-themes`. Style with the CSS custom properties (`var(--bg)`, `var(--text)`, `var(--primary)`), not hardcoded colors.

### Middleware and CSP

`middleware.ts` handles Supabase session refresh, auth-route redirects, and builds the Content-Security-Policy (`buildCspHeader`). **Any new external host a client calls must be added to `connect-src` there** or it fails silently in production — this has bitten the location fallback and map basemaps before. CSP lives only in middleware; do not duplicate it in `next.config.mjs`. `'unsafe-inline'` in `script-src` is intentional: most pages are SSG, so per-request nonces cannot be injected.

### Newsletter / blog automation

`scripts/newsletter/` generates posts into `content/blog/` and opens a PR, run by `.github/workflows/newsletter-{sunday,wednesday}.yml` (also `workflow_dispatch` with a `dry_run` input). It calls the Anthropic API (`ANTHROPIC_API_KEY`, model from `NEWSLETTER_MODEL`). These workflows push from CI, which is why the pre-push type-check is CI-skipped but the secret scan is not. Image sourcing is constrained by `lib/blog/allowed-hosts.ts` and validated by `npm run validate:images`.

### Education Guide generation

`scripts/education/` drafts one long-form Entry Guide into `content/education/` and opens a PR — manual dispatch only (`.github/workflows/education-guide.yml`), because the queue is finite. It shares the newsletter's `callAnthropic` and voice spec; its model is `EDUCATION_MODEL` (default `claude-opus-5`, chosen in `scripts/education/model.ts`), separate from `NEWSLETTER_MODEL`, and the shared wrapper withholds `temperature` from models that reject it. Two hard rules it enforces, both easy to "fix" wrongly: the eligible set is the **29 Entries already published as Guide URLs**, never the other 47 (ADR-0001), and it only generates for kinds whose route actually calls `getGuideContent` (`KINDS_WITH_GUIDE_RENDERING` in `queue.ts` — all three kinds today, kept honest by a test that reads the routes). Citations come from the catalog in `scripts/education/sources.ts` by id (`npm run validate:education-sources`), ranked by the brief's tag order in `topics.ts` with per-brief pins for the page a focus line depends on; diagrams come from the registry by id; the body gate rejects links, URLs, images and raw HTML outright; and every retry edits the previous draft in place rather than regenerating it. `npm run education:guide -- --list` shows the queue. See `scripts/education/README.md`.

## Testing

- Unit tests: `__tests__/**/*.test.[tj]s?(x)` (Jest + jsdom, `jest.config.mjs`). CSS, images, `react-markdown`, `rehype-sanitize`, and `remark-gfm` are mocked via `moduleNameMapper` — importing markdown libs in a test needs no extra setup.
- E2E: `tests/e2e/**/*.spec.ts`. Local runs auto-start the dev server against `127.0.0.1:3000`; setting `PLAYWRIGHT_TEST_BASE_URL` targets a deployed preview instead. `KERNEL_API_KEY` opts into OnKernel cloud browsers (legacy) and then *requires* a base URL.
- **Type-check gap**: `tsconfig.json` excludes test files and `tsconfig.tests.json` includes only a handful by name, so most of `__tests__/` is never type-checked by the hook or CI. Widening it is tracked separately — new tests are not automatically covered.

## Git Hooks (husky)

Hooks live in `.husky/` (installed via `prepare`):
- `pre-commit` — gitleaks secret scan of the staged diff
- `pre-push` — gitleaks scan of unpushed commits, then `tsc --noEmit` against both TS projects

The type check is local-only (skipped when `CI` is set); the secret scan always runs. A push that only deletes refs skips both gates. Both hooks hard-fail if `gitleaks` is missing; pre-push also fails if `node_modules/.bin/tsc` is missing (`npm ci`). Bypass only with explicit justification: `git commit --no-verify` / `git push --no-verify`.

## Environment Variables

Required in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Optional/server-only (see `.env.example` for the annotated list): `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `RESEND_API_KEY`/`RESEND_FROM_EMAIL`, `SUPABASE_WEBHOOK_SECRET`, `ADMIN_NOTIFICATION_EMAIL`, `GOOGLE_POLLEN_API_KEY` (US pollen coverage), `NASA_API_KEY`, `ANTHROPIC_API_KEY`/`NEWSLETTER_MODEL`/`EDUCATION_MODEL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `WEATHER_RATE_LIMIT_*`. Weather data itself is keyless.

## Repo layout notes

- `@/*` maps to project root; use `@/lib/`, `@/components/`, `@/hooks/`.
- `supabase/migrations/` — dated SQL migrations (RLS/grant hardening is a recurring theme; do not weaken RLS to make tests pass). `.sql.skip` files are intentionally inert.
- `_archive/`, `tempest/` — historical plans and legacy E2E; excluded from search/build/knip.
- `scripts/` — one-off `tsx` utilities; excluded from knip, so unused exports there are not flagged.
- `proxy.ts`, `instrumentation*.ts`, `sentry.*.config.ts` — top-level entry points outside the App Router.

## Pull Requests

Use `gh`. Descriptive titles, no emojis in descriptions. Before opening a PR, summarize what changed, why, tests run, and known risks. Do not push, open PRs, delete files, reset git state, or bypass hooks unless asked.
