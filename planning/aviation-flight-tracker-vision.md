# Aviation: Flighty / FlightAware-direction vision

**Status:** Active — design approved 2026-07-18  
**Spec:** [`planning/aviation-live-tracker-design.md`](./aviation-live-tracker-design.md)  
**Branch:** `feat/aviation-live-tracker`  
**Goal:** Evolve `/aviation` from a misery board + SIGMET terminal into a FlightAware-style live tracker + weather brief (ADS-B-first) — still educational, never for operational dispatch.

## North star

A user can enter a flight number (or origin/destination), see route weather risk, intersecting SIGMETs/AIRMETs, and airport conditions at both ends — with a retro terminal aesthetic.

## Building blocks we already have

- Airport Misery Board (hub delay/turbulence proxy)
- Turbulence / PIREP map
- Flight route lookup + flight-number input
- NOAA AWC SIGMET/AIRMET/METAR pipelines (after P0 time/id fix)

## Suggested phases

1. **Trust + clarity** — correct advisories, VFR legend, misery methodology tooltip (partially in P0/P1 polish)
2. **Flight-first CTA** — make “Track a flight” the primary surface; misery board secondary
3. **Route weather** — path polyline + SIGMETs that intersect the corridor; ETA weather at dest
4. **Watchlist** — saved flights/airports via Supabase (auth users)
5. **Polish** — push-style refresh, shareable flight weather cards

## Non-goals

- ATC / dispatch operational use
- Paid ADS-B scraping that violates ToS
- Replacing official briefings (always disclaimer)

## Open questions

- Flight data provider (existing flight-lookup vs new source)
- How far to go on live position vs schedule-only
- Mobile-first layout for “track this flight” vs desktop terminal
