# Aviation Live Tracker Implementation Plan

> **For agentic workers:** Implement task-by-task with separate commits on `feat/aviation-live-tracker`. One PR at the end.

**Goal:** Rebuild `/aviation` into an ADS-B-first FlightAware-style live map + search + NOAA weather brief.

**Architecture:** Server-proxied ADS-B providers normalize to `Aircraft`; MapLibre polls near-point every 3s; selection drives routeset/photo/brief from NOAA.

**Tech Stack:** Next.js App Router, MapLibre GL, OpenFreeMap, adsb.lol (+fallbacks), existing NOAA aviation services, Jest, Playwright.

**Spec:** `planning/aviation-live-tracker-design.md`

## Global Constraints

- No AeroAPI in this PR
- Never call ADS-B/planespotters from the browser
- `/travel` untouched
- Educational / non-dispatch disclaimer required
- Radius capped at 250 nm; near-point cache ~3s
- Incremental commits matching the design list

## File map

| Path | Responsibility |
|------|----------------|
| `lib/aviation/aircraft-types.ts` | `Aircraft`, raw types |
| `lib/aviation/normalize-aircraft.ts` | Parse v2 `ac[]` → `Aircraft` |
| `lib/aviation/aircraft-providers.ts` | Provider interface + failover + cache |
| `app/api/aviation/aircraft/route.ts` | Near-point proxy |
| `app/api/aviation/aircraft/callsign/route.ts` | Callsign lookup |
| `app/api/aviation/aircraft/route/route.ts` | Routeset proxy |
| `app/api/aviation/aircraft/photo/route.ts` | Planespotters proxy |
| `app/api/aviation/flight-brief/route.ts` | NOAA brief orchestration |
| `lib/aviation/brief-score.ts` | LOW/WATCH/ELEVATED |
| `lib/aviation/route-corridor.ts` | Great-circle + hazard buffer |
| `lib/aviation/weather-drivers.ts` | Plain-English drivers |
| `components/aviation/LiveAircraftMap.tsx` | MapLibre shell |
| `components/aviation/AircraftSearch.tsx` | Search + geolocate |
| `components/aviation/AircraftSelectionPanel.tsx` | Detail + trail meta |
| `components/aviation/FlightWeatherBrief.tsx` | Brief UI |
| `app/aviation/page.tsx` | New IA composition |
| `__tests__/aviation-aircraft*.test.ts` | Unit tests |
| `tests/e2e/aviation-live-tracker.spec.ts` | Smoke |

## Tasks

### Task 1 — Provider + near-point API
- [ ] Types + normalize + providers + cache
- [ ] `GET /api/aviation/aircraft`
- [ ] Unit tests with fixture from real curl
- [ ] Commit

### Task 2 — MapLibre shell
- [ ] Add `maplibre-gl` dependency
- [ ] `LiveAircraftMap` with GeoJSON layer, poll, visibility pause
- [ ] Wire onto `/aviation` above existing content
- [ ] Commit

### Task 3 — Selection + photo + trail
- [ ] Panel + photo route + client trail
- [ ] Commit

### Task 4 — Search + routeset + deep link
- [ ] Callsign + routeset routes
- [ ] `?flight=` on page
- [ ] Commit

### Task 5 — Weather brief
- [ ] Corridor + score + drivers + API + UI
- [ ] Commit

### Task 6 — IA demotion
- [ ] Misery board / terminal secondary
- [ ] Commit

### Task 7 — E2E + PR
- [ ] Playwright smoke
- [ ] Push + `gh pr create`
