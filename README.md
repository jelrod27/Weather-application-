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

The current calendar version is **2026.10.0**. Release history is recorded in [`CHANGELOG.md`](CHANGELOG.md).

## License

Fair Source License, Version 0.9. See [`LICENSE`](LICENSE).
