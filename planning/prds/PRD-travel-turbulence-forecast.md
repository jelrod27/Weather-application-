# PRD: Travel Turbulence Forecast (Stargazer-style Command Center)

**Version:** 2.1 (design + implementation; reconciled against main)  
**Date:** 2026-08-05 (baseline 2026-08-26)  
**Author:** Justin Elrod / Cursor  
**Project:** 16-Bit Weather (16bitweather.co)  
**Status:** Draft — `/travel/turbulence` is **not built**  
**Priority:** P2  
**Effort estimate:** M–L (one feature branch; ~4 implementation slices)  
**Surface:** `/travel/turbulence`  
**Design references:** Stargazer Command Center; NOAA AWC GTGN ([news](https://www.weather.gov/news/260803-gtgn))  
**Research:** [`planning/research/gtgn-nws-2026-08.md`](../research/gtgn-nws-2026-08.md)  
**Implementation slices:** §13 of this document (no separate plan file)

---

## Table of Contents

1. [Problem](#1-problem)
2. [Inspiration](#2-inspiration)
3. [Goals and Non-Goals](#3-goals-and-non-goals)
4. [Locked Product Decisions](#4-locked-product-decisions)
5. [Information Architecture](#5-information-architecture)
6. [Visual Design Spec](#6-visual-design-spec)
7. [Screen Spec (wire-level)](#7-screen-spec-wire-level)
8. [Copy Deck](#8-copy-deck)
9. [Data Strategy](#9-data-strategy)
10. [API Contract](#10-api-contract)
11. [Scoring Algorithm](#11-scoring-algorithm)
12. [File Inventory](#12-file-inventory)
13. [Implementation Slices](#13-implementation-slices)
14. [Verification](#14-verification)
15. [Risks, Attribution, Kill Criteria](#15-risks-attribution-kill-criteria)
16. [Decision Log](#16-decision-log)

---

## 1. Problem

### Current baseline (2026-08-26)

Reconciled against GitHub `main` (`b3ed851`).

| Already ships | Still missing |
|---------------|---------------|
| `/aviation` ops map: real AWC G-AIRMET polygons + PIREPs (`app/api/aviation/turbulence`, `app/api/aviation/pireps`, `hooks/useTurbulenceData`, `TurbulenceMap`) — see `planning/aviation-uplift.md` Phase 3 | `/travel/turbulence` page, travel forecast API, passenger score |
| `/travel` Fly/Drive hub; Fly deep-links to `/aviation` | Fly CTA to a passenger forecast |
| Fetch/parse lives **inside** the aviation API routes (no shared `aviation-turbulence-service` yet) | Extract those routes into services, then reuse (no HTTP loopback) |

Do not re-implement G-AIRMET fetch. Extract, then score.

`/travel` answers “will my trip suck?” with Fly and Drive. Fly shows airport misery and deep-links to `/aviation` (ops console: SIGMETs, METARs, TurbulenceMap with G-AIRMET + PIREPs).

Aviation is **ops-shaped**. Stargazer is **forecast-shaped**: one hero score, best window, tabbed detail. Travel has no passenger answer to:

> “How bumpy will the ride be, and when is the smoothest window?”

GTGN (AWC, 2026-08) raises the bar for turbulence storytelling. We adopt the product idea (nowcast-grade bumpiness forecast) without becoming an EFB or ingesting GRIB2 in v1.

---

## 2. Inspiration

### GTGN (product idea only)

| Trait | Our v1 translation |
|-------|-------------------|
| 15-min nowcast | Freshness stamp + “Updated Xm ago”; data refresh ~10 min cache |
| Multi-altitude | Hazard-type sub-scores in v1; altitude bands deferred to GTGN phase |
| Multi-signal | G-AIRMET + PIREPs → drivers list |
| Pilot GFA UI | Do **not** clone; build Stargazer-like forecast page |

### Stargazer (UX pattern — mirror closely)

| Stargazer | Turbulence forecast |
|-----------|---------------------|
| `STARGAZER COMMAND CENTER` | `TURBULENCE FORECAST` |
| Overall score + label | Bumpiness 0–100 + SMOOTH→BRUTAL (misery vocab) |
| Best window | Smoothest window next 12–24h |
| Limiting factor | Dominant driver |
| Sub-score bars | `gairmet` / `pirep` / `convective` (hazard-type) |
| Tabs | `now` / `timeline` / `reports` / `about` |
| Hourly timeline | Forecast-hour severity strip |
| Location search | LocationContext + search (airport/city) |
| Attribution | NOAA AWC |

---

## 3. Goals and Non-Goals

### Goals

- **G1.** Passenger-facing forecast at `/travel/turbulence` with Stargazer command-center layout.
- **G2.** First viewport = one composition: title, score, best smooth window, one summary — not a card dashboard.
- **G3.** CTA from Travel Hub Fly (and secondary from `/aviation` TurbulenceMap).
- **G4.** v1 data = real AWC G-AIRMET + turbulence PIREPs via shared lib (no HTTP loopback).
- **G5.** Explainable drivers; misery-family labels (`SMOOTH` / `BUMPY` / `ROUGH` / `BRUTAL`).
- **G6.** Out-of-coverage / no-data never renders as smooth green.
- **G7.** Educational disclaimer: not for operational flight planning.
- **G8.** Theme tokens (`--severity-*`) + retro terminal aesthetic.

### Non-Goals (v1)

- NOMADS GTGN GRIB2 ingest.
- Replacing `/aviation` TurbulenceMap.
- Third Fly/Drive/Bump mode on `/travel`.
- Origin→destination route sampling (location-only MVP).
- Flight-number turbulence.
- Push/email alerts.
- EFB / dispatch fidelity.

---

## 4. Locked Product Decisions

| # | Question | Decision |
|---|----------|----------|
| D1 | Placement | `/travel/turbulence` sibling page |
| D2 | Naming | **Turbulence Forecast** (chrome + SEO) |
| D3 | Location default | `LocationContext`; optional `?lat=&lon=` / `?q=`; snap label to nearest major airport within 80 km when available |
| D4 | Sub-scores | Hazard-type: `gairmet`, `pirep`, `convective` (0–100 bumpiness each) |
| D5 | Route mode | Deferred; location-only |
| D6 | Score polarity | Higher = bumpier (misery-aligned); About tab explains vs Stargazer |
| D7 | Labels | Map via existing `getSeverityLevel` + `MISERY_LEVEL_LABELS` |
| D8 | GTGN | Phase B spike after v1 ships |
| D9 | Radius | 400 km for polygon hit-test / PIREP inclusion |
| D10 | Timeline | Buckets by G-AIRMET `forecastHour` (0, 3, 6, 9, …) within ≤12h; fill gaps as `null` (unknown), not 0 |

---

## 5. Information Architecture

```
/travel                         Travel Hub (unchanged core)
  └─ Fly CTA                    “Turbulence forecast →” → /travel/turbulence
/travel/turbulence              NEW command center
/aviation                       Ops console (unchanged)
  └─ TurbulenceMap header CTA   “Passenger forecast →” (secondary)
```

Share URL: `https://www.16bitweather.co/travel/turbulence`  
Hash tabs: `#now` `#timeline` `#reports` `#about` (same pattern as Stargazer).

---

## 6. Visual Design Spec

### Aesthetic

Retro-terminal forecast console, Stargazer family. Not ops-map-as-hero, not marketing purple, not cream-serif editorial.

- **Type:** Mono for title, score, labels (existing font stack / `font-mono`).
- **Color:** `--severity-light|moderate|severe|extreme` (+ `-bg`); score text uses same ladder as misery badges.
- **Motion (ship 2–3):** (1) header score fade/slide-in, (2) best-window chip delay, (3) tab panel fade. Timeline: hover cell highlight only.
- **Atmosphere:** Optional subtle horizontal altitude-band lines behind header only (`opacity` ≤ 0.08); panels stay flat/readable.
- **Layout:** `container mx-auto px-4 py-8` like Stargazer; header `container-primary`; tabs match `StargazerNav` structure (terminal `//` rail, `[ LABEL ]` active).

### First-viewport composition test

Must contain only: product title, one supporting sentence, location strip, score header (score + best window + summary). No PIREP list, no map, no secondary promos above the fold on desktop.

### Mobile

- Score stacks above meta; sub-bars 3 columns.
- Tabs horizontal scroll (`StargazerNav` pattern).
- Timeline horizontal scroll with sticky hour labels.

---

## 7. Screen Spec (wire-level)

```
┌─────────────────────────────────────────────────────────────┐
│ TURBULENCE FORECAST                                         │
│ How bumpy is the sky near you — guidance, not a clearance.  │
│ Valid: {local date} · Updated {Xm} ago                      │
│ [ShareButtons]                                              │
├─────────────────────────────────────────────────────────────┤
│ Location: [________________] [GO]   {City / Kxxx if snapped}│
├─────────────────────────────────────────────────────────────┤
│ ┌─ HEADER ───────────────────────────────────────────────┐  │
│ │  72  BUMPY                                              │  │
│ │  Best smooth: 14:00–17:00 (28)                          │  │
│ │  Limiting: G-AIRMET — Moderate turb FL180–FL340         │  │
│ │  {summary one liner}                                    │  │
│ │  [gairmet ##] [pirep ##] [convective ##]  sub-bars      │  │
│ └────────────────────────────────────────────────────────┘  │
│ ┌ now │ timeline │ reports │ about ┐                        │
│ │ panel…                                         │          │
│ └────────────────────────────────────────────────┘          │
│ Attribution · disclaimer                                    │
└─────────────────────────────────────────────────────────────┘
```

### Tab: Now

- Active polygon count in radius; max severity; top 3 drivers.
- Short “what this means for passengers” blurb from score summary.
- Link: “Ops map → `/aviation`”.

### Tab: Timeline

- Row of forecast-hour cells: label `+0h` `+3h` … severity color + numeric score or `—` if unknown.
- Legend under strip.
- Call out best smooth window with outline on those cells.

### Tab: Reports

- List of up to 20 recent turbulence PIREPs (intensity, altitude, time, aircraft, distance km).
- Empty: “No recent pilot reports nearby.”
- No hero map in v1 (optional later).

### Tab: About

- How score works (G-AIRMET + PIREPs).
- Coverage CONUS+AK+HI.
- Higher = bumpier.
- Disclaimer.
- NOAA AWC attribution + link.
- Note: GTGN nowcast is a future data upgrade; v1 uses Graphical AIRMET turbulence.

### States

| State | Behavior |
|-------|----------|
| Loading | Skeleton header + pulse (clone Stargazer `SkeletonCard`) |
| Error | Banner + Retry; no fake score |
| Outside coverage | `coverage: 'none'`; message; no green score |
| In coverage, no hazards | Score 0–15 SMOOTH OK — only when `coverage: 'conus'` (or ak/hi) and fetch succeeded |
| No PIREPs | Reports empty copy; score may still use G-AIRMET |

---

## 8. Copy Deck

| Slot | Copy |
|------|------|
| H1 | `TURBULENCE FORECAST` |
| Subtitle | `How bumpy is the sky near you. Educational guidance — not for flight planning.` |
| Fly CTA | `Turbulence forecast →` |
| Aviation CTA | `Passenger forecast →` |
| Best window prefix | `Best smooth:` |
| Limiting prefix | `Limiting factor:` |
| No coverage | `No turbulence guidance for this area. AWC G-AIRMET covers CONUS, Alaska, and Hawaii.` |
| Error | `Unable to load turbulence forecast. Try again.` |
| Disclaimer (footer) | `Not for operational flight planning or dispatch. Sources: NOAA / NWS Aviation Weather Center.` |
| Share text | `Turbulence forecast near me — bumpiness score at 16bitweather.co` |

---

## 9. Data Strategy

### Phase A (v1) — ship

| Source | How | Role |
|--------|-----|------|
| AWC G-AIRMET `type=turb` | Extract existing fetch/parse from `app/api/aviation/turbulence/route.ts` into `lib/services/aviation-turbulence-service.ts`; reuse from that route + new travel API | Polygons, severity, forecastHour, base/top |
| AWC PIREPs | Extract shared bits from `app/api/aviation/pireps/route.ts`; filter `turbulenceIntensity` + radius | Reports + pirep sub-score |
| Geo | `haversineMeters` + `pointInGeoJsonGeometry` | Inclusion |
| Coverage | `isInConus` + simple AK/HI bounding boxes | `coverage` enum |

Prefer **service imports**, never Next.js route→route HTTP.

### Phase B (later)

GTGN GRIB2 / future AWC JSON — separate spike. Does not block v1.

---

## 10. API Contract

### `GET /api/travel/turbulence-forecast`

**Query**

| Param | Required | Notes |
|-------|----------|-------|
| `lat` | yes* | number |
| `lon` | yes* | number |
| `q` | no | if lat/lon missing, geocode via `resolveGeocodingQuery` |
| `radiusKm` | no | default `400`, clamp 50–800 |

\* Or `q` alone.

**Response 200**

```ts
type TurbulenceCoverage = 'conus' | 'ak' | 'hi' | 'none';

type TurbulenceForecastLabel = 'SMOOTH' | 'BUMPY' | 'ROUGH' | 'BRUTAL';

interface TurbulenceForecastResponse {
  success: boolean;
  data: {
    location: {
      lat: number;
      lon: number;
      label: string;
      airportCode: string | null; // IATA/ICAO if snapped
    };
    coverage: TurbulenceCoverage;
    score: {
      overall: number; // 0–100, higher = bumpier
      label: TurbulenceForecastLabel;
      level: 'green' | 'yellow' | 'orange' | 'red';
      color: string;
      summary: string;
      bestWindow: {
        startISO: string;
        endISO: string;
        score: number;
        forecastHours: number[]; // e.g. [3, 6]
      } | null;
      limitingFactor: {
        category: 'gairmet' | 'pirep' | 'convective' | 'none';
        label: string;
        detail?: string;
      } | null;
      subScores: {
        gairmet: number;
        pirep: number;
        convective: number;
      };
      drivers: Array<{
        key: string;
        label: string;
        weight: number;
        category: 'gairmet' | 'pirep' | 'convective';
      }>;
    } | null; // null when coverage === 'none' OR upstream hard-fail partial
    timeline: Array<{
      forecastHour: number;
      validFrom: string | null;
      score: number | null; // null = no data for hour
      maxSeverity: 'smooth' | 'light' | 'moderate' | 'severe' | 'extreme' | null;
      polygonCount: number;
    }>;
    reports: Array<{
      id: string;
      observationTime: string;
      intensity: string;
      altitudeFt: number | null;
      aircraftRef: string;
      distanceKm: number;
      lat: number;
      lon: number;
      rawText: string;
    }>;
    meta: {
      fetchedAt: string;
      source: 'NOAA AWC G-AIRMET + PIREPs';
      radiusKm: number;
      polygonHits: number;
      pirepHits: number;
    };
  };
  error?: string;
}
```

**Headers:** `Cache-Control: public, s-maxage=600, stale-while-revalidate=1200`  
**Errors:** `400` bad coords; `502` upstream; body still includes `success: false` and empty-safe `data` shape where possible.

---

## 11. Scoring Algorithm

Pure module: `lib/travel/turbulence-score.ts` (Jest required).

### Severity → bumpiness points

| G-AIRMET / PIREP intensity | Points |
|----------------------------|--------|
| smooth / none | 0 |
| light / LGT | 25 |
| moderate / MOD | 55 |
| severe / SEV | 85 |
| extreme / EXTRM | 100 |

### Inclusion

A polygon **hits** if either:

1. Point is inside any outer ring (`pointInGeoJsonGeometry` with `Polygon` built from `coordinates`), or  
2. Any vertex is within `radiusKm` of the point (`haversineMeters`).

A PIREP **hits** if it has turbulence intensity and distance ≤ `radiusKm`.

### Sub-scores

- **gairmet:** max points among hitting polygons with `forecastHour ≤ 3` (near-term); if none, 0.
- **pirep:** from hitting turb PIREPs in last 6 hours:  
  `min(100, maxIntensityPoints + 10 * min(5, count-1))`.
- **convective:** if any hitting polygon `rawSeverity`/`hazard` text suggests conv/TS or intensity paired with convective G-AIRMET — else 0. Practical v1: if `rawSeverity` or hazard string matches `/CONV|TS|THUNDER/i` → use that polygon’s points; else 0.

### Overall

```
overall = clamp(0, 100,
  round(0.55 * gairmet + 0.30 * pirep + 0.15 * convective)
)
```

Map `overall` → `level` / `label` / `color` via `getSeverityLevel` + `MISERY_LEVEL_LABELS` + `SEVERITY_COLORS`.

### Timeline bucket score

For each forecast hour H in `{0,3,6,9,12}`: max points among hitting polygons with that `forecastHour`; `null` if zero polygons for that hour.

### Best smooth window

Among hours with non-null scores, find contiguous span of ≥2 buckets with minimal average score. If all null → `bestWindow: null`. If only one bucket → that single hour as window (start=end of validity). Prefer copying control flow style from `findBestWindow` in `lib/stargazer/score.ts`.

### Limiting factor

Category of the max sub-score; label from top driver. If overall &lt; 20 → `category: 'none'`, label `Conditions look relatively smooth`.

### Summaries (template)

- overall &lt; 20: `Skies look relatively smooth near {label}.`
- &lt; 45: `Light to moderate bumpiness possible near {label}.`
- &lt; 70: `Expect a bumpier ride near {label} — check the timeline for smoother hours.`
- else: `Significant turbulence guidance near {label}. Prefer smoother windows if you can.`

---

## 12. File Inventory

### Create

| Path | Responsibility |
|------|----------------|
| `lib/travel/turbulence-types.ts` | Shared types (API + UI) |
| `lib/travel/turbulence-score.ts` | Pure scoring + best window + summaries |
| `lib/travel/turbulence-geo.ts` | Radius filter helpers (polygon hit, pirep distance) |
| `lib/services/aviation-turbulence-service.ts` | Fetch + parse G-AIRMET (extracted from route) |
| `lib/services/aviation-pirep-service.ts` | Fetch + parse PIREPs (extract shared bits if not already) |
| `app/api/travel/turbulence-forecast/route.ts` | API |
| `app/travel/turbulence/page.tsx` | Page shell |
| `app/travel/turbulence/layout.tsx` | Metadata / OG |
| `hooks/useTurbulenceForecast.ts` | Fetch, location, tabs, abort |
| `components/travel/turbulence/TurbulenceCommandCenter.tsx` | Layout orchestration |
| `components/travel/turbulence/TurbulenceNav.tsx` | Tabs |
| `components/travel/turbulence/TurbulenceHeader.tsx` | Score header |
| `components/travel/turbulence/TurbulenceNow.tsx` | Now panel |
| `components/travel/turbulence/TurbulenceTimeline.tsx` | Timeline panel |
| `components/travel/turbulence/TurbulenceReports.tsx` | Reports panel |
| `components/travel/turbulence/TurbulenceAbout.tsx` | About panel |
| `components/travel/turbulence/TurbulenceAttribution.tsx` | Footer |
| `__tests__/travel/turbulence-score.test.ts` | Unit tests |
| `__tests__/travel/turbulence-geo.test.ts` | Geo filter tests |
| `tests/e2e/travel-turbulence.spec.ts` | E2E |

### Modify

| Path | Change |
|------|--------|
| `app/api/aviation/turbulence/route.ts` | Keep response shape; delegate fetch/parse to aviation-turbulence-service |
| `app/api/aviation/pireps/route.ts` | Share PIREP fetch if extracted |
| `app/travel/page.tsx` | Fly CTA link (`href="/aviation"` today) |
| `components/aviation/TurbulenceMap.tsx` (or parent) | Secondary CTA |
| `planning/prds/README.md` | Index |

---

## 13. Implementation Slices

Slice summary:

| Slice | Deliverable | Exit criteria |
|-------|-------------|---------------|
| **1. Score + geo lib** | Pure functions + Jest green | Scoring cases in §11 covered |
| **2. Services + API** | Extract AWC services; forecast route returns contract | Manual curl / unit with mocks |
| **3. Page shell + header + CTA** | `/travel/turbulence` renders score; Fly link works | Visual match Stargazer chrome |
| **4. Tabs + E2E + polish** | All tabs, states, Playwright, knip | Ready for PR |

Commit cadence: one commit per slice (or per plan task).

---

## 14. Verification

```bash
npm test -- turbulence-score
npm test -- turbulence-geo
npm run typecheck
npx playwright test tests/e2e/travel-turbulence.spec.ts --project=chromium
npm run knip
```

E2E must mock `/api/travel/turbulence-forecast` (and not depend on live AWC).

Manual: 3 themes; mobile 390px; compare side-by-side with `/stargazer`.

---

## 15. Risks, Attribution, Kill Criteria

| Risk | Mitigation |
|------|------------|
| Users treat as clearance | Disclaimer in subtitle + About + footer; never “clear to fly” |
| Empty = smooth | `coverage: 'none'` and failed fetch block SMOOTH |
| GTGN expectation | About tab honesty; source string names G-AIRMET |
| Dual UI confusion | Travel = passenger forecast; Aviation = ops map |
| Service extract regresses map | Keep turbulence route response shape identical; existing aviation E2E |

**Attribution:** NOAA / NWS Aviation Weather Center — [aviationweather.gov](https://aviationweather.gov/).

**Kill if:** AWC unusable with no honest fallback; empty states look smooth; page becomes “map with a score sticker.”

---

## 16. Decision Log

| Date | Decision |
|------|----------|
| 2026-08-05 | GTGN = inspiration; no GRIB2 in v1 |
| 2026-08-05 | `/travel/turbulence` sibling; Stargazer UX |
| 2026-08-05 | v1 = G-AIRMET + PIREPs |
| 2026-08-05 | Lock D1–D10 (§4); bump to v2.0 design+implementation PRD |
| 2026-08-26 | Reconciled with GitHub `main`. Aviation G-AIRMET + PIREP map already ships. Dropped missing `docs/superpowers/plans/…` path (`docs/` is gitignored). GTGN notes at `planning/research/gtgn-nws-2026-08.md`. |
