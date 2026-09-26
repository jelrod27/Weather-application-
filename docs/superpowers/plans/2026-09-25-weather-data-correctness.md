# Weather Data Correctness Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. User authorized immediate execution and exactly seven commits; no further plan approval is needed.

**Goal:** Restore trust in existing forecast, hazard, travel and astronomy data before UI redesign.

**Architecture:** Keep provider data and its units, timestamps and availability together. Reuse shared formatters and existing lifecycle logic; remove unsupported derived claims rather than add new providers.

**Tech Stack:** Next.js 16, React 19, TypeScript, Jest, existing Open-Meteo/NWS/SWPC integrations.

**Spec:** `planning/weather-ux-remediation-scope.md`; evidence in `planning/ux-audit-2026-09-25.md`.

## Global Constraints

- Seven commits in one PR; scope/audit documentation in commit 1.
- Everyday users first, with depth for enthusiasts.
- Preserve visual design, unrelated user files and existing security controls.
- No new providers, paid integrations, database migrations or subscription changes.
- Focused regression checks per behavior; full tests, types, lint and production build before PR.

## Review Focus

- A selected unit must win over country defaults, including international locations and zero wind.
- Missing provider values must not become measurements; genuine zeroes remain visible.
- Midnight, DST and polar missing events must not fall back to the viewer's time zone.
- Expiry boundaries, cancellations and unknown validity must not imply an active or all-clear status.
- Hemisphere changes and unavailable data must not produce precise-looking invented guidance.

## Task 1: Consistent units

**Files:** `components/forecast.tsx`, `components/forecast-details.tsx`, `components/weather-display.tsx`, `lib/weather/open-meteo-adapter.ts`, related forecast/adapter tests.
**Interfaces:** Forecast/ForecastDetails consume an explicit temperature unit from WeatherData.unit; wind labels follow the adapter's unit contract. Existing pressure strings include their own unit.
- [ ] Add regression cases for UK Fahrenheit and US Celsius, detail wind units and zero wind; assert accessible forecast labels include the requested unit.
- [ ] Run targeted tests and verify incorrect country-derived labels fail.
- [ ] Pass actual unit through forecast and detail views; remove duplicate pressure unit; format adapter pressure from selected units and normalize wind severity to mph.
- [ ] Run forecast/adapter tests and type checks, review diff, commit `fix(weather): keep forecast units consistent` with scope/audit docs.

## Task 2: Honest missing data

**Files:** adapter, `lib/types.ts`, `components/forecast-details.tsx`, adapter/detail tests.
**Interfaces:** Daily details remain optional; actual daily sunrise/sunset are distinct from current observations. Incomplete days are omitted, not padded with fabricated weather.
- [ ] Add tests that missing daily humidity/pressure stay absent, unavailable rain stays unavailable, real zero survives, and truncated daily data is not padded.
- [ ] Run tests to see the existing fabricated values fail.
- [ ] Remove invented values/padding and today-observation fallbacks; use the selected day's solar events.
- [ ] Verify targeted tests, review diff, commit `fix(weather): preserve unavailable daily data`.

## Task 3: Location time and darkness

**Files:** `components/hourly-forecast.tsx`, `components/forecast.tsx`, `lib/stargazer/{types,build-payload,format}.ts`, astronomy consumers in `components/stargazer/`, tests.
**Interfaces:** Hourly forecast consumes weather.timezone; Stargazer payload carries provider IANA timezone; formatTime accepts an explicit location timezone and defaults to UTC for legacy payloads.
- [ ] Add midnight/DST formatting and dark-window consistency cases, including missing polar events.
- [ ] Run the cases and confirm viewer-time and sunset/darkness mistakes fail.
- [ ] Carry provider timezone to every astronomy time consumer; use astronomical dusk/dawn for the dark window and actual daily dates for forecast cards.
- [ ] Verify targeted tests, review diff, commit `fix(time): use location time and astronomical darkness`.

## Task 4: Accurate alert status

**Files:** `lib/bitwatch/desk.ts`, warning ranking/lifecycle consumers, space-weather alert parser/ticker, relevant tests.
**Interfaces:** An active event must satisfy lifecycle and source expiry at read time; SWPC message validity is explicit, with recent messages kept separate when current validity cannot be established.
- [ ] Add expiry-boundary, ended/cancelled/superseded and historical SWPC message cases.
- [ ] Verify incorrect active counts/ranking fail.
- [ ] Filter weather events at read time and honestly label recent space messages without assumed active validity.
- [ ] Verify alert regression suites, review diff, commit `fix(alerts): separate effective alerts from ended messages`.

## Task 5: Geographic relevance

**Files:** local/global homepage panels, warning pin coverage presentation, corresponding tests.
**Interfaces:** Viewing country/location is independent of persisted subscribed pin; coverage is explicitly known/unsupported/unavailable, not inferred from an empty list.
- [ ] Add tests for international unsupported coverage, local versus global labels, and a viewing city different from the alert pin.
- [ ] Observe misleading current labels fail.
- [ ] Label geographic scope honestly without moving subscribed pins or changing delivery policy.
- [ ] Verify targeted tests, review diff, commit `fix(weather): make hazard geography and coverage explicit`.

## Task 6: Credible travel results

**Files:** `lib/services/trip-score-service.ts`, trip response types and travel consumers, `__tests__/trip-score-service.test.ts`.
**Interfaces:** Peak timing is nullable/unavailable without hourly route scoring; current corridor scores continue to work.
- [ ] Add a tomorrow-trip test proving no synthetic peak time is claimed and useful scores survive.
- [ ] Observe clock-derived time assertion fail.
- [ ] Remove synthetic peak computation and replace precision claims with forecast-overview limits.
- [ ] Verify trip tests, review diff, commit `fix(travel): remove unsupported peak timing claims`.

## Task 7: Consistent aurora guidance

**Files:** `lib/space-weather/kp-scale.ts`, `components/space-weather/{KpIndexGauge,AuroraForecastMap}.tsx`, related intent consumers, tests.
**Interfaces:** One shared approximate latitude table/helper serves every view; hemisphere drives both latitude suffix and regional copy.
- [ ] Add Kp boundary, north/south and invalid-data cases.
- [ ] Observe inconsistent existing viewlines/hemisphere text fail.
- [ ] Unify calculation and hemisphere descriptions; explicitly label approximate guidance.
- [ ] Run targeted and full validation, obtain whole-branch review, address findings, commit `fix(space-weather): unify approximate aurora guidance`.

## Closeout

- [ ] Seven commits verified against main; no unrelated changes staged.
- [ ] Focused tests, full Jest suite, app/test types, lint and build reviewed.
- [ ] Affected browser flows inspected when practical; remote-only limitations documented.
- [ ] PR opened using gh, with validation and follow-ups; no automatic merge.
