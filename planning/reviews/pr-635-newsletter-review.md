# PR 635: September 27 newsletter verification

Initial reviewed head: `8e206752651a7d09518ac517887edaa21bc3930b`.
Base: `9916b0fbfb32548b9fbc90cb850da9562c33719e`.

## CI diagnosis

The original Chromium job (`108660125826`, run `36333607661`) received a runner shutdown signal while executing the suite. Its test step was cancelled, no failed assertion was reported, and report uploads were skipped. One failed-job rerun was requested. No test was weakened or application behavior changed to address that interruption.

## Source checks and article corrections

Source evidence was retrieved September 27, 2026 at approximately 18:20 UTC. This is an AI-assisted source check, not a meteorologist's signed review. The corrected article links its primary sources and labels its forecast retrieval time.

- The [IEM archive query](https://mesonet.agron.iastate.edu/api/1/vtec/sbw_interval.json?begints=2026-09-20T16%3A30%3A00Z&endts=2026-09-27T16%3A30%3A00Z) returned 983 records. Actual categories included FA.Y 322, SV.W 302, FF.W 198, MA.W 60, FA.W 49, FL.W 32, TO.W 14, FL.A 3, FL.Y 1, DS.Y 1 and DS.W 1. The article now calls this an alert-record sample rather than a comprehensive national warning count. The adapter's comment claiming that this response excludes watches/advisories does not describe this payload.
- The September 20–26 [SPC report files](https://www.spc.noaa.gov/climo/reports/) contained 343 reports: tornado 2, hail 42, wind 299. The article now calls them preliminary reports, not confirmed tornadoes. State counts quoted in the article match the retrieved files.
- ABQ records at 02:17 and 03:07 UTC September 26 convert to 8:17 and 9:07 p.m. MDT September 25. LUB records at 03:21 and 03:43 UTC convert to 10:21 and 10:43 p.m. CDT September 25. Both ABQ warnings are included; the bot's narrower suggested interval was not copied blindly.
- RLX records at 21:48 and 22:40 UTC September 21 convert to 5:48 and 6:40 p.m. EDT, in that order.
- [NOAA Kp observations](https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json) in the recap window peak at 4.33 at 09:00 UTC September 24. The retrieved [GOES seven-day X-ray series](https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json) peaks at 3.739429303095676e-6 W/m² in the 0.1–0.8 nm channel, corresponding to C3.7. Unsupported blanket claims about radio disruption and aurora were removed.
- [USGS event us6000txpi](https://earthquake.usgs.gov/earthquakes/eventpage/us6000txpi) has magnitude 6.6 and origin 2026-09-25T21:23:03.309Z, or September 26 at 08:23 in Pacific/Noumea (UTC+11).

The refreshed Open-Meteo point forecasts cover September 27–October 3. Daily fields were requested in Fahrenheit and inches with the location's automatic timezone. The article links each query; those live links will update over time.

| Location | Mean daily high, rounded °F | Seven-day precipitation, inches | Highest daily probability | Peak date |
| --- | ---: | ---: | ---: | --- |
| New York (40.71, -74.00) | 73 | 1.551 | 100% | September 27 |
| Dallas (32.78, -96.80) | 87 | 1.323 | 71% | October 1 |
| Denver (39.74, -104.99) | 77 | 0.131 | 63% | September 30 |
| San Francisco (37.77, -122.42) | 75 | 0 | 7% | September 27 |
| London (51.50, -0.13) | 70 | 0.107 | 69% | September 30 |

The original generation did not preserve its complete forecast inputs, so the original Dallas total of 10.11 inches cannot be independently reconstructed from that run. It is replaced by a clearly dated refreshed snapshot, not described as a proven fabrication. Unsupported ridge, jet, frontal, moisture-anomaly, NAO and climate-normal diagnoses were removed. A low precipitation probability remains a nonzero chance.

The mutable GOES image (whose URL now redirects to GOES-19 despite a GOES-16 caption) and the unrelated Sumatra 2004 image were replaced by a clearly labeled archive storm photograph and a regional Pacific reference map, placed within the article. Image audit metadata, reading time, word count, opener hash and key phrases were refreshed. Original-draft similarity scores were removed because the revised text was not rerun through the paid similarity judge.

Only the exact IEM and Open-Meteo API hosts were added to the existing link allowlist so the new citations survive rendering. HTTPS and exact-host matching remain enforced. Regression cases cover valid citations and insecure/spoofed destinations.

## Follow-ups outside this article repair

The existing newsletter Kp parser expects `kp_index` while the retrieved object records use `Kp`; it drops those readings and reduces an empty set to zero. The newsletter also falls back to zero-valued summaries on some provider failures. These ingestion and missing-data behaviors need a separate focused repair with provider-schema and failure-path tests. Other pipeline improvements: archive generation inputs; constrain forecast interpretation to supplied evidence; preserve preliminary-status and coverage labels; update the GOES catalog; validate final image placement. This PR does not claim to fix those pre-existing generator paths.
