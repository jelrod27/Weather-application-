# Warning Center NWS Ingestion Contract

Research completed for [Choose the authoritative NWS ingestion contract](https://github.com/jelrod27/Weather-application-/issues/511). Facts were verified against first-party NWS sources and live API behavior on August 6, 2026.

## Decision

Use `api.weather.gov` as the initial authoritative ingestion source:

```text
GET /alerts
  ?start=<overlapping UTC watermark>
  &event=Tornado Warning,Severe Thunderstorm Warning,Flash Flood Warning
  &limit=500
Accept: application/geo+json
User-Agent: (16bitweather.co, <operational-contact>)
```

Poll nationally every 30 seconds with one single-flight worker and a stable phase offset. Follow pagination, retain a rolling overlap, and deduplicate by CAP identifier and content hash.

Use `/alerts`, not only `/alerts/active`, because the seven-day collection includes Alert, Update, and Cancel messages. Use a filtered `/alerts/active` snapshot periodically for reconciliation.

## Polling rules

- Never poll more frequently than every 30 seconds.
- Start each incremental query from the previous successful watermark with at least 15 minutes of overlap.
- Do not advance the watermark after a timeout, malformed response, or upstream failure.
- Follow `pagination.next` until exhausted.
- Key messages by CAP `identifier` and retain a content hash for rare same-identifier mutations.
- Apply transitions through CAP `messageType`, `references`, and `expiredReferences`.
- Run active-state reconciliation periodically and a broader seven-day reconciliation after extended outages.
- Respect NWS cache metadata without relying on conditional requests.

Live testing found weak ETags but no dependable `304 Not Modified` behavior. Do not add random cache-busting query parameters; perform application-level deduplication.

## Rejected primary paths

- `/alerts/active` alone can miss short-lived messages and lifecycle transitions.
- Point or zone polling multiplies requests and is unsuitable for national collection.
- The Atom feed shares API infrastructure, omits full CAP content, and introduces per-message fetch bursts.
- Legacy `alerts.weather.gov` Atom feeds are not an independent fallback.

## Future low-latency supplement

NWS exposes no unauthenticated webhook, SSE, or WebSocket stream from `api.weather.gov`.

NWWS Open Interface is the official credentialed XMPP push path and is described as delivering text products within roughly ten seconds. It is the logical future supplement if measured API freshness is insufficient, but it introduces credentials, reconnect behavior, maintenance windows, and separate operational infrastructure.

## Freshness interpretation

A 30-second poll can support a measured two-minute objective but cannot guarantee it. NWS publication latency consumes part of the budget before 16-Bit Weather receives the message, and documented long-tail delays can exceed ten minutes.

Measure these intervals separately:

1. CAP `sent` to local ingestion.
2. API availability to local ingestion.
3. Local ingestion to persisted Warning Center visibility.
4. Local ingestion to provider acceptance for each Delivery channel.

The two-minute target must be expressed as an SLO with a percentile and measurement boundary, not as a safety guarantee.

## Failure policy

- Back off with bounded jitter after `429`, `5xx`, timeout, or malformed responses.
- Preserve the watermark and reconcile after recovery.
- Alert on NWS `/health` publication latency; faster polling cannot repair upstream delay.
- Monitor NWS Service Change Notices and `/alerts/types`.
- Expect API and Atom failure to correlate.
- Never convert an upstream failure or empty response into a Warning Event ending.

## Remaining decisions

- Whether two minutes is an aspirational SLO or a launch gate.
- Whether API-only ingestion is acceptable for initial proactive Delivery.
- Whether NWWS-OI redundancy is required before launch.
- Which freshness threshold marks data and Deliveries as delayed.
- Which percentile and boundary define SLO success.

## Primary sources

- [NWS API Web Service](https://www.weather.gov/documentation/services-web-api)
- [NWS Alerts Web Service](https://www.weather.gov/documentation/services-web-alerts)
- [NWS OpenAPI specification](https://api.weather.gov/openapi.json)
- [NWS CAP guide](https://www.weather.gov/media/alert/CAP_v12_guide_05-16-2017.pdf)
- [NWS Alerts Geolocation Guide](https://www.weather.gov/media/documentation/docs/NWS_Geolocation.pdf)
- [NWWS Open Interface FAQ](https://www.weather.gov/nwws/faq)
- [NWS Service Change Notices](https://www.weather.gov/notification)
