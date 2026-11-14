# Winter map source feasibility — November 14, 2026

Status: research complete; **no implementation approval**. Scope: contiguous United States first. This note evaluates readily consumable official map services; it does not propose alert subscriptions or a GRIB-processing pipeline.

## Recommendation

The smallest useful release is a **CONUS forecast map** with a Day 1–3 selector and two clearly separated views:

- **Snowfall probability:** initially the chance of at least 4 inches in the displayed 24-hour window; 8- and 12-inch thresholds can follow using the same service.
- **Winter impacts:** WPC Winter Storm Severity Index (WSSI), using its official impact categories.

These answer different questions. A probability is not an expected accumulation; WSSI is not a snowfall amount. Show the source, legend, issuance time, and actual valid start/end beside the map. WSSI itself states that it does not depict official warnings. Its short-range Day 1 window can be shortened as the cycle advances, so do not label every selection “the next 24 hours.” [WPC snowfall products](https://www.wpc.ncep.noaa.gov/wwd/winter_wx.shtml), [WSSI display](https://www.wpc.ncep.noaa.gov/wwd/wssi/wssi.php)

**Defer snow depth:** NOAA publishes an appropriate analysis service, but its current raster returned entirely transparent images in the probes below. An HTTP 200 and fresh catalog metadata did not establish that the snow pixels were available. Treat depth as a separate feasibility gate, not a launch dependency.

## Candidate layers

| Product | Meaning and coverage | Timing and units | Practical limitation |
| --- | --- | --- | --- |
| WPC snowfall probability | Forecast probability of threshold snowfall in CONUS; Day 1–3 layers for at least 4, 8, or 12 inches, plus ice layers. | 24-hour valid periods; service metadata says roughly 09Z/21Z updates. Polygon categories are slight 10–39%, moderate 40–69%, high 70–100%. | Broad probability contours, not a continuous exact probability, a point forecast, or observed snowfall. Preserve threshold, period, and category. |
| WPC WSSI overall | Forecast winter impacts over CONUS from weather forecasts plus climatology and societal/environmental factors. | Updated every two hours; Days 1, 2, 3 and combined Days 1–3. Categories: winter weather area, minor, moderate, major, extreme. | Categorical impacts, not inches or an issued warning. The “Snow Amount” component also measures impacts, not snow depth. |
| NOHRSC snow depth analysis | Estimated snow on the ground: model plus assimilated ground, airborne and satellite observations. Official service describes coterminous-US coverage. | Analysis, not forecast. Service lists ingest updates at approximately 01:20/05:20/11:20/17:20Z; valid time can precede ingest substantially. NSA display supports inches and metric; service legend unit mapping still needs explicit confirmation. | Not direct measurements at every pixel, not new snowfall, and not current precipitation type. Blank raster gate unresolved. Geographic service envelope extends into Canada, but does not establish validated Canadian coverage. |

Sources: [snowfall service metadata](https://mapservices.weather.noaa.gov/vector/rest/services/precip/wpc_prob_winter_precip/MapServer?f=pjson), [snowfall layer schema/renderer](https://mapservices.weather.noaa.gov/vector/rest/services/precip/wpc_prob_winter_precip/MapServer/1?f=pjson), [WSSI metadata](https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/wpc_wssi/MapServer?f=pjson), [snow analysis metadata](https://mapservices.weather.noaa.gov/raster/rest/services/snow/NOHRSC_Snow_Analysis/MapServer?f=pjson), [NOHRSC analysis display](https://www.nohrsc.noaa.gov/nsa/), [NOHRSC model/assimilation explanation](https://www.nohrsc.noaa.gov/archived_data/).

The services above do **not** establish Alaska, Hawaii, Canadian, or global winter coverage. Explicitly label CONUS scope and unavailable areas. Do not interpret blank outside coverage as no snow.

## Concrete service paths and OpenLayers feasibility

### Snowfall probability

Base: `https://mapservices.weather.noaa.gov/vector/rest/services/precip/wpc_prob_winter_precip/MapServer`

- REST layer IDs for 4-inch threshold: **1 / 6 / 11** for Days 1 / 2 / 3. For 8 inches: 2 / 7 / 12; for 12 inches: 3 / 8 / 13. Ice: 4 / 9 / 14. Verify names on each metadata refresh rather than assuming IDs never change.
- Rendered overlay: `{base}/export` with `layers=show:1`, `bboxSR=3857`, `imageSR=3857`, `format=png32`, `transparent=true`, viewport bbox/size, `f=image`.
- GeoJSON: `{base}/1/query?where=1%3D1&outFields=outlook,issue_time,start_time,end_time&returnGeometry=true&f=geojson`. Bound/simplify requests and handle transfer limits; this unbounded example is a protocol illustration.
- Legend/schema: `{base}/legend?f=pjson`, `{base}/1?f=pjson`.
- WMS advertised at `https://mapservices.weather.noaa.gov/vector/services/precip/wpc_prob_winter_precip/MapServer/WMSServer`; its GetCapabilities/GetMap were not probed in this investigation.

The renderer uses colored **outlines** with transparent fill. A successful export may therefore look sparse. Any later filled-polygon presentation must preserve the probability category meanings and nested contour behavior. [Source renderer](https://mapservices.weather.noaa.gov/vector/rest/services/precip/wpc_prob_winter_precip/MapServer/1?f=pjson)

### WSSI

Base: `https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/wpc_wssi/MapServer`

- REST overall-impact layers: **1 / 2 / 3 / 4** for Day 1 / Day 2 / Day 3 / Days 1–3.
- Same `/export`, `/legend`, and `/{id}/query?f=geojson` patterns as above. Useful fields include `impact`, `issue_time`, `start_time`, `end_time`, `valid_time`, `idp_filedate`, and `idp_ingestdate`.
- [WMS capabilities](https://mapservices.weather.noaa.gov/vector/services/outlooks/wpc_wssi/MapServer/WMSServer?service=WMS&request=GetCapabilities) were fetched. **WMS names differ from REST IDs:** overall Day 1 is WMS `24`, while REST is `1`; combined Days 1–3 is WMS `21`, while REST is `4`. Advertised CRS were geographic (`CRS:84`, EPSG:4326), not EPSG:3857.

### NOHRSC depth — deferred

Base: `https://mapservices.weather.noaa.gov/raster/rest/services/snow/NOHRSC_Snow_Analysis/MapServer`

- REST depth mosaic is `0`; its image is `3`, footprint `2`; SWE mosaic is `4`, image `7`.
- Footprint timestamps: `{base}/2/query?where=1%3D1&outFields=idp_validtime,idp_issueddate,idp_filedate,idp_ingestdate&returnGeometry=false&f=pjson`.
- [WMS capabilities](https://mapservices.weather.noaa.gov/raster/services/snow/NOHRSC_Snow_Analysis/MapServer/WMSServer?service=WMS&request=GetCapabilities): depth image name is **`5`**, not REST `3`; SWE image is WMS `1`. Geographic CRS advertised.
- A GeoJSON footprint is catalog geometry, **not snow-depth values or snow-cover polygons**. Do not turn a bounding footprint into snow coverage.

All three services report `singleFusedMapCache: false`; do not assume an XYZ `/tile/{z}/{y}/{x}` cache exists. ArcGIS image export is directly compatible with OpenLayers `ImageArcGISRest`, whose official API accepts MapServer URLs, layer selection and dynamically computed bbox/projection/size. WMS and vector GeoJSON are alternatives. This establishes a feasible integration mechanism without requiring an Esri JavaScript SDK; browser behavior, CSP and performance still need a later implementation check. [OpenLayers ImageArcGISRest API](https://openlayers.org/en/latest/apidoc/module-ol_source_ImageArcGISRest-ImageArcGISRest.html)

These services say they are **not time enabled**. A Day selector chooses distinct layers; it is not permission to request historical cycles through a `TIME` parameter.

## Dated live checks

Direct HTTPS probes ran **November 14, 2026, approximately 17:12–17:16 UTC**, using Python's HTTP client. Documentation was also retrieved through Firecrawl; some documentation responses were cached. The following direct API observations are a snapshot, not an availability guarantee or a browser/E2E test.

| Probe | Observed result |
| --- | --- |
| All three MapServer metadata documents | HTTP 200; expected layer inventories and descriptions. |
| WSSI REST layer 1 attributes | Issue `2026-11-14 1516Z`; valid `15Z 11/14/26 - 12Z 11/15/26`. |
| WSSI export in EPSG:3857 | HTTP 200, `image/png`, 384×256, 12,686 bytes. Pixel content was not visually reviewed. |
| WSSI GeoJSON, one unsimplified feature | HTTP 200 FeatureCollection, MultiPolygon; **3,613,641 bytes**. This is meaningful mobile/performance risk even for one nationwide feature. |
| Snowfall probability layer 1 attributes | `Slight (10-39%)`, issue `2026-11-14 08:26:53`, valid `12Z 11/14/26 - 12Z 11/15/26`. Source strings omit timezone in some fields; corroborate with `valid_time` and epoch metadata rather than device-local parsing. |
| Snowfall probability export / GeoJSON | Export: HTTP 200 PNG, 384×256, 2,041 bytes. A one-feature GeoJSON query with `geometryPrecision=2` returned 623 bytes; this is not a full-layer payload estimate. |
| NOHRSC footprint timestamps | Valid/reference **09:00Z**; file **17:05:07Z**, ingest **17:05:43Z**. Recent ingestion does not mean recent observation. |
| NOHRSC depth/SWE EPSG:3857 raster-only exports | HTTP 200 PNG, 384×256, 1,014 bytes each; decoded alpha showed **zero nontransparent pixels**. Depth mosaic `show:0` drew green footprint/boundary pixels only. |
| NOHRSC depth cross-checks | REST image `3` in EPSG:4326 and WMS image `5` in CRS:84 both returned entirely transparent PNGs over `-126,24,-66,51`. This was not resolved; neither “no snow” nor a definitive cause can be inferred. |
| CORS with `Origin: https://16bitweather.co` | Sample REST query/export responses echoed that origin. No-Origin requests lacked the header. Actual browser integration was not tested. |

Reproducible export parameters: `/export?bbox=-14500000,2800000,-7300000,6500000&bboxSR=3857&imageSR=3857&size=384,256&format=png32&transparent=true&layers=show:1&f=image` on the WSSI or snowfall base. For NOHRSC raster-only depth use `layers=show:3`. Geographic depth cross-check uses `bbox=-126,24,-66,51&bboxSR=4326&imageSR=4326`.

## Attribution, cost and reliability

NWS states that its web information is generally public domain and usable without charge **unless specifically noted otherwise**, with restrictions on misrepresenting ownership, endorsement, and modified content as official material. These services identify NOAA/NWS/WPC or NOHRSC as source; no API key was required for these probes. Display visible source attribution and links. This is not a blanket license for third-party basemap content, logos, or every future dataset. No paid source subscription is evidenced as necessary for these three official layers. [NWS use/disclaimer policy](https://www.weather.gov/disclaimer)

The same policy disclaims guaranteed timely Internet delivery, asks clients to respect source refresh intervals and limit requests to needed data, and advises at least one-minute intervals when retrying an unavailable web service. Plan caching, bounded requests, backoff and separate failure states; do not treat HTTP 200 or PNG decoding as evidence of meteorological freshness.

Required behavior for a later implementation:

- Distinguish **source issued**, **valid period**, and **app fetched** times. Derive freshness from source timestamps and its cadence, with a documented grace interval; do not reset source age when cached data is fetched again.
- Distinguish valid empty/under-threshold coverage, unavailable, loading, stale, and outside-CONUS states. A blank image cannot establish zero snow or zero impact by itself.
- Retain a known-good snapshot only with its original timestamp and a stale label; remove or disable expired forecast overlays after a defined limit. Never silently substitute radar for accumulation, snow depth for snowfall, or another cycle while retaining the old legend/times.
- Check metadata and imagery refer to the same source cycle. These are mutable “latest” services: a cycle may change between requests, and historical pinning is not established here.

## RainViewer is supporting radar, not the winter data answer

The detailed Weather Maps API describes two hours of past composite reflectivity, ten-minute frame spacing, maximum source zoom 7, and a `snow=1` option to use different snow colors. Its documentation does not establish a validated measured precipitation-type field, freezing-rain/sleet classification, accumulated snowfall, snow-on-ground depth, or probability forecasts. Frame `time` describes mosaic generation; contributing radars may have different observation times. Geographic reach depends on radar coverage; its coverage mask is not updated frequently. [Weather Maps API](https://www.rainviewer.com/api/weather-maps-api.html)

The [transition notice](https://www.rainviewer.com/api/transition-faq.html) explicitly says future radar, satellite IR and most color schemes were discontinued January 1, 2026; it specifies 100 requests/IP/minute. This conflicts with generic overview FAQ text mentioning nowcast and no posted hard limits. Follow the specific transition/current endpoint contract and confirm with the provider before expansion. No live RainViewer endpoint was probed here.

Its public API terms target personal/educational/small community use, require visible linked attribution, provide no SLA, and direct commercial/high-volume use to bespoke terms. The platform's educational purpose alone does not settle eligibility for every use. Existing RainViewer reuse does not remove this gate. [RainViewer API terms](https://www.rainviewer.com/api.html)

## Gates before approving implementation

1. Confirm the two forecast views and CONUS scope with explicit legends and actual valid periods. Do not promise deterministic snowfall totals from these probability/impact layers.
2. Validate rendered WSSI/probability content against the WPC display for a current event and a quiet cycle; validate pan/zoom alignment, contour semantics, mobile payloads, CORS/CSP, attribution and accessible legend/details.
3. Establish metadata/imagery cycle consistency and honest handling of an empty layer. The successful samples above contain features; a quiet-cycle timestamp path is still unproven.
4. Agree and test source-specific stale/outage thresholds, cache intervals, time parsing, expired validity and partial-load behavior. A map must not imply no hazard because upstream imagery is missing.
5. Keep NOHRSC depth deferred until actual snow pixels render and agree with the NSA display, legend units/NoData are established, and valid-time aging is verified. Do not add a new raw-data pipeline merely to bypass this failed service check.

No production files, dependencies, routes, or tests changed. Application test/build/lint suites were not run because this change is a sourced research document only. Live service checks are described above; their untested limits are intentional feasibility gates.
