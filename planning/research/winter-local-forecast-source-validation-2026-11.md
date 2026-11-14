# Local winter forecast source validation — November 14, 2026

Status: implementation evidence for the approved full Winter experience. This note establishes a local forecast contract; it does not establish comparative forecast accuracy or authorize additional subscriptions. Only this research note was edited by its author.

## Decision

Use the National Weather Service point forecast and raw grid data for local winter conditions, snow/ice accumulation periods, hourly weather timing, temperature, and wind. Discover the correct grid through `/points/{latitude},{longitude}` rather than calculating it. Use the returned IANA `timeZone` for display. Show the official local narrative alongside structured data. Keep WPC snowfall-threshold probabilities and WSSI categorical impacts separate.

This gives useful local forecasting without processing GRIB or buying a new service. NWS publishes forecasts on approximately 2.5 km grid cells, so a city pin is a grid forecast, not a street-level measurement. [NWS API documentation](https://www.weather.gov/documentation/services-web-api), [official gridpoint FAQ](https://weather-gov.github.io/api/gridpoints)

## Endpoint and data contract

1. Request `https://api.weather.gov/points/39.7392,-104.9903` with an identifying `User-Agent` and JSON/GeoJSON Accept header.
2. Read `properties.forecastGridData`, `forecastHourly`, `forecast`, `timeZone`, and `relativeLocation`. Mapping may change; refresh point metadata periodically.
3. Fetch raw grid plus hourly and narrative forecast independently. Do not discard all local results if one optional response fails. Every retained component needs its original source timestamp.

The actual fields are **`snowfallAmount`** and **`iceAccumulation`**, not `snowAmount`. Each numeric grid layer has a layer-level `uom` and `values: [{ validTime, value }]`. `validTime` is a start plus ISO-8601 duration, for example `2026-11-16T06:00:00+00:00/PT6H`. Null means no applicable data, not zero. Consecutive equal values can be merged by the API; interval handling must preserve the meaning of each element. [Gridpoint FAQ](https://weather-gov.github.io/api/gridpoints)

| Grid property | Live unit | Meaning / safe display |
| --- | --- | --- |
| `snowfallAmount` | `wmoUnit:mm` | Expected **new snow depth** accumulated over source periods; convert millimeters to inches by dividing by 25.4. Not snow water equivalent or snow already on the ground. |
| `iceAccumulation` | `wmoUnit:mm` | Expected ice accumulation over source periods; preserve periods and divide by 25.4 for inches. No data does not mean no freezing rain. |
| `temperature`, `apparentTemperature` | `wmoUnit:degC` | Temperature over the valid interval; Fahrenheit is `C * 9 / 5 + 32`. |
| `windSpeed`, `windGust` | `wmoUnit:km_h-1` | Wind over its valid interval; divide by 1.609344 for mph. |
| `probabilityOfPrecipitation` | `wmoUnit:percent` | Chance of any precipitation; do not relabel as probability of snow or threshold snowfall. |
| `weather` | array of objects | Source weather types such as `snow_showers`, `rain_showers`, `freezing_rain`, plus coverage/intensity attributes. Preserve combinations rather than deriving type from surface temperature alone. |

These are observed units from the endpoints below, not permission to assume every response always has them. Validate finite values, supported units, timestamp/duration syntax, and array/object shape. Unknown units or malformed entries should become unavailable, not be coerced into numbers.

The hourly endpoint has explicit `startTime`/`endTime`, `shortForecast`, temperatures (observed in Fahrenheit), wind strings (observed in mph), and precipitation probability. Default forecast fields may also have quantitative-value feature flags; do not opt into unimplemented shapes accidentally. Its `detailedForecast` is usually empty. The regular forecast provides approximately 12-hour narrative periods with meaningful `detailedForecast`. [NWS endpoint and feature-flag documentation](https://www.weather.gov/documentation/services-web-api)

## Accumulation and timing rules

NWS defines snow amount as the expected total new snowfall over a **six-hour period**, with boundaries at 00/06/12/18Z. It is not an hourly snowfall rate. The live API had shortened first periods followed by six-hour blocks. [NDFD metadata](https://www.weather.gov/gis/ndfd_metadata.html)

- Display actual source accumulation windows. A six-hour amount must not be duplicated into all six hourly rows, multiplied by duration, or silently divided into an invented hourly distribution.
- An hourly conditions timeline can say when NWS forecasts snow, a mix, or freezing rain. That does not establish exact onset minute, snowfall rate, or how each six-hour amount is distributed.
- Do not prorate a currently running block and call it “remaining snow.” If the block began before now, label its full start/end explicitly, including elapsed time. Forecast accumulation is not an observation of what has already fallen.
- Totals may sum **distinct nonoverlapping source accumulation periods wholly belonging to the displayed window**. If periods are missing, null, malformed, overlapping ambiguously, or only partly intersect a requested window, preserve the gap/partial status instead of presenting a complete total. Prefer displaying source blocks over slicing arbitrary “next 24 hours.”
- Weather, temperature, and wind intervals may be longer because equal values are compressed. Interval overlap lookup is appropriate for those conditions; it must not change accumulation semantics.
- Per-variable coverage must be explicit. Do not assume the grid's overall valid range means snowfall/ice is available throughout it. Do not fill the uncovered tail with zeros.

## Dated direct probes

Python HTTPS probes ran November 14, 2026, at approximately **17:28–17:31 UTC** with identifying User-Agent. Points, grid, hourly forecast, and narrative forecast requests succeeded for Denver, Buffalo, and Asheville. Truckee points/grid also succeeded. These are live snapshots, not a long-term availability or skill assessment.

| Location | Discovered grid | Zone | Grid source `updateTime` | Snow/ice coverage observed |
| --- | --- | --- | --- | --- |
| Denver, CO | [BOU/63,62](https://api.weather.gov/gridpoints/BOU/63,62) | America/Denver | 2026-11-14 11:13:05Z | 32 snow and 32 ice entries; last source period Nov. 21 18Z + 6h. |
| Buffalo, NY | [BUF/36,47](https://api.weather.gov/gridpoints/BUF/36,47) | America/New_York | 2026-11-14 14:57:47Z | 17 snow and 17 ice entries; last source period **Nov. 18 06Z + 6h**, while temperature extends to Nov. 22. |
| Asheville, NC | [GSP/56,75](https://api.weather.gov/gridpoints/GSP/56,75) | America/New_York | 2026-11-14 10:39:29Z | 32 snow and 32 ice entries; last source period Nov. 21 18Z + 6h. |
| Truckee, CA | [REV/31,100](https://api.weather.gov/gridpoints/REV/31,100) | America/Los_Angeles | 2026-11-14 11:30:53Z | 32 snow and 32 ice entries, including nonzero expected snow. |

Concrete nonzero Truckee snow examples: November 16 06–12Z = **7.62 mm / 0.3 in**; November 16 12–18Z = **15.24 mm / 0.6 in**. Denver also had two November 21 blocks at 2.54 mm each. All sampled ice values were zero. A nonzero freezing-rain case was **not** validated live, so deterministic tests must include it and later visual verification should cover an actual ice event.

Hourly forecasts for Denver and Buffalo each returned 156 hourly periods. Buffalo's regular narrative explicitly described rain changing to a chance of rain and snow showers overnight. Thus amount-zero and snow-mentioned can coexist without requiring the app to fabricate accumulation or discard the narrative.

## Uncertainty and ranges

The base raw grid exposes expected snowfall amounts, not low/high percentile snowfall ranges. Do **not** generate a range by adding a fixed percentage, treating hourly min/max as snowfall uncertainty, or converting broad WPC contours into a precise city probability.

NWS local narratives can contain official snow/ice ranges; display the source text verbatim as a forecast narrative, without a brittle extraction step. Broader low/expected/high graphics exist in the [NWS probabilistic snowfall program](https://www.weather.gov/prob-snow/), but a dependable nationwide machine-readable percentile contract has not been validated in this note. If the UI needs structured percentile ranges, that is a separate source gate; show expected amounts plus labeled threshold probabilities in the meantime.

## Freshness, cost, and tests

NWS describes the API as open data usable free of charge, with undisclosed reasonable rate limits and required identifying User-Agent. Use server caching/timeouts, bounded geographic inputs, partial-result handling, and backoff; do not request all points across a map. Conditional requests are supported; `Last-Modified` and grid `updateTime` indicate source creation. A successful fetch does not make an old source forecast fresh. [API overview](https://www.weather.gov/documentation/services-web-api), [gridpoint update FAQ](https://weather-gov.github.io/api/gridpoints)

Tests needed before implementation closeout: six-hour accumulation counted once; a block crossing now not prorated; timezone and DST boundaries; null versus genuine zero; missing/overlapping coverage; variable horizon shorter than grid horizon; unit conversion; missing/unknown units; source timestamp versus fetch time; partial endpoint failure; mixed weather types; source blocks that overlap only part of a requested total window.

No application code, dependencies, routes, or tests changed by this research task. Application suites were not run for this note. Live checks above supply implementation evidence; they do not replace source-normalization unit tests or browser validation.
