# 16-Bit Weather

Weather forecasts, hazard tools, and weather education in a retro-inspired interface.

[Live site](https://www.16bitweather.co) · [Changelog](CHANGELOG.md) · [Security policy](SECURITY.md)

## Features

- **Forecasts:** Current conditions, hourly and daily forecasts, city pages, air quality, and pollen. Forecasts use Open-Meteo and do not require an API key.
- **Alerts and hazards:** US NWS warning subscriptions by email or web push, severe-weather outlooks and reports, and winter weather information.
- **Maps and planning:** RainViewer radar, aviation data and aircraft tracking, interstate travel conditions, and outdoor planning.
- **Space and sky:** Space-weather observations and forecasts, plus Stargazer observing conditions and targets.
- **Education:** Cloud, weather-systems, and phenomena guides; a meteorology glossary; and learning tools.
- **News:** Weather articles and a blog/newsletter publishing workflow.
- **Accounts and themes:** Supabase authentication, saved locations, preferences, and six interface themes.

## Technology

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Supabase, Open-Meteo, OpenLayers, MapLibre GL (aviation map), Jest, Playwright, and Vercel.

## Run locally

Requirements: Node.js 22, npm, and gitleaks (required by the Git hooks).

```bash
git clone https://github.com/jelrod27/Weather-application-.git
cd Weather-application-
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Forecast browsing works without credentials. Supabase features require the corresponding values in `.env.local`; see `.env.example` for configuration.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build the production app |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check app code |
| `npm run typecheck:tests` | Type-check the configured test project |
| `npm test` | Run Jest tests |
| `npm run test:e2e` | Run Playwright tests |
| `npm run knip` | Check for unused files, exports, and dependencies |
| `npm run lighthouse` | Run Lighthouse CI |
| `npm run validate:pr` | Build, run Playwright, and Lighthouse |

CI runs lint, both configured TypeScript checks, unit tests, and Knip; the build runs after those checks pass. E2E and Lighthouse checks run in separate workflows. See `.github/workflows/` for workflow definitions.

## Project guidance

- [`AGENTS.md`](AGENTS.md): shared instructions for coding agents.
- [`CLAUDE.md`](CLAUDE.md): Claude Code project guidance.
- [`CODING.md`](CODING.md): engineering conventions, security, testing, and Git workflow.
- [`CONTEXT.md`](CONTEXT.md): warning-alerting domain terms.
- [`planning/prds/README.md`](planning/prds/README.md): product requirements documents.
- [`planning/`](planning/): plans, research, reviews, and architecture decisions.

## Data and deployment

The site deploys on Vercel. The primary forecast provider is Open-Meteo. Other features use services including NOAA/NWS, RainViewer, AviationWeather.gov, USGS, NASA, and Google Pollen. See the relevant feature pages and `.env.example` for provider and credential details.

### Analytics

Vercel Analytics and Speed Insights remain enabled. PostHog adds anonymous
pageviews, repeat-browser visits, and client-side navigation analytics. Its SDK
loads after hydration, only for Vercel production builds with both
`NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` configured.
The [Vercel Marketplace integration](https://posthog.com/docs/integrations/vercel-marketplace)
supplies these variables. Keep Vercel's automatic system environment variables
enabled so `NEXT_PUBLIC_VERCEL_ENV` is available at build time. Preview and local
development do not send events, even when they share the production token.

PostHog stores an anonymous browser identifier in local storage (with the SDK's
cookie fallback when local storage is unavailable) to measure repeat visits.
It respects Do Not Track for capture and identifier storage, does not identify Supabase users, and does not
create person profiles. Session replay, form/click autocapture, surveys, flags,
and additional error/performance collection are disabled. Events omit URL query
strings, fragments, campaign parameters, and person properties; referrer domains
and page paths remain available. PostHog can derive approximate geography from
the request IP. Browser identifiers can still be personal data;
include PostHog in the site's privacy disclosures and apply consent requirements
appropriate to the audience before release.

After deploying, open the production site in a browser without Do Not Track or
an analytics blocker, navigate between pages, and check PostHog's live activity
for `$pageview` events. Existing Vercel history is not imported into PostHog.

The isolated browser regression uses a fixture token and intercepts all PostHog
requests. Run it locally against a production build:

```bash
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=phc_local_verification NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com NEXT_PUBLIC_VERCEL_ENV=production npm run build
npm run start -- --hostname 127.0.0.1 --port 3100
# In another terminal:
PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:3100 POSTHOG_E2E_PRODUCTION=true npx playwright test tests/e2e/posthog.spec.ts --project=chromium
```

The current calendar version is **2026.10.0**. Release history is recorded in [`CHANGELOG.md`](CHANGELOG.md).

## License

Fair Source License, Version 0.9. See [`LICENSE`](LICENSE).
