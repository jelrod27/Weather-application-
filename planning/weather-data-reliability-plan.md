# Weather Data Reliability Implementation Plan

> For agentic workers: execute inline using superpowers:executing-plans; preserve the progress ledger. The user authorized implementation without an additional approval. Local code-review uses independent Standards and Spec agents before push.

**Goal:** Deliver audit priorities 1 and 2 in one reviewed PR.
**Architecture:** Keep server weather recovery in a bounded service, card request state in a focused hook, radar freshness in the controller/formatter, Moon enrichment on server forecast paths, and travel presentation derived from explicit sample coverage/worst-point data.
**Tech Stack:** Existing Next.js16 / React19 / TypeScript, npm, Jest, Playwright, astronomy-engine, existing TTL cache. No new dependency.
**Spec:** `planning/prds/PRD-weather-data-reliability.md`.

## Global constraints

- Fresh cache 5 minutes; fallback maximum age 30 minutes; at most 100 entries.
- No successful fallback changes the original fetch timestamp.
- Preserve place, units, detail horizon, source time and request identity.
- Missing measurements must not become reassuring zeros or all-clear messages.
- No production account mutations, new feeds, migrations or accessibility workstream.
- Normal hooks; one PR; review before push; no merge.

## Review focus

1. Unit/coordinate changes while an earlier request resolves: only the current identity renders (Task2).
2. A repeated provider outage with old successful data: deadline never renews; current/stale/missing remain distinct (Task1/2).
3. A paused newest radar frame as real time advances: age updates without interaction (Task3).
4. DST/local midnight/polar nights: Moon dates/zones and no-event outcomes match the existing observing-night definition (Task4).
5. One severe point or one missing point in a long otherwise quiet route: average may be low but highlighted risk/coverage stays explicit (Task5).

## Commit and execution strategy

Implement each task with focused failing tests then passing tests. Review the complete working diff before arranging focused commits; run the requested two-axis review against the committed branch before push. This keeps every commit covered by review while preserving a coherent history. The final review base is `9268e34c9ccf2c492a588b5b0b20d2538c73c976`.

### Task 1: Dashboard weather service

**Files:** create `lib/dashboard-weather-service.ts` and `__tests__/dashboard-weather-service.test.ts`; modify `app/api/dashboard-weather/route.ts`, add route tests. Reuse `lib/cache/ttl-cache.ts`, `lib/open-meteo.ts`, `lib/fetch-with-timeout.ts`.
**Interfaces:** service accepts coordinates, API units, detail/refresh flags; returns `{ forecast, fetchedAt, stale }`. Factory clock/fetch seam permits deterministic expiry and failure tests. Route retains existing current/detail fields and adds `fetchedAt`, `observedAt`, `stale`.

- [x] Write failure tests for loader coalescing, isolated keys, bounded stale fallback, manual refresh and malformed payload. Essential contract:
  ```ts
  const first = await service.load(input);
  clock += 6 * 60_000;
  upstream.mockRejectedValue(new Error('Open-Meteo Forecast API error 503'));
  const fallback = await service.load(input);
  expect(fallback.stale).toBe(true);
  expect(fallback.fetchedAt).toBe(first.fetchedAt);
  clock += 25 * 60_000;
  await expect(service.load(input)).rejects.toThrow();
  ```
- [x] Run `npm test -- --runInBand dashboard-weather-service dashboard-weather-route`. Expected: red before implementation.
- [x] Implement with existing TTL cache (300000ms fresh +1500000ms stale), success-only insertion and per-key in-flight coalescing; route logs sanitized failure class, returns 502 for provider failures, no-store for stale/error/manual refresh, and nullable optional metrics. No nested retry loops over the existing fetch wrapper.
- [x] Repeat focused tests. Expected: green.
- [x] Record production diagnosis and cache limitations in ledger.

### Task 2: Saved-location request lifecycle

**Files:** create `hooks/useDashboardWeather.ts`; modify `lib/dashboard-weather.ts`, `components/dashboard/location-card.tsx`, `components/dashboard/saved-locations-panel.tsx`, `lib/supabase/hooks.ts`, `app/dashboard/page.tsx`; extend location-card/panel tests and add hook tests.
**Interfaces:** client request accepts `{ signal, refresh }`; hook returns current identity's data/loading/error/refresh action; data includes original receipt/source timestamps. Saved panel accepts the hook's saved-list error for recovery.

- [x] Write delayed-promise tests: initial error, retry success, refresh failure preserves same-key data/timestamp, old response after coordinate/unit change is ignored, unmount aborts, stale limit expires, independent wind-unit preference remains correct, AQI unavailable stays unavailable. Panel must satisfy:
  ```tsx
  render(<SavedLocationsPanel locations={[]} loading onUpdate={noop} onAddLocation={noop} />);
  expect(screen.queryByTestId('saved-locations-empty')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
  ```
- [x] Run `npm test -- --runInBand location-card saved-locations-panel dashboard-weather-client useDashboardWeather saved-locations-hook`. Expected: red for new cases.
- [x] Implement request abortion/identity guards, preference readiness, separate initial/refresh state, dated stale retention and real retry. Avoid persisting coordinates/data beyond existing storage. Keep user mutation controls intact.
- [x] Replace missing AQI's fabricated zero with unavailable, preserving successful weather detail. Handle saved-list fetch errors and refetch states without an empty flash.
- [x] Repeat focused tests. Expected: green.

### Task 3: Radar newest-frame freshness

**Files:** `lib/radar/radar-timestamps.ts`, `hooks/useRadarController.ts`; tests `__tests__/radar-timestamps.test.ts`, controller freshness test and existing radar controls.
**Interfaces:** `formatRadarFrameAgeLabel(frame, now)` keeps signature and always formats age; controller provides a minute-updated clock independent of playback.

- [x] Change the old LATEST-only test to the required age and add paused-clock regression:
  ```ts
  expect(formatRadarFrameAgeLabel({ ...frame, isLive: true, timestamp: now - 900000 }, now)).toBe('15m ago');
  ```
- [x] Run `npm test -- --runInBand radar-timestamps radar-frame-age radar-controls`. Expected: red.
- [x] Remove newest-frame early return, preserve invalid/future handling, and update controller clock on a cleaned-up minute timer. Separate Latest control stays.
- [x] Repeat focused tests. Expected: green; navigation/playback regressions stay green.

### Task 4: Shared observing-night Moon information

**Files:** create `lib/weather/forecast-moon.ts`; modify forecast API route, adapter, Moon types and forecast card; remove unused lunar approximation. Tests: new forecast-moon, existing forecast route/adapter/weather utility suites.
**Interfaces:** `getForecastMoonInfo(lat, lon, timeZone, at)` returns the existing Moon display shape plus observing-night context; uses `calculateDarkWindow`/`calculateMoonInfo`. Forecast API adds optional Moon enrichment to its response. Server adapter computes the same enrichment through a server-only runtime path. Client adapter consumes supplied enrichment or explicit unavailability.

- [x] Fixed-date tests compare NY/London events to Stargazer calculations, verify explicit date/zone across DST and midnight, and polar no-set behavior. Example:
  ```ts
  const night = calculateDarkWindow(40.7128, -74.006, at);
  const moon = calculateMoonInfo(40.7128, -74.006, night);
  expect(result.moonsetAt).toBe(moon.set?.toISOString() ?? null);
  expect(result.timeZone).toBe('America/New_York');
  ```
- [x] Run `npm test -- --runInBand forecast-moon open-meteo-adapter open-meteo-forecast-route weather-utils`. Expected: red.
- [x] Enrich on the server with optional failure isolation; remove coordinate-free moonset fallback; render the observing-night label and no-event/unavailable copy. Do not eagerly import astronomy-engine in client adapter/card.
- [x] Repeat tests plus Stargazer astronomy tests. Expected: green with unchanged dark-window behavior.
- [x] Verify build/client import graph and local NY/London cards; no new external astronomy request.

### Task 5: Worst-point travel summaries and coverage

**Files:** `lib/services/travel-corridor-service.ts`, `app/api/travel/corridors/route.ts`, `components/travel/WorstCorridors.tsx`, `components/travel/TravelCorridorMap.tsx`, `app/travel/page.tsx`; service/API/component tests.
**Interfaces:** retain route-average `score`; add explicit worst-point score/hazard/location/time and coverage counts; level/color summarize highlighted sampled risk, unknown coverage stays distinct. Reuse existing types rather than repeat anonymous data shapes.

- [x] Tests pin clear, fog, wind, concentrated hazard, ties, one missing point, all missing, empty list, future day and unaffected fly control behavior. Essential regression:
  ```tsx
  render(<WorstCorridors corridors={[windyLowAverage]} isLoading={false} />);
  expect(screen.queryByText('CLEAR')).not.toBeInTheDocument();
  expect(screen.getByText(/route average/i)).toBeInTheDocument();
  expect(screen.getByText(/high winds/i)).toBeInTheDocument();
  ```
- [x] Run `npm test -- --runInBand travel-corridor-service travel-corridors-route worst-corridors travel-corridor-map travel-controls`. Expected: red for new semantics.
- [x] Derive coverage/worst point without substituting clear defaults for missing samples; rank the highlight list by worst conditions and label route average separately. Preserve existing numerical severity function and personal trip meaning. Propagate sample times for the board without inventing a departure forecast.
- [x] Update list/map/legend and incomplete-data copy together. Use names already available, otherwise explicitly sampled coordinates. Repeat focused tests. Expected: green.

### Task 6: Production-mode verification, review and PR

**Files:** `tests/e2e/weather-data-reliability.spec.ts`, `tsconfig.tests.json`, spec/plan closeout. Existing fixtures supply isolated auth and network states.

- [x] Add deterministic dashboard recovery, radar age, Moon consistency and travel coverage journeys; check desktop and 390px layouts in Chromium/Firefox.
- [x] Run build, both type checks, full Jest, lint and Knip. Expected: no new errors; record pre-existing warnings.
- [x] Start owned production server on an unused port; run targeted new E2E plus existing dashboard/radar/travel/weather-journey regressions. Expected: pass. Stop only the server owned by this task.
- [x] Run full working-diff correctness review, fix verified issues, then arrange the focused commits through normal hooks.
- [x] Run the user's code-review skill: independent Standards/Spec agents, fixed merge base above, saved PRD as spec. Repair findings with focused regression tests; re-review affected changes.
- [ ] Summarize actual changes, tests and limitations; push branch, create one PR with a body file, attach it to the chat. No merge.


## Progress / rulings

- Planning complete after production log inspection and baseline tests. No additional approval requested because the user explicitly authorized execution.
- Use this repository's tracked `planning/` location instead of ignored `docs/`.
- Main stays untouched; development uses the app-managed isolated checkout.
- The code-review skill's missing issue-tracker file is documented in the PRD; the explicit saved spec supplies review requirements.
- Historical upstream status is unknown: bounded resilience and new privacy-safe diagnostics address the proven failure class without claiming a specific provider fix.


### Implementation status

Tasks1–5 implemented. Final production build and both TypeScript projects passed. Full unit suite:274 suites/2098 tests. Lint:0 errors/93 existing warnings. Knip passed. Initial independent Standards review clear; Spec found response-unit labels, corrected with a failing-then-passing mixed-unit regression and re-reviewed clear.

Production Chromium/Firefox matrix:68 of70 passed initially; the two existing radar assertions expected the intentionally removed LATEST-only age label. Updated them to assert elapsed age and the separate Latest pressed state; both passed. All20 new desktop/mobile reliability scenarios passed, including one failed dashboard card alongside a successful card. Final review/PR closeout remains in Task6.

Final live validation: clean server New York/London dashboard HTTP200 with independent m/s units and distinct receipt/source timestamps. New York forecast Moon shows Sep27 moonset with EDT and the Sep26 observing night. Live corridor list exposes worst-point risk and route average separately. Astronomy engine remains in a separate client chunk absent from initial forecast script tags. Clean desktop Lighthouse:97 performance/94 accessibility/96 best practices/100 SEO, CLS0.048; unchanged contrast and localhost Vercel analytics findings remain outside this scope. Initial Lighthouse/live probes hit the local rate limiter after70 browser cases; those results were discarded, and the local server was restarted before the clean read-only smoke/performance check. No production limiter/settings changed.
