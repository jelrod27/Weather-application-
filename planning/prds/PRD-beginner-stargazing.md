# PR 6: Beginner stargazing

Status: approved September 26, 2026. Implementation in progress.

This is the final PR in the [weather experience remediation batch](../weather-ux-remediation-scope.md). Audience: everyday users first, with depth for enthusiasts. Branch: `codex/beginner-stargazing`. Review baseline: `b6625a43164e8e434197885e9e3db19796f25cec`, the merged PR #631.

## Outcome

A visitor should be able to answer four questions without understanding astronomy scores:

1. Is there a useful opportunity to look at the sky from this place tonight?
2. Which hour should I try, and what weather might get in the way?
3. What can I try to find with my equipment?
4. Which direction should I face, how high should I look, and what should I expect to see?

Deliver this inside the existing Stargazer experience, keeping its detailed conditions, targets, events, launches, and indexed object guides. Use the approved Daybreak styling, compact typography, and existing theme tokens. No account is needed.

Success means a first-time visitor can choose a city, read a suggested hour, identify a suitable target and its direction, open its explanation, and return without losing the city, hour, or equipment selection. The same journey must work on a narrow phone and by keyboard. Missing weather or unsuitable targets must lead to an honest explanation and a useful next action.

## Evidence from the current experience

The September 25 [UX audit](../ux-audit-2026-09-25.md) identified the beginner astronomy journey. A September 26 review of the merged code and local production page confirmed these gaps:

| Finding | Consequence | PR 6 response |
|---|---|---|
| The headline is an astrophotography score; one summary says to stay home and process data. | A casual observer cannot distinguish a bad imaging night from a useful Moon or planet opportunity. | Lead with an observing summary; retain a clearly labeled photography score in Conditions. |
| A subscore can read `CLOUD 0` alongside 100% forecast cloud cover. | Users can interpret a score as the underlying measurement. | Show cloud cover as a percentage; label every retained score `/100`. |
| The generic score summary contains an unsupported fixed 11 PM moonrise and can equate a Moon below the horizon with a new Moon. | Advice can disagree with the actual astronomy. | Remove invented timing and phase claims; use calculated events and phase. |
| Targets are ranked by maximum altitude during the entire night. | A high target can be difficult for beginners, already set at the selected hour, or require equipment. | Select from a small reviewed beginner set using equipment and positions during the selected hour. |
| Deep-sky links and the object guide's return link drop the city. The guide independently asks for geolocation and silently falls back to New York. | Users can receive directions for a different place. | Carry one explicit location and observing time throughout the journey. |
| A `q`-only link prefills the search but does not resolve it before stored context. Searches do not persist the resolved city in the URL. | Shared links, reloads and back navigation can load the wrong location. | Resolve URL intent first and persist successful searches. |
| The page title uses the viewer's date; detailed weather uses fixed metric labels. | International and travelling users get inconsistent dates and units. | Use the viewed city's calendar and existing unit preference. |
| Missing 7Timer data defaults to 4/8; an empty night can produce a 50/100 fallback. | Unavailable information appears measured. | Track availability and suppress unsupported scores and measurements. |
| Bortle class is inferred from population, including a default for unknown population. | An estimate looks like a site measurement. | Explain the estimate and never use it as measured sky darkness or a target eligibility guarantee. |
| The catalog has 151 entries, but no search/equipment controls or beginner finding diagram. | Useful reference content is hard to discover and apply outside. | Add lightweight catalog discovery and a reusable direction/height guide. |

These findings justify targeted repairs in the touched Stargazer flow. They do not authorize a general rewrite of weather, alerts, or astronomy providers.

## Proposed user experience

### Entry and page order

Keep `/stargazer` and existing deep links. Add `Start here` as the default tab for an unqualified visit. Existing `#conditions`, `#targets`, `#events`, and `#launches` links still open their original panels. Place the location search, selected place, local night dates, and data status above the tabs. Move the large photography score and detailed subscores into Conditions.

The default panel contains:

- **Tonight in [place]:** a plain-language statement about forecast cloud cover, the available observing period, and any missing information.
- **Try this hour:** one future one-hour comparison, the reason it was selected, and a control to choose another available hour that night. Show temperature range, highest forecast wind, cloud-cover range and precipitation chance with units and interval labels.
- **Your equipment:** `Just my eyes` by default, `Binoculars`, or `Small telescope`. This controls expectations and target suitability; it does not promise visibility through every instrument.
- **Up to three things to try:** target name, what it looks like, equipment guidance, direction and height at an explicitly displayed time, and a finding/explanation action.
- **Learn to look:** short illustrated explanations of compass directions/height, twilight versus darkness, and why clouds and moonlight affect different targets differently.
- **Go deeper:** links to detailed Conditions, all Targets, the catalog, Hourly, and Radar, preserving the place where those destinations support location context.

Do not force three cards when fewer are suitable. Do not turn an overcast forecast into an enthusiastic recommendation merely because objects are geometrically above the horizon.

### Time selection

Use the current observing night when a visit occurs before its dawn; otherwise use the upcoming night. Always display both local dates when crossing midnight. In continuous darkness, use a clearly labeled next-24-hours horizon. Never label a fabricated sunset or dawn as an observed event.

Choose from future one-hour periods aligned to the provider's actual hourly timestamps, with complete endpoint coverage. A period starting before the current instant is not a suggested future hour. Do not assume each local day has 24 hours or construct instants by parsing local clock labels.

The selected hour is a real start/end pair. The direction diagram and card text explicitly use its midpoint, for example `Where to look at 9:30 PM`. Target eligibility is checked every 15 minutes including both endpoints; this is an approximation, not a claim of continuous visibility. Explain that objects move during the hour. Changing the hour updates weather, targets and diagrams together.

An expired or out-of-horizon shared selection is replaced by a valid current selection with a visible notice. Reloading must not silently describe an old night as tonight. A small client clock can expire selections and refresh status; it must not repeatedly refetch all upstream providers every minute.

### Target cards and realistic expectations

Start with the Moon, Venus, Mars, Jupiter and Saturn, plus eight existing catalog objects: M31, M42, M45, M44, M7, M13, NGC5139 and NGC104. The set covers northern and southern observing opportunities. Do not treat the existing catalog's `beginner` or `nakedEyeVisible` flags as sufficient evidence for a recommendation.

Each curated object needs reviewed equipment guidance, a short visual description, limitations, and a primary-source reference before it ships. Conservative minimum equipment for this first recommendation set:

| Target | Suggested equipment | Expectation to explain |
|---|---|---|
| Moon | Eyes; binoculars or telescope reveal more | Bright disk and surface patterns; crater shadows depend on phase. |
| Venus, Mars, Jupiter, Saturn | Eyes for identification; telescope for fine detail | A bright point to the unaided eye; do not promise naked-eye rings or planetary surface detail. |
| M45 | Eyes under suitable skies; binoculars recommended | A small grouping of stars, with more visible through binoculars. |
| M31, M42, M44, M7, NGC5139, NGC104 | Binoculars or telescope | Appropriate star groups or faint patches; detail depends on sky darkness and equipment. |
| M13 | Small telescope | A faint rounded patch; resolving individual stars is not guaranteed. |

NASA supports the general Moon/planet/binocular approach; these equipment cutoffs are conservative product choices, not universal visibility limits. Validate target-specific descriptions and source links during content work. If a listed target cannot be supported, remove it from the recommendation set while retaining its existing catalog page.

Avoid suggesting Mercury, Uranus, Neptune, comets, meteor rates, ISS passes or launch visibility in this beginner recommendation set. They remain available through the existing deeper tools where present. Do not imply that every target appears as a colorful long-exposure photograph.

### Finding visuals and learning

Create a lightweight, deterministic SVG compass and horizon diagram from the calculated azimuth and altitude. Use north/east/south/west labels and plain text such as `Face southeast; look about halfway up the sky`. Display approximate degrees as secondary information. Above 85° altitude, say `Nearly overhead` and avoid a misleading precise direction.

This is a diagram for the selected location and time, not an AR view or a compass connected to the phone. It uses true north; terrain, trees and buildings are not modeled. Keep those limitations beside the finding guidance. Provide the same information in text for screen readers. A visual must not require dragging, animation, color perception, a camera, or device orientation permission.

Three short, source-backed lessons are enough: finding a direction and height; sunset/twilight/darkness; and Moon/cloud/light-pollution tradeoffs. Use a properly labeled phase schematic or a neutral Moon icon; do not retain an illumination percentage clipped into an inaccurate phase graphic.

### Catalog and object guides

Keep the existing catalog route and all 151 detail routes. Add case-insensitive search across ID, name and alternate names, plus equipment and object-type filters. Include a result count, clear filters, and useful no-results text. Unknown equipment metadata is unknown, not an automatic match. Default to the full catalog so pages remain discoverable.

Keep existing best-month information as reference, without using months as proof that an object is above the horizon. A separate catalog-wide `visible tonight` filter and season filter are deferred: the selected-hour recommendations provide the first reliable visibility path without suggesting all 151 objects were fully assessed for observational suitability.

Deep-sky cards open their existing object guide with place, hour and equipment preserved. Add `How to find it` using the same location/time interpretation and diagram; move practical viewing guidance before imaging tips. A direct guide visit without a selected location offers location selection rather than silently using New York. Returning to Stargazer restores the selected beginner context; legacy target links still return to Targets.

## Data and calculation rules

### Existing resources to reuse

| Resource | Use | Boundary |
|---|---|---|
| Open-Meteo hourly forecast | Clouds, temperature, wind, humidity/dew context; add `precipitation_probability` and `weather_code` to the existing request | Forecast estimates, not current observations or certainty of clear sky in a particular direction. |
| Astronomy Engine, installed version 2.1.19 | Sun/Moon/planet positions, twilight, phase and target directions | Calculated sky geometry; no terrain or local obstruction model. |
| Existing deep-sky catalog | IDs, coordinates, static pages and supporting reference details | Review the curated subset; magnitude alone does not determine how easily an extended object can be seen. |
| 7Timer ASTRO | Optional seeing/transparency in the detailed view | Missing or out-of-range data must not block the beginner path or become a fictitious 4/8 reading. |
| Existing geocoding, location context and weather journey helpers | Search, location continuity, weather/radar destinations | Explicit URL location takes precedence over stored/device location. |
| Existing theme, unit and time helpers | Daybreak/other themes, temperature/wind conversion, local dates and DST | Do not add a competing settings system or hand-written time-zone conversion. |
| NASA and USNO educational references | Short explanations and source links | Curated content; no runtime dependency on scraping their sites. |

No new provider, paid service, dependency, database table, cron job, or account flow is needed.

### Location and time contract

- Validate coordinates as complete finite numbers within latitude/longitude bounds. Reject malformed, partial and out-of-range pairs in the API and handle them clearly in the UI.
- Resolve a valid URL coordinate pair first; otherwise resolve a supplied `q` before saved context. A failed explicit city search must not silently fall back to another place. With no supplied or saved place, offer search and an explicit `Use my location` action.
- Preserve request cancellation and the existing intent/version guards. A late geocode or forecast must never replace a newer selection. While a new city is loading or fails, do not show the old city's recommendations as if they belong to it.
- Store successful city selections in the URL using existing `lat`, `lon`, and `q` conventions. Add a validated UTC selection parameter and an allowlisted equipment parameter for the Stargazer journey. Ignore unknown extras; do not pass user strings into arbitrary destinations.
- Use epoch instants for calculations and a validated IANA zone for local presentation. Provider UTC offset is not a substitute for an IANA zone across DST. Preserve the existing Open-Meteo Unix-time conversion; do not reintroduce the disproven per-label ISO/DST conversion from PR 5 review.
- Format all page headings, selected hours, midnight dates and event labels in the viewed place's zone. Repeated fall-back clock times must have an offset or zone suffix that distinguishes them. Label UTC explicitly if an instant can be shown without a known local zone; do not make local-night recommendations without a valid zone.
- Share links retain the selected context. Canonical SEO URLs remain the unparameterized catalog/detail paths; do not generate a sitemap entry for every city/time combination.

### Honest weather and freshness

Validate the fields used in recommendations: finite timestamps, non-duplicated chronological samples, percentage ranges, nonnegative wind, recognized weather codes, and reported units. Missing/null values are unavailable; real zeroes are valid. No averaging across a gap, stretching the last sample, converting null to zero, or substituting default weather.

One suggested hour needs contiguous start/end samples and the precipitation probability attached to its ending timestamp, which describes the preceding hour. Report cloud/temperature ranges and maximum sampled wind across both endpoints. A one-hour precipitation chance is not a combined probability for an entire night. Weather remains hourly even though astronomy is sampled more frequently.

Use these deterministic product rules for suggested hours:

1. Require complete cloud, temperature, wind, precipitation and weather-code coverage and at least one equipment-appropriate target meeting the geometry rules below.
2. Exclude the severe/freezing/heavy-precipitation code set already used by outdoor planning. Retain its documented meaning; do not recast this as a safety assessment.
3. Exclude periods with maximum sampled cloud cover at least 75% or precipitation chance at least 50% from affirmative suggestions. These are conservative product cutoffs, not scientific visibility boundaries. Users can still inspect another hour with a clear weather limitation.
4. Rank the remaining periods by lowest maximum sampled cloud cover, then lower precipitation chance, then lower maximum wind, then earlier start. Display the actual reason. Do not reuse the photography score as a beginner ranking or invent a combined viewing probability.
5. If none qualify, explain whether clouds, precipitation, missing coverage or target geometry prevented a suggestion. Keep educational browsing available.

Display `Forecast retrieved [time]` based on the successful provider fetch/cache record where available, separately from any known upstream model run. `generatedAt` alone is the server's assembly time and must not be called the model's update time. If the provider/cache fetch time cannot be established, say when this page received the forecast and that provider issuance time is unavailable. A client-held response older than 30 minutes needs refresh before an affirmative suggestion; the 30-minute threshold is a product policy. Do not mark old client data fresh by merely rerendering it.

7Timer samples need a valid initialization time and scale values, and a target time within their covered range; use the nearest sample only within 90 minutes of its timestamp for its three-hour grid. A live ASTRO response checked September 26 contained 24 samples at offsets 3 through 72 hours, spaced three hours apart. Require the initialization time to be no more than 24 hours old and not in the future; this age limit is a product freshness policy. Label unavailable seeing/transparency in detailed rows. Do not calculate or display a complete photography score from missing required inputs. Use the existing unavailable score variant for unavailable overall values; retain score function signatures and weights for valid data.

If Open-Meteo fails completely, keep a clear retry/change-location state and static learning/catalog links. This PR does not create a separate offline astronomy service. If only 7Timer, ISS or launch data fails, the core beginner forecast must remain usable. Distinguish provider failure from a successful empty event result where the touched UI exposes it.

### Geometry and recommendation rules

- Calculate Moon/planet topocentric coordinates for the actual observer and instant with Astronomy Engine's documented equator-of-date/horizon path. Handle catalog J2000 coordinates with the appropriate epoch transformation before horizon conversion. Cross-check both hemispheres and cardinal-direction conventions.
- For Moon/bright-planet cards, require the Sun to be at least 6° below the horizon and the target to remain at least 15° high at every 15-minute sample across the selected hour. Bright-planet apparent magnitude must be 2 or brighter for unaided-eye suggestions. These are conservative beginner selection rules, not claims about absolute visibility limits.
- Require at least 2% Moon illumination for an automatic lunar suggestion. A very thin or new Moon must not be described as an easy target.
- For the curated deep-sky targets, require astronomical darkness (Sun at least 18° below the horizon) and altitude at least 25° throughout the sampled hour. Suppress automatic faint-target suggestions when the Moon is above the horizon and more than 50% illuminated at any sample. Explain this conservative Moon preference and keep reference pages available.
- Equipment selection filters the reviewed target set. First fill cards with the qualifying Moon and bright planets; within that group prefer the Moon, then brighter planets, then greater minimum altitude, then name. Fill remaining places with qualified deep-sky targets, preferring greater minimum altitude, then stable ID. Cap at three cards, without duplicates.
- Keep the geometry result separate from the weather result. Say `Above the horizon at this time` or `A target to try if skies clear`, not `You will see it`. A population-derived Bortle estimate must not be used as observed sky darkness.
- No astronomical darkness does not mean no Moon or planet opportunities. Polar daylight, continuous darkness, twilight-only nights, circumpolar targets, missing rise/set events and targets near the zenith need explicit states.

### Existing score cleanup

Retain the valid-input photography scoring weights and the existing top-level score contract used by the home hub. Make the wording explicitly about photography conditions and label subscores `/100`. Replace the hard-coded moonrise/new-Moon claims. Do not treat the ground subscore as a validated danger rating. Guard invalid/empty data instead of emitting 50/100 or unsupported limiting factors.

The home hub currently reads `StargazerData.score`; add regression coverage for its unavailable state. The condition-alert PRD discusses reusing score functions but is not evidence that a new alert integration is needed. Do not build condition alerts in this PR.

## Code boundaries

Keep provider access server-side in the existing payload pipeline. Add focused pure helpers under `lib/stargazer/` for beginner selection and presentation data, accepting an explicit clock for deterministic tests. Keep astronomy calculations out of JSX and avoid shipping the full catalog/astronomy engine into unrelated weather pages. Reuse the existing object-guide client boundary where calculations are already required; use precomputed compact positions for the main plan when practical.

Expected touch points:

- `app/stargazer/page.tsx`, `StargazerCommandCenter`, `StargazerNav`, and focused new components for the beginner panel, target card and direction diagram.
- `hooks/useStargazerController.ts` plus one shared, validated Stargazer URL/context helper reused by cards and object guides.
- `lib/stargazer/build-payload.ts`, `astronomy.ts`, `seven-timer.ts`, `types.ts`, and focused beginner-target metadata/selection helpers. Preserve public score consumers; use explicit availability for new data and update touched renderers to handle it.
- `DeepSkyHighlights`, `ObjectDetail`, `TonightVisibility`, catalog presentation, `HourlyTimeline`, `MoonIntel`, and unit/time formatting in the touched flow.
- Existing forecast/home entry links only as needed to carry the selected location into Stargazer; use `lib/weather/journey.ts` and existing home link conventions.
- Focused Jest suites, Stargazer Playwright journeys/fixtures, and the batch scope/index documents.

Read relevant installed Next.js 16 guides before editing route, search-parameter or client/Suspense boundaries. Preserve static object metadata and generated routes. Do not broaden this into a repository-wide type, provider or styling refactor.

## Six proposed commits in one PR

Each behavior commit includes its focused regression coverage. The last commit joins the pieces and closes cross-page gaps; it is not the first point at which tests are written.

| # | Commit outcome | Acceptance evidence |
|---|---|---|
| 1 | **Keep one observing place and time.** URL resolution, successful search persistence, honest location recovery, local-night/date handling, location-preserving links and return paths. Include this approved scope. | Coordinate and `q` links, reload/back, failed search, stale requests, midnight and DST regressions. |
| 2 | **Make observing inputs trustworthy.** Validate used forecast values, add precipitation/code fields, availability/freshness metadata, optional-provider handling, accurate units, score labels and unsupported-summary fixes. | Missing versus zero, invalid units/ranges, hourly gaps/duplicates, absent/stale 7Timer, empty weather, home-hub unavailable score. |
| 3 | **Calculate suitable hours and targets.** Reviewed beginner target metadata, one-hour selection, equipment rules, Sun/Moon constraints and correct direction/height calculations. | Fixed-clock geometry and policy boundary tests; independently checked coordinate examples from both hemispheres. |
| 4 | **Build the beginner entry view.** Start here tab, city/night summary, suggested-hour and equipment controls, up to three cards, honest recovery states, Daybreak/theme support. | Component state and selection tests; narrow/mobile and desktop visual checks. |
| 5 | **Teach users how to find targets.** Compass/horizon diagram, short sourced lessons, catalog search/filtering and practical object-guide viewing section. | Accessible text equivalence, catalog filters, source links, object-guide round trip with city/time/equipment retained. |
| 6 | **Finish and validate the complete journey.** Entry links, keyboard tab behavior/focus, responsive details, SEO/performance checks, complete journey regressions and scope completion notes. | Production-mode Chromium/Firefox flows, all original tab deep links, meaningful local review and applicable CI/CD checks. |

If local review or bot review finds a real issue after these commits, use additional focused correction commits; do not rewrite history to force an exact count.

## Acceptance and validation

### User-visible acceptance scenarios

1. A first-time visitor with location permission denied can search for a city and use the feature without signing in or seeing directions for a silent default city.
2. A forecast link for London opens London; changing to Sydney updates night dates, weather and sky directions together. Refresh/back and target-guide return retain that context.
3. A clear full-Moon night can suggest the Moon or a bright planet even when the photography score is low. A new Moon is not offered as an easy visible object.
4. An overcast night gives no affirmative clear-sky suggestion. Changing the hour still shows astronomical positions with explicit weather limitations.
5. Changing equipment or hour changes eligible targets and directions, not just labels. Below-horizon and already elapsed targets never appear as current recommendations.
6. A twilight-only high-latitude night distinguishes bright-object opportunities from unavailable deep-sky darkness; a polar-day visit gets a clear explanation.
7. Missing weather, missing 7Timer, gaps, duplicate instants, null fields, true zeroes, invalid zones and stale responses show the intended distinct states.
8. A fall-back hour is unambiguous; a spring-forward gap is not filled with invented weather. A midnight visit uses the correct observing night.
9. The catalog search and equipment/type filters work with keyboard navigation, have a readable empty state, and retain links to all existing object pages.
10. A reader can understand the direction graphic through its text alone. Mobile users can select an hour, open a guide, return, and reach Conditions without horizontal page overflow.
11. Existing Conditions/Targets/Events/Launches deep links, home-hub score display, forecast and radar journeys continue working.

### Test strategy and release gate

- Use deterministic Jest tests for selection behavior, URL/clock logic, missing data and representative geometry. Test outcomes at boundaries rather than reproducing the implementation's sorting formula in assertions.
- Add component tests for meaningful control/state transitions and available/unavailable information. Reuse existing fixtures, extending them with realistic provider timestamps rather than hand-waving DST clock strings.
- Run a compact production Playwright matrix on Chromium and Firefox: desktop and narrow phone, one keyboard journey, a city/guide return journey, equipment/hour changes, no good period, optional-provider failure, and representative DST/high-latitude states. Keep browser tests deterministic with fixtures; perform a separate read-only live-provider smoke check without making CI depend on external weather.
- Validate astronomy with recorded, cited independent reference cases in addition to internal invariants. Include north/south hemispheres, azimuth wrap, nearly overhead and horizon rejection; numerical tolerance should match approximate UI precision.
- Run focused checks during work, then the full unit suite, app and test TypeScript projects, lint, Knip, and a production build. Inspect route output and payload/client bundle changes for unnecessary growth. Run applicable accessibility and Lighthouse checks; diagnose regressions rather than weaken thresholds.
- Before pushing/opening the PR, run the user's local `code-review` skill (Standards and Spec), fix verified findings and rerun affected checks. Keep ordinary Git hooks enabled. Report a concise validation summary and material limitations.
- After opening one PR, attach it and use the established babysit workflow. Confirm all applicable CI/CD checks, explicitly including Build, preview E2E and Lighthouse; then read actual CodeRabbit/other bot review bodies, comments and unresolved threads. A green review status with skipped/rate-limited coverage is insufficient. Address useful verified feedback, validate, review and push corrections. Do not merge automatically.

## Explicit limits and follow-ups

This PR does not add an AR sky map, phone-orientation tracking, a 3D planetarium, telescope control, live star-camera identification, dark-site routing, measured light-pollution tiles, multiday event optimization, equipment shopping, saved observing lists, alerts/notifications, AI recommendations or a new astronomy provider. It does not migrate CI to Blacksmith.

Existing ISS, launches and astronomical events remain enthusiast depth; full provider freshness/visibility redesigns for those tools require separate scope. The catalog is retained in full, but recommendation-grade content review covers the curated beginner set. Weather forecasts and clear-horizon calculations cannot guarantee what a person will see at a particular site.

## Reference sources

Reviewed September 26, 2026. Use short original explanations and direct links; do not copy articles or make external sites runtime dependencies.

- [NASA skywatching FAQ](https://science.nasa.gov/skywatching/faq/): starting without a telescope, observing locations, equipment and light pollution.
- [NASA Moon viewing tips](https://science.nasa.gov/moon/viewing-tips/): illuminated phases and how surface shadows affect visible detail.
- [NASA binocular skywatching](https://science.nasa.gov/solar-system/skywatching/night-sky-network/binoculars-a-great-first-telescope/): binocular suitability and realistic examples including M45, M31 and M42.
- [USNO rise, set and twilight definitions](https://aa.usno.navy.mil/faq/RST_defs): horizon assumptions and civil/nautical/astronomical twilight thresholds.
- [Open-Meteo forecast documentation](https://open-meteo.com/en/docs): hourly measurements, units, Unix instants, WMO codes and preceding-hour precipitation probabilities.
- [7Timer documentation](https://www.7timer.info/doc.php?lang=en): ASTRO variables and forecast definitions. The three-hour cadence was also verified against a live ASTRO response for public New York city coordinates; validate cadence and valid-time coverage on incoming responses.
- [Astronomy Engine](https://github.com/cosinekitty/astronomy): installed `node_modules/astronomy-engine/README.md` and declarations document the observer, equator-of-date, horizon and J2000 transformation APIs used by the existing app.

## Approval record

The user approved this six-commit design with “approve” on September 26, 2026. Proceed with implementation, focused validation, local code review, one PR, and the established babysit workflow. Do not merge automatically.
