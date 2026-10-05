# PRD: North America Turbulence Outlook

**Version:** 3.0 — product direction rewrite
**Originally drafted:** 2026-08-05; first added to the repository 2026-08-26
**Revised:** 2026-10-04
**Status:** US advisory first release approved October 4, 2026; implemented and validated for PR review, not yet shipped. The broader North America forecast and optional trip comparison remain proposals.
**Project:** 16-Bit Weather (`16bitweather.co`)
**Priority:** Proposed P2
**Surface:** `/travel/turbulence`
**Related work:** [Aviation uplift](../aviation-uplift.md), [GTGN research](../research/gtgn-nws-2026-08.md), [Aviation flight-tracker vision](../aviation-flight-tracker-vision.md)

---

## Approved first release — October 4, 2026

Tracking: [issue #657](https://github.com/jelrod27/Weather-application-/issues/657). After reviewing source feasibility, Justin explicitly selected **“Start with a clearly labeled US advisory map; expand later.”** This amendment governs the initial release; the continental product vision below is retained for later consideration.

- Ship `/travel/turbulence` as **US turbulence advisory map**, with G-AIRMET coverage limited to the contiguous United States and adjacent coastal waters. No Canada, Mexico, Alaska or Hawaii coverage claim.
- Display source-native advisories on a map and equivalent numbered list, actual published snapshot times, altitude-layer filtering, city centering, retrieval/issue/expiry details, and clear empty/partial/stale/failure states.
- Reuse the corrected `/api/aviation/turbulence` endpoint and shared parser/acquisition service. No duplicate passenger endpoint or route-to-route HTTP is needed for an identical national dataset.
- Request documented TANGO snapshots at `fore=0,3,6,9,12`, retaining turbulence areas and excluding other TANGO hazards. Product expiry and snapshot validity are distinct. Do not invent missing forecast steps or map absent advisories to smooth conditions.
- Add entry links from Travel Fly and the aviation turbulence map. Preserve the operations map with one nearest valid snapshot rather than stacked forecast times.
- Defer gridded guidance, additional observation layers, numeric ride scores, approximate trip comparison, continental coverage, accounts, subscriptions and GRIB processing. Existing aviation reports remain linked separately.
- [Source feasibility and expansion gates](../research/turbulence-source-feasibility-2026-10.md) document the source choice. No paid service or provider account was introduced.

First-release acceptance: actual AWC polygons render; source times/altitudes survive normalization; invalid feeds cannot become healthy-empty results; expiry removes areas; snapshot/altitude changes update map and list together; city centering never expands coverage; both entry links and mobile/keyboard controls work. The broader acceptance checklist in §10 applies to future expansion, not this approved smaller release.

### Local verification — October 4, 2026

- 40 focused Jest tests passed across the new parser/service, route, and passenger UI suites plus existing Travel controls. Tests cover flat JSON versus GeoJSON, coordinate/altitude/time normalization, malformed and unknown fields, HTTP 204, failed snapshots, product expiry, exact-time/altitude filtering, stale/partial/empty UI and retry recovery.
- 12 relevant Chromium journeys passed: four new desktop/mobile, navigation, city-search and error-recovery tests, six existing aviation tests, and two existing Travel tests. Browser suites stub external tiles for map interaction tests.
- Live local acquisition returned five actual snapshot times with zero rejected records; a later upstream partial response retained the successful snapshots and reported partial status. These are live smoke observations, not permanent expected counts.
- Agent-browser inspection confirmed real advisory polygons over a visible basemap, source details, working page/home navigation, and no reported browser errors. The new map uses the configured CARTO basemap, with direct OpenStreetMap tiles and visible attribution when no public CARTO key is configured; no proxy, prefetch, or offline downloads.
- Production build, application/test TypeScript projects, changed-code ESLint, repository lint, Knip and whitespace checks passed. Existing repository warnings remain (including deprecated Next/Sentry conventions, optional local credentials and unrelated build-time upstream/cache diagnostics).
- PR #658 review follow-up: configured-Supabase CI exposed an existing guest preference reset during INITIAL_SESSION. This was a real bug missed by the initial local forecast run without Supabase configuration. Auth initialization now preserves guest units/theme; SIGNED_OUT and explicit sign-out retain cleanup. Failed advisory refreshes retain the last successful data with an explicit warning, while age/expiry still hide stale areas. Regression tests cover both fixes. Final local validation passed all 281 Jest suites / 2,222 tests, all 148 runnable Chromium tests in one CI-equivalent configured-auth run (two intentional skips), production build, changed-file lint and test TypeScript. Earlier five-run Lighthouse validation passed; hosted checks will rerun for these fixes. Firefox is not installed; WebKit is not configured.

Publication: the user authorized one combined PR on the existing branch. Keep the imported PRD reconciliation as a documentation commit separate from the #656 temperature change and #657 feature. Stage the shared `tsconfig.tests.json` additions by task. No production deployment or merge is authorized by this documentation.

---

## 1. Product intent

Build an easy-to-open, map-led turbulence outlook that gives travelers a useful view of current and forecast turbulence across North America without requiring an itinerary or flight number.

A passenger opens **Turbulence Forecast** and immediately sees the latest available regional outlook, when it is valid, what altitude range it describes, and where the data does and does not cover. The passenger can explore a time window or altitude and, optionally, enter a departure, destination, and departure time to see how an approximate travel corridor relates to the outlook.

The feature provides weather context. It does not predict the exact ride on a particular aircraft, replace an airline or crew, or advise whether a flight is safe.

### Product promise

> See the latest available turbulence outlook over North America. Explore when and where it applies; optionally compare it with an approximate trip corridor.

“Latest available” and the source's issue/valid times are shown in the experience. The product must not imply that a forecast is a live measurement or updates continuously.

---

## 2. Problem

The existing aviation turbulence map is an operations-oriented surface. A general passenger may not know the relevant aviation terms, have a flight number, or want to submit trip details just to understand the broader picture. A single location score is also a poor fit for a journey that crosses regions, altitudes, and forecast periods.

The product should answer these questions in order:

1. **What is the latest available turbulence outlook over North America?**
2. **When is that outlook valid, and at what altitudes?**
3. **What areas are forecast to have turbulence, and what information is observed rather than forecast?**
4. **If I want to, how might this outlook relate to my approximate trip?**

A broad map is the primary experience. Trip-specific interpretation is an optional layer, not a prerequisite for seeing the forecast.

---

## 3. Goals and success criteria

### Goals

- **G1 — Immediate value:** Opening `/travel/turbulence` displays a useful North America outlook without requiring a flight number, account, or trip form.
- **G2 — Geographic honesty:** The map distinguishes geographic viewport from actual data coverage. North America-wide claims are made only if the validated sources support the represented regions.
- **G3 — Time clarity:** Users can identify the source issue/observation time, valid time or period, last successful retrieval, and whether data is current, stale, unavailable, or outside coverage.
- **G4 — Altitude clarity:** Users can see the forecast altitude range in plain language, with exact aviation levels available as detail where the source provides them.
- **G5 — Source separation:** Forecast fields, advisories, and pilot reports are visually and verbally distinct; observations are not presented as forecast predictions.
- **G6 — Optional trip context:** Users can enter origin, destination, and departure date/time without a flight number and compare an approximate corridor and time window with available forecast layers.
- **G7 — Safe interpretation:** No-data, unsupported altitude, expired product, stale product, and fetch failure never appear as smooth or turbulence-free conditions.
- **G8 — Accessibility:** Every map insight has an accessible text/list equivalent; the experience works with keyboard and screen reader and at mobile sizes.

### Initial success measures

Measure these after launch; do not invent targets before collecting a baseline:

- Share of page visits that reach a usable map state.
- Use of time and altitude controls.
- Use of the optional trip comparison and completion rate.
- Failure, stale-data, and uncovered-area rates by source and region.
- User feedback on whether the outlook was understandable and whether its limits were clear.

Do not use engagement or trip-form completion as evidence that the forecast is accurate or improves flight outcomes.

---

## 4. Non-goals and product boundaries

Version 1 does not:

- Require a flight number or airline account.
- Claim to know an airline's filed route, actual aircraft altitude, dispatch plan, or in-flight deviations.
- Provide a safety, cancellation, delay, seat-selection, or flight-choice recommendation.
- Present a route corridor as an exact flight track.
- Replace the existing `/aviation` operations map or professional aviation weather products.
- Generate an independent turbulence forecast by blending sparse PIREPs and advisories into an unexplained 0–100 score.
- Promise live conditions, continuous updates, precise turbulence timing, or a specific passenger experience.
- Add push/email alerts or paid provider integrations before a separate product and cost decision.
- Ingest GTGN/NWP GRIB2 or other large model data unless provider access, licensing, compute, and validation have been separately approved.

---

## 5. Primary user experience

### 5.1 Entry and default state

The user chooses **Turbulence Forecast** from the Travel area or another clearly labeled entry point. The destination opens directly to a North America map and the latest available forecast state; no form blocks the initial view.

The initial viewport contains:

- Page title and one-sentence explanation.
- A map with the validated default time and altitude selection.
- A visible data status: source, issued/observed time, valid period, last retrieved time, and coverage state.
- Simple controls for **Time**, **Altitude**, **Layers**, and **My trip**.
- A concise legend and a link to “How to read this map.”

If data is loading, show a loading state with no inferred conditions. If no valid forecast is available, explain that clearly and retain whatever independently valid reports or advisories can be shown.

### 5.2 Map and controls

The map is the main view, not a score dashboard. It should support pan/zoom, reset to North America, and location search. The geographic extent may include Canada, the United States, and Mexico, but must display actual provider coverage rather than implying that every visible area is forecast.

- **Time:** Choose among the source's available valid times or periods. Show local time for a selected location and UTC in source details. Do not manufacture time steps between provider products.
- **Altitude:** Provide a plain-language default such as **Typical cruise** only if the underlying source supports a defensible range. Offer source-aligned altitude bands, with exact flight levels in details. Do not imply that one band covers every aircraft or route.
- **Layers:** Toggle forecast turbulence, relevant official advisories, and observed pilot reports only when each layer is available and useful. Each layer has a distinct symbol/color treatment and legend.
- **Search:** Allow a city or airport search to center the map and show nearby data status; it must not turn absent coverage into a local forecast.
- **Map alternative:** Provide a synchronized text/list view of the selected region/time/altitude, with source-native severity, location or area, validity, and data status.

Use accessible colors, line patterns or icons as well as color. Do not use green “all clear” styling for missing, stale, or uncovered data.

### 5.3 Reading the outlook

The product should preserve the source's validated terminology and intensity categories. A short plain-language explanation may translate those categories, but it must not exaggerate them or imply certainty.

When a user selects a forecast area, report:

- What the source indicates, using its supported category/wording.
- The altitude range or level and valid period.
- The issuing source and issue/retrieval times.
- Whether the feature is forecast guidance, an advisory, or an observation.
- A short statement of coverage and uncertainty appropriate to the source.

If the source exposes confidence or probability, display it only after its meaning and calibration are verified. Do not fabricate a confidence score.

### 5.4 Optional trip comparison

“My trip” is optional. It asks for:

- Origin (airport or place).
- Destination (airport or place).
- Departure date and time, with the time zone made explicit or resolved from the selected origin.

A flight number is not required. The tool estimates a great-circle or otherwise explicitly described corridor and a broad travel-time window only if that estimate has an approved, explainable basis. It overlays the approximate corridor on the map and identifies forecast products that overlap the selected time/altitude context.

The results must say **approximate corridor — not your airline's route**. Without an actual route, cruise altitude, flight duration, or provider data for the corridor, do not claim that a forecast feature will intersect the user's flight. If required information is unavailable, show the broad outlook and state why trip-specific comparison is unavailable.

Trip inputs are transient by default: do not persist them to an account, URL, analytics event, or server log unless a separate privacy review and explicit product decision approves it. Share links must not contain precise personal trip details by default.

---

## 6. Data model and source requirements

### 6.1 Separate data types

The UI and internal model must keep these concepts separate:

1. **Forecast guidance:** a model/provider's predicted turbulence field or area with an issue time, valid time, altitude dimension, units/categories, and coverage.
2. **Official advisory:** an issued aviation advisory with its own area, valid period, source and severity semantics.
3. **Pilot report (PIREPs):** a point observation with observation time, reported altitude, and source-reported intensity. It is evidence of a report at that place/time, not a forecast for nearby flights.

Do not merge these into one score or a single unqualified map layer. If multiple layers are selected, the legend and detail panel retain their separate identities.

### 6.2 Source feasibility gate — before implementation approval

The current implementation surface uses AWC G-AIRMETs and PIREPs. Those inputs alone do not establish a complete, passenger-oriented North America forecast. Before implementation is approved, document and test:

- Which upstream product supplies broad forecast guidance (including whether GTGN/GTG is available for the intended use).
- Geographic coverage in Canada, the United States, and Mexico; identify areas and altitudes not covered.
- Forecast issue cadence, valid-time steps, altitude levels, resolution, and update/freshness semantics.
- Public API or download mechanism, authentication, rate limits, terms/licensing, attribution, and operational availability.
- Whether the project can legally and reliably display or transform the data on its Vercel deployment.
- A reproducible fixture/sample and a known-good visualization method for every proposed forecast layer.

**Launch requirement:** Call the product a North America outlook only when the data supports the mapped coverage claim. If a source supports only a subset, either obtain approved coverage for the missing regions or label the feature's real geographic coverage prominently and revise the product promise before launch. A basemap extending over North America is not evidence of North America forecast coverage.

The existing research at [`planning/research/gtgn-nws-2026-08.md`](../research/gtgn-nws-2026-08.md) is an input, not proof that the source is available, current, licensed, or suitable for this product. Revalidate it against current primary-source documentation before choosing a provider.

### 6.3 Provenance and freshness

Every displayed data object should retain, as available:

- Source/provider and product identifier.
- `issuedAt` or observation time.
- `validFrom` and `validTo`, or the source-defined valid period.
- `retrievedAt` (our successful retrieval time).
- Geographic and altitude coverage.
- Source-native intensity/category and units.
- Freshness state derived from documented provider cadence, not an arbitrary “live” badge.

An expired advisory must not appear active. A delayed or stale forecast is labeled stale/delayed; it is not silently relabeled current. If a source does not provide a field, render it as unavailable rather than deriving a false value.

### 6.4 Existing data reuse

The existing aviation routes and map may provide useful advisory and PIREP data. Reuse their domain logic through shared services where appropriate; do not call one Next.js route from another over HTTP. Keep the existing `/aviation` operations experience intact.

The current point-in-radius scoring design in earlier versions of this PRD is not a valid substitute for a broad gridded forecast. PIREPs and G-AIRMETs may be offered as separate layers where their coverage and interpretation are clear.

---

## 7. Safety, clarity, and privacy

Persistent, concise disclaimer:

> This is general weather information, not a forecast for a specific aircraft or flight and not for operational flight planning. Conditions and routes can change. Follow airline crew instructions and official aviation/weather guidance.

Additional rules:

- Never label an area “safe,” “clear to fly,” or “no turbulence” from absent reports or unavailable data.
- Explain that turbulence can occur outside displayed forecast areas and forecast conditions may differ from a flight's actual experience.
- Do not imply the airline's crew lacks this information or that passengers should act on the map during flight.
- Do not display a precise route, arrival time, or cruise altitude unless supplied by an approved data source or explicitly marked as an estimate.
- Do not collect flight number, account data, or precise location by default. Location search and browser geolocation are optional and user initiated.
- User-facing copy avoids alarmist “BRUTAL”/“misery” labels. Use source-aligned severity and calm explanations.

---

## 8. Product and interaction requirements

### Required states

- Initial loading.
- Forecast available and fresh.
- Forecast available but delayed/stale.
- Forecast unavailable due to provider failure.
- No forecast issued for the selected time/altitude.
- Region outside source coverage.
- Advisory active/expired, if the source supplies it.
- Reports available/none; none means no reports, not no turbulence.
- Optional trip comparison incomplete, unsupported, or approximate.
- Partial source failure while independent layers remain available.

Each state explains what the user can still do (change time/altitude, view another layer, retry, or use the broad map). Retry and refresh use existing route/cache patterns and are rate-limited appropriately.

### Mobile

- Map remains usable with touch controls and no essential overlays hidden behind hover.
- Time, altitude, layers, and trip comparison open in accessible sheets/panels.
- Selected-area details do not obscure the map controls or make the map the only way to obtain information.
- Support portrait and landscape layouts and reduced-motion preferences.

### Sharing

A share URL may encode public display state such as selected time, altitude band, and map view only if those values are non-sensitive and stable. Do not encode origin/destination, exact user location, or flight identifiers by default.

---

## 9. Proposed technical boundaries

These are boundaries, not a finalized file-by-file implementation plan. Final architecture follows the verified source contract.

- **Provider adapter:** validates/normalizes forecast products while retaining provenance and native semantics.
- **Domain model:** separates forecast guidance, advisories, and observations; represents missing coverage explicitly.
- **Server route(s):** fetch/proxy data where required for credentials, CORS, rate limits, caching, and provider terms. Use the shared API route wrapper when applicable.
- **Map layer(s):** renders source-aware products and explicit coverage; never turns missing values into zero/clear.
- **Passenger UI:** map-first summary, time/altitude controls, layer legend, data details, accessible list alternative, optional approximate-trip overlay.
- **Tests/fixtures:** captured or synthetic provider fixtures validated against documented contracts; unit tests for timestamps, coverage, altitude selection, stale/failure states, and layer separation.

Read [`AGENTS.md`](../../AGENTS.md) and [`CODING.md`](../../CODING.md) before implementation. For Next.js work, follow the repository's Next.js 16 agent rules.

---

## 10. Acceptance criteria

### Product feasibility

- [ ] A primary-source research note records provider terms, attribution, API/data access, current coverage, altitude/valid-time dimensions, cadence, and known limitations.
- [ ] Coverage for the intended North America product is demonstrated with data, not inferred from map extent.
- [ ] Product language matches actual coverage. Any excluded region or altitude is visible before users interpret the map.
- [ ] A product approval explicitly authorizes the selected v1 data scope before feature implementation starts.

### Passenger experience

- [ ] A user can open the feature and inspect the latest available map without entering a flight number or trip details.
- [ ] The default selection is supported by the source and labeled with its altitude range, issue time, and valid time.
- [ ] The user can change supported time and altitude selections without seeing fabricated interpolated data.
- [ ] Forecast, advisory, and observation layers have distinct labels, visual treatments, legends, and detail copy.
- [ ] Area selection exposes source-native information, time validity, altitude, source, and coverage/freshness state.
- [ ] A text/list alternative conveys the selected map information to keyboard and screen-reader users.
- [ ] Missing, stale, failed, partial, or out-of-coverage data never appears as a reassuring no-turbulence forecast.
- [ ] Optional trip comparison works without a flight number, is visibly approximate, and does not imply access to an airline route or actual cruise altitude.
- [ ] Trip data is not persisted or placed in share URLs/analytics by default.
- [ ] Safety disclaimer and non-alarmist copy are visible on desktop and mobile.

### Engineering and release

- [ ] Provider contract tests cover valid products, malformed data, missing fields, expired data, partial coverage, and upstream failures.
- [ ] Unit tests cover time/altitude selection, freshness, coverage masking, report age, and separation of data types.
- [ ] E2E tests cover initial load without trip details, map controls, no-data states, optional trip flow, and mobile accessibility.
- [ ] Lint, both TypeScript projects, unit tests, Knip, production build, relevant Playwright tests, and required CI checks pass.
- [ ] Provider outages and stale data are observable without logging precise user trip inputs.

---

## 11. Delivery sequence and decision gates

1. **Revalidate sources:** complete §6.2 research and record primary-source evidence. Do not build the map around an assumed GTGN/GTG API.
2. **Confirm product coverage:** decide whether launch requires US+Canada+Mexico, or a narrower explicitly named coverage area. Confirm that the available data supports the decision.
3. **Approve the v1 product:** approve source(s), permitted use, coverage, supported times/altitudes, and whether optional trip comparison is in v1.
4. **Prototype data comprehension:** test a map using source-representative fixtures with non-aviation users. Verify forecast/observed distinctions, altitude comprehension, and stale/no-data interpretation.
5. **Implement a vertical slice:** provider adapter, one source-backed layer, source metadata, coverage/failure states, and accessible map/list; then add other independently useful layers.
6. **Add optional trip context only after the broad outlook works:** corridor estimate, selected departure time, supported forecast periods, privacy-safe behavior, and explicit approximation copy.
7. **Run validation and release review:** automated coverage, browser checks, data-source review, safety-copy review, and the repository's normal CI/CD gates.

If source feasibility fails for continent-scale forecast guidance, stop before implementation and return with the verified coverage options. Do not silently replace the broad forecast promise with a point score derived from PIREPs.

---

## 12. Open product decisions

1. What does “North America” mean for launch coverage: Canada, the United States, and Mexico, or a narrower documented region?
2. Which validated source can provide forecast guidance across that coverage, at useful altitude levels and time intervals, under acceptable terms?
3. Should v1 include the optional origin/destination/departure-time comparison, or launch with map/search/time/altitude only?
4. Which passenger-friendly altitude labels best explain source flight levels without hiding the exact levels?
5. What refresh cadence is appropriate for each source, and when should the UI label data delayed or stale?
6. Should advisory and PIREP layers be on by default or opt-in? Each must remain distinguishable from the forecast layer.

These questions are intentionally unresolved. Answer them with source evidence and user testing rather than assumptions in the old design.

---

## 13. Decision log

| Date | Decision |
|---|---|
| 2026-08-05 | Initial concept: passenger-facing turbulence forecast inspired by Stargazer; use existing AWC G-AIRMETs and PIREPs. |
| 2026-08-26 | Reconciled baseline: aviation operations map already has G-AIRMETs and PIREPs; passenger forecast page was not built. |
| 2026-10-04 | Reframed as map-first North America outlook with optional approximate trip comparison. Do not require a flight number. Validate continental source coverage, data contract, and licensing before implementation approval. |
