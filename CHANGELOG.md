# Changelog

All notable changes to 16-Bit Weather are documented in this file.

## Versioning

This project uses **calendar versioning** (`YYYY.M.PATCH`) as of `2026.9.0`. The
app is a continuously deployed site, not a published package - nothing installs
it at a pinned version, so semver's compatibility contract never carried any
meaning here. A dated version tells you at a glance how current a release is,
and it can never go backwards.

The pre-`2026.9.0` entries below used semver-shaped numbers that were not
ordered: `1.600.0` was tagged 2026-03-29 and `1.589.0` on 2026-04-12, so the
newer release carried the lower number. Those tags are left in place as history.
Every calendar version sorts above all of them.

## [2026.9.0] - 2026-09-01

First release under calendar versioning, covering 160 pull requests since
`1.589.0` (2026-04-12).

### Added

- **Warning alerting pipeline (Bitwatch)**: End-to-end NWS warning delivery. An
  every-minute ingest cron leases a row, pulls alert pages from a sliding
  watermark, content-hashes each source message, and applies it to a warning
  event through VTEC parsing and geometry place matching; a second cron fans out
  to email (Resend) and web push. Includes a local-first warning center with
  on-site interrupt, nearby-warning ranking around a searchable pin, and Scout
  nowcasting (#533, #535, #536, #537).
- **Guest alerts**: Subscribe a place to warnings without an account, managed
  through HMAC-signed links at `/alerts` (#535, #537).
- **Education Guides pipeline**: Long-form guide generation into
  `content/education/`, with a validated source catalog, per-brief citation
  pinning, a diagram registry, and a pre-ship grounding check. Guides published
  for Cumulonimbus, Cirrus, Cyclones, and Anticyclones (#557, #559, #561-#568,
  #574-#576).
- **Education page structure**: Related Guides, guide indexes, and full Article
  JSON-LD across the education routes (#575).
- **Radar v2**: RainViewer-native tiles proxied through the app, plus a North
  America radar modernization pass (#445, #447, #449).
- **Aviation live tracker**: `/aviation` rebuilt around ADS-B flight tracking
  (#483).
- **Earth sciences and dashboard**: USGS earthquake surface and a home hub
  discovery row (#352, #456).
- **News overhaul**: New information architecture, UI, sources, and pipeline
  fixes (#455).
- **SEO and AI discoverability**: `llms.txt`, homepage JSON-LD, robots rules,
  crawlable city links, and indexing work for radar, city climate, and space
  weather (#458, #459, #464, #473, #477).
- **Auth**: Security and UX overhaul plus post-signup dashboard onboarding
  (#460, #461, #475).
- **Stargazer**: Per-hour observing scores and best-window selection (#346).
- **Pre-push type check**: Both TypeScript projects are checked locally so CI is
  not the first sign of a type error (#499).

### Changed

- **Shared API route wrapper**: `withApiRoute` adopted across space weather and
  other route groups, so rate limiting and Sentry-visible failures are uniform
  (#552, #554).
- **Rate limit isolation**: Radar tiles, city search, alerts, and hub reads no
  longer share a bucket, so a map pan can no longer 429 a search (#548, #553).
- **Theme color lives only in CSS variables**; Tailwind class strings are no
  longer looked up through `useTheme` (#551).
- **Architecture consolidation**: Deep-module sweep across newsletter, cache,
  API routes, space weather, and client data loading; god-module splits and a
  city catalog facade (#498, #554).
- **Session ownership**: Theme, auth, and preferences ownership collapsed and
  the weather session bootstrap unified behind one hook (#488).
- **Timezones**: Weather times render in the viewed location's timezone rather
  than the browser's (#527).
- **Search ranking**: Snippets ranked on live weather demand (#556).

### Removed

- **AI chat subsystem**: The assistant, its tool surface, and per-user AI memory
  were removed (#387). The `1.512.0` and `1.600.0` entries below describe
  features that no longer exist.
- **Weather arcade**: The games feature was removed (2026-04-27).
- **OpenWeatherMap**: Dropped as a data source. Open-Meteo is now the primary
  forecast provider and requires no API key (#480).

### Fixed

- **Bitwatch ingest hardening**: Lease reclaim against PostgREST `RETURNING`,
  closeout against PostgREST URL length limits, and ingest success recorded
  before source-message upserts (#542, #544, #545).
- **Supabase resilience**: Fail open when the free-tier project is paused, and
  skip a hung `getUser` on public routes (#531, #532).
- **Theme contrast**: Accent text rendering at roughly 1:1 contrast fixed in all
  six themes (#558).
- **Maps**: CARTO basemap key appended to tile URLs, removing the API-key
  watermark (#555).
- **Alerts**: NWS news cards open readable alert pages instead of downloading
  CAP XML (#443).
- **Security and dependencies**: Multi-phase audit remediation (#387, #484),
  Next.js 16.3 security bumps, MapLibre 6, and patched `postcss`, `nanoid`, and
  `js-yaml` overrides (#496, #497, #501, #505, #529, #530).

---

## [1.600.0] - 2026-03-29

### Added

- **Space weather redesign**: Tabbed dashboard with interactive Kp index, solar wind, and X-ray flux charts; ENLIL solar wind model viewer; coronal mass ejection tracker; aurora forecast maps.
- **SPC convective outlooks**: Day 1-3 Storm Prediction Center outlook maps on the severe weather page.
- **Travel corridor weather**: Interstate driving condition scoring with hazard maps and WPC daily outlooks.
- **Social sharing**: Reusable `ShareButtons` component on 7 feature pages (space weather, severe, radar, travel, tropical, aviation, education) with contextual share text.
- **OG metadata layouts**: Dynamic Open Graph images and Twitter cards for space weather, severe, travel, tropical, aviation, and education pages.
- **Shared social icons**: Extracted `XIcon`, `FacebookIcon`, `LinkedInIcon` into `components/icons/social.tsx`.

### Changed

- **Education hub overhaul**: Consolidated learning pages under one hub with expanded content and navigation.
- **OG image fix**: Root layout and city layout now use dynamic `/api/og` endpoint instead of non-existent static `/og-image.png`.
- **City layout URLs**: Standardized from `16-bit-weather.vercel.app` to `www.16bitweather.co`.
- **Radar page sharing**: Replaced inline `navigator.share` with full `ShareButtons` component.

### Fixed

- **Supabase RLS**: Added policies to `user_ai_memory` (was inaccessible), fixed `auth.uid()` initplan performance across 17 policies on 7 tables, removed 5 duplicate permissive policies, fixed `games` admin policy initplan.
- **Supabase indexes**: Added missing foreign key index on `daily_challenges.game_id`.
- **Sentry noise**: Filtered geocoding 401 auth errors from metadata generation (6,000+ events silenced); broadened detection to catch `OpenWeatherMap API authentication error` messages.

---

## [1.512.0] - 2026-03-21

### Added

- **Supabase `user_ai_memory`**: Per-user rows for assistant notes and recent locations, with RLS and service-role access from API routes; atomic append RPCs limit growth (`20260321_user_ai_memory.sql`, `20260322_user_ai_memory_atomic_rpc.sql`).
- **AI memory tools**: Assistant can record facts, locations, and scoped clears via dedicated tools (`lib/ai/memory-tools.ts`, `lib/services/ai-memory-service.ts`).
- **AI tool surface**: Structured tools for weather lookups, aviation context, USGS earthquakes, and space weather (`lib/ai/tools.ts`), replacing broad pre-fetch where practical.

### Changed

- **News and RSS**: Earthquake and volcano feeds from USGS (and related sources) integrated in the feed catalog (`lib/services/rss/feedSources.ts`).
- **Theme provider**: Sign-out handling uses a live theme reference so premium themes reset correctly; Playwright test mode avoids forcing free themes when the suite sets a premium theme for persistence tests (`components/theme-provider.tsx`).
- **Weather controller**: Playwright test mode can restore cached weather without waiting on the full auto-location gate (`hooks/useWeatherController.ts`).
- **Profile E2E**: `data-testid="profile-edit-button"` and `navigateToProfile` wait for that control with `domcontentloaded` instead of `networkidle` (`app/profile/page.tsx`, `tests/fixtures/utils.ts`, `tests/e2e/profile.spec.ts`).

### Documentation

- **README**: Version 1.512, stack bumped to Next.js 16, highlights for AI memory, earth-science feeds, and testing hardening.

---

## [1.0.1] - 2026-03-12

### Codebase Cleanup

Comprehensive audit and cleanup pass removing dead code, consolidating duplicate types, and fixing import hygiene.

#### Removed
- **Dead components**: `modern-weather-icon.tsx`, `weather-search-enhanced.tsx` (zero imports)
- **Dead hooks**: `lib/hooks.ts` — 5 unused hooks (`useDebounce`, `useMemoizedCalculation`, `useLazyComponent`, `useOfflineDetection`, `useRetry`)
- **Deprecated shim**: `lib/weather-api.ts` — consumers migrated to `@/lib/weather`
- **Stale files**: `app/error.tsx.backup`, `.eslintrc.json` (empty), `.env.local.example` (redundant), `DELETION_MANIFEST.md` (root copy), `PiHole.txt`
- **Unused dependency**: `sonner` (toast system uses Radix, not Sonner)

#### Changed
- **Hooks consolidated**: Moved `useNewsFeed.ts` and `use-theme-preview.ts` from `lib/hooks/` to `hooks/`
- **`AviationAlert` type**: Consolidated 3 definitions → single source in `lib/services/aviation-service.ts`
- **`GeocodingResponse` type**: Removed duplicates from 2 API routes → import from `lib/weather`
- **`ForecastDay` type**: Removed duplicates from 3 components → centralized in `lib/types.ts`
- **`LocationTemperature` type**: Removed duplicate from API route → import from `lib/extremes/extremes-data`
- **`NEWS_API_KEY`**: Removed `NEXT_PUBLIC_NEWS_API_KEY` client-side check (redundant; API route handles missing keys)
- **`.env.example`**: Added missing vars (`CRON_SECRET`, `NASA_API_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, `SUPABASE_SERVICE_ROLE_KEY`)

---

## [1.0.0] - 2025-12-27

### Release Highlights
Official 1.0 release of the 16-Bit Weather Platform.

### Features
- **Real-Time Weather Data**: Temperature, conditions, wind, humidity, pressure, UV index, AQI, and pollen counts
- **5-Day Forecast**: Extended forecasts with detailed daily breakdowns
- **Hourly Forecast**: Hour-by-hour weather predictions
- **Interactive Radar**: OpenLayers-based weather radar with precipitation overlays
- **Global Extremes**: Live tracking of Earth's hottest and coldest locations
- **Learn Hub**: Educational content on cloud types, weather systems, and extreme phenomena
- **Weather Arcade**: Retro-styled educational games with Supabase-backed high scores
- **News Aggregation**: Weather-related news from multiple RSS sources
- **User Authentication**: Supabase Auth with saved locations and preferences
- **12 Themes**: Dark, Miami, Tron, Tokyo Night, Dracula, Cyberpunk, Matrix, Synthwave '84, and more

### Technical
- Next.js 15 with React 19
- Tailwind CSS v4 with shadcn/ui components
- TypeScript throughout
- Playwright end-to-end testing
- Sentry error monitoring
- Vercel Analytics and Speed Insights

---

## [0.6.x] - December 2025

### Added
- Premium theme system with 12 total themes
- Theme-aware AQI and Pollen display cards
- RSS feed aggregation for weather news

### Changed
- Migrated UI components to shadcn/ui
- Updated radar navigation URL from /map to /radar
- Improved theme consistency across all components

### Fixed
- AQI and Pollen card border colors now match selected theme
- Card background colors use theme secondary colors for consistency

---

## [0.5.x] - December 2025

### Added
- User preferences service
- Theme persistence across sessions
- Enhanced theme selector with grid layout

### Changed
- Refactored theme provider architecture
- Improved authentication flow

---

## [0.3.x] - November-December 2025

### Added
- Initial weather dashboard
- OpenWeatherMap API integration
- Supabase authentication
- Basic theme support (Dark, Miami, Tron)
- Cloud types educational content
- Weather extremes tracking
- Interactive games (Snake, Pong, etc.)
- Playwright test suite

### Changed
- Multiple UI iterations
- Performance optimizations
- Security hardening

---

## [0.1.x - 0.2.x] - October-November 2025

### Added
- Initial project setup
- Next.js foundation
- Basic weather search functionality
