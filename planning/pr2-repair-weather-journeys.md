# PR 2: Repair existing weather journeys

Approved scope: [remediation sequence](weather-ux-remediation-scope.md), based on the [September 25 UX audit](ux-audit-2026-09-25.md#repair-the-paths-that-break-or-confuse). Audience: everyday users first, with depth for enthusiasts.

Baseline: PR 1 merged as `deda7e55124a510e87afb1de6fd964f34b221766` (#627).

Deliver six coherent commits in one PR. After the six commits, run the code-review skill's separate Standards and Spec reviews, address findings, finish validation, and then push/open the PR. Preserve the current visual design.

1. **London lookup and geographic hints.** Normalize UK/GB/full country hints through city routing and geocoding. Preserve US state and ZIP behavior. An explicit country must not silently select another country. Test the advertised London example and other representative inputs.
2. **Hourly location recovery.** Support coordinates, the viewed location, cached reloads, and direct-entry search. Invalid coordinates and unavailable data have recovery actions. Return to the forecast with resolved coordinates when available; discard late responses for a previous location.
3. **Warning navigation.** Severe cards open their warning. Detail and radar carry the selected warning geometry/bounds, link to the actual official NWS alert, and retain desk filters/selection on return. Detail displays the warning area; absent geometry/feed failure must be explicit and recoverable. Return destinations must stay within the intended site paths.
4. **Tropical imagery.** Replace obsolete satellite/SST images with current official NOAA sources, retain the outlooks, show source-file update times separately from image valid/observation times, and provide image failure/timeout/retry and official-source access. Keep the basin consistent.
5. **Airport resolution.** Manual turbulence routes accept IATA and ICAO using the existing US hub catalog shared with weather briefs. Flight lookup may supply other airports. State this coverage; reject unknown/equivalent endpoints rather than invent coordinates. Discard stale responses after route edits and allow retry by submitting again.
6. **Feed recovery.** Distinguish aircraft traffic unavailable from a successful empty feed, identify a working backup feed, show last successful update, offer retry and a usable weather-only view. Clear unavailable traffic markers and ignore obsolete requests after moving/unmounting. Add recovery to severe alerts.

## Verification

Focused regressions for each behavior, both TypeScript projects, lint, complete Jest suite, production build, and browser checks of the touched journeys. Existing provider availability is an external dependency; deterministic browser fixtures test recovery separately from live-source checks. The full Chromium preview suite and Lighthouse checks run in CI; local journey verification targets Chromium.

## Source replacements

NOAA NHC's [satellite page](https://www.nhc.noaa.gov/satellite.php) links the current GOES-19 Atlantic GeoColor still image. Its [SST page](https://www.nhc.noaa.gov/sst/) links the daily Atlantic analysis. Replacement image URLs were checked successfully on September 25, 2026. Source-file modification times describe the file, not a new observation at browser load time; each image includes its own valid/observation time.

## Boundaries

No new paid providers, database migrations, general redesign, precise rain-arrival predictions, or worldwide airport database. A warning missing from the active feed cannot be presented as an active radar overlay; its detail and official source remain the recovery paths.
