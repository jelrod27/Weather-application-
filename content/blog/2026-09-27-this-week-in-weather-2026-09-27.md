---
slug: this-week-in-weather-2026-09-27
title: 'This Week in Weather — September 27, 2026'
date: 2026-09-27T16:32:09.985Z
author: 16bitbot
summary: >-
  A sourced recap of severe-weather reports, space weather and a New Caledonia
  earthquake, plus city forecast snapshots for September 27–October 3, 2026.
tags:
  - weekly-recap
  - forecast
  - severe-weather
  - space-weather
  - roadmap
heroImage: /api/og/blog?title=This%20Week%20in%20Weather&type=severe
readTime: 4
cadence: sunday_rearview
opener_hash: 23690b22
key_phrases:
  - 'preliminary reports, not a count of confirmed tornadoes'
  - each office's local time zone retained
  - city samples show different planning windows
  - 'a small chance, not evidence that rain is impossible'
model_used: claude-sonnet-4-6
images_used:
  - chaparral-supercell
  - pacific-ring-of-fire
image_audit:
  - >-
    id=chaparral-supercell; lane=severe; anchor=with each office's local time
    zone retained.; tags=severe_storms; caption=Archive illustration: a
    supercell over Chaparral, New Mexico.
  - >-
    id=pacific-ring-of-fire; lane=earthquake; anchor=the linked event record
    supplies this earthquake's measurements.; tags=earthquakes,volcanoes;
    caption=Pacific Ring of Fire: regional earthquake and volcanic context.
spotlight_active: null
generation_retries: 0
word_count: 796
closer_used: on-the-radar
updated: '2026-09-27T18:23:03.677Z'
---
## Rearview

Wind reports dominated the September 20–26 [SPC daily storm-report files](https://www.spc.noaa.gov/climo/reports/): 299 wind reports, 42 hail reports and 2 tornado reports. These are preliminary reports, not a count of confirmed tornadoes or distinct storms. Alabama had 56 reports across categories, followed by Georgia with 36 and North Carolina with 34; West Virginia had 28 and Mississippi 27. The totals describe the reports collected, rather than a ranking of damage or storm intensity.

A separate [Iowa Environmental Mesonet archive query](https://mesonet.agron.iastate.edu/api/1/vtec/sbw_interval.json?begints=2026-09-20T16%3A30%3A00Z&endts=2026-09-27T16%3A30%3A00Z) returned 983 NWS alert records for the seven days ending September 27 at 16:30 UTC. The largest categories were flood advisories, with 322 records, and severe thunderstorm warnings, with 302. Flash flood warnings accounted for 198. This archive sample includes advisories and watches as well as warnings; it is not a comprehensive count of every NWS alert issued nationwide.

On Friday, September 25, Albuquerque issued tornado warnings for Curry County, New Mexico, at 8:17 p.m. and 9:07 p.m. MDT. Lubbock issued tornado warnings for Parmer County, Texas, at 10:21 p.m. and 10:43 p.m. CDT. Those times come from the archived issuance records, with each office's local time zone retained.

![Archive illustration: a supercell over Chaparral, New Mexico.](https://commons.wikimedia.org/wiki/Special:FilePath/Chaparral_Supercell_2.JPG?width=1280)
*Greg Lundeen / NOAA. Illustrative archive photograph, not a photograph of the September 25 warnings.*

On September 21, Charleston's office issued a tornado warning for Lawrence County, Kentucky, and Wayne County, West Virginia, at 5:48 p.m. EDT. A later warning at 6:40 p.m. EDT covered Lincoln, Logan, Mingo and Wayne counties in West Virginia. A warning records a threat; it does not by itself confirm a tornado touchdown.

[NOAA SWPC's observed Kp readings](https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json) available for the recap window peaked at 4.33, on September 24 at 09:00 UTC. The retrieved [seven-day GOES X-ray observations](https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json) peaked at C3.7. These measurements alone cannot establish that every location had quiet radio or aurora conditions.

[USGS recorded a magnitude 6.6 earthquake](https://earthquake.usgs.gov/earthquakes/eventpage/us6000txpi) 80 km ENE of Tadine, New Caledonia, at 21:23 UTC on September 25: 8:23 a.m. on September 26 in New Caledonia. The Pacific tectonic setting provides context, while the linked event record supplies this earthquake's measurements.

![Pacific Ring of Fire: regional earthquake and volcanic context.](https://commons.wikimedia.org/wiki/Special:FilePath/Pacific_Ring_of_Fire.svg?width=1280)
*Wikimedia Commons. Regional reference map, not a map of this week's earthquake activity.*

## Roadmap

*Forecast snapshot refreshed September 27 at 18:20 UTC, covering September 27–October 3 at the named city coordinates. Linked forecast endpoints update as new model runs arrive.*

The city samples show different planning windows: New York has its strongest rain signal early in the week, while Dallas's highest precipitation probability falls on October 1. Denver and San Francisco have lower forecast precipitation totals. These point forecasts help compare timing, but do not establish a continent-wide pressure pattern or the cause of a particular storm. They also do not describe every location in their surrounding regions.

**New York City.** The [refreshed city forecast](https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74&daily=temperature_2m_max,precipitation_sum,precipitation_probability_max&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto&forecast_days=7) has average daily highs near 73°F and about 1.55 inches of precipitation across seven days. The highest daily precipitation probability is 100% on September 27, followed by 83% on September 28. For outdoor plans, those two days deserve the closest hourly check. A high daily probability does not mean rain continues all day or arrives at a specific minute.

**Dallas.** The [updated point forecast](https://api.open-meteo.com/v1/forecast?latitude=32.78&longitude=-96.8&daily=temperature_2m_max,precipitation_sum,precipitation_probability_max&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto&forecast_days=7) totals about 1.32 inches for the week, with the largest daily precipitation probability, 71%, on October 1. September 30 and October 2 also carry elevated chances in this snapshot. Most of the model's weekly precipitation falls within that three-day period. This forecast alone does not establish a flash-flood threat; check [NWS Fort Worth/Dallas](https://www.weather.gov/fwd/) for current local forecasts, watches and warnings as the dates approach.

**Denver and San Francisco.** [Denver's sample](https://api.open-meteo.com/v1/forecast?latitude=39.74&longitude=-104.99&daily=temperature_2m_max,precipitation_sum,precipitation_probability_max&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto&forecast_days=7) averages highs near 77°F, with about 0.13 inches across the week and a peak daily precipitation probability of 63% on September 30. [San Francisco's sample](https://api.open-meteo.com/v1/forecast?latitude=37.77&longitude=-122.42&daily=temperature_2m_max,precipitation_sum,precipitation_probability_max&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto&forecast_days=7) has zero accumulated precipitation in this model snapshot, but a 7% peak probability on September 27. That remains a small chance, not evidence that rain is impossible. Low weekly totals also do not identify whether a particular hour will be dry.

**London.** The [London point forecast](https://api.open-meteo.com/v1/forecast?latitude=51.5&longitude=-0.13&daily=temperature_2m_max,precipitation_sum,precipitation_probability_max&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto&forecast_days=7) averages daily highs near 70°F, with about 0.11 inches of precipitation and its highest daily probability, 69%, on September 30. Keep that date in view when comparing days for an outing. Check the hourly detail again before choosing a departure time; the daily probability cannot locate the wettest hours.

## On the Radar

- Recheck Dallas's hourly forecast closer to September 30–October 2, and use NWS alerts for hazard decisions.
- Give New York outdoor plans flexibility on September 27–28; check the hourly forecast for the hours you actually need.
- Follow the linked USGS event record for updates to the New Caledonia earthquake, keeping its September 26 local date distinct from the September 25 UTC date.
