# PRD: Bitwatch

**Program:** Bitwatch  
**Product:** 16-Bit Weather  
**Date:** 2026-08-18  
**Status:** In progress (phased delivery)

Bitwatch is the 16-Bit Weather warning program. It is not a Ryan Hall clone brand. Forecast products stay our strength. This spec is the warning/alert gap: US NWS Warning Events, guest Web Push + email, warning desk, takeover, then radar/nowcast auto-detection (Scout).

## Locked decisions

- Parity = US NWS warning product (subscribe, polygons, lifecycle, desk, takeover) plus storm auto-detection.
- Delivery = Web Push + email, guest subscribe, no account required.
- Flash Flood Warning stays a Delivery toggle (their free email is TOR/SVR only).
- Paid phone/SMS/lightning/travel (Y’all Call / WeatherCall) is not a launch gate.
- Nice-weather emails, WIS-DOS ops, shop, YouTube, YallBot, SMS waitlist, NWWS-OI, Associated Account, and global CAP are out of v1.
- Two minutes is a measured percentile SLO, not a launch gate. API ingest + outbox first.
- Each implementation phase is one git commit on `feat/bitwatch`.

## Competitor map (free website)

Ryan Hall Y’all splits alerting across three surfaces:

1. **Y’all Alerts** — guest email when a TOR or SVR **polygon contains a saved point**. GPS / search pin. Upgrade follow-ups (observed / PDS / TE; SVR considerable/destructive). NOAA Weather Radio disclaimer. CONUS. No account. Token manage/unsub. “Detect automatically” = GPS for the pin, not unofficial storm detection.
2. **Warning Center** — national list + detail, IBW tags, population, radar stills, VTEC `common_id`, CAP `action`, ~15s refresh, WeatherWise radar handoff.
3. **Home / local weather** — warning chip, happening-now, GPS+IP pin, display of all NWS types at a point, CTA into TOR/SVR email.

Companions (out of Bitwatch v1): WeatherWise (radar/push app), Y’all Call ($19.95/yr WeatherCall NexGen voice/SMS).

## Current 16-Bit baseline

Shipped: minute cron, TOR/SVR/FF point-in-polygon, guest verify/manage, Resend, web push, takeover, warning desk, WIS, SPC/storm reports. Monitor is an **ID set diff** on `/alerts/active?message_type=alert`. That misses Update/Cancel, has no Warning Event identity, no zone fallback, no outbox, and the desk live-fetches (CDN 120–300s).

Domain language: [`CONTEXT.md`](../../CONTEXT.md). Ingestion/lifecycle/SLO research: [`planning/research/warning-center/`](../research/warning-center/).

## Architecture

Five modules under `lib/bitwatch/`:

1. **Ingest** — `GET /alerts` (alert/update/cancel) for harm products plus a national `/alerts/active` snapshot. Persist Source Messages. VTEC Warning Event identity.
2. **Warning Event store** — `bitwatch_source_messages`, `bitwatch_warning_events`, `bitwatch_ingest_state`.
3. **Place Match** — polygon `ST_Covers` equivalent; NWS point fallback when geometry is null; persist match evidence.
4. **Delivery outbox** — `(warningEventId, lifecyclePhase, protectedPlaceId, channel)` idempotency. Email + Web Push.
5. **Scout** — unofficial approaching-storm Delivery, never labeled as an NWS warning.

```text
NWS CAP → Ingest → Warning Event store → Place Match → Outbox → Email/Push
                              ↓                        ↑
                         Warning desk              Scout (radar/nowcast)
```

## Phases (one commit each)

### 1. Canonical Warning Events

Persist Source Messages and Warning Events. Serve `/warnings` from the store when ingest is fresh (`no-store`), live NWS fallback otherwise. Failed ingest never looks like “no warnings.” Detail pages can resolve ended events from the store.

### 2. Place Match + Delivery outbox

Replace ID-diff monitor. Match Protected Places to Event Actions. Deliver on first cover, polygon expansion, IBW upgrade, cancel/expire wording (not all-clear). Guest/account hazard toggles in schema (TOR/SVR/FF, upgrades).

### 3. Guest `/alerts` landing

GPS + search, no account, Turnstile, per-hazard toggles, upgrade opt-in, manage/unsubscribe on every email, PWA push after verify.

### 4. Warning desk parity

Radar crop (WMS GetMap proxy), population/coverage estimate labeled approximate, priority score, type+state filters, motion/VTEC/zones, store-backed takeover.

### 5. Bitwatch Scout

TIME…MOT…LOC projection and/or nowcast precip toward a Protected Place. Copy: radar-detected, unofficial. Dedup against an overlapping Warning Event.

## SLO (measure, do not promise)

- Discovery: 99% of eligible events observed within 120s of CAP `sent` (monthly).
- Display-ready: 99.9% of accepted ingestions queryable within 30s.
- Delivery: 99% provider acceptance within 120s of local observation.

Provider acceptance is not inbox receipt or user attention.

## Safety copy

Every Delivery, takeover, and desk includes: supplemental heads-up; does not replace WEA, NOAA Weather Radio, or local officials. Cancellation/expiry/loss of polygon is not an all-clear.
