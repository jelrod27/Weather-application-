# Read the sky design session

Date: October 9, 2026.

Status: **Shared understanding confirmed by the user on October 9, 2026.** Q1–Q11 are settled. The approved product specification is [GitHub issue #664](https://github.com/jelrod27/Weather-application-/issues/664), with a [local copy](./prds/PRD-read-your-sky.md). Visual prototyping is the next step.

## Confirmed goal

The visitor should understand the sky near their Selected Location right now. The user selected this goal during the research investigation. Selected Location is defined in [GLOSSARY.md](../GLOSSARY.md); it is distinct from the warning system's Protected Place.

Research: [product investigation](./research/read-the-sky-product-investigation-2026-10.md) and [data feasibility](./research/read-the-sky-data-feasibility-2026-10.md).

## Round 1 — agreed direction

The user accepted Q1 and Q2 and clarified Q3 on October 9, 2026:

1. **Evidence:** use clearly labeled model estimates with source and valid time in the first release. Nearby station observations are a later addition.
2. **Entry and destination:** the visitor clicks the sky link on the main weather page and reaches a dedicated page for the location and situation they were viewing. Preserve the Selected Location and return path; a generic lesson is not a substitute for that local experience.
3. **Purpose and depth:** provide a short, useful, scientifically accurate explanation that educates visitors about the weather and clouds they may see when looking outside. Interactive cloud identification is outside the first release.

The user subsequently confirmed the final walkthrough in Q11 and the direction to carry this design into a specification and visual prototype. Production layout selection remains a prototype review step.

## Design tree

- Confirmed goal: understand the sky near the Selected Location now.
  - Q1 settled: Sky Estimates in the first release.
    - Source and valid time are part of the agreed evidence presentation.
    - Missing data cannot establish clear skies; old data cannot be described as current. These follow from the agreed accuracy requirement.
    - Q5 and Q8 settled: current conditions when the visitor opens the experience, then possible changes through roughly the next two hours. The Sky Window is not a maximum data-age rule or a past-weather summary.
    - Nearby station selection and disagreement behavior are deferred with observations.
  - Q2 settled: main weather page link opens a dedicated page for its Selected Location.
    - Q6 settled: “Read your sky.” Keep the Selected Location visible on the destination page.
    - Preserve the existing selected-place and safe-return conventions; direct visits and location changes are included in the final journey walkthrough below.
  - Q3 settled: short, useful, scientifically accurate education; no interactive identification flow at launch.
    - Q4 settled: lead with a useful description and require the visual to match it. The user did not request automatic cloud-type identification or approve inferring a genus from the model.
    - Q7 settled: a small, accurate scientific illustration, rather than reference photography for the primary visual.
    - Q9 settled: one compact scientific illustration matching the overall explanation, including multiple layers when relevant.
    - Q10 settled: explicitly state when the local current sky estimate is unavailable, then retain general learning with a matching general illustration.
    - Keep existing Guides and the Atlas as deeper learning destinations; proposed placement is below the local explanation.
- Q11 settled: the user confirmed the complete screen and edge-case walkthrough. The interview frontier is empty; proceed to specification and prototyping.

## Round 2 — agreed direction

4. **Description and matching:** the user wants a description with visuals that match. Treat this as a requirement that the text and diagram describe the same supported condition; a generic decorative cloud image is insufficient. The drawing remains illustrative and cannot establish the exact clouds overhead.
5. **Time scope:** the user specified “what is present within a 2 hour window,” replacing the six-hour proposal. Round 3 clarified that this means now through roughly two hours ahead.
6. **Naming:** use the user's wording, **Read your sky**.
7. **Visual support:** a small, accurate scientific illustration. Reference photographs are not required for this first version.

## Round 3 — agreed direction

8. **Two-hour meaning:** the user clarified that the visitor comes from their selected forecast to understand current clouds and what the clouds could be like in roughly two hours. Anchor the experience to the current visit, using a current estimate and clearly distinguished near-future forecast. This is not a retrospective window or permission to present two-hour-old data as current.
9. **Mixed conditions:** the user accepted one compact condition illustration matching the explanation, including multiple estimated layers when relevant. Keep it explicitly illustrative and avoid identifying a single cloud genus from model values.
10. **Unavailable local explanation:** the user accepted general learning on the explicit condition that we state we do not have their current sky. Suggested wording: “We don't have a current sky estimate for [City]. Here's a general guide to reading clouds.” Include a retry option; the general lesson and illustration must not imply current local conditions.

## Final screen walkthrough — confirmed

The user confirmed the following complete experience in Q11. Precise visual layout will be reviewed through the prototype.

### Main path

1. The visitor selects a place on the main weather page and clicks **Read your sky**. Carry that exact Selected Location into the destination; do not substitute the visitor's physical location or a Protected Place. Obtain the current available estimate for the visit rather than freezing conditions at an earlier search time.
2. The destination begins with **Read your sky**, the place name, and the estimate's local valid time. A compact source label identifies it as a weather-model estimate.
3. **Now:** one small scientific illustration and a brief plain-language explanation describe the same supported conditions. Include relevant cloud cover/layers and related weather only when those fields support it. Educational cloud names can appear with conditional visible clues; they are not local detections.
4. **Over the next two hours:** a compact explanation of the expected cloud change, explicitly forecast rather than current. If the forecast remains similar, say so without inventing a change. Keep any future visual tied to its labeled time; the current illustration must not silently combine current and future conditions.
5. Place one relevant deeper-learning link below the local explanation, with access to the existing Atlas. Keep **Back to your forecast** available and preserve the same place through the learning journey. Existing education URLs remain available.

### Scenario walkthrough

| Situation | Proposed behavior |
| --- | --- |
| Mixed layers | One combined scientific illustration reflects the supported layers. The page does not sum their overlapping coverage or infer one named cloud type. |
| Few or no clouds estimated | Show a matching mostly clear illustration and a useful explanation. Do not insert decorative clouds that contradict the estimate. |
| Nighttime | Adapt the illustration and reading cues to night; retain the same current/forecast distinction. Do not promise daytime visibility of cloud detail. |
| Current estimate available, some layers missing | Explain only supported values; avoid invented layers, heights, or shapes. |
| Current estimate available, near-future data missing | Retain the useful current explanation and say the two-hour outlook is unavailable. |
| No usable current estimate, including stale-only data | Clearly state that current local sky information is unavailable; provide retry and general learning with an example illustration. Never label the lesson as local or current. |
| Direct visit without a valid place | Offer the existing place-search experience and clearly labeled general learning. Do not silently choose a location. |
| Visitor changes place or returns to the forecast | Update the description, illustration, and outlook together for the selected place; prevent an earlier request from replacing a later selection. Return navigation retains the place. |

### Boundaries and next step

First release uses the existing weather provider, reviewed explanatory content, and scientific illustrations. Nearby airport observations, photo identification, reference-photo libraries, satellite views, and longer outlooks are outside this slice. The experience does not identify exact cloud genera from model percentages or infer local rain timing from generic cloud lore.

After shared-understanding confirmation, record the agreed specification in the GitHub issue tracker and use a small prototype to review the description/illustration pairing before application implementation. That specification must define and test operational freshness, available forecast times, partial-data handling, and content-selection rules. These are engineering verification tasks rather than facts to ask the user to supply. The two-hour horizon must never be substituted for an unverified freshness policy.

The interview itself changed only documentation. Its outcome is now captured in issue #664. A separate local prototype checkout will hold disposable UI variations; no production deployment is part of this step.

### Scientific evidence for the explanation choice

The [NWS cloud classification reference](https://www.weather.gov/lmk/cloud_classification) supports conditional visual comparisons: separate puffs with flat bottoms can be cumulus; a low uniform grey blanket can be stratus; feather-like streaks can be cirrus. A stratus layer may be dry or produce drizzle. These are appearance-based examples, not deductions from model cloud-cover values. Any local weather outlook must come from the forecast rather than an assumed cloud-type association.

At night, the explanation should acknowledge harder visual identification without claiming it is impossible; sufficiently bright moonlight can illuminate clouds. See [WMO cloud observation guidance](https://cloudatlas.wmo.int/en/observing-clouds.html). These scientific constraints guide explanatory content; a named cloud comparison must not become an unsupported identification at the Selected Location.

No ADR has been created: no decision meeting the durable-trade-off criteria has been settled in this interview. The agreed design will need a GitHub issue/spec before substantial application changes, following the repository process.

## Layout verdict

The user selected **A — Field note**: description first, matching illustration alongside, then the two-hour outlook. Production implementation follows issue #664. The local prototype is preserved at `prototype/read-your-sky` (`e11ff26`); implementation is isolated on `feat/read-your-sky`.
