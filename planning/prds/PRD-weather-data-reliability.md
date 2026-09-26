# Weather data reliability and consistency

Date: September 26, 2026. Status: authorized for implementation in one PR.
Branch: `codex/weather-data-reliability`.
Base: `9268e34c9ccf2c492a588b5b0b20d2538c73c976` (merged PR633).

## Goal and authority

Implement priorities 1 and 2 from [the repeat UX audit](../ux-audit-2026-09-26.md): reliable saved-location weather, radar frame freshness, honest travel corridor summaries, and location-aware forecast Moon information. The user explicitly authorized full scoping followed by implementation without another approval, multiple focused commits in one PR, testing, and the local code-review skill before pushing.

Everyday users should be able to tell whether data is loading, current, older, unavailable, or about a different place/time. A provider failure must never become a fabricated zero, a false all-clear, or a mismatched city's weather.

## Diagnosis and limits

- Production logs for September 26 22:46–22:47 UTC confirm four dashboard HTTP500 responses (two initial, two retries), two successful responses, and the existing “expected upstream failure” message. The logger suppresses the upstream code. An exact 429/5xx/timeout diagnosis is unavailable from that historical evidence; no claim that Supabase or a particular upstream status caused it.
- Dashboard cards overwrite last good weather with null, have no basic-request cancellation/identity guard, initially fetch default units before preferences resolve, and provide no fetch timestamp. SavedLocationsPanel displays its empty state while loading.
- Radar's age helper returns LATEST early for the newest frame. The controller does not independently advance the paused frame's age.
- Corridor API averages all sampled scores but labels the row using that average and describes the worst sampled hazard. The top-five list counts every row as flagged, including clear samples, and empty can mean missing data.
- The forecast Moon utility uses a lunar-age approximation with no coordinates or viewing timezone. Stargazer already has location-aware astronomy-engine calculations.

## Scope and acceptance

### A. Dashboard transport and current weather

1. Reuse the existing bounded TTL-cache and fetch/timeout infrastructure. Cache successful dashboard forecast results by coordinates, temperature/wind units and detail horizon, coalesce duplicate in-flight requests, and avoid multiplying upstream retries.
2. Fresh server cache: 5 minutes. Maximum fallback age: 30 minutes from the original successful fetch. Maximum entries: 100. Memory caching is best-effort per server instance, not a durable availability guarantee.
3. Explicit refresh bypasses a fresh cached result; on provider failure a still-eligible older value may be returned with its original timestamp and an explicit stale flag. Failed loads never renew the fallback deadline. Errors/stale fallback must not be publicly cached as fresh.
4. Return bounded, useful errors for upstream failures. Log failure class and HTTP status when known, with no coordinates, user identifiers, provider response bodies or secrets. Existing rate limits/auth protections stay intact.
5. Reject unusable current-condition payloads; optional missing metrics remain unavailable, not zero/default pressure. Record fetched time separately from provider sample time.

### B. Dashboard rendering and retry

1. Distinguish loading, empty saved list, saved-list failure, first weather failure, refreshing and failed refresh with last successful weather.
2. A failed refresh retains only weather for the same place and units, visibly marked older with its original timestamp; data older than the fallback limit is not presented as usable current weather.
3. Coordinate/unit changes and unmount cancel obsolete requests. Late responses may not overwrite the current card or incorrectly clear its loading state.
4. Resolve account preferences before the initial weather request. Render wind/visibility/temperature from the actual response units, including the existing independent wind preference.
5. Retry must make a new attempt and recover. Existing favorite/delete/add/profile workflows remain unchanged. No production account mutations during verification.
6. Optional detail/AQI failure must not fabricate “AQI 0 / Good.” Keep useful weather details when only AQI fails.

### C. Radar age

Every valid selected frame, including the newest, shows elapsed age alongside its timestamp. Preserve the separate Latest control/state. Advance age while paused at least once per minute; retain historical playback and navigation behavior. Invalid timestamps show unavailable age. Small future clock skew must not produce a negative age.

### D. Forecast Moon consistency

Use the same location-aware observing-night calculations as Stargazer. Calculate on the server; do not add astronomy-engine to the main forecast's eagerly loaded browser code. Carry coordinates and IANA timezone through the calculation and format explicit date/zone for Moon events. Label the card's observing-night scope so phase/event timing is not confused with a current observation. A night with no moonset must say so; unavailable calculation must not fall back to the old invented time. The main weather forecast must remain available if optional Moon enrichment fails.

No new external astronomy provider or dependency. Preserve Stargazer's established dark-window/phase definitions and provider-to-epoch conversion. Reuse `calculateDarkWindow` and `calculateMoonInfo`, rather than write another ephemeris.

### E. Travel severity and coverage

1. Keep the numeric route-average score separately labeled. Identify the worst sampled point, its hazard/score and sample time. Rank highlighted corridors by their worst sampled conditions rather than dilute them through a long route.
2. A specific local hazard must not coexist with an overall CLEAR/all-clear assertion. Use a conservative advisory label for identified hazards even when the numeric composite falls below its generic caution threshold. Do not describe a low score as a safety guarantee.
3. Missing/partial waypoint data remains unavailable/partial; do not fill missing points with clear defaults or treat absent corridors as all-clear.
4. Use existing named place metadata where available, with an honest coordinate/sample-point fallback if it is not. No paid geocoder, invented town names, route geometry correction or routing service.
5. Show whether the board describes current samples or a future-day midday snapshot, with source time/refresh context. Preserve the unified Fly/Drive/day controls and existing trip-scoring meaning. No departure recommendation or travel-time progression.
6. Keep map, list and legend terminology consistent. Failed/all-clear/partially sampled states must differ.

## Exclusions

Education discovery, auth headings, editorial cleanup, new feeds, full accessibility remediation, all-theme redesign, account settings changes, database migrations, external notification changes, CI-provider migration, aircraft-feed repair and unrelated cleanup are excluded. The audit artifacts are included as the originating evidence.

## Delivery and review

One PR with focused commits: (1) audit/spec/plan; (2) dashboard service; (3) dashboard UI; (4) radar age; (5) Moon consistency; (6) travel summaries; (7) cross-flow verification and closeout if needed. Tests belong beside each behavior change; the final commit must not hide implementation fixes.

Use normal hooks. Do not force-push, merge or bypass tests. Before pushing, run local code-review Standards and Spec agents independently against the fixed base and this document, repair verified findings, then rerun affected validation. The missing optional `docs/agents/issue-tracker.md` does not block use of this saved spec; `/setup-matt-pocock-skills` can configure issue-tracker integration separately.

## Validation

- Baseline: 267 Jest suites / 2066 tests passed before implementation.
- Deterministic tests: transient upstream failure, stale expiry and timestamp preservation, unit/detail cache isolation, duplicate requests, manual refresh, malformed payload, initial/refresh failures, out-of-order results, unmount, preferences race, missing AQI, loading/empty/error list; latest/historical/paused radar age; London/NY/night/DST/polar Moon cases; worst-point versus average travel scores, partial/all-missing/clear data and day switching.
- Production build, both TypeScript projects, full Jest, lint and Knip; normal commit/push hooks.
- Local production Chromium and Firefox: desktop/390px dashboard loading→partial failure→retry→success, failed refresh retention, radar latest/paused/history and navigation, Moon date/zone for London/NY, travel hazard/average/coverage states. Use controlled test accounts/fixtures; no production preference changes.
- Read-only live public upstream smoke as available; distinguish live provider availability from deterministic failure recovery. Check bundle/build effects of server Moon enrichment.
- Attach the PR, report actual validation and remaining limits. CI readiness is separate from successful local validation.
