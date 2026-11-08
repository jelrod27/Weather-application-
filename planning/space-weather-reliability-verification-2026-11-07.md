# Space Weather reliability fixes — November 7, 2026

Branch: `codex/space-weather-reliability`. Implementation began from local `14e0c90`; only the Space Weather commit was moved onto publication base `a1d2bfb` (`origin/main`) to exclude unrelated local commits. Both sides' test-project inclusions were preserved when resolving the configuration conflict.
Scope: the three reliability fixes requested after the Space Weather review. Validation below was recorded before publication. No production deployment or production configuration change was performed.

## Behavior

- The overall terminal status shows loading, unavailable, or partial data instead of inferring quiet from missing Kp/scales. Observed activity/storms remain visible when another condition feed is missing. Quiet requires valid Kp and all three NOAA scales. A total dashboard API failure displays its error banner, including after a previously successful refresh. Missing/malformed upstream scale fields no longer become successful zero observations.
- The plasma route selects the newest active wind source (one newest source if none is active), excludes invalid/out-of-window UTC observations, deduplicates and sorts them, and joins magnetic data only from the same spacecraft at the same instant. Missing matching magnetic data remains null. The response identifies its spacecraft. Charts also sort by observation time before choosing their current value.
- The flare route uses NASA's documented public `https://ccmc.gsfc.nasa.gov/DONKI-API/get/FLR` endpoint rather than the failing API gateway. It requires no NASA API key, validates the catalog, uses UTC date boundaries, bounds transport to two four-second attempts with at most 500 ms backoff, and returns unavailable at HTTP 502 for upstream/format failures. The client aborts after twelve seconds, reports failure, supports retry, and preserves previously loaded events with a warning if refresh fails. An empty catalog is described as no cataloged events rather than no solar activity.

NASA evidence: [migration announcement](https://ccmc.gsfc.nasa.gov/news/major-updates/). Read-only Sentry search found [upstream HTTP 503](https://justin-elrod.sentry.io/issues/16BIT-WEATHER-WEB-S) and [timeouts](https://justin-elrod.sentry.io/issues/16BIT-WEATHER-WEB-G) in the old flare route. The new public endpoint returned four cataloged events without credentials; a known empty date range returned `[]`.

## Files changed

Runtime/configuration:

- `.env.example` — clarify the flare catalog does not need a gateway key.
- `app/api/space-weather/flares/route.ts` — migrated endpoint, bounded transport, validation, unavailable response.
- `app/api/space-weather/plasma/route.ts` — bounded UTC series and same-spacecraft magnetic join.
- `app/api/space-weather/scales/route.ts` — reject absent/malformed scales.
- `app/space-weather/space-weather-client.tsx` — surface total feed failure.
- `components/space-weather/SolarCommandTerminal.tsx` — truthful overall availability status.
- `components/space-weather/SolarFlareTimeline.tsx` — timeout, recovery, cleanup and retained events.
- `components/space-weather/SpaceWeatherCharts.tsx` — order observations before displaying current.
- `lib/services/swpc-solar-wind.ts` — shared active-source series selection and deduplication.

Regression coverage:

- `__tests__/space-weather-status.test.tsx` — loading, unavailable, partial, valid quiet, storm during partial outage, all-API failure and failed refresh.
- `__tests__/space-weather/plasma-route.test.ts` — reversed order, active source, source-isolated magnetic join, UTC equivalence/deduplication, fallback source, future/invalid/nonfinite observations.
- `__tests__/space-weather/flares-route.test.ts` — current keyless endpoint, parsed event/CME linkage, 429/503, timeout, malformed payload and empty catalog.
- `__tests__/space-weather/scales-route.test.ts` — missing and invalid scales.
- `__tests__/solar-flare-timeline.test.tsx` — errors, malformed response, stalled request/retry, retained events after refresh failure.
- `__tests__/space-weather-charts.test.tsx` — newest reading from reversed input.
- `tests/e2e/space-weather.spec.ts` — unavailable dashboard, newest chart reading, flare retry, existing shell smoke. Tests wait for hydration before tab interactions.
- `tsconfig.tests.json` — type-check the added/touched regressions.

This verification note is the only additional documentation file created during implementation. Existing untracked review and Sentry notes were preserved.

## Validation

| Check | Result |
|---|---|
| Initial regressions against old behavior | Failed for the intended missing-status, ordering/source, gateway and client-recovery behaviors before each corresponding fix |
| Targeted Jest | 193 tests passed across 20 suites |
| Full Jest, `npm test -- --runInBand` | 2,574 tests passed across 307 suites |
| Full Jest on publication base, `TMPDIR=/private/tmp npm test -- --runInBand` | 2,666 tests passed across 315 suites |
| `npm run typecheck` | Passed |
| `npm run typecheck:tests` | Passed |
| `npm run lint` | Passed; 0 errors, 89 existing warnings, none in changed files |
| `npm run build` | Passed |
| `npm run knip` on publication base | Passed; configuration hints only |
| Targeted Playwright against local production build | 8 passed: all four scenarios in Chromium and Firefox |
| `git diff --check` | Passed |
| Independent code/React review | No substantive findings |

Live local production-build checks returned HTTP 200 from the new flare route with four events (~0.5 seconds) and HTTP 200 from plasma with 117 unique chronological SOLAR1 observations. Those are point-in-time checks, not an uptime guarantee. Missing magnetic samples were correctly null.

The first E2E run identified ambiguous selection of Next's route-announcer alert and clicks before hydration; the selectors/readiness checks were corrected, then all eight scenarios passed. Adding all existing Space Weather tests to the type-check project initially exposed an older assertion in `series-route.test.ts`; the inclusion was narrowed to the changed/new regressions, and the required test type check passed without changing that unrelated test.

After moving the commit onto publication base `a1d2bfb`, build, both type projects, lint, Knip, and all eight Chromium/Firefox scenarios passed again. The default macOS temporary directory aliases `/var` to `/private/var`; four existing `newsletter/publication.test.ts` merge-to-publish cases fail their path-containment check under that alias. With canonical `TMPDIR=/private/tmp`, all 29 newsletter publication tests and then the full 2,666-test suite passed. No newsletter code or tests were changed to work around this platform issue.

## Limits and follow-ups

- Full application-wide Playwright and Lighthouse were not rerun: verification used both browsers for the affected feature, the full unit suite, both type projects, lint and production build. Visual styling was not changed.
- Third-party outages remain possible. The new endpoint and bounded failure/retry states address the observed gateway failures; no claim of permanent upstream availability is made.
- Same-instant, same-source magnetic joins intentionally leave gaps when telemetry does not align; they do not borrow another instrument's values.
- Build output included existing Next.js deprecation/config warnings and the upstream RTSW payloads exceeding Next's two-megabyte data-cache limit. This change does not introduce a new caching system.
- The other review findings (sunspot labeling, alert classification, imagery contracts, broader freshness/range coverage, and navigation) remain outside this requested scope.
