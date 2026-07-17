# 16bitweather.co

Retro-styled weather education platform that pairs live environmental data with a pixel-influenced interface and structured learning paths.

**Version 1.589** | [Live Site](https://www.16bitweather.co)

## Version 1.589 highlights

Recent shipping focused on education, search discoverability, and auth onboarding.

- **Education hub**: Rebuilt `/education` with encyclopedia links, live labs, cloud altitude quiz, glossary, and **29 shareable reference guides** under `/education/*`.
- **Weather systems**: 16 encyclopedia entries with expanded cards plus canonical guide pages for Google Search (`/education/weather-systems/[slug]`).
- **Glossary**: Meteorology concepts (supercell, CAPE, mesocyclone, wind shear, and more) with blog anchor support.
- **SEO / GSC**: Sitemap coverage for all guide URLs, internal linking from the indexed education hub, Article JSON-LD, and `llms.txt` patterns for AI citation.
- **Auth onboarding**: Post-signup dashboard welcome flow and improved registration UX.
- **Weekly blog**: NOAA public-domain imagery and severe weather deep dives.
- **Stargazer & space weather**: Observing scores, tabbed space-weather dashboard, Kp/solar wind/X-ray charts, aurora and ENLIL tools.
- **Severe & travel**: SPC Day 1–3 outlook maps, NWS warnings hub, interstate corridor scores.
- **Social sharing**: Dynamic OG images and share buttons on major pages.

## About

The site targets learners, hobbyists, and weather enthusiasts who want accurate data without a generic app layout. Content mixes forecasts, structured education, live hazard tools, and optional sign-in for saved locations and theme preferences.

## Features

- **Real-time weather**: Current conditions and forecasts via **Open-Meteo** (primary), with legacy OpenWeatherMap endpoints where still required
- **Space weather**: Kp index, solar wind, aurora forecast, flare tracking, ENLIL model visualization
- **Severe weather**: SPC convective outlook maps (Day 1–3) and active NWS alerts
- **Travel weather**: Interstate corridor driving conditions with hazard scoring
- **Tropical tracker**: NHC outlooks and Atlantic satellite context
- **Aviation weather**: SIGMETs, AIRMETs, turbulence maps, and flight conditions terminal
- **Education**: Hub at `/education` — cloud atlas, weather systems, phenomena, glossary, and shareable detail guides
- **Interactive radar**: Global RainViewer tiles with severe overlays and shareable URL state
- **Custom themes**: **Six** retro themes with persistence for signed-in users
- **User accounts**: Saved locations and preferences via Supabase
- **News and feeds**: Multi-source RSS including earth science and space categories
- **Social sharing**: Share buttons with dynamic OG preview images

## Tech stack

- **Framework**: Next.js 16 (App Router), React 19
- **Styling**: Tailwind CSS v4, shadcn-style UI primitives
- **Language**: TypeScript (strict)
- **Database**: Supabase (PostgreSQL, Auth, RLS)
- **Weather data**: Open-Meteo (primary), OpenWeatherMap (legacy/fallback), NOAA, USGS, NASA, NHC, SPC
- **Monitoring**: Sentry
- **Testing**: Jest (unit), Playwright (E2E), Lighthouse CI
- **Deployment**: Vercel

## Getting started

### Prerequisites

- Node.js 20.9 or newer (required by Next.js 16)
- npm
- Supabase and OpenWeatherMap keys for full local functionality

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jelrod27/Weather-application-.git
   cd Weather-application-
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables — copy `.env.example` to `.env.local` and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   OPENWEATHER_API_KEY=
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

   Open http://localhost:3000 in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm test` | Run Jest unit tests |
| `npm run test:ci` | Jest in CI mode |
| `npx playwright test` | Run end-to-end tests |
| `npm run validate:pr` | Build, Playwright, and Lighthouse gate |
| `npm run knip` | Dead code and unused dependency scan |

## Documentation

Contributor and agent docs live in the repo root:

- **`CODING.md`** — engineering handbook (architecture, tests, security, PR workflow)
- **`CLAUDE.md`** / **`AGENTS.md`** — agent and IDE context
- **`planning/prds/`** — product specs for in-flight features
- **`CHANGELOG.md`** — release history

## License

Licensed under the Fair Source License, Version 0.9.
