# Winter forecasting verification — November 14, 2026

Implementation complete locally on `codex/winter-forecast-experience`. Publication is pending; no push, PR, merge or deployment was requested or performed.

## Delivered

- National WPC maps for snowfall probabilities exceeding 4/8/12 inches, ice probabilities exceeding 0.25 inches, and WSSI overall winter impacts, with Day 1–3 selection. Every map carries its original source issue time, exact validity window, acquisition time, source link and categorical legend.
- Key-free USGS Topo geographic reference map, visible attribution, selected-location marker, keyboard and touch controls, and a text alternative. Source contours are simplified approximately 0.5 km for display; they are regional guidance, not street-level probability estimates.
- Account-free city/ZIP search, shared location links and a local 72-hour NWS forecast. Expected snow/ice amounts preserve complete published source blocks, explicit unknowns, ongoing intervals, and partial coverage. Known-period totals exclude ongoing, overlapping and boundary-crossing blocks. The original NWS narrative supplies any source-written ranges; percentile ranges are not invented.
- Hourly temperature, wind, precipitation likelihood and condition text, local timezone, and the verified NWS point reference. Accumulation-period inspectors and hourly tables expand on request so mobile users can reach the summary and narrative.
- Official winter alerts support the forecast. The national list is collapsed; local alerts are expanded. An initial upstream failure cannot become an all-clear. Failed refreshes, expired source windows, invalid geometry, unsupported locations and unknown accumulation have distinct handling.
- Server-rendered education, consistent FAQ structured data, accurate metadata and source/coverage explanations.

Main production files: `app/winter/{page,layout}.tsx`, `app/api/winter/{outlook,forecast}/route.ts`, `lib/winter/`, `components/winter/`, and `hooks/use-winter-{place,resource}.ts`. Tests live in twelve Winter Jest suites, `tests/e2e/winter.spec.ts`, and `tests/fixtures/winter.ts`; the test TypeScript project includes them.

## Commits and review

- `9639223` — validated NOAA outlook adapter, map contract/renderer, source research and approved scope.
- `53697aa` — full local forecast adapter, client workspace, search, disclosures, error states, SEO and integrated tests; includes final visual/accessibility fixes.

An architecture agent mapped existing patterns; separate workers owned local data, map rendering and workspace integration. Independent foundation, local and whole-branch reviewers returned **SHIP**, including rechecks of the final deltas. A foundation review identified cache hits that could outlive issuance freshness; a regression test reproduced it, and both server responses and CDN lifetime now stop at the earliest source boundary. Reviews did not identify remaining P1/P2 findings.

The final documentation commit records this evidence; it does not change the validated production code.

## Checks

| Check | Result |
| --- | --- |
| `npm run build` | Passed; `/winter` remains statically rendered with client forecasting/map interaction. |
| `npm run typecheck` | Passed. |
| `npm run typecheck:tests` | Passed. |
| `TMPDIR=/private/tmp npm test -- --runInBand` | **338 suites, 2,966 tests passed.** |
| Targeted Winter Jest rerun after final UI changes | **12 suites, 126 tests passed.** |
| `npm run lint` | Passed, zero errors; 87 existing warnings. Final changed-file lint also passed without warnings. |
| `npm run knip` | Passed; existing configuration hints only. No dependencies added. |
| Chromium and Firefox Winter E2E | **18 tests passed** against the final production build. |
| Clear Sky, Nord and Daybreak browser axe checks | No color-contrast or visible-label/accessibility-name violations; no page overflow. |
| Manual production-browser checks | Actual national geography/contours, mobile Truckee forecast, source timestamps, disclosures, keyboard controls, source links and responsive layout inspected. No page errors in sampled flows. |
| Git whitespace and pre-commit gitleaks hooks | Passed; hooks were not bypassed. |

The default Mac temporary directory uses a symlinked `/var` path. Four existing newsletter publication tests fail because their child processes resolve a physical `/private/var` working directory. The identical four failures were reproduced on a separate clean tracked snapshot of `main` before changing anything in that subsystem. Running Jest with the canonical `TMPDIR=/private/tmp` passes the entire suite. No newsletter code or tests were modified.

The full all-page E2E suite and aggregate `validate:pr` command were not run: validation used the complete unit suite plus production build, both type projects, lint, dependency analysis, and the affected Winter flows in both browsers. Lighthouse was run directly against `/winter` on desktop and mobile, rather than the aggregate command's homepage target. No deployment was available for field performance validation.

## Before and after Lighthouse

Three runs per device and phase, medians shown. Baseline: `3f90b9b`; final production code: `53697aa`. The local production server used the default Clear Sky theme and real upstream requests. Desktop uses Lighthouse's desktop preset; mobile uses its default throttling. These are lab measurements, not real-user Core Web Vitals.

| Metric | Desktop before | Desktop after | Mobile before | Mobile after |
| --- | ---: | ---: | ---: | ---: |
| Performance | 82 | **100** | 68 | **89** |
| Accessibility | 96 | **100** | 96 | **100** |
| Best practices | 96 | 96 | 96 | 96 |
| SEO | 100 | 100 | 100 | 100 |
| Largest contentful paint | 0.711 s | 0.700 s | 3.659 s | 3.757 s |
| Cumulative layout shift | 0.359 | 0.004 | 0.566 | 0.000 |

Mobile LCP is about 0.10 seconds slower in these samples. The performance-score gain primarily reflects much better layout stability; this is not evidence that every loading metric improved. The production map is lazily bundled and map/status spaces are reserved.

The accessibility pass corrected insufficient selected-button/search contrast and aligned the map reset button's accessible name with its visible label. Lab scores do not replace keyboard and screen-reader testing. [Per-run results and precise medians](./winter-lighthouse-results-2026-11-14.json).

## Live source evidence

API checks at **2026-11-14 17:47 UTC** against the local production routes:

| Request | Result |
| --- | --- |
| Day 1 snowfall >4 inches | Available, 14 contours; issued 08:26:53Z, valid 12Z Nov 14–12Z Nov 15. |
| Day 1 icing >0.25 inches | Available, one below-10% source contour; never represented as zero risk. |
| Day 1 WSSI | Available, five impact features; issued 15:16Z, valid 15Z Nov 14–12Z Nov 15. |
| Day 2 snowfall >8 inches | Available, eight contours; valid 12Z Nov 15–12Z Nov 16. |
| Day 3 snowfall >12 inches | Available, one contour; valid 12Z Nov 16–12Z Nov 17. |
| Day 3 icing / WSSI | Both available; one icing contour / two impact features with valid source metadata. |
| Denver NWS point | Partial 72-hour accumulation coverage honestly labelled; known-period snow/ice totals zero, 73 intersecting hourly source periods, seven narrative periods. Grid updated 11:13:05Z. |
| Truckee NWS point | Partial coverage; **0.90 inches** across eleven fully future snow blocks, 73 intersecting hourly periods and seven narratives. Grid updated 11:30:53Z; actual America/Los_Angeles timezone retained. |
| Anchorage | Explicit `outside_coverage`, unknown amounts, no local forecast rows. |

An ongoing hourly period plus future periods can intersect a 72-hour window in 73 rows. These retain their actual boundaries; the display does not claim 73 complete future hours. Likewise, partial accumulation totals are not whole-storm totals. Nonzero ice, overlap, null, unsupported units, endpoint failure and stale data are covered by deterministic tests; the sampled live local forecasts did not include nonzero icing.

Source checks establish acquisition and interpretation fidelity, not measured meteorological forecast skill. Comparing future issued forecasts with verified observations across real storms remains necessary before any comparative accuracy claim.

## Operational limits and follow-ups

- Coverage is contiguous U.S. supported NWS points; overseas, Alaska, Hawaii and Canadian forecasts are not silently substituted.
- Snow-on-ground analysis remains deferred because the evaluated source raster was transparent. Current radar, snowfall forecasts and snow depth are distinct products.
- WPC contours and NWS fields may be unavailable, partial or stale. Layers older than their validity/freshness boundaries are hidden; source acquisition and local browser refresh have bounded timeouts/caches.
- Local forecast-source freshness uses an 18-hour ceiling; WSSI six hours and probability outlooks thirty hours. Those are application display limits, not guarantees of update delivery.
- USGS reference tiles and NOAA/NWS forecasts are external dependencies without an application-controlled availability guarantee. Maps have visible geographic/source attribution and no paid provider or new key requirement.
- Existing tornado/thunderstorm/flash-flood notifications were not expanded. This work does not introduce winter subscriptions or road/school-closure predictions.

Raw Lighthouse reports, browser screenshots, source probes and validation logs remain at `/private/tmp/winter-forecast/`. The production preview runs locally on port 3107 for review.
