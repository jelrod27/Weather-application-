# News source evidence

Issue [#675, phase 3](https://github.com/jelrod27/Weather-application-/issues/675) replaces publication recency as evidence of an active hazard. Phase 4 owns the full section layout, ranking, view-all controls, and visible-page network refresh.

`fetchFeed` returns items and source health together. Valid empty collections are successful observations; HTTP failures, invalid document shapes, and all-rejected collections are unavailable or delayed. Mixed valid/invalid or capped collections are partial. Health reports received/accepted/rejected counts, pages, truncation, coverage, observed item-time range, and independent attempt/success times. Response `lastUpdated` means assembly time only. The route, including `featured=true`, sends `no-store`; source snapshots provide caching.

## Freshness and bounds

These are application budgets, not provider delivery guarantees. The source's successful retrieval time never advances on a cache hit, assembly, or failed attempt. USGS generation time and upstream HTTP Age can shorten freshness. NWS page checks share a 20-second deadline; partial traversal never verifies active status.

| Source | Poll on demand | Freshness budget | Delayed retention from successful retrieval | Collection bound |
|---|---|---|---|---|
| NWS actual national alerts | 2 minutes | 5 minutes | 1 hour | 8 pages, 500 records per page |
| USGS earthquake GeoJSON | 5 minutes | 15 minutes | 24 hours | 500 records per feed |
| SPC and NHC | Configured `refreshInterval` | Twice the poll interval | 6 hours | 30 feed items |
| Volcano and editorial feeds | Configured `refreshInterval` | Twice the poll interval | 48 hours | 30 feed items |

Failed checks retry after 30 seconds when requested. Concurrent requests for the same source share one fetch. Snapshot storage is bounded by the configured feed inventory and item caps, in server memory only. Warm instances can retain delayed evidence; a cold instance with no prior successful snapshot reports unavailable. There is no cross-instance persistence guarantee and no new paid storage. Cold starts can increase provider requests. Every response and the open page re-evaluate freshness; expired retention removes the reports. Network refresh while a page remains visible is phase 4.

The national NWS request is `/alerts/active?status=actual`. Its active endpoint rejects a `limit=500` query (verified October 11, 2026), so the record bound is enforced locally. Follow only supplied HTTPS continuation links on `api.weather.gov`, with no credentials or custom ports. Invalid/repeated continuations, conflicting message IDs, page limits, malformed rows, and later-page failure make coverage incomplete. There is no national all-clear claim from incomplete evidence.

## Identity and lifecycle

- NWS uses the existing CAP adapter, VTEC parser, and warning lifecycle selector. Resolve cancellations, expiration, future validity, upgrades, and geographic revisions before selecting the active lane. Validate raw required message types before adapter compatibility defaults. CAP references are retained; revisions without VTEC make the snapshot partial because the existing geographic selector cannot establish replacement coverage. Only fresh, complete NWS snapshots can verify warnings. Watches/advisories and uncertain reports stay outside that lane. Unknown severity remains unknown.
- VTEC identifies a warning event, not a physical storm. Group only matching event IDs and exact affected-area sets, preserving original CAP bulletin links. Missing VTEC or area identity falls back to an individual message; similar headlines never join hazards.
- USGS uses its event ID. `timestamp`/`occurredAt` are occurrence time; `updatedAt` is the later catalog update. A recently revised old quake never becomes a new occurrence. Overlapping feeds can group only the same event ID.
- NHC uses explicit ATCF IDs in the cyclone namespace or bulletin text. Rotating product wallets, names, and images do not establish a cyclone identity. Preserve product GUIDs/URLs, bulletin timestamps, and terminal-status evidence in each retained update. A later discussion cannot erase the group's final-advisory/handoff label; that label reports provider evidence, not the physical end of the cyclone. NHC active status remains unverified.
- Volcano notices preserve the reported alert level and issue time, but their identity and active lifecycle are not verified. The UI and source coverage disclose that limitation.

Grouped records retain their individual official updates. Items declare hazard, outlook, event, or story meaning. Source uncertainty overrides priority; neither a high-priority flag nor a fresh publication date establishes active status. Delayed NWS and partial NWS reports appear outside the active lane and hero.

## Evidence and verification

Recorded fixtures and retrieval provenance are in `__tests__/fixtures/news/phase3-provenance.json`. The NWS fixture is an excerpt, explicitly **not** proof of full national coverage. Synthetic pages exercise cancellations, different areas, incomplete pagination, failure/recovery, and freshness/retention clocks. Tests also cover malformed XML/JSON, provider cache age, cache reads, independent source failures, USGS occurrence/update times, and NHC final products. Browser coverage in `tests/e2e/news-integrity.spec.ts` checks open-page expiry and unavailable coverage, alongside the existing news and imagery journeys.

Provider references: [NWS API documentation](https://www.weather.gov/documentation/services-web-api), [USGS GeoJSON contract](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php), [NHC Atlantic RSS](https://www.nhc.noaa.gov/index-at.xml). Recheck these contracts when adding an active source; the labels here deliberately narrow the claim to validated evidence.
