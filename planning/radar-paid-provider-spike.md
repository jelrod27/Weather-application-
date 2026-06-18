# Radar Paid Provider Spike

## Context

The North America radar modernization now has a public-data baseline:

- US: NOAA MRMS metadata default with Iowa NEXRAD fallback.
- Canada: MSC GeoMet WMS.
- Broader North America/global fallback: RainViewer tile template.
- Severe weather context: NWS alert polygons, SPC outlooks, and recent storm reports.

Paid radar should only be introduced if it improves reliability, coverage, latency, nowcast quality, or user value enough to justify recurring cost and operational complexity.

## Candidate Providers

| Provider | Why evaluate | Cost posture | Notes |
| --- | --- | --- | --- |
| Tomorrow.io Weather Maps | Low published entry price and broad weather map layers | Low paid tier appears plausible | Confirm radar tile call accounting and allowed public web usage before implementation. |
| meteoblue Weather Maps API | Radar, satellite, and forecast map layers with a modern map product | Unknown/custom business pricing | Evaluate only if public baseline feels materially less polished. |
| RainViewer commercial/Pro terms | Already fits the fallback tile model and has radar-specific UX | Public API is free/no-SLA for small use; commercial terms require review | Good first commercial conversation because integration shape is already compatible. |
| Xweather/Aeris | Strong severe weather, lightning, and enterprise radar layers | Likely too expensive for first pass | Do not implement unless a higher budget is explicitly approved. |

## Measurement Gate

Before adopting a paid source, measure the public baseline:

- Average radar page tile requests per view on desktop and mobile.
- Tile requests during a 4-hour animation loop at 1x playback.
- Vercel function invocations and egress if any source is proxied.
- Load time and Lighthouse score for `/radar`.
- Tile failure rate and provider fallback count from logs/Sentry.

## Decision Criteria

Approve a paid provider only if all of the following are true:

- Monthly cost is acceptable at expected traffic with at least 3x headroom.
- Keys remain server-side or are restricted to safe browser usage by the provider.
- Terms allow public consumer web display with required attribution.
- The provider improves at least one visible user outcome: smoother animation, better Canada/Mexico coverage, future radar/nowcast, satellite/lightning, or stronger uptime.
- The implementation can enforce usage caps or graceful fallback before launch.

## Current Recommendation

Ship the public-data baseline first. Then run a short trial with Tomorrow.io and RainViewer commercial terms using measured tile counts from the live baseline. Keep Xweather/Aeris out of scope unless the product direction shifts toward premium severe-weather intelligence.
