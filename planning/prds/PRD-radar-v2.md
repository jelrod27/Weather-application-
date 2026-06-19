# PRD: Radar v2 — RainViewer / WeatherWise–style Experience

**Version:** 1.0  
**Date:** 2026-06-19  
**Author:** Justin Elrod / Cursor  
**Project:** 16-Bit Weather (16bitweather.co)  
**Priority:** P1  
**Effort estimate:** L (one feature branch, one PR)  
**Base branch:** `main` at `42216b3` (post #445–#448 radar hotfixes)  
**Review strategy:** Single PR for one CodeRabbit scan (free tier). Internal commits may be logical chunks, but merge as one unit.

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
9. [Data and Provider Constraints](#9-data-and-provider-constraints)
10. [Delivery Plan](#10-delivery-plan-single-branch-single-pr)
11. [Verification](#11-verification)
12. [Kill Criteria](#12-kill-criteria)

---

## 1. Problem

The radar modernization (PR #445) shipped solid provider plumbing—registry, metadata route, overlays, URL state—but the user-facing product still feels like a developer map with retro controls bolted on. Production hotfixes (#447 Iowa primary, #448 fullscreen layout) restored reliability without improving usability.

`components/weather-map-openlayers.tsx` is a ~1,400-line monolith. Controls compete on mobile (top-right LAYERS dropdown, bottom playback bar, floating 8px legend). Severe overlays default off. Timeline labels are hardcoded to `-4h` regardless of provider. `/radar` blocks GPS and requires manual search when no URL location is set.

Users comparing to **RainViewer** or **WeatherWise** expect: full-screen map, bottom animation player, LIVE freshness, one-tap severe context, and minimal chrome. We are not close today.

---

## 2. Design Reference

### RainViewer (primary consumer UX reference)

| Pattern | What we adopt |
|---------|----------------|
| Full-screen map | Map owns the viewport; chrome is thin and dismissible |
| Bottom animation player | Scrubber + play/pause + LIVE dot at right edge |
| LIVE indicator | Pulsing marker on timeline when on latest frame |
| Auto-play on load | Loop starts automatically when frames are ready |
| Layer tabs / quick switch | Recent layer modes as horizontal chips (Radar, Severe, Outlook) |
| Tap for details | Tap map feature → bottom card with alert/report detail |
| Data freshness honesty | Badge: provider name + “updated Xm ago” (green/amber/red thresholds) |
| Clean modern UI | Sans typography, glass panels, no heavy mono borders on every control |
| Dark basemap | High-contrast precip on dark base (keep Carto Dark Matter) |

| Pattern | Defer / cannot match with public data |
|---------|--------------------------------------|
| 48h archive, 2h nowcast | Iowa/GeoMet ~4h history; RainViewer XYZ ~2h; no native nowcast tiles in v1 |
| Per-pixel scan age on tap | No per-station latency metadata from our sources in v1 |
| Storm movement arrows | Requires motion vector product; defer |
| Pro radar tilts (velocity, CC) | Requires NEXRAD Level-II; out of scope |
| Hurricane tracker | Separate product surface |

### WeatherWise (severe-weather depth reference)

| Pattern | What we adopt |
|---------|----------------|
| Map-first professional layout | Reflectivity as default product; severe context one tap away |
| Product / mode switcher | Top segmented control: **Radar** · **Severe** · **Outlook** |
| Always-visible playback | Bottom dock; never hidden behind menus |
| dBZ legend | Collapsible legend in layer sheet, not floating micro-text |
| Alert inspection | Tap polygon → readable card + link to weather.gov |
| Satellite-style dark map | Default; optional lighter base in settings (v1.1) |
| Educational tone | Short layer descriptions in sheet (RainViewer 5.0 pattern) |

| Pattern | Defer |
|---------|-------|
| 3D radar, cross sections, quad view | Pro-tier WeatherWise; needs Level-II + WebGL stack |
| FastScan / single-site super-res | Paid/direct radar feeds |
| Y'all Mode palette | Fun v1.1: offer 2–3 reflectivity color schemes |
| Range rings, velocity units | Chaser/pro tooling; not v1 |

### 16-Bit Weather identity (adjusted)

Keep the brand as **accent**, not chrome: cyan LIVE pulse, subtle pixel badge on logo area, mono labels only for status chips—not every button. Target: **RainViewer cleanliness with WeatherWise severe usefulness**, not a Weather.com clone or full retro terminal.

---

## 3. Goals and Non-Goals

### Goals

- **G1.** `/radar` feels like opening a modern radar app: full map, bottom player, auto-play loop.
- **G2.** Mobile-first: all primary actions reachable with one thumb (timeline, play, layer presets).
- **G3.** US users see precip + NWS alerts on first load (Severe preset as default for US).
- **G4.** Timeline labels and frame count reflect actual provider metadata (`pastMinutes`, `frameStepMinutes`).
- **G5.** Auto-bootstrap location: context location or GPS; no dead “search only” landing.
- **G6.** Retire `weather-map-openlayers.tsx` for `/radar`; keep a thin widget wrapper for dashboard if needed.
- **G7.** Preserve shareable URL state (`layers`, `frame`, `zoom`) and existing provider abstraction in `lib/radar/`.

### Non-Goals (v1)

- MRMS as default US provider (stay Iowa primary until upstream health check exists).
- Level-II products (velocity, CC, storm tracks).
- 2-hour radar nowcast / 48h archive.
- GOES IR satellite layer (v1.1 candidate).
- Paid providers (Tomorrow.io, etc.).
- Replacing OpenLayers with MapLibre.
- Native apps or Live Activities.

---

## 4. Experience Principles

1. **Map is 90% of the screen** — header ≤ 48px on mobile; desktop ≤ 56px.
2. **One dock** — timeline, play, presets, layer entry live in a single bottom dock (safe-area aware).
3. **Severe is the default story in the US** — not buried in a menu.
4. **Honest time** — never show `-4h` when the provider only has 2h.
5. **Progressive depth** — simple by default; layer sheet exposes opacity, individual overlays, legend.
6. **Fail gracefully** — metadata error → full-screen message + retry; tile fallback → visible “Using fallback” chip.

---

## 5. Information Architecture

```
/radar
├── Location bootstrap (URL > context > GPS prompt)
├── RadarShell
│   ├── RadarTopBar (back, location, search icon, share)
│   ├── RadarMap (OpenLayers viewport only)
│   ├── RadarStatusChip (provider, freshness, fallback)
│   ├── RadarPresetBar (Radar | Severe | Outlook)
│   ├── RadarPlayerDock (timeline, play/pause, speed, LIVE)
│   ├── RadarLayerSheet (slide-up / side panel)
│   └── RadarInspector (bottom card on feature tap)
└── Widget embed (dashboard) — simplified dock, no presets
```

**Presets**

| Preset | Layers | Default for |
|--------|--------|-------------|
| Radar | precip | Canada, international |
| Severe | precip + alerts + storm reports | US |
| Outlook | precip + spc | optional user toggle |

---

## 6. Screen Layout

### Desktop (≥1024px)

```
┌──────────────────────────────────────────────────────────┐
│ ←  Chicago, IL                              [⌕] [Share]  │  48px
├──────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │                    MAP                             │  │
│  │                                                    │  │
│  │  [NEXRAD · 3m ago ●]                               │  │  status chip
│  └────────────────────────────────────────────────────┘  │
│  [ Radar ] [ Severe ] [ Outlook ]          [ Layers ∨ ]  │  presets
│  ◀◀   ▶ PLAY   ▶▶   1×  │═══════●════│  LIVE            │  player dock
└──────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

- Top bar: back + truncated location + search icon (expands to full search).
- Map: `flex-1`, `h-screen` layout unchanged from #448.
- Presets: horizontal scroll chips above dock.
- Player dock: sticky bottom, `pb-safe`.
- Layers: bottom sheet (80vh max), not top-right dropdown.
- Legend: inside layer sheet only (no floating sidebar).

---

## 7. Interactions

| Action | Behavior |
|--------|----------|
| Page load | Resolve location → fetch metadata → auto-play loop from frame 0 |
| LIVE tap | Jump to latest frame, pause |
| Scrub timeline | Pause; update frame; sync URL `frame` param (debounced) |
| Preset tap | Set layer bundle; sync URL `layers` |
| Layers sheet | Individual toggles, opacity slider, legend, layer descriptions |
| Map tap (vector) | Open inspector card: alert title, severity, expires, NWS URL |
| Map tap (empty) | Dismiss inspector |
| Search | Slide-down or modal search; navigate `?location=` |
| GPS | `WeatherSearch` location button enabled on `/radar` |
| Keyboard | Space play/pause; ←/→ step frames; Esc close sheet/inspector |
| Share | Existing share URL with layers/frame/zoom |

**Auto-play:** Loop from oldest → newest, pause 1.5s on LIVE frame, repeat (RainViewer-style).

**Freshness chip:**  
- Green: metadata age &lt; 5 min  
- Amber: 5–15 min  
- Red: &gt; 15 min or fallback provider  

---

## 8. Technical Architecture

### New files (do not extend monolith)

```
components/radar-v2/
  radar-shell.tsx
  radar-map.tsx
  radar-player-dock.tsx
  radar-preset-bar.tsx
  radar-layer-sheet.tsx
  radar-inspector.tsx
  radar-status-chip.tsx
  radar-top-bar.tsx
  radar-legend.tsx
  use-radar-controller.ts
  radar-constants.ts
  radar-types.ts

app/radar/
  page.tsx          ← thin; location bootstrap only
```

### Reuse unchanged

- `lib/radar/providers/*`
- `app/api/radar/metadata/route.ts`
- `lib/radar/radar-url-state.ts`
- Overlay APIs: alerts, spc-outlook, storm-reports
- `components/weather-map.tsx` → dashboard widget keeps old map until widget v2 (or embeds simplified `radar-map` in widget mode)

### State machine (`use-radar-controller`)

```
idle → loadingMetadata → ready → playing ⇄ paused
                      ↘ error
```

Owns: metadata, frames, frameIndex, isPlaying, speed, activeLayers, preset, zoom, selectedFeature, urlSync, tileFallback flag.

### Cutover strategy

1. Build v2 components behind `RadarShell` on `/radar`.
2. Delete imports of `weather-map-openlayers` from radar page only.
3. Leave dashboard widget on old map for one release if needed; migrate in PR 5 or same final PR.

---

## 9. Data and Provider Constraints

| Region | Primary | History window | v2 timeline label |
|--------|---------|----------------|-------------------|
| US | Iowa NEXRAD | 4h / 5 min steps | `-4h` … `LIVE` |
| Canada | MSC GeoMet | 3h / 6 min steps | `-3h` … `LIVE` |
| Other | RainViewer | 2h / 10 min steps | `-2h` … `LIVE` |

US default preset: **Severe** (precip + alerts + storm reports). Alerts default **on** in `DEFAULT_RADAR_LAYERS` for US only (detect via metadata `selectedProvider.coverage === 'us'`).

---

## 10. Delivery Plan (single branch, single PR)

**Branch:** `feature/radar-v2`  
**PR:** One pull request against `main` — optimized for a single CodeRabbit review pass.

Implementation order on that branch (logical commits, not separate PRs):

| Step | Ships |
|------|-------|
| 1 | PRD + `components/radar-v2/` scaffold, map renders tiles, fullscreen shell |
| 2 | Bottom player dock, auto-play, provider-aware timeline, LIVE chip |
| 3 | Presets, layer sheet, US Severe default, inspector + NWS links |
| 4 | Auto-location, GPS, slim top bar, search |
| 5 | Cutover `/radar` off old monolith, E2E suite, About copy |

**Why one PR:** CodeRabbit free tier is per-PR; splitting would burn multiple scans on the same feature. The diff will be large but cohesive — easier for reviewers to see the full RainViewer/WeatherWise intent.

**Optional v1.1 (separate PR later):** reflectivity color schemes, GOES IR layer, MRMS health-check retry.

---

## 11. Verification

### Unit

- Provider-aware timeline label helper
- Preset → layer bundle mapping
- US vs non-US default layers

### E2E (`tests/e2e/radar-v2.spec.ts`)

- Loads with stubbed metadata; map &gt; 50% viewport
- Auto-play advances frames (stubbed timestamps)
- Severe preset enables alerts layer (US fixture)
- Mobile 375×667: player dock visible, layer sheet opens
- URL state round-trip: `layers`, `frame`, `zoom`
- Inspector opens on stubbed alert feature click

### Manual

- Real Iowa tiles on US city
- GeoMet on Canadian city
- RainViewer fallback outside NA official coverage
- Theme variants do not break map contrast

### Commands before opening the PR

```bash
npm run typecheck
npm run lint
npm test -- radar
npx playwright test tests/e2e/radar-v2.spec.ts --project=chromium
npm run build
```

---

## 12. Kill Criteria

Stop or descope v2 if:

- OpenLayers bottom-dock layout cannot meet 50% viewport map height on iPhone SE (fix layout, do not abandon v2).
- Provider metadata latency makes auto-play feel broken (&gt;3s to first frame) — add skeleton player, do not revert to old UI.
- Scoped effort blocks a shippable single PR — drop Outlook preset and inspector NWS links before dropping Severe default; do not split into multiple PRs for CodeRabbit.

---

## Appendix: Visual Tokens (RainViewer-adjacent)

| Token | Value |
|-------|-------|
| Map chrome bg | `bg-black/80 backdrop-blur-md` |
| Dock bg | `bg-zinc-950/95 border-t border-white/10` |
| LIVE dot | `bg-red-500 animate-pulse` |
| Primary accent | `cyan-400` (brand) |
| Typography | `font-sans` for controls; `font-mono` for timestamps only |
| Touch targets | min 44×44px |
| Radius | `rounded-xl` on dock/sheet; map full bleed |

---

*End of PRD.*
