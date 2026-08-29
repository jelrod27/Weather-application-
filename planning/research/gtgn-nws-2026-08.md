# GTGN (NWS AWC, 2026-08)

Research notes for [PRD-travel-turbulence-forecast.md](../prds/PRD-travel-turbulence-forecast.md). Source: [NWS news, 2026-08-03](https://www.weather.gov/news/260803-gtgn). Scraped locally 2026-08-15; do not treat this as an ingest spec.

## What it is

Graphical Turbulence Guidance Nowcast (GTGN) is an Aviation Weather Center product for **in-flight** turbulence, not route-planning forecasts. FAA-sponsored; AWC with NCAR and CIRA via the Aviation Weather Testbed.

## Product traits we care about

| Trait | Detail |
|-------|--------|
| Cadence | Inflight analysis every **15 minutes** (4×/hour) |
| Vertical | 51 altitudes, 100 ft AGL through 50,000 ft |
| Horizontal | CONUS at HRRR resolution (**3 km**) |
| Signals | Clear-air, mountain-wave, convective; lightning, satellite, PIREPs, METARs; NTDA + HRRR |
| Pilot UI | [aviationweather.gov GFA](https://aviationweather.gov/gfa/#obs); mobile-friendly in flight |
| Raw data | GRIB2 on [NOMADS](https://nomads.ncep.noaa.gov/) |

## Implication for 16-Bit Weather

v1 copies the **story** (nowcast-grade bumpiness near you) and **does not** ingest GTGN GRIB2. Existing `/aviation` already shows AWC G-AIRMET polygons + PIREPs. Passenger forecast at `/travel/turbulence` scores those same sources. GTGN ingest is Phase B after v1 ships.
