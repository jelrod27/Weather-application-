# PRD: Radar v2 — RainViewer-native Experience

**Version:** 2.0  
**Date:** 2026-06-19  
**Author:** Justin Elrod / Cursor  
**Project:** 16-Bit Weather (16bitweather.co)  
**Priority:** P1  
**Effort estimate:** L (one feature branch, one PR)  
**Base branch:** `main` (post #445–#448 radar hotfixes)  
**Review strategy:** Single PR for one CodeRabbit scan (free tier). Internal commits may be logical chunks, but merge as one unit.

**v2.0 change:** Radar tiles come **only from RainViewer** — one global source, one timeline, one tile pipeline. Iowa NEXRAD, MRMS, and MSC GeoMet are **removed** from radar v2. Severe overlays (NWS, SPC, storm reports) remain our own APIs.

---

## Table of Contents

1. [Problem](#1-problem)
2. [Design Reference](#2-design-reference)
3. [Goals and Non-Goals](#3-goals-and-non-goals)
4. [Experience Principles](#4-experience-principles)
5. [Information Architecture](#5-information-architecture)
6. [Screen Layout](#6-screen-layout)
7. [Interactions](#7-interactions)
8. [Technical Architecture](#8-technical-architecture)
9. [RainViewer Data Contract](#9-rainviewer-data-contract)
10. [Risks and Attribution](#10-risks-and-attribution)
11. [Delivery Plan](#11-delivery-plan-single-branch-single-pr)
12. [Verification](#12-verification)
13. [Kill Criteria](#13-kill-criteria)

---

## 1. Problem

The radar modernization (PR #445) shipped a multi-provider stack (Iowa, GeoMet, MRMS, RainViewer fallback) with solid overlay plumbing, but:

- **Production broke** on MRMS (403) and layout (#448).
- **UX still feels dev-grade** — monolithic map, cramped mobile controls, severe layers off by default.
- **Data is inconsistent** — US gets 4h NEXRAD, Canada 3h GeoMet, Mexico 2h RainViewer; timeline labels lie; tile behavior differs by region.

The product goal is **RainViewer-like** — same app family as our data source. Using RainViewer tiles everywhere matches that goal and **simplifies** the stack: one API, one animation loop, one look worldwide.

---

## 2. Design Reference

### RainViewer app (UX + data — same vendor)

| Pattern | v2 behavior |
|---------|-------------|
| Full-screen map | Map owns viewport; thin top bar + bottom dock |
| Bottom animation player | Scrubber, play/pause, LIVE dot (right edge) |
| Auto-play on load | Loop oldest → newest; pause on LIVE |
| Global radar composite | Same tiles in Chicago, Toronto, London, Tokyo |
| 2-hour history | Driven by RainViewer `weather-maps.json` frames (10-min steps) |
| Color scheme | Default RainViewer scheme `2` (Universal Blue); toggle in layer sheet |
| Smooth / snow options | Tile option `1_1` (smoothed + snow colors) — user toggles in sheet |
| Coverage mask | Optional layer: `/v2/coverage/0/...` shows where radar exists |
| Attribution | “Source: [RainViewer](https://www.rainviewer.com/)” always visible |
| Clean modern UI | Sans controls, glass dock; 16-bit accents only on LIVE/status |

### WeatherWise (severe context only — not tile source)

| Pattern | v2 behavior |
|---------|-------------|
| Severe preset | Precip + NWS alerts + storm reports (US locations) |
| Outlook preset | Precip + SPC Day-1 categorical |
| Alert inspector | Tap polygon → card + weather.gov link |

We **do not** ingest NWS Level-II like WeatherWise. Severe context comes from existing GeoJSON APIs.

---

## 3. Goals and Non-Goals

### Goals

- **G1.** Single global radar source: RainViewer Weather Maps API for all locations.
- **G2.** Frame list from `weather-maps.json` — no synthetic timestamps.
- **G3.** RainViewer-native UX: bottom player, auto-play, LIVE chip, fullscreen map.
- **G4.** Mobile-first bottom dock + layer sheet.
- **G5.** US default preset: **Severe** (radar + alerts + storm reports).
- **G6.** Auto-bootstrap location (URL → context → GPS).
- **G7.** Retire `weather-map-openlayers.tsx` on `/radar`; new `components/radar-v2/`.
- **G8.** Preserve shareable URL state (`layers`, `frame`, `zoom`, `scheme`).
- **G9.** Server-cache RainViewer manifest; proxy tiles only if CORS requires it.

### Non-Goals (v1)

- Iowa NEXRAD, NOAA MRMS, MSC GeoMet as radar sources.
- Multi-provider selection or tile fallback chains.
- RainViewer PRO / single-site Level-II products.
- RainViewer nowcast / forecast frames (not in public `weather-maps.json` today — add when API exposes `nowcast`).
- Paid radar vendors (OpenWeather precip, meteoblue, AccuWeather).
- MapLibre migration.

---

## 4. Experience Principles

1. **One radar worldwide** — same colors, same loop, same player.
2. **Map is 90% of the screen** — header ≤ 48px mobile.
3. **Truthful timeline** — always `-2h` … `LIVE` (from API frame count).
4. **Severe is default in the US** — RainViewer shows rain; we add NWS context.
5. **RainViewer attribution** — non-negotiable link in UI.
6. **Fail gracefully** — manifest fetch error → retry UI; empty `radar.past` → “Radar temporarily unavailable”.

---

## 5. Information Architecture

```
/radar
├── Location bootstrap (URL > context > GPS)
├── RadarShell
│   ├── RadarTopBar (back, location, search, share)
│   ├── RadarMap (OpenLayers + RainViewer XYZ tiles)
│   ├── RadarStatusChip (RainViewer · updated Xm ago · ● LIVE)
│   ├── RadarPresetBar (Radar | Severe | Outlook)
│   ├── RadarPlayerDock (timeline, play/pause, speed, LIVE)
│   ├── RadarLayerSheet (overlays, color scheme, smooth/snow, coverage, legend)
│   └── RadarInspector (alert/storm tap → card)
└── Dashboard widget — same RainViewer tiles, simplified dock
```

**Presets**

| Preset | Layers | Default |
|--------|--------|---------|
| Radar | rainviewer | All locations |
| Severe | rainviewer + alerts + storm reports | US (`coverage region === 'us'`) |
| Outlook | rainviewer + spc | User toggle |

**Layer sheet (RainViewer-specific)**

| Control | Maps to |
|---------|---------|
| Color scheme | Tile `{color}` param (default `2`) |
| Smooth radar | `{smooth}` 1 or 0 |
| Show snow colors | `{snow}` 1 or 0 |
| Coverage mask | `/v2/coverage/0/{size}/{z}/{x}/{y}/0/0_0.png` |
| Opacity | OpenLayers layer opacity |

---

## 6. Screen Layout

### Desktop (≥1024px)

```
┌──────────────────────────────────────────────────────────┐
│ ←  Chicago, IL                              [⌕] [Share]  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                         MAP                              │
│              [RainViewer · 2m ago ●]                       │
│                                                          │
│  [ Radar ] [ Severe ] [ Outlook ]          [ Layers ∨ ]  │
│  ◀◀   ▶ PLAY   ▶▶   1×  │═══════●════│  LIVE            │
│  Source: rainviewer.com                                  │
└──────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

- Top bar: back + location + search icon.
- Full-height map (`h-screen` shell from #448).
- Preset chips + player dock sticky bottom (`pb-safe`).
- Layer sheet: bottom 80vh max.
- Attribution + source link in dock footer.

---

## 7. Interactions

| Action | Behavior |
|--------|----------|
| Page load | Location → fetch cached manifest → map frames from `radar.past` → auto-play |
| LIVE tap | Jump to last frame; pause |
| Scrub | Pause; set `frameIndex`; sync URL `frame` |
| Preset | Set overlay bundle; sync URL `layers` |
| Layer sheet | Scheme / smooth / snow / coverage / overlay toggles |
| Manifest refresh | Re-fetch every 5 min (match RainViewer cadence); diff frames; extend loop |
| Map tap (vector) | Inspector with NWS link |
| GPS | Enabled on `/radar` |
| Share | URL includes `layers`, `frame`, `zoom`, `scheme` |

**Auto-play:** 500ms between frames (RainViewer example default); pause 1.5s on LIVE; loop.

**Freshness chip:** Based on manifest `generated` unix time vs `Date.now()`.

---

## 8. Technical Architecture

### RainViewer integration (new)

```
lib/radar/rainviewer/
  types.ts              ← WeatherMapsResponse, Frame, tile options
  fetch-manifest.ts     ← GET weather-maps.json, validate, normalize
  build-frames.ts       ← Map API past[] → RadarFrame[]
  tile-url.ts           ← host + path + size/z/x/y/color/options

app/api/radar/
  metadata/route.ts     ← lat/lon + manifest frames + overlays config
  manifest/route.ts     ← NEW: cached proxy to weather-maps.json (optional split)
```

**Manifest proxy** (`/api/radar/manifest` or inline in metadata):

- Fetches `https://api.rainviewer.com/public/weather-maps.json`
- Cache: `s-maxage=120, stale-while-revalidate=60` (align with RainViewer 5-min refresh)
- Returns normalized `{ host, generated, frames: [{ time, path }] }`

**Metadata route** changes:

- `selectRadarProvider()` → always RainViewer (remove region switch for tiles).
- `frames` built from manifest `radar.past`, not `buildRadarFrames()` synthetic loop.
- `selectedProvider` single entry; drop `fallbackProvider` for tiles.

**Tile URL format:**

```
{host}{path}/{size}/{z}/{x}/{y}/{color}/{smooth}_{snow}.png
```

Example: `https://tilecache.rainviewer.com/v2/radar/1609401600/256/6/32/41/2/1_1.png`

- `size`: 256 (512 on retina optional v1.1)
- `maxNativeZoom`: 7 (per RainViewer docs)
- `maxZoom`: 12 (overzoom allowed)

**Deprecate for v2** (remove in same PR or mark unused):

- `noaa-mrms`, `iowa-nexrad`, `canada-geomet` in `RADAR_PROVIDERS`
- WMS radar layers in `weather-map-openlayers.tsx`
- `/api/weather/noaa-wms` usage from radar (route may remain for other features)
- Synthetic frame generation as primary path (keep util for tests only)

### UI components (unchanged structure)

```
components/radar-v2/
  radar-shell.tsx
  radar-map.tsx           ← OpenLayers XYZ from tile-url.ts
  radar-player-dock.tsx
  radar-preset-bar.tsx
  radar-layer-sheet.tsx   ← + RainViewer scheme/smooth/snow/coverage
  radar-inspector.tsx
  radar-status-chip.tsx
  radar-top-bar.tsx
  radar-legend.tsx        ← RainViewer Universal Blue table
  use-radar-controller.ts
```

### State machine

```
idle → loadingManifest → ready → playing ⇄ paused
                      ↘ error
```

Owns: manifest, frames, frameIndex, isPlaying, speed, colorScheme, smooth, snow, coverageMask, activeLayers, urlSync.

### Cutover

1. Build `radar-v2` on `/radar` with RainViewer tiles only.
2. Remove `weather-map-openlayers` from radar page.
3. Update dashboard widget to `radar-v2` widget mode (same tiles).
4. Update About, SEO copy, E2E stubs.

---

## 9. RainViewer Data Contract

| Field | Value |
|-------|-------|
| Manifest URL | `https://api.rainviewer.com/public/weather-maps.json` |
| History | `radar.past[]` — **2 hours**, **10-minute** steps (~13 frames) |
| Tile host | From manifest `host` (typically `https://tilecache.rainviewer.com`) |
| Frame path | Per-frame `path` (e.g. `/v2/radar/{unix}`) |
| Max native zoom | 7 |
| Default color | `2` (Universal Blue) |
| Default options | `1_1` (smooth + snow) |
| Coverage | `/v2/coverage/0/{size}/{z}/{x}/{y}/0/0_0.png` |
| Refresh | Poll manifest every 5 minutes |

**Timeline label:** Always `-2h` … `LIVE` (frame 0 = oldest in `past`, last = LIVE).

**No regional divergence** — Chicago and London use the same pipeline.

---

## 10. Risks and Attribution

### Terms (must ship with v2)

RainViewer API terms ([rainviewer.com/api.html](https://www.rainviewer.com/api.html)):

- Free for **personal and educational** use; **small-scale community** mentioned on marketing page.
- **Attribution required:** link to https://www.rainviewer.com/
- No SLA; upstream radar owners can pull data without notice.
- Third-party API access has been **restricted** for some apps (reports through early 2026). Monitor status page; manifest proxy gives a single switch point if URLs change.

**Action:** Visible attribution in dock + About page. Consider contacting RainViewer for commercial/community clarification for 16bitweather.co before high traffic.

### Technical risks

| Risk | Mitigation |
|------|------------|
| API discontinued | Manifest proxy + feature flag to re-enable legacy providers (keep registry code in git history, not active path) |
| CORS on tiles | Tiles already work client-side via `tilecache.rainviewer.com`; proxy route if blocked |
| Only 2h history | Honest UI; no fake `-4h` label |
| Zoom 7 cap | Allow overzoom; show subtle “max radar zoom” hint |
| Low frame count | 13 frames is enough for loop; preload all frames on play |

---

## 11. Delivery Plan (single branch, single PR)

**Branch:** `feature/radar-v2`

| Step | Ships |
|------|-------|
| 1 | RainViewer manifest service + metadata refactor (frames from API) |
| 2 | `radar-v2` map shell — RainViewer tiles, fullscreen |
| 3 | Player dock, auto-play, LIVE chip, `-2h` timeline |
| 4 | Layer sheet (scheme, smooth, snow, coverage) + presets + US Severe default |
| 5 | Location bootstrap, inspector, cutover, remove old providers from active path |
| 6 | E2E + unit tests + About/SEO copy |

**Removals in same PR:**

- Iowa/MRMS/GeoMet from active provider selection
- `weather-map-openlayers.tsx` usage on `/radar`
- E2E expectations for “NEXRAD RADAR” / “GeoMet” badges → “RainViewer”

---

## 12. Verification

### Unit

- `fetch-manifest` parses example JSON
- `build-frames` maps `past[]` to `RadarFrame[]` with correct LIVE frame
- `tile-url` builds correct URL for scheme/smooth/snow
- Preset → layer bundle; US Severe default

### E2E (`tests/e2e/radar-v2.spec.ts`)

- Stub `/api/radar/metadata` + manifest with fixture frames
- Stub `tilecache.rainviewer.com/**` (existing pattern in `tests/fixtures/utils.ts`)
- Map &gt; 50% viewport
- Badge shows “RainViewer” + attribution link
- Auto-play advances frame index
- Severe preset enables alerts (US)
- Mobile layer sheet opens
- URL round-trip: `layers`, `frame`, `zoom`, `scheme`

### Manual

- Live manifest + tiles: US, Canada, Europe, Mexico
- Coverage mask toggle
- Color scheme toggle
- Theme contrast (synthwave, nord, dark)

### Commands before PR

```bash
npm run typecheck
npm run lint
npm test -- radar
npx playwright test tests/e2e/radar-v2.spec.ts --project=chromium
npm run build
```

---

## 13. Kill Criteria

- Manifest unavailable &gt;24h → document outage; do not silently revert to Iowa without user approval.
- Layout fails iPhone SE 50% map test → fix layout, not providers.
- Single PR too large → drop coverage mask or scheme picker before dropping Severe preset.

---

## Appendix: Visual Tokens

| Token | Value |
|-------|-------|
| Map chrome | `bg-black/80 backdrop-blur-md` |
| Dock | `bg-zinc-950/95 border-t border-white/10` |
| LIVE dot | `bg-red-500 animate-pulse` |
| Accent | `cyan-400` |
| Typography | `font-sans` UI; `font-mono` timestamps only |
| Touch targets | min 44×44px |

---

*End of PRD v2.0.*
