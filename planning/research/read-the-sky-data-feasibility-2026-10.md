# Read the sky: local data feasibility

Reviewed **2026-10-09**. Product question: help people **understand the sky near their selected location right now**, then explain what may change over the next few hours. This is a research recommendation, not an approved implementation specification or a forecast-accuracy study. Public documentation and small unauthenticated API samples were checked; no service was purchased or configured.

## Recommendation

Make the primary experience **“Your local sky”**, with an estimated current snapshot, a short cloud-cover outlook, and a small explanation tied to those conditions. Retain **“Read the sky”** as an educational invitation or supporting section. Preserve the selected place throughout the journey; a region name alone is insufficient to locate this experience.

The first release can answer **how cloudy, which broad layers, and what changes next** using the existing provider. It cannot honestly answer **which named cloud types are overhead** from cloud-cover percentages. Use a separate optional **“What do you see?”** activity to help the visitor identify visible features. WMO's identification guide uses appearance, structure and other observable clues, rather than cloud-cover percentages. [WMO cloud identification guide](https://cloudatlas.wmo.int/en/cloud-identification-guide.html)

## Source capabilities and boundaries

| Source | Established capability | Product implication |
|---|---|---|
| Open-Meteo Forecast API | Total cloud cover is an area fraction; low, middle and high cover are available. Current conditions use weather-model data in 15-minute steps, with hourly variables also requestable as current. [Forecast documentation](https://open-meteo.com/en/docs) | Label the snapshot **estimated**. A 15-minute timestamp is not proof of a new observation or model run. |
| AviationWeather METAR | Worldwide terminal observations; JSON responses; most reports update hourly. [AWC API](https://aviationweather.gov/data/api/) | Optional evidence from a named airport, with actual observation time and distance. Worldwide distribution does not promise a reporting station near every selected place. |
| Human observation / educational guidance | Automated observing systems measure cloud height but do not generally identify cloud type; traditional classifications describe the state of the sky. [NOAA NWS Cloud Chart](https://www.noaa.gov/jetstream/clouds/nws-cloud-chart) | Show identification suggestions only after visual input, or report a type explicitly present in a source report. |
| GOES satellite imagery | Visible imagery depends on daylight; infrared supports nighttime viewing. ABI scans full disk every 10 minutes and the US mainland every five minutes. [NOAA ABI overview](https://www.nesdis.noaa.gov/our-satellites/currently-flying/goes-east-west/advanced-baseline-imager-abi) | Useful regional context later. It requires a distinct map/imagery integration and must retain frame times and coverage. |

### Open-Meteo: good MVP, estimated conditions

Request current and six hourly steps for `cloud_cover`, `cloud_cover_low`, `cloud_cover_mid`, and `cloud_cover_high`; reuse available `weather_code`, `is_day`, precipitation and visibility rather than independently fetching duplicates. Missing layers must stay unavailable, not become zero.

The documentation describes low cover up to 3 km, middle 3–8 km, and high above 8 km. These are provider categories, not measured cloud bases. Best Match selects applicable models; available fields and spatial resolution vary. Grid-cell selection can consider elevation. [Forecast documentation](https://open-meteo.com/en/docs)

**Recommendation:** call the rows “Low / Middle / High cloud” without precise height labels in the initial UI. Do not equate those categories with fixed distances above the visitor. ECMWF's native categories use model layers corresponding approximately to pressure ranges, including terrain-sensitive behavior. It also accounts for vertical overlap: total cover is not the sum of three layer percentages. Its guide identifies inversion-trapped cloud as a difficult forecasting situation. [ECMWF cloud guidance](https://confluence.ecmwf.int/spaces/FUG/pages/673550490/Section%2B2A.1.5.2%2BClouds)

Consequently, use the provider's total directly; show separate layer indicators rather than a stacked-to-100% chart. A mountain, coastal valley or marine layer can differ from the model grid around it. The MVP should say “near [place]” and avoid a street-level accuracy promise. This is a product inference from the gridded forecast and observation limitations above, not a measured accuracy result.

Open-Meteo's pricing overview describes regional resolution of 1–2 km and global resolution of 9–11 km; its full catalogue includes other resolutions. Treat these as model-dependent grids, never the guaranteed precision of a selected point. [Provider overview](https://open-meteo.com/en/pricing)

No cloud-base or ceiling field is documented in the generic Forecast API field table reviewed. The candidate requests below did not establish a usable contract. Do not manufacture an observed base from surface temperature/dew point or relabel freezing level/boundary-layer height as cloud base. A model can possess cloud-base diagnostics without the selected API exposing them. [Forecast field definitions](https://open-meteo.com/en/docs), [ECMWF base versus ceiling definitions](https://confluence.ecmwf.int/spaces/FUG/pages/673550490/Section%2B2A.1.5.2%2BClouds)

### METAR: valuable corroboration, not a citywide replacement

METAR sky groups report amount and base height **above station ground**. Automated `CLR` means no layers detected at or below 12,000 feet; it is not proof that the entire atmosphere is cloudless. `VV` represents visibility upward into obscuration, not an ordinary measured cloud base. Reports can include explicit cloud remarks such as `CB` or `TCU`, but ordinary coverage groups do not identify genera. [AWC product guide](https://aviationweather.gov/help/data/)

ASOS ceilometers look vertically and estimate coverage using time averaging; their reports may omit thin clouds. [NWS ceilometer description](https://www.weather.gov/asos/Ceilometer.html) Therefore display “Observed at [station], [distance] away” and keep it separate from the selected-place model estimate. Do not silently merge observations into the model's percentages or treat disagreement as an API failure. Station distance alone cannot establish representativeness across mountains or coastlines.

**Later-release gate:** define and validate a station-selection policy, including age, distance, terrain/elevation and missing fields. Any starting cutoff (for example, 50 km / 90 minutes) is a product heuristic requiring validation, not a NOAA-endorsed accuracy boundary. With no suitable report, keep the model experience and say no recent nearby observation is available. If a reported height is displayed, preserve the reference and measurement method; WMO explicitly distinguishes height above the observing place from altitude above sea level. [WMO height and altitude](https://cloudatlas.wmo.int/en/height-and-altitude.html)

## Read-only API checks

Samples were retrieved on **2026-10-09 at 23:19–23:20 UTC (4:19–4:20 PM Pacific)**. These demonstrate response shape and availability only. URLs are live queries and will return different values later.

| Query | Captured result |
|---|---|
| [San Francisco model snapshot and six-hour outlook](https://api.open-meteo.com/v1/forecast?latitude=37.7749&longitude=-122.4194&current=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,weather_code,is_day,visibility&hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high&forecast_hours=6&timezone=America%2FLos_Angeles) | HTTP 200. Current valid time 16:15 local; total/low 35%, middle/high 0%; `interval: 900`. Hourly total for 16:00–21:00: 39, 26, 93, 100, 100, 100%. Returned grid coordinate differed from requested coordinate. |
| [KSFO latest METAR](https://aviationweather.gov/api/data/metar?ids=KSFO&format=json) | HTTP 200. Observation 22:56 UTC / 15:56 Pacific; FEW at 800 ft and 4,500 ft, SCT at 15,000 ft. Source station approximately 17.9 km from the selected SF coordinate, calculated from returned station coordinates. |
| [London, Tokyo and La Paz current/layer queries](https://api.open-meteo.com/v1/forecast?latitude=51.5074,35.6762,-16.4897&longitude=-0.1278,139.6503,-68.1193&current=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,is_day&hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high&forecast_hours=2&timezone=auto) | HTTP 200; all requested layer values present. Current totals: 5%, 6%, 0%, respectively. Correctly distinct local time zones and day/night values were returned; La Paz response elevation was 3,627 m. This is not global completeness or mountain accuracy validation. |
| [Candidate `cloud_base`](https://api.open-meteo.com/v1/forecast?latitude=37.7749&longitude=-122.4194&hourly=cloud_base&forecast_hours=1) / [candidate `cloud_ceiling`](https://api.open-meteo.com/v1/forecast?latitude=37.7749&longitude=-122.4194&hourly=cloud_ceiling&forecast_hours=1) | `cloud_base`: HTTP 200, null value and `undefined` unit. `cloud_ceiling`: HTTP 400, invalid variable. Neither is an acceptable production dependency from this evidence. |

The SF snapshot and airport observation are not synchronized or co-located ground truth. Their differences demonstrate why those distinctions must remain visible. They do not prove either source is wrong.

## Freshness and uncertainty contract

Open-Meteo model metadata distinguishes initialization, processing completion and API availability. Metadata times do not directly identify the model selection in a Best Match forecast; providers update on different schedules and distributed servers can take extra time to agree. [Model updates documentation](https://open-meteo.com/en/docs/model-updates)

Recommended implementation fields: selected coordinates/name/time zone; source; source kind (`model`, `station`, or later `satellite`); valid/observation time; fetch time; nullability; and station identity/distance where relevant. Store model-run time only when verifiably associated with the actual data. Never label fetch time as observation time or use `generationtime_ms` as freshness.

Recommended copy, with placeholders rather than fabricated live conditions:

- **Model:** “Estimated sky near [place] · [local valid time].” Supporting sentence: “Cloud cover is estimated from weather models; the view from your location may differ.”
- **Outlook:** “Cloud cover is forecast to increase over the next few hours,” only when the values support it. Do not promise an exact clearing minute.
- **Layers:** “The estimate shows more cloud at low levels.” Then “Look for…” visual clues. Do not state “These are stratus clouds” from that value.
- **Observation:** “At [station], [distance] away: [reported coverage/base], observed [time].”
- **Night:** keep the estimate; say visual identification is harder after dark. Do not show daytime-only identification cues as the current view.
- **Unavailable:** “Current sky estimate unavailable.” Keep general identification Guides accessible. Never replace missing data with “clear.”
- **Old snapshot:** identify its valid time and that refresh failed; suppress “right now” wording. Freshness thresholds should be explicit app policy, tested with older cached responses and local-date transitions.

## Access, cost and reuse

- **Open-Meteo access:** free API is non-commercial, with limits below 10,000 calls/day, 5,000/hour and 600/minute. Ads or subscriptions are listed as commercial uses. Confirm the existing site's access arrangement before expanding requests. [Terms](https://open-meteo.com/en/terms)
- **Usage budget:** pricing lists 300,000 free calls/month; paid plans include commercial access and reserved capacity. More than ten variables can count as multiple calls, so extending the existing weather request can increase usage even without an extra HTTP request. Verify current plan pricing before procurement; this review did not obtain a checkout quote. [Pricing and call accounting](https://open-meteo.com/en/pricing)
- **Attribution:** Open-Meteo requires linked credit beside displayed data, licence credit and indication of modifications. Keep explanatory text distinguishable from provider data. [Licence](https://open-meteo.com/en/licence)
- **AWC access:** maximum 100 requests/minute; most endpoints cap results at 400; browser cross-origin requests are not supported. Use a bounded server-side query/cache and custom user agent. Full METAR cache files refresh each minute, but this does not mean individual observations do. [AWC API restrictions](https://aviationweather.gov/data/api/)
- **NOAA data:** NWS material is generally usable without charge unless marked otherwise; preserve attribution and do not imply endorsement. Timely Internet delivery is not guaranteed. Hosting, processing and caching still have application costs. [NWS terms](https://www.weather.gov/disclaimer)
- **Educational imagery:** check each image's credit. NOAA pages can include third-party imagery; WMO Atlas images are not a freely reusable image library and broader reuse can require permission. Prefer original illustrations or individually verified reusable NOAA assets, with direct WMO links for deeper learning. [NOAA reuse guidance](https://www.noaa.gov/office-education/outreach-communication/faq), [WMO copyright](https://cloudatlas.wmo.int/en/copyright.html)

## Sequence and explicit deferrals

1. **MVP:** selected-place snapshot, total/layer cover, short outlook, source/time/estimate labels, meaningful missing and stale states, and a contextual link to an existing Entry Guide. Show broad layer examples as education, not detected types. Measure whether visitors can explain current conditions and distinguish estimate from observation.
2. **Supporting identification:** an optional visual comparison with puffy, layered and wispy examples, an “I cannot tell” path, and a tentative result based on the visitor's answers. WMO's visual guide is the scientific reference; write original instructional copy and verify image rights. [WMO guide](https://cloudatlas.wmo.int/en/cloud-identification-guide.html)
3. **Observation enhancement:** add nearby METAR evidence after station-selection and reporting-gap validation. Preserve raw report provenance and avoid turning aviation categories into general safety advice.
4. **Satellite context later:** start with a link to an official regional viewer; evaluate an embedded loop separately. Infrared and visible views tell different stories, and a geostationary regional product is not a global ground-view cloud identifier. Show frame time, region and imagery mode. [NOAA satellite maps](https://www.nesdis.noaa.gov/imagery/satellite-maps), [visible/infrared explanation](https://www.nesdis.noaa.gov/imagery/interactive-maps/visible-infrared-imagery)

Defer automatic named-cloud detection from weather codes/percentages, a homemade “confidence score,” photo-AI identification, new webcams, precise cloud-base predictions, universal satellite coverage, and promises about local storm formation. Photo identification would require a separate evaluation across cloud classes, lighting, geography and ambiguous images, plus consent/storage decisions. Keep official warnings and existing hazard tools authoritative; this educational feature should not infer an all-clear from low cloud cover or an absent observation.

## Existing implementation to reuse carefully

The existing [Stargazer weather request](../../lib/stargazer/build-payload.ts) already requests total/low/middle/high cover. Its [input reader](../../lib/stargazer/forecast-inputs.ts) checks percentage units, bounds and missing values, and explicitly distinguishes response retrieval time from model-run time. Reuse or extract that narrow validated weather logic where appropriate; calling the full Stargazer payload also starts astronomy, satellite, launch and other work unrelated to this goal.

The shared [Open-Meteo request](../../lib/open-meteo.ts) already includes current total cloud cover and accepts extra current/hourly variables. Establish how the relevant application-facing weather type exposes these values before adding a second provider path.

The [Atlas entries](../../data/cloud-types.ts) contain static `weatherPrediction` claims, including “Fair weather, change in 8-10 hrs” for cirrus and “Rain or snow within 24 hours” for cirrostratus; the [Guide](../../components/education/cloud-guide.tsx) renders these as “Signals.” **Do not reuse those strings as a forecast for the selected place.** Review contextual educational statements before highlighting them in the new experience. A cloud observation can be a learning clue without establishing local timing or an inevitable weather event.

## Remaining verification before implementation

- Validate current and hourly layer availability with the site's actual model-selection and cache contracts, not only default public requests.
- Resolve exact model-specific altitude semantics before displaying numerical cloud-height bands.
- Exercise partial missing layers, contradictory station/model reports, obscuration, `CLR`, absent station data, refresh failure, nighttime and a selected location in another time zone.
- Verify the existing provider plan and incremental call accounting. Reuse the shared weather request and location session where feasible.
- Obtain product agreement on whether nearby observations belong in the first release; the useful model-based experience does not depend on them.

Only this research file was authored for the data investigation. Application tests were not run because no application behavior changed.
