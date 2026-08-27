# Critical and high cleanup — stacked PRs

Engineering plan from the 2026-08-27 thermo-nuclear review. Not a product PRD.

**Goal:** Delete leftover architecture that still looks live, then finish the half-migrations (theme JS helper, `withApiRoute`, pollen self-proxy, fat routes, god modules, city catalogs).

**Ship shape:** stacked PRs. Each PR is mergeable on its own. Later PRs must not reintroduce concepts earlier PRs deleted.

**Out of scope:** mediums (cache `as any`, client 60 vs server 400 rate limits, finishing `swpcSeriesRoute`) unless they fall out of a high. Deleting dead `APP_CONSTANTS` is in PR 0.

**Merge order:**

```
0 leftovers → 1 theme → 2a/2b/2c withApiRoute → 3 pollen → 4a/4b routes → 5a–5e splits → 6 cities
```

PRs 2a–2c can queue while 1 is in review. 5a–5e can queue after 4. Do not start 6 until 0–5 are on main.

---

## PR 0 — Dead leftovers (this branch)

Remove unused `schema-adapter`, `APP_CONSTANTS` / unused `lib/utils.ts` objects, unused weather error parsers, duplicate AQI ladders, and the local WMO map in `weather-forecast.ts`.

**Done when:** targeted unit tests pass, knip is clean on those symbols, no behavior change except canonical WMO Title Case in `processDailyForecastFromOpenMeteo`.

## PR 1 — Delete the JS theme lookup (critical)

Stop ~90 files from importing `useTheme` only to call `getComponentStyles`. Use CSS variables / Tailwind tokens. Keep `useTheme` in ThemeProvider, theme-selector, and premium-gate UI. Move daybreak glow to CSS if it still matters. Do not convert `"use client"` pages in the same PR unless the hook was the only client reason.

## PR 2 — `withApiRoute` on the remaining 38 routes (critical)

Mechanical wrap. Do not extract stargazer/trip-score here.

- **2a** space-weather (including magnetometer/proton-flux)
- **2b** remaining public GETs (alerts, travel, aviation leftovers, radar, earthquakes, gfs, vapid)
- **2c** cron (`rateLimit: false` + existing bearer), webhooks, welcome-email, test-sentry-error

Add a `tiles` rate-limit bucket so radar tiles cannot 429 city search. Keep each route’s existing status/message.

## PR 3 — Server pollen without HTTP

Server path in `open-meteo-adapter.ts` should call the pollen mapper / Google client in lib. Client keeps `/api/weather/pollen`.

## PR 4 — Domain out of fat routes

- **4a** `lib/stargazer/build-payload.ts`; Nominatim only via `lib/geocoding/lookup.ts`
- **4b** trip-score composition into lib; route stays thin

Freeze JSON contracts with fixtures before moving code.

## PR 5 — Split remaining god modules

Same move as stargazer page / radar-shell:

| PR | Split |
|----|--------|
| 5a | `useRadarController` → map engine / overlay loader / URL state |
| 5b | `rssAggregator` → fetch, parse, cache, image enrich |
| 5c | `severe-alert-monitor` → guest vs account + bounded concurrency |
| 5d | `LiveAircraftMap` → map init hook + poll hook + shell |
| 5e | `warnings-client` → `useWarningsDesk` + lane/detail |

## PR 6 — One city catalog (last)

Do not shard `city-metadata.ts` while `city-data` and `city-database` still exist. One slug-keyed catalog; `lib/cities.ts` is the only import path.

---

## Risks

- Theme PR is wide but should be a class-string swap.
- Tile rate-limit bucket is the easy way to starve search if radar lands on the `weather` bucket.
- Stargazer extract can change response shape; freeze the contract first.
- Canonical WMO strings are Title Case (`Clear Sky` not `Clear sky`). Callers that compared exact copy need updating.
