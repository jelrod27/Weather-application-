# Aviation Live Tracker Design

**Date:** 2026-07-18  
**Status:** Approved for implementation  
**Branch:** `feat/aviation-live-tracker`  
**Location:** `planning/aviation-live-tracker-design.md` (repo ignores `docs/`)  
**Surface:** `/aviation` only (`/travel` unchanged this PR)

## Goal

Rebuild `/aviation` into a FlightAware-style experience that combines:

1. **Track a flight** — search by callsign / flight ident, select aircraft, see identity + route  
2. **Weather for that flight** — LOW / WATCH / ELEVATED brief from NOAA for the selected route  
3. **Live sky map** — regional ADS-B aircraft on a map, clickable, with trails while selected  

Educational / non-dispatch. Always show a clear disclaimer.

## Product decisions (locked)

| Decision | Choice |
|----------|--------|
| Primary page | `/aviation` |
| Travel page | Untouched this PR |
| Data strategy | **ADS-B-first (C)** — no AeroAPI in this PR |
| Map stack for sky | MapLibre GL + OpenFreeMap Liberty tiles (`tiles.openfreemap.org`); Carto dark only if OpenFreeMap fails QA |
| Existing OpenLayers | Keep for radar / other maps; do not migrate radar in this PR |
| Mock-first ship | Out of scope — real ADS-B + NOAA only |
| AeroAPI / Standard tier | Explicitly deferred |

## Architecture

```
Browser
  ├── MapLibre map (poll /api/aviation/aircraft every 3s; pause when tab hidden)
  ├── Search → /api/aviation/aircraft/callsign
  ├── Selection panel → routeset + planespotters (proxied)
  └── Weather brief → /api/aviation/flight-brief (NOAA only; OD from routeset or airports)

Server
  ├── AircraftProvider interface
  │     ├── AdsbLolProvider (primary)
  │     ├── AirplanesLiveProvider (fallback)
  │     └── AdsbFiProvider (fallback)
  ├── In-memory cache (near-point ~3s TTL, keyed on rounded lat/lon/radius)
  └── Existing NOAA METAR / SIGMET / G-AIRMET services
```

Never call ADS-B or planespotters from the browser.

## Verified ADS-B response shape (adsb.lol)

Probed `GET https://api.adsb.lol/v2/lat/34/lon/-118/dist/50` and callsign lookup on 2026-07-18.

Envelope:

```json
{
  "ac": [ /* AircraftRaw */ ],
  "msg": "No error",
  "now": 1784385056500,
  "total": 1
}
```

Observed aircraft fields (normalize into `Aircraft`; treat all as optional at parse time):

| Field | Meaning |
|-------|---------|
| `hex` | ICAO24 |
| `flight` | Callsign (often space-padded) |
| `r` | Registration |
| `t` | Aircraft type |
| `lat`, `lon` | Position |
| `alt_baro`, `alt_geom` | Altitude (ft) |
| `gs` | Ground speed (kt) |
| `track` | Heading (deg) |
| `baro_rate` | Vertical rate (fpm) |
| `squawk` | Squawk code |
| `seen`, `seen_pos` | Freshness (seconds) |
| `dst`, `dir` | Distance/bearing from query point (near endpoint) |

Normalize to:

```ts
type Aircraft = {
  icao24: string;
  callsign: string | null;      // trimmed
  registration: string | null;
  typeCode: string | null;
  lat: number;
  lon: number;
  altitudeFt: number | null;    // prefer alt_baro, else alt_geom
  groundSpeedKt: number | null;
  trackDeg: number | null;
  verticalRateFpm: number | null;
  squawk: string | null;
  seenSec: number | null;
  source: 'adsb.lol' | 'airplanes.live' | 'adsb.fi';
};
```

Fallbacks (`airplanes.live`, `opendata.adsb.fi`) expose the same v2 near-point shape; share one parser with source tagging.

**Routeset:** `POST https://api.adsb.lol/api/0/routeset` — implement behind the provider interface; validate response shape in the routeset commit before typing UI against it. If routeset is flaky, weather brief falls back to airport-pair entry or “route unknown” with origin/dest unknown and map-only selection.

## API routes

| Route | Behavior |
|-------|----------|
| `GET /api/aviation/aircraft?lat=&lon=&radius=` | Near-point; radius capped at 250 nm; cache ~3s; failover providers |
| `GET /api/aviation/aircraft/callsign?q=` | Trim/uppercase query; return matching aircraft or empty |
| `GET /api/aviation/aircraft/route?callsign=&lat=&lon=` | Proxy routeset for O/D |
| `GET /api/aviation/aircraft/photo?hex=` | Proxy planespotters; cache longer (e.g. 1 day) |
| `GET /api/aviation/flight-brief?origin=&dest=` or `?callsign=` | NOAA METAR pair + corridor hazard intersect + LOW/WATCH/ELEVATED + drivers |

Rate limiting: reuse existing aviation/weather rate limiter patterns. Degraded source → `X-Aircraft-Source` header + JSON `source` / `degraded: true` for UI toast.

## UI composition (`/aviation`)

```
Header + ShareButtons + non-dispatch disclaimer
Search box (callsign / flight ident) + geolocate
Live map (full-width, primary visual)
  - Symbol/GeoJSON layer (not per-plane DOM markers)
  - Altitude color gradient; icons rotated to track
  - Client interpolation between polls
  - Live count in header/chip
Selection panel (slide-in when aircraft selected)
  - Callsign, registration, type, alt, gs, VS, squawk
  - Route (routeset)
  - Photo (planespotters)
  - Client-side trail since selection
Weather brief (for selection with known or resolvable OD)
  - BriefStatusBanner LOW | WATCH | ELEVATED
  - AirportPairWeather (origin | dest METAR)
  - RouteHazardPanel (intersecting advisories)
  - WeatherDriversList + disclaimer
Secondary (demoted below fold or collapsed)
  - AirportMiseryBoard (“Hub conditions”)
  - FlightConditionsTerminal explorers (turbulence / alerts / guide)
```

Deep link: `/aviation?flight=UAL2096` runs callsign search and selects the match when found.

## Scoring / weather brief

Reuse the prior Flight Weather Brief scoring intent (deterministic rules):

- Inputs: origin/dest flight category (METAR), intersecting SIGMET/AIRMET/G-AIRMET along great-circle corridor (~150 mi buffer)  
- Output: `low` | `watch` | `elevated`, plain-English drivers, valid-until  
- No AeroAPI schedule/delay fields in this PR  

When OD cannot be resolved, show identity + live position only and prompt for optional airport-pair override (minimal: two IATA inputs) so weather brief still works.

## Incremental commits (single PR)

1. Spec + branch note (this document)  
2. `AircraftProvider` + normalize + `/api/aviation/aircraft` (near-point) + unit tests from real fixture  
3. MapLibre shell on `/aviation` — poll, visibility pause, altitude styling, count chip  
4. Selection panel + client trail + photo proxy  
5. Callsign search + routeset proxy + `?flight=` deep link  
6. Flight weather brief API + UI for selection  
7. Demote misery board / terminal; wire IA  
8. Playwright smoke + polish (toasts, mobile panel, empty/error states)

## Testing

- Unit: parser/normalize, provider failover, cache key rounding, brief score fixtures  
- Route tests: aircraft API validation, radius cap, missing params  
- Playwright: load `/aviation`, see map/count or degraded toast; search callsign (mock network if needed); open panel  

## Non-goals

- AeroAPI / Personal or Standard FlightAware identity  
- Replacing or deleting `/travel`  
- Auth watchlist, push alerts, airport delay boards  
- FR24-level global coverage claims  
- Dispatch / operational briefing replacement  
- Migrating radar maps off OpenLayers  

## Success criteria

- `/aviation` feels map-first and searchable without AeroAPI  
- Selecting an aircraft shows identity + (when available) weather brief  
- ADS-B failures degrade gracefully with visible source status  
- Cap abuse via server cache + existing rate limits; no browser direct calls  
- One PR; history readable as the commit list above  

## Follow-ups (out of this PR)

- Optional Personal AeroAPI enrichment for schedule when under cap  
- Strip Travel Fly tab / deep-link to `/aviation`  
- Standard AeroAPI if public FA attribution is required later  
- Route polyline overlay on turbulence map  
