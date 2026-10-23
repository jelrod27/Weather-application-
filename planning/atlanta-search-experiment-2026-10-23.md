# Atlanta climate search experiment

Prepared October 23, 2026. The measurement window starts when deployed.

## Baseline

Search Console domain property: `sc-domain:16bitweather.co`, Web search, September 25–October 22, 2026. Page: `https://www.16bitweather.co/weather/atlanta-ga`.

- Page totals: 941 impressions, 1 click, 0.11% CTR, average position 11.8.
- Visible query rows include “hottest month in atlanta” (26 impressions, position 32.2), “atlanta climate” (17, 18.1), “how much rain does atlanta get a year” (15, 9.5), and “atlanta weather year round” (12, 4.0). All four had zero reported clicks.
- The 116 returned query rows account for 301 impressions and zero clicks. Query reporting omits some traffic; do not substitute these row totals for page totals or assume every impression's intent is known.

## Change and hypothesis

Use the title “Atlanta Climate & Weather by Month” and a factual description covering July temperatures, annual rainfall and travel timing. Keep the URL, canonical, live forecast, existing layout and expanded monthly table.

Correct the existing monthly temperatures to rounded NOAA/NCEI 1991–2020 airport normals, visibly link the source, and answer the hottest-month and annual-rainfall questions directly in the existing FAQ. Remove unsupported daily-storm frequency, dewpoint comparisons, highest-city and guaranteed-pleasant-weather claims from the edited Atlanta copy. No new client-side logic, provider request or runtime dependency is added.

Production-build inspection found the existing client bailout left the guide only in React's payload, while initial HTML showed a loading message. The city's Suspense fallback now includes the canonical city heading and climate guide, with an anchor to the guide while live weather loads. The fallback and client's forecast placeholder reserve a viewport so the guide does not briefly paint and then get pushed down by hydration or the live forecast. This preserves ISR and the hydrated location-override behavior while making the guide readable without JavaScript.

Hypothesis: more specific, accurate answers and snippet copy can improve relevance and clicks for the searches already reaching this page. This is a before/after experiment, not an A/B test or a promise of ranking improvement. Search engines may rewrite snippets and FAQ markup does not guarantee a rich result.

## Sources

- [NOAA/NCEI monthly normals CSV](https://www.ncei.noaa.gov/data/normals-monthly/1991-2020/access/USW00013874.csv): station USW00013874, Atlanta Hartsfield International Airport, 1991–2020. January high/low 54.0/35.6°F; July 90.1/71.8°F and mean 80.9°F. The displayed table rounds all 12 months to whole °F.
- [NWS Atlanta rainfall scorecard](https://www.weather.gov/ffc/rainfall_scorecard): 1991–2020 normal annual precipitation 50.43 inches; October 3.28 inches. Normals describe a station and baseline period, not every neighborhood or a travel-day forecast.

Retrieved October 23, 2026. Firecrawl could not retrieve the CSV, so its values were read directly from NOAA with Python's standard CSV reader. No production fetch or retained raw data is needed.

## Validation and measurement

Validation completed locally:

- Production build, both TypeScript projects, changed-file ESLint and whitespace checks passed. City routes retain ten-minute ISR.
- Full Jest suite on current main (`a480000`) with this change: 297 suites / 2,482 tests passed after a clean locked-dependency install. The only added page regression makes the actual live client suspend and checks that the guide, monthly values and source remain in the rendered HTML; it failed before the fix. No editorial snapshots or documentation tests were added.
- Production browser inspection verified Atlanta's title, description, canonical, expanded monthly table, source link and matching visible FAQ/JSON-LD answers. Boston retained its existing title, table and canonical without Atlanta's source link.
- A JavaScript-disabled browser could read all 24 monthly temperature cells, follow the guide anchor and see the NOAA source. Mobile/desktop hydrated checks found one guide, no page overflow and no original-city guide after a coordinate override.
- Cold loads with a 350ms JavaScript delay and 4× CPU throttling produced layout-shift sums of 0.00060 at 390×844 and 0.00311 at 1440×1000. Repeating on the updated main dependencies measured 0.00060 and 0.00268 respectively, with no overflow and preserved location overrides. Before correcting the client placeholder, the same desktop setup measured about 0.35. These are short local observations, not Lighthouse scores or real-user field metrics.
- Full lint passed with the existing 89 warnings; Knip and the workflow parser/pinned-action check passed. Both touched TypeScript tests are now included in the test type-check project. The workflow regression declares the already-installed YAML parser as a direct dev dependency; it adds no installed packages.
- Local browser console messages included unavailable Vercel analytics endpoints and an existing manifest-icon warning. No browser runtime exception was observed in these checks. The full cross-browser E2E matrix and Lighthouse suite were not rerun; the local browser work targeted the changed rendering, location identity and layout behavior.

After deployment, record the deployment date and review a complete 28-day window after recrawling. Compare page clicks, impressions, CTR and average position, plus the same query/device/country segments when enough data is available. Treat a one-click difference cautiously; report seasonal demand and ranking changes alongside CTR. No scheduled monitor or follow-up automation is created by this change.
