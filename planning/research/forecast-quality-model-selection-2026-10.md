# Forecast model selection and quality investigation (2026-10)

Research for [issue #656](https://github.com/jelrod27/Weather-application-/issues/656), retrieved October 4, 2026. Scope: the source-selection and provenance questions behind Pleasanton, California forecasts for October 9–10. This note describes documented behavior and public implementation; the companion investigation captures live numerical comparisons. It does not establish which forecast will verify against future observations.

## Reproduced discrepancy

Requests captured October 4 at approximately 23:11–23:12 UTC (4:11–4:12 PM PDT), for `37.6624,-121.8747` and `America/Los_Angeles`, produced these daily highs:

| Source | Friday October 9 | Saturday October 10 |
| --- | ---: | ---: |
| Production API | 98.8°F | 94.0°F |
| Direct Open-Meteo Best Match | 98.8°F | 94.0°F |
| Explicit GFS Seamless | 98.8°F | 94.0°F |
| Explicit GFS Global | 98.8°F | 94.0°F |
| Explicit ECMWF IFS 0.25° | 91.6°F | 68.9°F |
| Explicit NBM CONUS | 88.5°F | 79.9°F |
| NWS point forecast, MTR/103,96 | 87°F | 78°F |

These values summarize the October 4 diagnostic capture. The large raw response snapshots were removed before PR publication because application and regression tests do not depend on them. NWS's response was updated at 20:26 UTC. The application's cached response had an age of 598 seconds, within its 900-second cache policy, and its values matched the fresh upstream response. This capture does not support an application stale-cache explanation. The originally reported 102°F was not reproduced.

The same snapshot gives both production and Best Match Celsius highs of 37.1°C/34.4°C, consistent with the Fahrenheit values within API rounding. Disabling downscaling produces 97.4°F/92.7°F: a much smaller difference than the NWS discrepancy. The evidence supports a difference in source guidance and does not show a temperature conversion defect.

The metadata inspected during the capture reported GFS's 12 UTC run available at approximately 17:27 UTC, HRRR's 21 UTC run at 22:33 UTC, NBM's 22 UTC run at 22:50 UTC, and ECMWF's 12 UTC run at 19:57 UTC. Different initialization times reflect different publication cadences; these timestamps alone do not establish stale or incorrect guidance.

**Finding:** the application's warm late-week forecast reproduces Open-Meteo Best Match and GFS exactly. Other guidance predicts more cooling. That is a confirmed quality discrepancy worth resolving through source evaluation, while forecast accuracy remains unverified until observations are available.

## What Best Match means here

The public Open-Meteo implementation at commit `1cd0eaa1ed97857772a6bd968bbe373bd23636f3` defaults `/v1/forecast` to `best_match`. In the North American HRRR coverage branch, it creates readers in this order: GFS probabilities, NBM probabilities, ICON, GFS, HRRR. NBM contributes probability fields in this branch; its temperature forecast is not selected. ECMWF readers are initialized elsewhere in the function but are absent from this returned North American list. [Forecast controller, default](https://github.com/open-meteo/open-meteo/blob/1cd0eaa1ed97857772a6bd968bbe373bd23636f3/Sources/App/Controllers/ForecastapiController.swift#L16-L19), [North American selection](https://github.com/open-meteo/open-meteo/blob/1cd0eaa1ed97857772a6bd968bbe373bd23636f3/Sources/App/Controllers/ForecastapiController.swift#L1904-L1916).

The mixer traverses readers in reverse priority, retaining higher-priority available values and filling missing values from lower-priority readers. Its shared combination function smooths continuous variables across missing-data transitions. This is source precedence with fallback, not an arithmetic consensus of all the models. [Mixer](https://github.com/open-meteo/open-meteo/blob/1cd0eaa1ed97857772a6bd968bbe373bd23636f3/Sources/App/Helper/Reader/GenericReaderMulti.swift#L131-L147), [combination implementation](https://github.com/open-meteo/open-meteo/blob/1cd0eaa1ed97857772a6bd968bbe373bd23636f3/Sources/App/Helper/Reader/GenericReaderMixerRaw.swift).

**Inference to test:** after HRRR's horizon expires, a valid GFS temperature should take precedence over ICON at this location. Comparing same-coordinate, same-unit, same-date Best Match and explicit GFS responses can support that attribution. This public repository revision does not prove which revision the hosted API is running, nor does one matching daily maximum identify every underlying hourly input.

## Explicit models worth comparing

These identifiers are accepted by the public controller enum and mappings: `gfs_seamless`, `gfs_global`, `ecmwf_ifs025`, `ncep_nbm_conus`, and `ncep_hrrr_conus`. The first combines GFS and HRRR; `ncep_nbm_conus` selects the NBM reader directly. [Model identifiers and mappings](https://github.com/open-meteo/open-meteo/blob/1cd0eaa1ed97857772a6bd968bbe373bd23636f3/Sources/App/Controllers/ForecastapiController.swift).

| Candidate | Documented horizon and cadence | Investigation use |
| --- | --- | --- |
| GFS global | 16 days; every 6 hours | Test which longer-range series Best Match follows |
| HRRR CONUS | 18 hours, extended to 48 hours at 00/06/12/18 UTC; hourly updates | Explain why high-resolution near-term guidance cannot supply Friday/Saturday from Sunday |
| NBM CONUS | 11 days; hourly updates | Compare another regional guidance product with the same Open-Meteo transport |

GFS hourly output after 120 hours is interpolated from three-hourly model data. NBM has three-hourly native steps beyond 36 hours, then six-hourly beyond eight days. Interpolation does not add independent hourly predictions. [Open-Meteo GFS/HRRR/NBM documentation](https://open-meteo.com/en/docs/gfs-api#data_sources).

Use `models=` to compare explicit sources while holding coordinates, timezone, units, date range, and elevation policy constant. The default grid selection prefers land and similar elevation. `cell_selection=nearest` and `elevation=nan` are separate probes; the latter disables elevation downscaling. Response coordinates describe the selected grid and can differ from the requested point. Daily temperature values aggregate hourly data over the local day. `generationtime_ms` measures response generation performance, not the model's issuance time. `past_days` extends the returned valid-date range; it does not select a historical issuance. [Forecast API parameter and response definitions](https://open-meteo.com/en/docs#api_documentation).

## Forecast age and reproducibility

Open-Meteo's metadata distinguishes initialization, completed download/conversion, and API availability. The metadata is per model, and the documentation explicitly warns that these timestamps do not directly describe a Best Match response. Redundant servers are eventually consistent; the provider recommends allowing ten minutes after availability when the newest run is required. Preserve metadata beside a response rather than claiming it proves every returned value's run. [Model update and metadata documentation](https://open-meteo.com/en/docs/model-updates#metadata_api_documentation).

The official model-updates page constructs the following free-service metadata URLs, which are suitable for investigation snapshots:

- [GFS 0.11-degree metadata](https://api.open-meteo.com/data/ncep_gfs013/static/meta.json)
- [GFS 0.25-degree metadata](https://api.open-meteo.com/data/ncep_gfs025/static/meta.json)
- [HRRR metadata](https://api.open-meteo.com/data/ncep_hrrr_conus/static/meta.json)
- [NBM metadata](https://api.open-meteo.com/data/ncep_nbm_conus/static/meta.json)
- [ECMWF IFS 0.25-degree metadata](https://api.open-meteo.com/data/ecmwf_ifs025/static/meta.json)

For stronger reproducibility, the [Single Runs API](https://open-meteo.com/en/docs/single-runs-api) accepts an explicit UTC initialization through `run=YYYY-MM-DDTHH:mm` and preserves individual model runs. Initialization is earlier than public availability. Select an explicit model when testing attribution; a date-only request to the live API is not a frozen forecast.

The [Previous Runs API](https://open-meteo.com/en/docs/previous-runs-api) supports fixed lead-time fields such as `temperature_2m_previous_day5`. These represent predictions five days before their valid time, useful for evaluating errors by lead time. They are different from asking for yesterday's valid weather or a specific issuance.

## NWS as an independent comparison or candidate source

NWS provides point-to-grid discovery at `/points/{latitude},{longitude}`. The returned `forecast` link exposes approximately twelve-hour periods for seven days; `forecastHourly` and `forecastGridData` expose hourly and raw grid products for that horizon. Local Weather Forecast Offices create the forecasts on approximately 2.5-km grids. Mapping can change, so persist coordinates and periodically refresh the point lookup instead of hardcoding an office/grid pair. Coastal marine locations have different forecast availability. [NWS API documentation](https://www.weather.gov/documentation/services-web-api#how-do-i-get-the-forecast).

**Engineering implication:** NWS is a useful independent regional reference, but adopting it is a provider-integration change. Daytime/nighttime periods do not have the same shape as calendar-day min/max arrays. An adapter must define local-day alignment, missing periods, units, condition icons, precipitation/wind semantics, horizon limits, and fallback behavior. A global application also needs behavior for points without a supported NWS forecast. Replacing only a daily high while retaining a contradictory hourly curve would create a new quality problem.

## Recommended decision process

1. Keep the app-versus-upstream reproduction separate from forecast-versus-forecast disagreement. A correct transport can faithfully display weaker guidance in a particular event.
2. Capture live Best Match, explicit GFS, NBM, ECMWF, and NWS for identical requested coordinates and local dates, with retrieval timestamps, units, response grids, and available issuance metadata. Compare complete hourly curves as well as daily extrema.
3. If a conversion, date alignment, stale-cache, or location defect is demonstrated, add a deterministic regression at that seam and fix it. A test asserting that two independent forecasts must agree would encode the wrong requirement.
4. If the discrepancy is source guidance, retain the issue as a quality decision. Evaluate a regional NBM or NWS policy over multiple locations, terrain/coastal settings, seasons, and lead times against observations. Record bias and absolute errors; agreement with a competitor alone is not ground truth.
5. Independently improve provenance: show source and honest retrieval freshness, retain diagnostic model metadata, and consider explaining longer-range uncertainty. A retrieval timestamp must not be labeled model issuance without evidence.

These are investigation recommendations, not a deployed source change or a claim that one provider is universally superior.

## Integration constraint found during the investigation

An explicit NBM request using the application's complete variable lists returned HTTP 200 but contained nulls: current surface pressure and UV index; all 168 hourly UV values; 78 hourly visibility values; and all seven daily UV maxima. This finding is now guarded by small deterministic regression fixtures in `__tests__/open-meteo-model-selection.test.ts`, rather than a committed raw response. A successful HTTP status is not evidence that a replacement covers the existing contract.

The next implementation should therefore evaluate a scoped CONUS source policy with coherent daily and hourly temperature guidance, documented fallback for unsupported fields, and the existing global behavior outside coverage. It should not add a global `models=ncep_nbm_conus` parameter or replace only the displayed daily high. NWS is also a candidate, subject to the period-adaptation requirements above. This is a proposal for validation, not authorization to deploy an untested provider switch.

## Repeating the investigation and checks

The comparison script remains available for an explicitly requested live investigation. Write new captures outside the repository, for example:

```sh
node planning/research/issue-656/compare-forecasts.mjs capture /path/outside/repo/forecast-capture.json ncep_nbm_conus
node planning/research/issue-656/compare-forecasts.mjs replay /path/outside/repo/forecast-capture.json
```

The harness records the original October 9–10 target dates and pre-change Best Match baseline. Update its dates and baseline expectations deliberately for a new investigation; it is not a permanent CI test or a way to recreate the deleted historical capture. Replay accepts a capture the investigator supplies. Deterministic application tests remain self-contained and require no snapshots or network access. Neither comparison proves that a provider's future forecast is observed truth.

The investigation also ran four existing focused unit-test suites covering the adapter, forecast route, forecast units, and day details: **43 tests passed**. No application code changed, and no application regression test was added for provider disagreement alone. Build, browser E2E, and Lighthouse checks were not needed for these research artifacts; a later source-policy implementation requires its own contract, fallback, and UI verification.
