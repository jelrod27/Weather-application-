# Turbulence source feasibility

Reviewed 2026-10-04 for [issue #657](https://github.com/jelrod27/Weather-application-/issues/657) and [PRD v3](../prds/PRD-travel-turbulence-forecast.md). This is a source and delivery assessment, not validation of forecast accuracy.

## Decision

The user selected **a clearly labeled US advisory map first, with expansion later** during this implementation session. The first release therefore displays contiguous-US G-AIRMET turbulence advisories. It must say what those advisories cover and must not present them as a complete North America turbulence forecast. This is an explicitly approved narrower release, not completion of the continental forecast proposal.

No verified, unrestricted, continent-wide turbulence forecast tile or JSON service emerged from this review. The strongest broader candidate is WAFS through WIFS, subject to eligibility and data-processing gates. No account application, paid service, infrastructure installation, or GRIB ingestion was performed.

## Sources and practical fit

| Source | Verified contract | Fit and remaining gate |
|---|---|---|
| AWC G-AIRMET Data API | Public JSON/GeoJSON/XML; advisory coverage is the contiguous 48 states. Alaska AIRMETs are a separate product. | Practical for the approved advisory release. Preserve provider validity, altitude and severity; an empty response does not establish smooth conditions. [AWC API](https://aviationweather.gov/data/api/) |
| NOAA DAFS GTG v4 | Public NOMADS GRIB2; CONUS only; 3 km; hourly runs with F000–F018; CAT, mountain-wave, convective and maximum EDR products. Published volume is approximately 155 MB per forecast hour. | Genuine forecast guidance, but no continental coverage. Needs a separate approved decoder/rendering/cache pipeline and sample validation, not raw downloads for each page request. [NWS implementation notice](https://www.weather.gov/media/notification/pdf_2025/scn25-80_Updated_DAFS_aaa.pdf) |
| NOAA GTGN | CONUS 3 km nowcast, refreshed every 15 minutes, 51 altitude outputs. Public GRIB2 on NOMADS. | Useful future nowcast layer, not a substitute for future trip forecast periods or Canadian/Mexican coverage. Exact altitude reference must be checked in GRIB metadata before UI labels. [NWS announcement](https://www.weather.gov/news/260803-gtgn) |
| WAFS through WIFS | Global gridded guidance; turbulence at 0.25 degrees and FL100–FL450. | Best documented geographic fit. WIFS approval and API credentials are required; a passenger education site must not assume eligibility. [WIFS overview](https://connect.aviationweather.gov/wifs/) |
| ECCC aviation four-panel charts | Documented North America/Arctic charts for +6/+12/+18/+24 hours from 00/12 runs; high-level DVSI at 400–200 hPa and mid-level DVSI at 700–400 hPa. | A potentially useful official chart reference. This review did not establish a current downloadable georeferenced turbulence layer, coverage mask, metadata contract or accessible area data. DVSI is not interchangeable with EDR or aircraft ride severity. [ECCC chart documentation](https://eccc-msc.github.io/open-data/msc-data/nwp_rdps/aviation-package_en/) |

The [NOMADS catalogue](https://nomads.ncep.noaa.gov/) links both [DAFS production](https://nomads.ncep.noaa.gov/pub/data/nccf/com/dafs/prod/) and [GTGN production](https://nomads.ncep.noaa.gov/pub/data/nccf/com/gtgn/prod/). The DAFS listing exposed dated operational directories, including `dafs.20261004`, when reviewed. This establishes distribution availability, not that a decoder or visualization has been tested. NOMADS does not list a GRIB-filter service for these two products; a future pipeline must validate its actual subset/download method.

## Broader forecast gates

The [WIFS user guide](https://aviationweather.gov/wifs/users_guide/) describes approved users supporting international air navigation, API-key access, four daily updates, and GRIB2 turbulence items. The documented forecast groups cover hourly F06–F24 and three-hourly F27–F48. Limits include 100 requests/minute, no more than one request/minute per endpoint/thread, and 5,000 data requests/day. Confirm permission for this site's intended public display and redistribution before adopting it. The guide contains a future-dated revision-history entry, so implementation must verify current collection metadata and actual samples rather than relying on every historical table. No authenticated sample was retrieved.

ECCC's [GeoMet platform](https://eccc-msc.github.io/open-data/msc-geomet/readme_en/) offers free anonymous geospatial services, but that does not prove a suitable aviation turbulence layer is published. Any ECCC expansion needs an identified supported layer, actual issue/valid-time samples, legend semantics and demonstrated US/Canada/Mexico coverage. Do not reverse-engineer private map endpoints or infer turbulence from ordinary wind or astronomy-seeing fields.

For either gridded option, validate native altitude reference, missing-value masks, native units, forecast time versus run time, and category interpretation. Generate bounded, cached display assets once per product update; benchmark compute, storage, transfer and latency before choosing a Vercel deployment design. A map renderer can then consume those assets, but the processing infrastructure is a separate scope decision.

## Use, attribution and reliability

[NWS terms](https://www.weather.gov/disclaimer) generally permit lawful reuse of public-domain NWS material unless otherwise noted. Attribute the source, distinguish transformed displays from official products, and avoid implied endorsement. Public Internet delivery is not guaranteed; refresh against provider cadence, back off on failures and label stale products. These general terms do not override WIFS account restrictions or third-party rights.

[ECCC's data licence](https://eccc-msc.github.io/open-data/licence/readme_en/) permits reuse and adaptation, including commercial use, subject to attribution and exclusions. Preserve any product-specific third-party attribution and avoid implying endorsement. Access conditions and licence terms must be rechecked at integration time.

## Approved first-release checks

- Normalize the documented G-AIRMET response contract in shared domain code; do not silently drop valid polygons because JSON is mistaken for GeoJSON.
- Label coverage **contiguous United States**. Canada, Mexico, Alaska and Hawaii are not covered by this layer.
- Show actual source times and altitude bounds. Missing or malformed metadata stays unknown; never invent a valid time or zero altitude.
- Separate advisory absence, unsupported selections, stale/expired products and upstream failure. None means a smooth forecast.
- Provide map and accessible list equivalents, with calm source-aligned wording and an educational-use disclaimer.
- Defer gridded forecast guidance, North America claims, independent scores and approximate-trip conclusions until their respective source and product gates are approved.

This review performed documentation and public distribution-list checks only. It did not decode a model fixture, validate meteorological calibration, register credentials, or test a continental forecast visualization. Those remain explicit gates for expansion.
