# Forecast temperature quality — issue #656

Status: initial slice implemented and validated; included in the combined forecast/advisory PR. Not yet merged or deployed.

## Problem and evidence

The Pleasanton October 9–10 forecast reproduced Open-Meteo Best Match/GFS highs of 98.8°F/94°F while independent NWS guidance gave 87°F/78°F. Explicit NBM guidance gave 88.5°F/79.9°F. App date mapping and units were correct. See the [investigation and timestamped evidence](../research/forecast-quality-model-selection-2026-10.md) and [issue #656](https://github.com/jelrod27/Weather-application-/issues/656).

This justifies a scoped source-selection change. It does not prove that one model is always more accurate; comparison against eventual observations remains future evaluation.

## Small initial change

- Home, city and hourly pages use NBM CONUS for hourly temperature/feels-like and daily temperature/feels-like extrema together.
- Eligibility requires a resolved `US` geocoding country and existing mainland bounds. A bounding box alone would also include parts of Canada and Mexico. Unknown country, international points, Alaska, Hawaii and territories retain Best Match.
- Apply to requests of up to seven forecast days with no past days. Extended and historical requests retain Best Match.
- Keep current conditions and all non-temperature variables on Best Match. NBM lacks UV/pressure and some visibility; this change never replaces those fields or their availability semantics.
- Request the optional NBM data alongside the baseline with a three-second timeout and no retries. Best Match remains required. NBM errors or invalid JSON fall back to the baseline.
- Only use NBM when both hourly and daily temperature groups are complete, finite, in matching units, and have identical timestamp arrays, timezone and UTC offset. Otherwise retain the entire baseline temperature forecast. No per-hour patchwork or daily-only override.
- Preserve the public forecast shape, existing unit conversion, icons, cache policy, and UI layout. Reuse existing geocoding; add no lookup service or package.

Country is forwarded by the shared weather adapter to the same-origin proxy and direct server path. Existing callers without a resolved country retain Best Match, including the separate dashboard summary service. Extending that service requires plumbing its saved-location country explicitly; it is outside this home/city/hourly slice.

## Acceptance and validation

- Deterministic service regression demonstrates the new model's temperatures pass through unchanged, including zero and negative values.
- Tests cover international/border points, unknown country, unsupported US regions, extended/history requests, units, dates, missing data, errors and whole-group fallback.
- Existing adapter, route, units and forecast tests pass; application and test TypeScript projects and lint pass.
- Live local API comparisons at representative points confirm NBM temperature selection and preservation of ancillary fields.
- Browser checks exercise home and city forecasts, hourly navigation and both temperature units.
- Record the actual results here before closeout. Keep #656 open until reviewed and shipped.

No new confidence UI, monitoring platform, automatic provider ranking, NWS adapter, or historic backtesting system is part of this change. It adds one optional upstream request per eligible uncached forecast; ordinary cache behavior remains in place.

## Verification — October 4, 2026

- Regression first: the initial source-selection tests failed with Best Match's 98.8°F/94°F instead of the fixture's NBM 88.5°F/79.9°F. They passed after the implementation.
- 96 tests passed across ten focused Jest suites, including 26 model-selection cases. Application and test TypeScript checks passed. Changed-code ESLint passed without warnings; whole-repo lint passed with existing warnings and six console-output warnings in the retained investigation harness.
- 14 Chromium tests passed: four new home/city + Fahrenheit/Celsius contract journeys, eight first-visit home checks, and two hourly daylight checks. The new tests initially encountered the existing warning-takeover fixture; using the existing dismissal helper resolved the test setup issue.
- Live local API comparisons passed for Pleasanton in both units, Denver and Miami (NBM temperatures), and Toronto and London (Best Match). Checked matching daily dates/highs and complete hourly temperature series against the selected upstream model; current pressure, current UV and daily UV stayed available.
- Live Pleasanton city browser check displayed Friday 89°F / Saturday 80°F and Friday 31°C / Saturday 27°C, with ancillary metrics intact and no browser errors reported. Home initial load also rendered correctly; the standalone manual home weather check had no geolocation permission, so weather-loaded home behavior was covered by the automated browser tests.
- Combined-PR validation: all 280 Jest suites / 2,217 tests passed; the subsequent review fix passed 28 targeted turbulence tests including the new snapshot-boundary regression. Chromium finished with 148 passing tests and two intentional skips across the full run and environment-corrected rerun. Auth fixtures required the existing test-mode flag and CI placeholder Supabase values; no real credentials or auth code changed. Production build, lint (warnings only), Knip and all five Lighthouse runs passed. Firefox was not installed; hosted CI remains the publication gate.

Changed runtime files: `lib/open-meteo.ts`, `lib/weather/open-meteo-temperature-source.ts`, `lib/weather/open-meteo-adapter.ts`, `app/api/open-meteo/forecast/route.ts`. Added/updated source-selection, adapter, route and browser tests, the test TypeScript include list, and this PRD/index. The research summary and comparison script are retained; four unused raw JSON captures (8,737 lines) were removed at the user's request before publication. Tests use self-contained representative fixtures.
