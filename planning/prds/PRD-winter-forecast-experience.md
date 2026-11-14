# Full Winter forecasting experience

Status: **Active — approved**, November 14, 2026. The user explicitly approved the fuller Winter experience described in this chat, authorized multiple agents and commits, and requested implementation. No push, PR, or deployment is authorized by that instruction.

Implemented locally in `9639223` and `53697aa`; publication is pending. See [verification and before/after Lighthouse results](../winter-forecast-verification-2026-11-14.md).

## Intent and scope

Make `/winter` a trustworthy forecasting destination for the contiguous United States. Visitors should understand where significant snow or icing is forecast, when it applies, what local conditions are expected, and how certain the information is. Keep the retro identity, accessible controls, and mobile usability. Strong presentation does not establish forecast superiority over AccuWeather, Weather.com, or human storm coverage.

The user chose CONUS first and map/local forecasting over notification expansion. The implementation follows the proposed official-source approach: NWS local forecasts and WPC national outlooks. A commercial-provider integration could add products but introduces unapproved contracts/costs; a raw model/GRIB pipeline adds substantial processing and would not establish better accuracy. Those alternatives are not needed for this release.

## Experience

1. Server-rendered heading, source/coverage explanation and education; client forecast workspace.
2. National map: snowfall probability thresholds 4/8/12 inches, significant icing probability, WSSI overall impact categories, Days 1–3, exact source issue/valid times, legends, textual outlook summary, source links, accessible zoom/reset controls and responsive fixed map space.
3. City/ZIP search without an account; selection focuses the map and loads official local forecasts. Preserve a selected place in a shareable URL. Clearly reject locations outside supported CONUS/NWS coverage.
4. Local summary, source-written forecast discussion periods, hourly conditions with precipitation likelihood/temperature/wind, and separate snow/ice accumulation blocks. Preserve published interval boundaries. Expected accumulations, probabilities and impact categories remain distinct. Show unknown data as unknown and partial coverage as partial. Do not fabricate percentile ranges or snow start/end times from six-hour accumulation blocks.
5. Official winter watches/warnings/advisories as supporting context, scoped to a selected place where available, with links to the warning desk. Initial API failure must never say there are no alerts; failed refresh must label retained data stale.
6. Source/uncertainty guidance that explains probabilities versus accumulation versus snow depth, forecast changes and mountain/local variation. Clear links to official forecasts and radar. Accurate SEO/FAQ content matching shipped behavior.

## Accuracy and reliability rules

- Official NWS/WPC sources; source attribution and original issuance/valid timestamps alongside acquisition time.
- National contours represent regional forecast categories, not precise street-level forecasts. Render nested probability contours low-to-high without adding categories or percentages.
- Fetch contour geometry and attributes together; reject mixed cycles, invalid times, unknown categories, truncated upstream responses and oversized payloads. Do not substitute an older cycle under new labels.
- Simplify regional geometry for display with documented resolution; local forecasts come from NWS point/grid data rather than polygon interpolation.
- Each source has bounded timeouts and cache intervals; retries and refresh are bounded. Distinguish loading, unknown, partial, expired and unavailable states. Browser updates must ignore obsolete responses after changing location/layer.
- NWS snow/ice intervals are amounts, not hourly rates. Convert source units explicitly. Preserve null and uncovered time. Never prorate an in-progress accumulation block into remaining snowfall or add overlapping intervals twice.
- Stale national overlays are hidden after validity ends or issuance exceeds the product freshness ceiling (WSSI 6 hours, probability 30 hours). Local grid source older than 18 hours is labelled stale; expired periods are not shown as future.
- A successful empty polygon response without verifiable cycle validity is not proof of no winter hazard.
- No snowfall percentile range unless a source explicitly provides it. Forecaster-written ranges may be displayed as source text.

## Boundaries

No notification subscriptions expansion; no promises about passable roads/school closures; no affiliation or accuracy-parity claim; no new paid data contracts. Snow-on-ground remains deferred because the tested official raster was blank. Forecast accuracy verification over real storms is ongoing work; this release validates source fidelity and records reproducible source checks, without claiming observational skill it has not measured.

## Architecture and ownership

Use existing Next.js App Router, React, TypeScript, OpenLayers, geocoding API, timeout/cache/rate-limit helpers. No new dependencies. All forecast JSON goes through same-origin APIs; no CSP broadening. Shared map contract: `lib/winter/types.ts`; local contract: `lib/winter/local-types.ts`. Winter uses the key-free USGS Topo reference basemap with visible National Geospatial Program attribution: local visual checks showed that the optional CARTO key was absent and its watermark hid geographic context. USGS documents its National Map services as public domain; source [service metadata](https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer), [terms](https://www.usgs.gov/faqs/what-are-terms-uselicensing-map-services-and-data-national-map).

- National data: `lib/winter/outlooks.ts`, `/api/winter/outlook`, unit/route tests.
- Local data: `lib/winter/local-*.ts`, `/api/winter/forecast`, interval/unit/route tests.
- Map: `components/winter/winter-map.tsx`, rendering helpers and behavior tests.
- Workspace: client data hooks, search, local panels, warnings, metadata/SEO and E2E tests.

## Acceptance and validation

Demonstrate snow, ice, quiet, partial, unknown, out-of-coverage and upstream-failure cases using deterministic tests. Validate representative live NWS and WPC payloads and geometry. Run production type checks, Jest, lint, build, scoped Chromium/Firefox E2E and desktop/mobile Lighthouse; inspect actual desktop/mobile UI and keyboard controls. Retain honest before/after performance results. Independent review before commits, including weather semantics, stale state, requests races, SSRF/input validation and accessibility. Preserve all unrelated work.

Research: [national source feasibility](../research/winter-map-source-feasibility-2026-11.md), [usage and initial defects](../research/winter-weather-product-investigation-2026-11.md), and local source validation in `planning/research/`.
