---
publication_version: 1
publication_id: 2026-11-16-sunday-rearview-a170634c-788d-4055-8853-a690e19c8d5b
coverage_status: partial
slug: this-week-in-weather-2026-11-16
title: 'This Week in Weather — November 16, 2026'
date: 2026-11-16T02:43:17.365Z
author: 16bitbot
summary: >-
  November storm reports, California rain and mountain snow, and seven-day
  forecasts for nine cities for November 16–22.
tags:
  - weekly-recap
  - forecast
  - severe-weather
  - space-weather
  - roadmap
heroImage: /api/og/blog?title=This%20Week%20in%20Weather&type=severe
readTime: 6
cadence: sunday_rearview
opener_hash: 5ce78069
key_phrases:
  - four tornado warnings in less than three hours
  - 'five tornado, 52 hail and 16 wind reports'
  - California’s midweek rain and mountain snow
  - 1.10 inches Wednesday and 1.03 inches Thursday
  - 119 earthquakes of magnitude 4.5 or greater
model_used: claude-sonnet-4-6
images_used:
  - fault-types-usgs
  - wpc-day1-qpf
image_audit:
  - >-
    id=fault-types-usgs; lane=earthquake; anchor=The USGS catalog recorded 119
    earthquakes; tags=earthquakes; caption=USGS diagram of normal, reverse, and
    strike-slip fault motion.
  - >-
    id=wpc-day1-qpf; lane=forecast; anchor=The main midweek concern is
    California.; tags=atmosphere_layers,tech_and_models; caption=NWS/WPC Day 1
    Quantitative Precipitation Forecast — expected accumulated rainfall across
    the contiguous US.
spotlight_active: null
generation_retries: 1
word_count: 1067
closer_used: natural-wrapup
editorial_revision: true
updated: '2026-11-16T02:53:38.918Z'
---
## Rearview

Four tornado warnings in less than three hours put parts of New York, New Jersey and Delaware on alert on Thursday, November 12. An Indiana warning the previous day brought the week's tracked tornado-warning total to five. The next major weather story is farther west: NOAA's outlook calls for heavy California rain and mountain snow around the middle of the coming week.

The Thursday warnings covered Queens, New Castle County and parts of central New Jersey. Their issuance times ran from 18:13 to 21:03 UTC, or 1:13 to 4:03 p.m. Eastern Standard Time. Flash flood warnings also affected communities in New Jersey and southeastern Pennsylvania. Across the reporting period, the [Iowa Environmental Mesonet archive](https://mesonet.agron.iastate.edu/api/1/vtec/sbw_interval.json?begints=2026-11-08T12%3A00%3A00.000Z&endts=2026-11-15T12%3A00%3A00.000Z) contains 114 unique warnings in the tracked products: five tornado, 42 severe thunderstorm, 20 flash flood and 47 marine warnings.

The [SPC's November 11 report log](https://www.spc.noaa.gov/climo/reports/261111_rpts.csv) includes an EF-0 survey report near Riley in Vigo County, Indiana. It lists an 85 mph maximum wind, a 1.1-mile track and damage to a barn and an RV. The reported time was 22:27 UTC, or 5:27 p.m. EST. On November 12, the preliminary logs include 24 storm reports in New Jersey and ten in Delaware.

Across the seven completed report days, from noon UTC November 8 to noon UTC November 15, SPC recorded 73 preliminary storm reports: five tornado, 52 hail and 16 wind reports. These are report entries, not a count of distinct storms or confirmed tornadoes; one storm can generate reports at several locations.

The USGS catalog recorded 119 earthquakes of magnitude 4.5 or greater during that interval. One met the catalog's significance threshold above 600: a [magnitude 6.4 earthquake near Lata in the Solomon Islands](https://earthquake.usgs.gov/earthquakes/eventpage/us7000tx16), recorded on November 9 at 03:34 UTC and a depth of 17 km.

![USGS diagram of normal, reverse, and strike-slip fault motion.](https://commons.wikimedia.org/wiki/Special:FilePath/Fault_types.svg?width=1280)
*USGS reference illustration of three fault motions.*

Among the available NOAA space-weather observations, planetary Kp reached 3.33, and the GOES X-ray record includes an M1.8 flare reading at 21:21 UTC on November 11. Those figures describe the observations collected for this edition; the source notes retain the gaps in both series.

## Roadmap

For Monday and Tuesday, [NOAA's short-range outlook](https://www.wpc.ncep.noaa.gov/discussions/pmdspdbody.txt) places high pressure over the Ohio Valley and then the central Appalachians, bringing clearing skies to parts of the Southeast. Rain over the Southern Plains shifts toward the Lower Mississippi Valley, while coastal Florida remains prone to showers. In the West, an inland-moving front brings rain at lower elevations and snow to parts of the northern Intermountain region and western Rockies. The Sunday discussion also notes Sierra winter-weather advisories with that earlier round of snow.

The main midweek concern is California. [NOAA's extended outlook](https://www.wpc.ncep.noaa.gov/discussions/pmdepdbody.txt) identifies an atmospheric river bringing heavy rain to coastal and parts of interior California on Wednesday, November 18, and Thursday, November 19, with flooding possible. Heavy mountain snow is forecast for the Sierra, parts of Utah and the San Juans. Precipitation then spreads farther into the Intermountain West and toward the Plains, where strong winds are another concern Friday into Saturday.

![NWS/WPC Day 1 Quantitative Precipitation Forecast — expected accumulated rainfall across the contiguous US.](https://www.wpc.ncep.noaa.gov/qpf/94qwbg.gif)
*NOAA/WPC's current Day 1 rainfall graphic. The weekly pattern above uses the dated forecast discussions.*

Farther east, WPC expects warmer conditions as the week progresses. A potential low east of Florida adds uncertainty to the weekend coastal forecast: its eventual track will matter for where rain reaches the Eastern Seaboard. The extended discussion covers Wednesday through Sunday morning; the full seven-day city samples below come separately from Open-Meteo.

### Nine city point forecasts

These samples cover **Monday, November 16, through Sunday, November 22, using UTC dates**. Temperatures are rounded to the nearest degree Fahrenheit. They describe the named city points; regional hazards and mountain conditions come from the NOAA discussions above.

**[New York City area](https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74&daily=temperature_2m_max%2Ctemperature_2m_min%2Cprecipitation_sum%2Cprecipitation_probability_max%2Cweather_code&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=UTC&start_date=2026-11-16&end_date=2026-11-22):** Monday starts near 52°F with a low around 34°F; Tuesday is similar at 53°F and 33°F. Highs reach about 64°F Friday before settling near 60°F for the weekend. Daily rain probabilities stay at 0–1% through Saturday, then rise to 11% Sunday.

**[Atlanta area](https://api.open-meteo.com/v1/forecast?latitude=33.75&longitude=-84.39&daily=temperature_2m_max%2Ctemperature_2m_min%2Cprecipitation_sum%2Cprecipitation_probability_max%2Cweather_code&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=UTC&start_date=2026-11-16&end_date=2026-11-22):** Monday's high is about 58°F with a low near 36°F. Afternoons warm to roughly 68°F Thursday and 70°F Sunday. Daily precipitation probabilities remain very low, at 0–3%, throughout this point forecast.

**[Chicago area](https://api.open-meteo.com/v1/forecast?latitude=41.88&longitude=-87.63&daily=temperature_2m_max%2Ctemperature_2m_min%2Cprecipitation_sum%2Cprecipitation_probability_max%2Cweather_code&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=UTC&start_date=2026-11-16&end_date=2026-11-22):** Monday and Tuesday bring highs of about 51°F and 54°F, with lows close to freezing. Highs approach 60°F Thursday. Weekend rain probabilities increase to 21% Saturday and 32% Sunday, with about 0.04 inches modeled for Sunday.

**[Denver area](https://api.open-meteo.com/v1/forecast?latitude=39.74&longitude=-104.99&daily=temperature_2m_max%2Ctemperature_2m_min%2Cprecipitation_sum%2Cprecipitation_probability_max%2Cweather_code&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=UTC&start_date=2026-11-16&end_date=2026-11-22):** Highs rise from about 62°F Monday to 70°F Tuesday, then ease to 55°F Thursday and 52°F Sunday. Monday's low is near 31°F. The clearest precipitation signal in this city sample is small: about 0.01 inches Saturday with a 19% probability.

**[San Francisco area](https://api.open-meteo.com/v1/forecast?latitude=37.77&longitude=-122.42&daily=temperature_2m_max%2Ctemperature_2m_min%2Cprecipitation_sum%2Cprecipitation_probability_max%2Cweather_code&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=UTC&start_date=2026-11-16&end_date=2026-11-22):** Rain is forecast Monday, with about 0.22 inches and a 91% probability. After a much lower rain chance Tuesday, the point forecast shows approximately 1.10 inches Wednesday and 1.03 inches Thursday, with probabilities of 100% and 94%. Highs stay around 56–59°F. Saturday brings another modeled 0.69 inches; these city amounts complement the broader California flooding concern in WPC's outlook.

**[Dallas area](https://api.open-meteo.com/v1/forecast?latitude=32.78&longitude=-96.8&daily=temperature_2m_max%2Ctemperature_2m_min%2Cprecipitation_sum%2Cprecipitation_probability_max%2Cweather_code&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=UTC&start_date=2026-11-16&end_date=2026-11-22):** Monday has about 0.03 inches of modeled precipitation and a 53% probability, with a high near 57°F. Tuesday is drier, and highs reach about 72°F Thursday and Friday. Weekend precipitation probabilities return to 18–28%, with small amounts in this sample.

**[London](https://api.open-meteo.com/v1/forecast?latitude=51.5&longitude=-0.13&daily=temperature_2m_max%2Ctemperature_2m_min%2Cprecipitation_sum%2Cprecipitation_probability_max%2Cweather_code&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=UTC&start_date=2026-11-16&end_date=2026-11-22):** Tuesday has the strongest rain signal, about 0.48 inches with an 87% probability. The high reaches roughly 55°F that day, then falls to about 48°F Thursday. Further rain chances continue later in the week.

**[Tokyo](https://api.open-meteo.com/v1/forecast?latitude=35.68&longitude=139.69&daily=temperature_2m_max%2Ctemperature_2m_min%2Cprecipitation_sum%2Cprecipitation_probability_max%2Cweather_code&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=UTC&start_date=2026-11-16&end_date=2026-11-22):** Monday's high is around 65°F. Tuesday turns cooler and wetter, with a high near 53°F, about 1.34 inches of modeled rain and an 84% probability. Rain chances decline by Thursday; weekend highs are in the mid-50s.

**[Sydney](https://api.open-meteo.com/v1/forecast?latitude=-33.87&longitude=151.21&daily=temperature_2m_max%2Ctemperature_2m_min%2Cprecipitation_sum%2Cprecipitation_probability_max%2Cweather_code&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=UTC&start_date=2026-11-16&end_date=2026-11-22):** Monday has a 97% rain probability and about 0.32 inches modeled, with a high near 66°F. Rain chances dip during the middle of the week, then rise to 70% Friday as the high reaches about 80°F. Sunday's high is near 82°F. These international samples use the same UTC date convention and are separate from WPC's U.S. outlook.

California's midweek rain and mountain snow are the clearest regional concern to follow in updated forecasts. Later in the week, watch how the system crosses the Plains and whether the uncertain low near Florida brings weekend rain farther up the East Coast.

## Source coverage

Reporting interval: 2026-11-08T12:00:00.000Z to 2026-11-15T12:00:00.000Z (end exclusive).
Counts and peaks describe only the observations and intervals listed below. Missing data is unknown, never zero. City forecasts are point forecasts; Lower 48 pattern statements, when present, use the dated NOAA/WPC discussions.

- [IEM polygon warnings issued (TO/SV/FF/MA/EW.W only)](https://mesonet.agron.iastate.edu/api/1/vtec/sbw_interval.json?begints=2026-11-08T12%3A00%3A00.000Z&endts=2026-11-15T12%3A00%3A00.000Z): **complete**. 1/1 archive queries (unique warning events). Observations: 2026-11-08T12:20:00.000Z to 2026-11-15T10:56:00.000Z. Requested: 2026-11-08T12:00:00.000Z to 2026-11-15T12:00:00.000Z. Checked: 2026-11-16T02:46:49.582Z.
- [SPC preliminary reports 2026-11-08](https://www.spc.noaa.gov/climo/reports/261108_rpts.csv): **complete**. 1/1 complete report days. Requested: 2026-11-08T12:00:00.000Z to 2026-11-09T12:00:00.000Z. Checked: 2026-11-16T02:46:49.495Z.
- [SPC preliminary reports 2026-11-09](https://www.spc.noaa.gov/climo/reports/261109_rpts.csv): **complete**. 1/1 complete report days. Requested: 2026-11-09T12:00:00.000Z to 2026-11-10T12:00:00.000Z. Checked: 2026-11-16T02:46:49.723Z.
- [SPC preliminary reports 2026-11-10](https://www.spc.noaa.gov/climo/reports/261110_rpts.csv): **complete**. 1/1 complete report days. Requested: 2026-11-10T12:00:00.000Z to 2026-11-11T12:00:00.000Z. Checked: 2026-11-16T02:46:49.840Z.
- [SPC preliminary reports 2026-11-11](https://www.spc.noaa.gov/climo/reports/261111_rpts.csv): **complete**. 1/1 complete report days. Observations: 2026-11-11T13:48:00.000Z to 2026-11-12T03:17:00.000Z. Requested: 2026-11-11T12:00:00.000Z to 2026-11-12T12:00:00.000Z. Checked: 2026-11-16T02:46:49.968Z.
- [SPC preliminary reports 2026-11-12](https://www.spc.noaa.gov/climo/reports/261112_rpts.csv): **complete**. 1/1 complete report days. Observations: 2026-11-12T17:30:00.000Z to 2026-11-12T22:42:00.000Z. Requested: 2026-11-12T12:00:00.000Z to 2026-11-13T12:00:00.000Z. Checked: 2026-11-16T02:46:50.102Z.
- [SPC preliminary reports 2026-11-13](https://www.spc.noaa.gov/climo/reports/261113_rpts.csv): **complete**. 1/1 complete report days. Observations: 2026-11-13T20:54:00.000Z to 2026-11-13T21:00:00.000Z. Requested: 2026-11-13T12:00:00.000Z to 2026-11-14T12:00:00.000Z. Checked: 2026-11-16T02:46:50.388Z.
- [SPC preliminary reports 2026-11-14](https://www.spc.noaa.gov/climo/reports/261114_rpts.csv): **complete**. 1/1 complete report days. Observations: 2026-11-14T20:44:00.000Z to 2026-11-15T03:08:00.000Z. Requested: 2026-11-14T12:00:00.000Z to 2026-11-15T12:00:00.000Z. Checked: 2026-11-16T02:46:50.665Z.
- [NOAA SWPC planetary Kp](https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json): **partial**. 52/56 three-hour blocks. Observations: 2026-11-09T00:00:00.000Z to 2026-11-15T09:00:00.000Z. Requested: 2026-11-08T12:00:00.000Z to 2026-11-15T12:00:00.000Z. Checked: 2026-11-16T02:46:49.472Z. Missing 4 of 56 expected intervals; peak is only for observed coverage.
- [NOAA GOES primary 0.1–0.8 nm X-ray flux](https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json): **partial**. 9189/10080 one-minute samples. Observations: 2026-11-09T02:46:00.000Z to 2026-11-15T11:59:00.000Z. Requested: 2026-11-08T12:00:00.000Z to 2026-11-15T12:00:00.000Z. Checked: 2026-11-16T02:46:49.496Z. Missing 891 of 10080 expected intervals; peak is only for observed coverage.
- [USGS significant (significance > 600) earthquakes](https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2026-11-08T12%3A00%3A00.000Z&endtime=2026-11-15T11%3A59%3A59.999Z&orderby=time&limit=20000&minsig=601): **complete**. 1/1 catalog queries. Observations: 2026-11-09T03:34:59.466Z to 2026-11-09T03:34:59.466Z. Requested: 2026-11-08T12:00:00.000Z to 2026-11-15T12:00:00.000Z. Checked: 2026-11-16T02:46:49.408Z.
- [USGS M4.5+ earthquakes](https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2026-11-08T12%3A00%3A00.000Z&endtime=2026-11-15T11%3A59%3A59.999Z&orderby=time&limit=20000&minmagnitude=4.5): **complete**. 1/1 catalog queries. Observations: 2026-11-08T12:29:17.722Z to 2026-11-15T07:36:37.211Z. Requested: 2026-11-08T12:00:00.000Z to 2026-11-15T12:00:00.000Z. Checked: 2026-11-16T02:46:49.414Z.
- [Open-Meteo point forecast: Northeast (NYC area)](https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74&daily=temperature_2m_max%2Ctemperature_2m_min%2Cprecipitation_sum%2Cprecipitation_probability_max%2Cweather_code&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=UTC&start_date=2026-11-16&end_date=2026-11-22): **complete**. 7/7 UTC forecast days. Observations: 2026-11-16T00:00:00.000Z to 2026-11-22T00:00:00.000Z. Requested: 2026-11-16T00:00:00.000Z to 2026-11-23T00:00:00.000Z. Checked: 2026-11-16T02:46:49.461Z.
- [Open-Meteo point forecast: Southeast (Atlanta area)](https://api.open-meteo.com/v1/forecast?latitude=33.75&longitude=-84.39&daily=temperature_2m_max%2Ctemperature_2m_min%2Cprecipitation_sum%2Cprecipitation_probability_max%2Cweather_code&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=UTC&start_date=2026-11-16&end_date=2026-11-22): **complete**. 7/7 UTC forecast days. Observations: 2026-11-16T00:00:00.000Z to 2026-11-22T00:00:00.000Z. Requested: 2026-11-16T00:00:00.000Z to 2026-11-23T00:00:00.000Z. Checked: 2026-11-16T02:46:49.623Z.
- [Open-Meteo point forecast: Midwest (Chicago area)](https://api.open-meteo.com/v1/forecast?latitude=41.88&longitude=-87.63&daily=temperature_2m_max%2Ctemperature_2m_min%2Cprecipitation_sum%2Cprecipitation_probability_max%2Cweather_code&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=UTC&start_date=2026-11-16&end_date=2026-11-22): **complete**. 7/7 UTC forecast days. Observations: 2026-11-16T00:00:00.000Z to 2026-11-22T00:00:00.000Z. Requested: 2026-11-16T00:00:00.000Z to 2026-11-23T00:00:00.000Z. Checked: 2026-11-16T02:46:49.596Z.
- [Open-Meteo point forecast: Mountain West (Denver area)](https://api.open-meteo.com/v1/forecast?latitude=39.74&longitude=-104.99&daily=temperature_2m_max%2Ctemperature_2m_min%2Cprecipitation_sum%2Cprecipitation_probability_max%2Cweather_code&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=UTC&start_date=2026-11-16&end_date=2026-11-22): **complete**. 7/7 UTC forecast days. Observations: 2026-11-16T00:00:00.000Z to 2026-11-22T00:00:00.000Z. Requested: 2026-11-16T00:00:00.000Z to 2026-11-23T00:00:00.000Z. Checked: 2026-11-16T02:46:49.612Z.
- [Open-Meteo point forecast: Pacific (San Francisco area)](https://api.open-meteo.com/v1/forecast?latitude=37.77&longitude=-122.42&daily=temperature_2m_max%2Ctemperature_2m_min%2Cprecipitation_sum%2Cprecipitation_probability_max%2Cweather_code&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=UTC&start_date=2026-11-16&end_date=2026-11-22): **complete**. 7/7 UTC forecast days. Observations: 2026-11-16T00:00:00.000Z to 2026-11-22T00:00:00.000Z. Requested: 2026-11-16T00:00:00.000Z to 2026-11-23T00:00:00.000Z. Checked: 2026-11-16T02:46:49.614Z.
- [Open-Meteo point forecast: South Plains (Dallas area)](https://api.open-meteo.com/v1/forecast?latitude=32.78&longitude=-96.8&daily=temperature_2m_max%2Ctemperature_2m_min%2Cprecipitation_sum%2Cprecipitation_probability_max%2Cweather_code&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=UTC&start_date=2026-11-16&end_date=2026-11-22): **complete**. 7/7 UTC forecast days. Observations: 2026-11-16T00:00:00.000Z to 2026-11-22T00:00:00.000Z. Requested: 2026-11-16T00:00:00.000Z to 2026-11-23T00:00:00.000Z. Checked: 2026-11-16T02:46:49.596Z.
- [Open-Meteo point forecast: London](https://api.open-meteo.com/v1/forecast?latitude=51.5&longitude=-0.13&daily=temperature_2m_max%2Ctemperature_2m_min%2Cprecipitation_sum%2Cprecipitation_probability_max%2Cweather_code&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=UTC&start_date=2026-11-16&end_date=2026-11-22): **complete**. 7/7 UTC forecast days. Observations: 2026-11-16T00:00:00.000Z to 2026-11-22T00:00:00.000Z. Requested: 2026-11-16T00:00:00.000Z to 2026-11-23T00:00:00.000Z. Checked: 2026-11-16T02:46:49.630Z.
- [Open-Meteo point forecast: Tokyo](https://api.open-meteo.com/v1/forecast?latitude=35.68&longitude=139.69&daily=temperature_2m_max%2Ctemperature_2m_min%2Cprecipitation_sum%2Cprecipitation_probability_max%2Cweather_code&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=UTC&start_date=2026-11-16&end_date=2026-11-22): **complete**. 7/7 UTC forecast days. Observations: 2026-11-16T00:00:00.000Z to 2026-11-22T00:00:00.000Z. Requested: 2026-11-16T00:00:00.000Z to 2026-11-23T00:00:00.000Z. Checked: 2026-11-16T02:46:49.621Z.
- [Open-Meteo point forecast: Sydney](https://api.open-meteo.com/v1/forecast?latitude=-33.87&longitude=151.21&daily=temperature_2m_max%2Ctemperature_2m_min%2Cprecipitation_sum%2Cprecipitation_probability_max%2Cweather_code&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=UTC&start_date=2026-11-16&end_date=2026-11-22): **complete**. 7/7 UTC forecast days. Observations: 2026-11-16T00:00:00.000Z to 2026-11-22T00:00:00.000Z. Requested: 2026-11-16T00:00:00.000Z to 2026-11-23T00:00:00.000Z. Checked: 2026-11-16T02:46:49.621Z.
- [NOAA/WPC Short Range Forecast Discussion](https://www.wpc.ncep.noaa.gov/discussions/pmdspdbody.txt): **complete**. 1/1 forecast discussion. Observations: 2026-11-15T19:18:00.000Z to 2026-11-15T19:18:00.000Z. Requested: 2026-11-16T02:46:48.834Z to 2026-11-17T14:46:48.834Z. Checked: 2026-11-16T02:46:49.643Z.
- [NOAA/WPC Extended Forecast Discussion](https://www.wpc.ncep.noaa.gov/discussions/pmdepdbody.txt): **complete**. 1/1 forecast discussion. Observations: 2026-11-15T18:53:00.000Z to 2026-11-15T18:53:00.000Z. Requested: 2026-11-19T02:46:48.834Z to 2026-11-22T02:46:48.834Z. Checked: 2026-11-16T02:46:49.706Z.
