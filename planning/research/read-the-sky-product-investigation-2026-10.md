# Read the sky local conditions investigation

Date: October 9, 2026. Repository baseline: `dde9e5c` on `main`.

Status: research and proposed scope. No application implementation or product specification has been approved by this document.

Subsequent design interview: the user chose **Read your sky**, a description with one matching scientific illustration, and **current conditions through roughly the next two hours**. If current local data is unavailable, the page must say so and provide clearly labeled general learning. Those choices supersede the naming and six-hour recommendations below. The user confirmed the [design session](../read-the-sky-design-session.md); [issue #664](https://github.com/jelrod27/Weather-application-/issues/664) is the approved product specification, with visual prototyping next.

## Recommendation

Make the forecast's sky destination answer **what the sky near the selected location is like now, what may change over the next few hours, and how to understand what the visitor sees**. The user explicitly selected that goal during this investigation. Cloud identification and general education support that goal rather than lead the page.

Use **Sky now** as the compact forecast navigation label and **Read your sky** as the page heading, with the selected place immediately visible. Keep the existing illustrated lessons and Cloud Atlas as deeper learning destinations. A useful first version can use the existing weather provider and deterministic, reviewed explanations. It does not need photo recognition or generated weather prose.

The critical distinction is evidence: a model can estimate cloud cover and layers near a location; those values do not establish which cloud genus is visibly overhead. Nearby airport observations are a different source and must remain labeled by station, distance, and observation time. See the [source and API feasibility investigation](./read-the-sky-data-feasibility-2026-10.md).

## What visitors get today

The live journey was inspected from the New York city forecast to the cloud lesson, through its final step, and into the Cloud Atlas. The following behavior is also confirmed by source at the baseline commit.

| Finding | Evidence | Effect on the visitor |
| --- | --- | --- |
| Forecast and Hourly use “Read the sky” for a generic lesson. | [WeatherJourney](../../components/weather-journey.tsx), [journey URL builder](../../lib/weather/journey.ts). | A link beside local forecast views suggests local interpretation, but opens unrelated teaching content. |
| The lesson only receives a lesson name and return URL. | [Page boundary](../../app/education/weather-skills/page.tsx), [lesson component](../../components/education/weather-skills.tsx). | The original place survives in the Back link, but is not used to choose or explain lesson content. |
| Every visitor starts with Stratus, then Cirrus, then Cumulonimbus. | The fixed `LESSONS.clouds` array and `CLOUD_NAMES` in the lesson component. | A clear night, low overcast, and broken daytime cloud all get the same experience. |
| The Education Hub sends “Read the sky” to a different destination. | `START_HERE` in [EducationHubClient](../../components/education/education-hub-client.tsx) points to `/cloud-types`. | The same phrase has two meanings and the Hub does not introduce the newer lesson path. |
| The Atlas leads with 35 Entries, taxonomy counts, filters, and text. | [Cloud Atlas](../../app/cloud-types/page.tsx), [cloud data](../../data/cloud-types.ts); live page inspection. | It is a reference index, not a fast explanation of the visitor's sky. |
| Learning paths lose the original weather return context beyond the lesson. | `lesson.guide.href` is `/cloud-types`; Atlas and Guide back links lead to education. | A visitor who explores a cloud cannot directly return to the same local weather view through an explicit contextual link. |
| Some existing “Signals” are overspecific static claims. | `weatherPrediction` in cloud data includes “change in 8-10 hrs” for cirrus and “Rain or snow within 24 hours” for cirrostratus; [CloudGuide](../../components/education/cloud-guide.tsx) displays the field. | Reusing these strings as local interpretation would turn general associations into unsupported local predictions. |

The existing lesson does have useful qualities to retain: cited WMO/NOAA explanations, deliberately illustrative diagrams, explicit uncertainty about local rain, native controls, keyboard focus handling, and safe return links. The problem is primarily the destination's purpose and context, not that it needs longer paragraphs.

This gap was already observed in the [September 26 UX audit](../ux-audit-2026-09-26.md): the lesson was insufficiently exposed from education, and cloud identification remained text-heavy. The [approved September UI work](../pr4-improve-weather-ui.md) intentionally delivered short lessons. A local sky tool is a new capability beyond that shipped scope.

## Existing decisions to preserve

- The [education direction](../education-hub-direction.md) positions evergreen Guides as search assets. The live sky tool should lead people into those Guides without replacing their URLs or turning them into location-dependent pages.
- [ADR 0001](../adr/0001-depth-over-breadth-for-education-guides.md) favors depth over generating a thin page for every Entry. This proposal does not require expanding the published Guide count.
- [ADR 0002](../adr/0002-education-content-is-markdown-not-mdx.md) keeps educational prose in Markdown with registered diagrams. Reuse that structure for reviewed explanations.
- [ADR 0003](../adr/0003-notation-and-reading-typography-are-invariant.md) preserves meaningful meteorological notation and readable Guide typography across themes.
- [CONTEXT.md](../../CONTEXT.md) distinguishes an Atlas from a Guide. The local tool should not rename the Atlas or imply every Entry has a Guide.

## Recommended first experience

### 1. Your selected place and current sky

The first screen names the selected city or area, shows its local time and the valid time of the weather estimate, then gives one useful sentence. Example copy, illustrative rather than a live report:

> Low cloud is the dominant modeled layer near your selected location. The forecast shows more gaps later this afternoon.

That wording is only eligible when the corresponding valid inputs and time-series trend support it. If only total cloud cover is available, describe total coverage without inventing a layer. A refresh time must not masquerade as the observation or model issue time.

Use a small, clearly labeled cloud-layer illustration or three independent layer bars. Do not make a photorealistic sky image look like a live camera. Layers overlap, so low, middle, and high cover must not be added into a stacked percentage total.

### 2. What that means when you look outside

Explain the supported pattern in ordinary language, then invite comparison with actual appearance. For example, a low-layer lesson can ask whether clouds form a continuous sheet or separate rounded patches. Show faithful, attributed visual references where rights are verified. Label these as examples, not today's clouds.

Do not label a low-cloud estimate “stratus detected,” turn a high-cloud estimate into “cirrus overhead,” or infer a storm from a cloud-layer percentage. Even a “likely type” ranking needs a defensible method and validation that the current data does not provide.

### 3. How the sky may change

Show the next six hours initially, with cloud cover, relevant layer changes, and local time labels. Add precipitation or visibility only when it explains the sky and is independently supported by its own field. Keep cloud amount distinct from rain probability and horizontal visibility. A cloudy but dry period should be understandable without visiting three other pages.

The six-hour range is a proposed product choice, not a provider limitation. Decide whether users need a longer range after testing the first version.

### 4. One relevant thing to learn

Offer one short explanation and a clear route into the appropriate existing lesson or published Guide. Provide “Compare cloud shapes” and “Browse the Cloud Atlas” as secondary actions. Location and the originating weather return path should survive the local learning journey.

At night, use the same weather estimate with nighttime language and an optional link to Stargazer for celestial targets. Do not recommend inspecting subtle cloud colors in darkness or rebuild the astronomy experience inside this page.

### 5. Source and limits where they matter

Keep a compact, visible source label: “Weather model estimate,” valid time, and last retrieved time. Explain spatial limits in a details disclosure. For future station enrichment, show a separate “Nearby observation” block; never silently replace the selected city's estimate with an airport report.

For no location, offer the existing location search and access to general cloud learning. For missing data, say the local sky estimate is unavailable and retain useful education. For stale data, show its age and suppress fresh-sounding predictions. Missing values must remain unknown rather than defaulting to clear skies.

## Scope and sequencing

| Stage | Deliverable | Why |
| --- | --- | --- |
| First release | Selected-location sky estimate, low/middle/high layer context, six-hour outlook, source/valid time, recovery states, contextual learning and return navigation. | Directly answers the user's confirmed goal with available data. |
| Following slice | Nearby METAR corroboration with station selection, distance, elevation/terrain considerations, observation age, and disagreement handling. | Adds observational evidence without weakening the global experience where stations are absent. |
| Learning improvement | Curated cloud-shape comparisons and carefully reviewed explanations linked to local context. | Helps a person compare what they see rather than memorize taxonomy. |
| Separate feasibility work | Photo-assisted identification, sky cameras, a satellite viewer, or richer regional pattern interpretation. | Each introduces distinct coverage, licensing, cost, validation, and operational questions. None is necessary for a useful first release. |

Regional climate and season can inform optional educational examples. They are not evidence that a cloud type is present today. Avoid a geographic lookup table that automatically assigns a genus to a city or region.

## Feasibility checks and remaining decisions

Read-only API samples returned current total and layered cloud cover for San Francisco, London, Tokyo, and La Paz. A separate KSFO observation confirmed the need to distinguish station reports from the selected-place estimate. These checks establish available response fields, not forecast accuracy or universal coverage. Timestamped results and source limitations are in the [data feasibility report](./read-the-sky-data-feasibility-2026-10.md#read-only-api-checks).

Before implementation, confirm the site's existing Open-Meteo access arrangement and incremental request accounting; using an existing provider does not guarantee zero additional cost. Verify rights for each educational image. Keep nearby observations outside the first release unless the agreed scope includes station selection and reporting-gap handling. Naming, the proposed six-hour horizon, and the compact screen layout remain design decisions for the next skill session.

## Implementation opportunities and constraints

1. **Preserve location as explicit input.** Extend the existing journey URL convention with validated coordinates and a display label. Keep the existing safe return-path validation. Do not treat a saved warning location, browser location, or IP guess as the selected place.
2. **Use the weather-provider boundary.** [lib/open-meteo.ts](../../lib/open-meteo.ts) already fetches current total `cloud_cover` and supports additional current/hourly fields. The [weather adapter](../../lib/weather/open-meteo-adapter.ts) currently drops current cloud cover, while [WeatherData](../../lib/types.ts) lacks current and hourly cloud-layer fields. Merely adding UI will not expose that missing data.
3. **Reuse the narrow Stargazer precedent.** [forecast-inputs.ts](../../lib/stargazer/forecast-inputs.ts) validates cloud values, units, timestamps, and nulls. [build-payload.ts](../../lib/stargazer/build-payload.ts) already requests the three cloud layers. Reuse or extract only the needed weather-reading behavior: the full Stargazer endpoint also loads astronomy, satellites, launches, and observing scores that a daytime sky page does not need.
4. **Keep interpretation testable.** A small pure function should turn validated weather fields into reviewed statements and relevant learning links. No LLM call is needed for the first release. Avoid rules that silently infer morphology, precise cloud bases, storm development, rain arrival, or cause from a single percentage.
5. **Make freshness explicit.** Keep valid time, retrieval time, and any actually available model update metadata separate. Use absolute timestamps plus the selected location's IANA timezone for display, including repeated daylight-saving hours. Check cache age separately from the weather's valid time.
6. **Keep optional sources optional.** A missing observation or learning image must not prevent the modeled snapshot from rendering. Ignore responses for a previous place after the user changes location.
7. **Preserve forecast policy.** Current conditions and ancillary variables use Best Match; the NBM policy is deliberately scoped to US forecast temperatures. Adding cloud layers must not accidentally change that selection or alter forecast units.
8. **Audit METAR before reuse.** The current [METAR route](../../app/api/aviation/metar/route.ts) takes an ICAO station, not a city/coordinate, and the [parser](../../lib/aviation/metar.ts) exposes cover and base but not a general cloud-type classification. Nearby-station selection and full missing/clear/obscuration semantics are additional work.
9. **Keep routes stable.** A new `/sky` route is the recommended implementation shape, subject to the design decision. Retain `/education/weather-skills`, `/cloud-types`, and published Guide URLs. Give static lessons explicit education labels; give local sky entry points a consistent destination. Avoid indexable copies for every arbitrary coordinate query.

## Acceptance and validation plan

- Enter from Forecast and Hourly; keep the exact selected place and return destination. Test a direct visit, missing location, invalid coordinates, foreign timezone, midnight, and daylight-saving transitions.
- Cover clear, mixed layers, overcast without rain, fog/poor visibility, rain, nighttime, missing layers, stale data, and provider failure. Verify every displayed sentence against the available inputs.
- Prove that missing cloud values do not become zero, layer values are not summed, and no morphology claim is produced from cloud-cover percentages.
- Test a place change while requests are in flight, retry recovery, source/time labels, keyboard operation, and widths of 390 and 1280 pixels. Keep the local summary near the top on smaller screens.
- Preserve the old lessons' steps, source links, focus behavior, and return-path protections. Existing [lesson tests](../../__tests__/education/weather-skills.test.tsx), [journey tests](../../__tests__/weather-journey.test.tsx), and [browser tests](../../tests/e2e/weather-skills.spec.ts) are the regression starting point.
- For station enrichment, separately test station distance, terrain mismatch, stale reports, obscured sky, missing layers, and disagreement with the model. A nearby report must never be described as an observation at the user's pin.
- Validate comprehension with a small set of everyday visitors: can they name the selected place, explain the current estimate and near-term change, and distinguish an estimate from an observation or example cloud? Measure incorrect conclusions as well as completion and engagement. Establish a baseline before choosing numerical success targets.
- Run the repository's relevant unit tests, lint, both TypeScript checks, Knip, build, and affected E2E/Lighthouse checks during implementation. Follow all required PR checks, including `Preview Smoke`; Production Smoke verifies the deployed result after the authorized merge/deployment process.

## Skill and issue workflow

Research is the correct first skill and has been used for the data/source investigation. The next useful skill is **`grill-with-docs`**, to settle the proposed screen hierarchy, naming, and first-release boundaries using these findings. Use **`prototype`** if the screen is difficult to judge from prose, then **`to-spec`** to record the agreed behavior in the configured GitHub issue tracker. Use **`to-tickets`** if the approved specification needs several independently testable slices. Implementation follows with TDD and the standards/spec code review.

Suggested parent issue title: **Make Read the sky explain current conditions for the selected location**. The body should include the confirmed user goal, observed route mismatch, proposed first-release scope, explicit model-versus-observation wording, acceptance criteria, and links to this research. Use `enhancement` and `needs-triage` until the design is agreed; `ready-for-agent` would be premature. Searches for “read the sky,” open cloud issues, and open education issues found no matching issue during this investigation. Recheck before publishing to avoid a duplicate.

The issue/spec must precede substantial application changes under [CONTRIBUTING.md](../../CONTRIBUTING.md). No issue or implementation ticket has been published by this investigation, and there is no need to invoke the heavier `wayfinder` flow for the currently bounded first release.

## Investigation coverage

Completed: live forecast-to-lesson navigation, final lesson state and return link, live Atlas inspection, relevant source and test review, existing planning/ADR review, GitHub issue search, and official-source/API feasibility research. Both research reports were checked for broken local links and trailing whitespace. Existing tests were read, not executed; no application code changed. The walkthrough used the browser's current viewport, not a complete device or assistive-technology matrix. The proposed acceptance matrix above remains implementation work.
