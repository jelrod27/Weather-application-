# Warning Event Lifecycle and Protected Place Matching

Research completed for [Define Warning Event lifecycle and spatial-match semantics](https://github.com/jelrod27/Weather-application-/issues/512). Facts were verified against CAP, NWS, GeoJSON, and PostGIS primary sources on August 6, 2026.

## Decision

Model three separate concepts:

1. **Source Message**: one immutable CAP/API message.
2. **Warning Event**: the NWS hazard tracked across continuations, extensions, cancellations, and expiration.
3. **Event Action**: the effect one Source Message has on one Warning Event and geographic segment.

A **Place Match** records whether and why one Event Action covers one version of a Protected Place.

Do not treat one NWS alert ID as the Warning Event identity.

## Canonical identity

- Identify a Source Message by `(sender, identifier, sent)`. Preserve both the API retrieval URI and CAP identifier.
- Identify a Warning Event from each P-VTEC string using ETN origin year, office, phenomenon, significance, and ETN.
- Represent the relationship between messages and events explicitly because one message may end one event while starting its replacement.
- Use CAP `references` to build an immutable supersession graph, not as the event identity itself.
- If VTEC is absent or malformed, construct a provisional event from the connected CAP-reference component. Never infer identity from headline, area text, or time proximity.

Process messages idempotently by authoritative sent time and references rather than arrival order.

## Lifecycle semantics

- `NEW` starts event coverage.
- `CON`, `EXT`, `EXA`, and `EXB` revise or extend the same event.
- `CAN` ends the event only for the action's geographic segment.
- `UPG` ends the old event segment and links its separately identified replacement.
- `EXP` indicates that the event is ending or ended at its scheduled VTEC time.
- `COR` corrects metadata without creating another event.
- CAP Update supersedes referenced Source Messages but does not prove that the Warning Event ended.
- CAP Cancel ends referenced message coverage; VTEC actions remain authoritative when present.
- CAP `expires` marks message staleness and may differ from event end time.

Maintain global and place-relative state separately. A Warning Event may remain active elsewhere after it stops covering one Protected Place.

## Spatial matching

### Valid Polygon or MultiPolygon

- Treat the warning geometry as authoritative.
- Use `ST_Covers(warning_geometry, place_point)` so boundary points count.
- Do not union warning polygons with entire listed counties.
- Preserve holes and multipart geometry in WGS-84 longitude/latitude order.

### Null geometry

- Normalize `affectedZones` and `geocode.UGC`.
- Match against versioned official county, public-zone, fire-zone, or marine-zone geometry using `ST_Covers`.
- Preserve zone type because identifiers can overlap across zone classes.
- A point-specific active-alert query may confirm membership as a live fallback.

### Missing or invalid geometry and unusable UGC

- Confirm currently active membership through `/alerts/active?point=lat,lon`, matching by CAP/VTEC identity.
- Otherwise mark the result unresolved.
- Never silently treat unresolved data as matched or clear.

Do not use `areaDesc`, headline text, centroids, bounding boxes, or SAME codes alone for safety Delivery.

## Match evidence

Persist:

- Source Message key.
- Warning Event key.
- Protected Place coordinate and version.
- Matching method.
- Polygon or zone dataset version.
- Spatial predicate result.
- Evaluation timestamp.

Re-evaluate every revision because polygons can expand or shrink. Losing coverage means the place is no longer in that warning's official area, not that conditions are safe.

## Failure and wording rules

- Stale or failed ingestion produces unknown status, never a negative match.
- Cancellation, expiration, disappearance, and loss of polygon coverage are not an all-clear.
- Use official wording such as cancelled, expired, ended, or no longer inside the updated warning area.
- Ignore Test, Exercise, Draft, and System messages outside explicit test mode.
- Persist raw messages immediately because the API retains only a short history.
- Retain the official boundary version used for historical matching.

## Existing-system gaps

- Current alert types discard lifecycle, reference, zone, geocode, and VTEC fields.
- Monitor state diffs only message IDs, so revisions can look like new warnings.
- Fetch failures become empty point results and can trigger false ended messaging.
- Rounded point-cache keys can merge locations on opposite sides of a polygon.
- Current monitor state cannot represent event identity, actions, successors, match evidence, or terminal causes.
- The keyword filter is broader than the three chosen Warning Event types.

## Remaining decisions

- Official zone dataset and versioning strategy.
- Whether point fallback is synchronous or asynchronous.
- Staleness threshold before scheduled expiry becomes status unavailable.
- Stable external IDs for provisional events after merging.
- Upgrade/replacement Delivery wording.
- Whether geocoder accuracy is stored and displayed.

## Primary sources

- [OASIS CAP 1.2](https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2-os.html)
- [NWS OpenAPI specification](https://api.weather.gov/openapi.json)
- [NWSI 10-1703](https://www.weather.gov/media/directives/010_pdfs/pd01017003curr.pdf)
- [NWS CAP guide](https://www.weather.gov/media/alert/CAP_v12_guide_05-16-2017.pdf)
- [NWS Alerts Geolocation Guide](https://www.weather.gov/media/documentation/docs/NWS_Geolocation.pdf)
- [RFC 7946: GeoJSON](https://www.rfc-editor.org/rfc/rfc7946.html)
- [PostGIS ST_Covers](https://postgis.net/docs/en/ST_Covers.html)
