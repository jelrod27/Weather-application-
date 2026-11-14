# Winter Forecast Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved full CONUS Winter forecasting page with trustworthy regional outlooks and local forecast detail.

**Architecture:** Same-origin NWS/WPC adapters normalize source data and expose separate local and national APIs. An accessible client workspace composes an OpenLayers map, local forecast panels and official winter warnings; server-rendered education preserves crawlable content. Independent owners work on local data, national/map data and page integration against explicit contracts.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, existing OpenLayers/Jest/Playwright/Lighthouse; npm only.

**Spec:** `planning/prds/PRD-winter-forecast-experience.md`, approved by the user's explicit go-ahead November 14, 2026.

## Global Constraints

- CONUS first, source-backed coverage, no invented probabilities/percentiles/hourly snow rates.
- No new dependencies, paid services, notification expansion or CSP broadening.
- Preserve unknown versus zero; source validity and stale states; no expired overlays.
- Read installed Next docs before code. Review before commits; no push/PR/deployment without authorization.

## Review Focus

- Mixed/expired source cycles must never appear under a new valid-period label.
- Six-hour, overlapping, in-progress and null snow/ice intervals must not inflate totals or fabricate timing.
- Delayed results after place or layer changes must not replace current selections.
- Missing upstream data must not appear as no winter hazard or no snowfall.
- Outside-U.S./unsupported points and map boundaries must not imply local forecast coverage.

### Task 1: National outlook adapter and map contract

**Files:** `lib/winter/types.ts`, `lib/winter/outlooks.ts`, `app/api/winter/outlook/route.ts`, `__tests__/winter-outlooks.test.ts`, `__tests__/winter-outlook-route.test.ts`.

**Interfaces:** `WinterMapSelection` to `fetchWinterOutlook(selection): Promise<WinterMapSnapshot>`; GeoJSON polygon properties include category/label/color/rank. Day 1–3; snow thresholds 4/8/12; ice ≥0.25 inch; WSSI overall.

- [ ] Write tests for units/categories/validity, empty/mixed cycle/truncated payloads and invalid route selections; run failing tests.
- [ ] Implement one source query per snapshot with bounded geometry and explicit freshness rules; same-origin route uses existing rate limiting and cache headers.
- [ ] Run targeted tests and type checks; review and commit with map after integration.

### Task 2: Local NWS forecast adapter

**Files:** `lib/winter/local-types.ts`, `lib/winter/local-*.ts`, `app/api/winter/forecast/route.ts`, local unit/route tests and source-validation note.

**Interfaces:** location coordinates to normalized local forecast; explicit published accumulation periods and completeness, source forecast periods and hourly conditions. Owner publishes exact contract before UI implementation consumes it.

- [ ] Pin null, mm conversion, interval overlap, partial horizon, in-progress block and unsupported coordinate behavior in failing tests.
- [ ] Implement allowlisted NWS points/gridpoint/hourly/forecast acquisition with timeouts, validation and original timestamps.
- [ ] Run targeted tests; independently review and commit with page consumers after integration.

### Task 3: OpenLayers winter map

**Files:** `components/winter/winter-map.tsx`, optional pure map helpers/tests.

**Interfaces:** `WinterMapProps { snapshot: WinterMapSnapshot | null; place: WinterPlace | null }`; workspace owns controls and source acquisition. Render only available current contours; clear old layers on change/failure; use national bounds and selected-place marker. Keep accessible controls and text alternative outside canvas.

- [ ] Implement lazily loaded map using shared CARTO source and EPSG4326→3857 GeoJSON conversion, sorted contour ranks, cleanup and ResizeObserver.
- [ ] Verify layer replacement, empty/error handling and selected-place focus in scoped browser tests; run lint/type checks.
- [ ] Independent review with national adapter before commit.

### Task 4: Full forecast workspace and education

**Files:** `app/winter/page.tsx`, `app/winter/layout.tsx`, `components/winter/*`, `hooks/use-winter-*.ts`, associated unit/E2E tests.

- [ ] Build accessible layer/day/threshold controls, exact valid-time labels, search/shareable place, local accumulation panels, hourly/detail forecast, warnings and source explanations.
- [ ] Test initial failure versus empty alerts, failed refresh, source/location race, invalid URLs, search results and out-of-coverage; update SEO tests to match actual page claims.
- [ ] Review responsive desktop/mobile, keyboard operation and no-data states in a real production build.

### Task 5: Verification and reviewed commits

**Files:** `planning/winter-forecast-verification-2026-11-14.md`, plan progress and required fixes.

- [ ] Record baseline Lighthouse for existing Winter page before replacing built output.
- [ ] Run targeted checks then full type projects/Jest/lint/build and scoped Chromium/Firefox E2E.
- [ ] Run desktop/mobile Lighthouse on the finished page and inspect results; verify source behavior without live upstream reliance in CI fixtures.
- [ ] Independent whole-branch review, resolve findings and rerun relevant checks.
- [ ] Commit reviewed coherent milestones with hooks; report commits, results and material remaining limitations. No push/PR/deploy.
