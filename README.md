# 16bitweather.co

Retro-styled weather education platform that pairs live environmental data with a pixel-influenced interface and structured learning paths.

**Version 1.589** | [Live Site](https://www.16bitweather.co)

## Version 1.589 highlights

Weekly blog posts with NOAA public domain imagery, precipitation history accuracy improvements, and continued SEO refinements for city pages.

- **Weekly blog**: Super El Nino coverage and severe weather outlook with inline NOAA CPC and NSSL imagery.
- **Precipitation accuracy**: Reworked 24-hour precipitation history endpoint for more reliable readings.
- **SEO city pages**: Enriched metadata and restored missing H1 spacing on city weather pages.
- **Stargazer**: Night sky observing score, education pages, and launch link integration.
- **Space weather redesign**: Tabbed dashboard with interactive Kp index, solar wind, and X-ray flux charts. ENLIL model viewer, CME tracker, and aurora forecast maps.
- **Social sharing**: Fixed blank OG previews. Share buttons on all major pages with dynamic OG images.
- **SPC outlooks and travel corridors**: Day 1-3 convective outlook maps on the severe weather page. Interstate corridor driving condition scores with hazard maps.
- **Education hub**: Consolidated learning pages with expanded cloud types, weather systems, fun facts, extremes, and glossary content.
- **Supabase hardening**: RLS policies on user_ai_memory, initplan performance fixes, duplicate policy cleanup, and missing foreign key indexes.

## About

The site targets learners and hobbyists who want accurate data without a generic weather app layout. Content mixes forecasts, education, games, and optional sign-in for saved locations and preferences.

## Features

- **Real-time weather**: Current conditions, forecasts, air quality, pollen, and related environmental metrics
- **Space weather**: Solar activity monitoring with Kp index, solar wind, aurora forecast, flare tracking, and ENLIL model visualization
- **Severe weather**: SPC convective outlook maps (Day 1-3) and active NWS alerts filtered by tornado, thunderstorm, wind, hail, and flood
- **Travel weather**: Interstate corridor driving conditions with hazard scoring and WPC daily outlook maps
- **Tropical tracker**: NHC 2-day and 7-day outlooks, Atlantic satellite imagery, and sea surface temperature analysis
- **Aviation weather**: SIGMETs, AIRMETs, turbulence maps, and real-time flight conditions in a terminal-style interface
- **Learn Hub**: Cloud types, weather systems, extreme phenomena, fun facts, and a weather glossary
- **Interactive radar**: North America radar with NOAA/Iowa NEXRAD, MSC GeoMet, RainViewer fallback, and severe weather overlays
- **Global extremes**: Hot and cold location tracking with live data
- **Custom themes**: Twelve themes with persistence for signed-in users
- **Weather Arcade**: Educational games with score tracking
- **User accounts**: Saved locations and preferences via Supabase
- **News and feeds**: Multi-source RSS including earth science and space categories
- **Social sharing**: Share buttons on every major page with dynamic OG preview images

## Tech stack

- **Framework**: Next.js 16 (App Router), React 19
- **Styling**: Tailwind CSS v4, shadcn-style UI primitives
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL, Auth, RLS)
- **APIs**: OpenWeatherMap, NOAA SWPC, USGS, NASA, NHC, SPC, and other providers behind server routes
- **Monitoring**: Sentry error tracking
- **Testing**: Jest (unit), Playwright (E2E), Lighthouse CI (performance gate)
- **Deployment**: Vercel

## Getting started

### Prerequisites

- Node.js 20.9 or newer (required by Next.js 16)
- npm or pnpm
- API keys for OpenWeatherMap and Supabase, plus any optional keys you enable locally

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

3. Set up environment variables:
   Create a `.env.local` file in the root directory with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   OPENWEATHER_API_KEY=your_openweather_key
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
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm test` | Run Jest unit tests |
| `npm run test:ci` | Jest in CI mode |
| `npx playwright test` | Run end-to-end tests |
| `npm run validate:pr` | Build, Playwright, and Lighthouse gate |

## Documentation

The `docs` folder contains deeper references when present (API notes, architecture, deployment, testing).

## License

Licensed under the Fair Source License, Version 0.9.
