# Read your sky

Status: **Approved — layout A implemented; [PR #665](https://github.com/jelrod27/Weather-application-/pull/665) in review**. The user confirmed the complete design and selected A — Field note on October 9, 2026. The implementation pairs the short explanation with its matching scientific illustration, followed by the two-hour outlook. The user subsequently authorized resolving the review findings, pushing the branch, and opening a PR, followed by the CodeRabbit clock correction. Merge and production deployment are not authorized.

Canonical specification: [GitHub issue #664](https://github.com/jelrod27/Weather-application-/issues/664). This file is the local specification copy; keep behavior changes synchronized with the issue.

## Problem Statement

A visitor chooses a location on the main forecast and clicks “Read the sky,” expecting an explanation of the conditions there. Today the link opens the same generic cloud lesson for every place and time. It does not explain the current sky, connect the description to a matching visual, or describe near-term changes.

## Solution

Replace the forecast journey's sky entry with **Read your sky**, leading to a dedicated page for the exact Selected Location. Show a brief scientifically accurate explanation, one matching scientific Sky Illustration, source and valid time, then what may change through roughly the next two hours. The experience uses clearly labeled weather-model estimates; it does not claim to identify the actual cloud genera overhead.

When usable current data is unavailable, explicitly say “We don't have a current sky estimate for [City]” and offer clearly labeled general learning with a matching example illustration and retry. Keep deeper Guides, the Atlas, and a return to the same forecast available.

## User Stories

1. As a forecast visitor, I want Read your sky to use the place I selected, so the explanation relates to the forecast I was viewing.
2. As a visitor researching another city, I want that city retained even when I am physically elsewhere, so the page does not silently substitute my device location.
3. As a visitor, I want a short explanation of the estimated sky now, so I can relate the weather data to what I may see outside.
4. As a visitor, I want a small scientific illustration that matches that explanation, so the visual clarifies the words.
5. As a visitor under mixed cloud layers, I want a single coherent illustration reflecting those layers, so I do not mistake one example cloud for the whole sky.
6. As a visitor, I want the page to distinguish model estimates from observations, so I understand the evidence behind the explanation.
7. As a visitor, I want the place and local valid time visible, so I know where and when the estimate applies.
8. As a curious visitor, I want conditional visual clues for cloud names, so I can compare actual shapes without being told a cloud was detected by the app.
9. As a visitor, I want a short outlook through roughly two hours ahead, so I understand near-term cloud changes without opening a long forecast.
10. As a visitor, I want future descriptions clearly labeled with their applicable times, so I do not confuse a forecast with current conditions.
11. As a visitor, I want stable conditions explained honestly, so the page does not invent a change to fill the outlook.
12. As a visitor on a mostly clear day, I want the illustration to show little or no cloud consistently with the estimate, so decoration does not contradict the explanation.
13. As a nighttime visitor, I want appropriate lighting and viewing cues, so the lesson does not assume daytime visibility.
14. As a visitor in overcast but dry conditions, I want cloudiness and precipitation explained separately, so I do not assume clouds guarantee rain.
15. As a visitor with incomplete layer data, I want the page to explain only what is known, so missing values do not become clear skies or invented layers.
16. As a visitor whose current estimate is available but outlook is missing, I want the current explanation retained, so a partial failure does not remove useful information.
17. As a visitor without usable current data, I want an explicit unavailable message and general learning, so I can still learn without mistaking an example for my current sky.
18. As a visitor after a failed refresh, I want old data distinguished from current information and a retry action, so the page does not imply it has fresh conditions.
19. As a direct visitor without a valid location, I want the existing place search and general learning, so I can select the sky I want to understand.
20. As a visitor changing locations, I want the text, illustration, and outlook to change together, so an earlier response cannot mix two places.
21. As a visitor, I want to explore a related Guide or the Atlas and return to my forecast, so learning does not lose the place I chose.
22. As a keyboard or screen-reader user, I want meaningful headings, illustration descriptions, focus states, and usable controls, so I can use the complete experience.
23. As a mobile visitor, I want the local explanation and matching visual near the top, so the page remains useful on a narrow screen.
24. As a visitor using another theme, I want readable text and consistent scientific meaning, so presentation does not change the interpretation.

## Implementation Decisions

- **Domain language:** Selected Location is the place being viewed, distinct from the visitor's physical location and a warning subscription's Protected Place. A Sky Estimate is model-based, a Sky Illustration is explanatory rather than measured imagery, and the Sky Window is now through approximately two hours ahead.
- **Journey:** use the existing forecast journey and validated place/return conventions. The main-page entry is required; shared forecast/hourly journey entries should remain consistent. Preserve static education and Guide URLs. A direct visit without a valid place must offer the existing place-selection experience; no silent location guessing.
- **Evidence:** reuse the existing Open-Meteo boundary and the narrow validated cloud-layer reading precedent. Do not call the full Stargazer payload and its unrelated astronomy, satellite, and launch sources. Preserve the existing Best Match ancillary-data policy and the separately scoped US forecast-temperature policy.
- **Fields:** total, low, middle, and high cloud cover; valid times; retrieval time; Selected Location timezone; day/night; and only independently supported related weather fields. Keep nulls, unit/range validation, and unknowns explicit. Use the provider's total; do not sum overlapping layers.
- **Time:** open the page against the current visit, not an earlier search timestamp. Use absolute timestamps and the location's IANA timezone for display. Fetch enough hourly data to cover the Sky Window and display actual valid times. Do not label an earlier hourly sample “in two hours,” invent a precise clearing minute, or expose a six-hour horizon.
- **Freshness:** reuse the existing 30-minute receipt-age policy as a conservative application policy and validate current-field time separately (reject invalid, future, or over-30-minute-old current values). This is an app policy, not model-run cadence or an accuracy guarantee. Invalid/stale-only current data uses the general-learning fallback; the two-hour forecast horizon is never a freshness allowance. Keep retrieval, valid, and any verifiable model-run times distinct.
- **Interpretation:** use reviewed, deterministic explanatory content. Base each local claim on its supporting fields. No generated prose is required. Cloud morphology is not inferred from percentages or weather codes; cloud names appear only in explicitly conditional educational comparisons with visible clues.
- **Illustrations:** one compact scientific composition matching the same condition and time as the description. Show supported broad layers and coverage schematically; label the drawing illustrative and not to scale. Avoid exact base-height claims or implying a particular morphology was measured. All artwork is original or individually verified for reuse.
- **Current versus future:** lead with current conditions; follow with the short near-term outlook. Any future illustration is time-labeled. Stable, cloudy-but-dry, clear, mixed-layer, and nighttime experiences must be coherent. Precipitation and visibility require their own evidence.
- **Recovery:** partial current data narrows the explanation. A missing outlook does not discard usable current data. No usable current estimate shows the explicit local-unavailability statement, retry, and a clearly labeled general lesson with an example image. Missing is not zero.
- **Navigation and concurrency:** preserve selected-place context through deeper learning and the safe forecast return. Ignore responses belonging to a previous place. Keep arbitrary coordinate query variants out of search indexing.
- **Boundaries:** no new account requirement, database, paid service purchase, or provider integration is needed for this slice. Confirm existing provider access and incremental call accounting before live implementation.
- **Prototype:** compare three structurally distinct layouts on an isolated throwaway route, using clearly labeled fixtures for mixed, clear, nighttime, and unavailable situations. The prototype validates the description/illustration pairing and screen hierarchy; it does not establish forecast accuracy or production readiness.

## Testing Decisions

- The main test boundary is the externally visible forecast-to-sky journey with deterministic provider responses and a controlled clock. This directly reflects the screen and scenario walkthrough confirmed by the user; no additional product interview is needed to choose internal function names.
- Prefer the existing journey and weather-lesson browser tests as prior art. Verify entry from the selected forecast, exact place and timezone retention, current versus future labels, matching illustration semantics, deeper-learning links, and safe return navigation.
- Exercise the scenarios in the user stories through the page boundary: clear, mixed layers, cloudy without precipitation, independently supported fog/rain, nighttime, null layers, stale data, provider failure, missing outlook, retries, and changing place while requests are in flight.
- Assert that no named genus is presented as detected, missing values do not become zero, and overlapping percentages are not summed. Test the meaning visible to users rather than SVG path coordinates or component structure.
- Use existing validation seams for focused cases the full page cannot distinguish clearly: malformed units/ranges/timestamps, freshness boundaries, exact two-hour filtering, midnight, and DST transitions. Avoid creating many new test-only interfaces.
- Check keyboard operation, accessible illustration descriptions, focus, narrow/wide layouts, and existing theme behavior. Use mobile and desktop browser walkthroughs for the prototype; it is disposable UI and does not need a new automated test suite.
- Before a production PR, run repository lint, both TypeScript projects, relevant Jest tests, Knip, build, affected E2E, and Lighthouse. All required CI/security/Preview Smoke gates remain mandatory; Production Smoke applies after an authorized deployment.

## Out of Scope

- Nearby airport observations and station-selection policy.
- Photo identification, sky cameras, satellite viewing, or automatically detected cloud genera.
- An interactive cloud-identification quiz or a new reference-photo library.
- Long-range outlooks, new warnings/alerts, or safety conclusions from cloud coverage.
- New education URLs for every cloud Entry, replacement of existing Guides/Atlas URLs, or a glossary migration of unrelated domains.
- Merge, production deployment, or purchase authorization. Push and PR publication were separately authorized after code review.

## Further Notes

- The user confirmed the complete product direction on October 9, 2026 after a three-round interview and final walkthrough.
- The selected prototype is A — Field note, captured at local branch `prototype/read-your-sky`, commit `e11ff26`. Implement the live experience from this layout on `feat/read-your-sky`. Do not treat a prototype fixture, example image, or future-looking sentence as a live report.
- Scientific references: [Open-Meteo Forecast API](https://open-meteo.com/en/docs), [WMO cloud identification guide](https://cloudatlas.wmo.int/en/cloud-identification-guide.html), [NWS cloud classification](https://www.weather.gov/lmk/cloud_classification), [WMO observing clouds](https://cloudatlas.wmo.int/en/observing-clouds.html).
- Preserve the established education decisions: depth over thin Entry pages, Markdown-based reviewed prose, and invariant scientific notation with readable typography.

## Local implementation

Layout A is implemented on `feat/read-your-sky`, with all five standards/specification review findings and CodeRabbit's device-clock finding resolved. See [verification and release limitations](../read-your-sky-verification.md). Node 22 and the committed lockfile pass the clean production build, both TypeScript projects, all 2,276 unit tests, lint, Knip, all nine affected production browser tests, and the five-run Lighthouse gate. Nine database tests also passed before the review fixes, which do not touch database code. PR #665 links to #664 and must satisfy the normal CI/security/preview gates for each new commit. Production deployment remains a separate step.
