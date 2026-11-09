# Space Weather accuracy verification — 2026-11-08

## Observation and message corrections

The prior implementation accepted monthly sunspot `ssn` values as a “Daily Sunspot Number”, read nonexistent `f107_obs`/`f107` fields, calculated a trailing arithmetic mean and called it NOAA's 13-month smoothed value, and inferred a cycle phase/progress from an assumed 11-year cycle. It also accepted `-1` missing sentinels as observations. The route now returns finite, nonnegative `ssn`, `f10.7`, and provider `smoothed_ssn` values; current monthly observations and smoothing each retain their own observation month. The display says monthly, preserves decimal precision and zero values, and removes the unsupported cycle phase/progress. An unavailable feed returns null and an error status; its cards do not manufacture quiet zeroes.

Primary evidence checked on November 8:

- [NOAA observed solar-cycle indices](https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json): monthly `time-tag`, `ssn`, `f10.7`, `smoothed_ssn`; recent smoothing is `-1` while monthly observations exist. The fetched feed ended with October 2026 (`ssn: 45.7`, `f10.7: 108.47`) and had an April 2026 smoothed value (`88.6`), establishing why those two dates must not be conflated.
- [NOAA alert products](https://services.swpc.noaa.gov/products/alerts.json): actual `product_id: K05A` carries `Space Weather Message Code: ALTK05` and an `ALERT:` headline. The route now classifies dedicated ALT/WAR/WAT message codes and anchored headlines; unknown messages remain neutral. Severity uses explicit NOAA Scale declarations rather than incidental references to extreme impacts or G5 in explanatory text. Messages remain labeled recent messages, not guaranteed active alerts.
- [NOAA scales](https://services.swpc.noaa.gov/products/noaa-scales.json): index `0` contains current `DateStamp`, `TimeStamp`, and R/S/G observations; positive indices are forecast products and are not used as current measurements.

## Availability policy

The thresholds below are conservative application policies, not asserted NOAA service guarantees. All current boundaries reject missing/invalid observation dates and future observations. The request completion timestamp never substitutes for the measurement date.

| Current product | Maximum accepted age | Rationale |
| --- | --- | --- |
| GOES long-band X-ray | 15 minutes | Minute-cadence feed; allow delivery/cache delay |
| RTSW wind | 15 minutes | Minute-cadence feed; allow delivery/cache delay |
| Planetary Kp | 6 hours | Three-hour blocks plus one delivery interval |
| NOAA current scales | 1 hour | Current operational status, with cache/delivery margin |
| Sunspot monthly mean | Explicit observation month | Historical monthly product, never a current daily count |

The API and server-rendered Kp/flare/wind loaders apply these policies. Historical X-ray/Kp parsers remain usable for dated historical evidence. Headline Kp uses strict dated observations and ignores future rows before choosing its newest sample. The forecast deduplicates observation instants and bounds accepted rows to the coming day (including an in-progress three-hour block); the UI reports the number of available blocks rather than claiming sparse blocks form a continuous N-hour forecast.

RTSW current and recent magnetic observations join the wind spacecraft at the same UTC instant. Equivalent UTC tag formats still match. Missing density, temperature, or magnetic values remain null, with finite-number validation. Existing active-source wind selection, chronology, partial availability, and the plasma route's same-source/same-instant joins remain intact.

## Charts and navigation

The 7D control now explicitly describes a display limit rather than claiming seven days of data. Each nonempty chart reports its actual UTC observation window; individual unavailable series remain unavailable. Future/nonfinite points are excluded, missing values are not connected, and mounted charts refresh every minute. Request generations keep old range responses from replacing newer data. The fixed “72min from DSCOVR” caption now explains that L1 propagation depends on wind speed; the merged RTSW source is not assumed to be DSCOVR.

SPACE and Weather navigation remain active on descendant paths using a slash boundary, excluding neighboring prefixes. The five space-weather tabs use one tab stop and support ArrowLeft/ArrowRight (wrapping), Home, and End with focus and selection moving together.

## Regression evidence and checks

The first targeted run reproduced 23 intended failures before fixes: provider field/period/smoothing errors, absent-data defaults, actual alert classification, future/stale/malformed current products, a spacecraft mismatch, duplicate/distant outlook rows, descendant navigation, and keyboard tabs. Subsequent regressions first demonstrated future chart values, lack of mounted refresh, fabricated compact current observations, stale SSR/aurora values, and misleading sparse-outlook coverage, then passed after their fixes.

Jest covers mocked provider contracts with frozen current clocks, missing observations, genuine quiet zeroes, X-ray sort order and peak band, dated Kp selection, RTSW source/time joins, UI coverage and refresh, and keyboard navigation. The existing flare timeline retry and plasma regressions remain in the affected suite. Existing historical X-ray/Kp fixture tests remain valid without forcing the historical parser clock to the present.

Independent review requested explicit same-source/different-instant join regressions. Five frozen-clock cases now check both current and recent output: one-minute offsets remain null, and three equivalent UTC timestamp forms join. Temporarily restoring the old fifteen-minute tolerance failed both negative cases; restoring strict equality passed the targeted suite.

Locally verified during implementation: affected Jest suites, both TypeScript projects, and scoped ESLint. New Playwright regressions cover keyboard tab navigation, monthly sunspot dates/smoothing, and future chart exclusion/actual coverage. The parent integration run records full-suite/build/browser results; those are not claimed here before that run completes.

Imagery route/viewer verification is documented by the parallel imagery implementer and integrated review; the same commit includes those corrections. Full release-gate results belong in the PR and overall verification note.

## Limitations

These changes do not create a seven-day provider archive or infer missing observations. Monthly sunspot and smoothed dates may legitimately lag. A stale minute feed becomes unavailable under the documented policy even when it still returns HTTP 200. NOAA current scales do not establish alert expiry, and recent messages remain separate from current scale status. External source outages remain visible errors with existing recovery controls.
