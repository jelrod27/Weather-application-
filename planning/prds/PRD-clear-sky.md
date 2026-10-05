# Clear Sky — default theme and complete weather experience

**Date:** September 27, 2026
**Status:** Shipped — [PR #638](https://github.com/jelrod27/Weather-application-/pull/638), merge `7834d12`.
**Verification:** [Clear Sky verification](../clear-sky-verification.md).
**Design selected:** Concept A, Clear Sky, from the local five-theme study.
**Audience:** Everyday weather users first, with complete detail and learning paths for enthusiasts.
**Delivery proposal:** One implementation PR with focused commits and local code review before pushing.

## 1. Intent and decision record

Make 16-Bit Weather feel as clear and usable as prototype A while retaining the depth of the current application. A visitor should quickly understand current conditions and the next few hours, then find every existing detailed measurement, forecast, map, and explanation.

The user selected A from five concepts and explicitly liked its full design. Their central concern was the prototype omitting data such as feels like, pressure, and humidity. **The production design must preserve the complete existing weather experience. The prototype is a visual reference, not the data specification.**

Confirmed direction:

- Clear Sky's blue-white palette, navy text, cobalt accents, compact typography, and forecast-first layout.
- Desktop discovery sidebar with radar and learning entry points.
- Existing weather detail remains available on the forecast page; it is not replaced by discovery cards.
- No oversized Get Started panel or unsolicited city list for a first-time visitor.

Proposed implementation decisions made explicit in this PRD:

- Add a free theme named **Clear Sky**, stored as `clear-sky`, and make it the default when no valid preference exists.
- Keep Daybreak and all other themes selectable under their existing access rules.
- Use one shared forecast layout across themes; the theme changes presentation, not which weather data exists.
- Preserve valid saved preferences. Do not infer that a saved Daybreak value was accidental or silently replace it.
- Apply the shared palette throughout the site, with detailed layout work focused on forecast, hourly/planning, radar controls, and learning surfaces. Other tools retain their specialized layouts.

### Primary design references

- Local preview: `http://127.0.0.1:3003/?prototype=themes&variant=A&view=forecast`.
- Prototype branch: `codex/prototype-theme-concepts`.
- Local source: `app/theme-prototype.tsx`, `app/theme-prototype.module.css`, `app/theme-prototype.README.md`.
- User's September 27 screenshot of the existing nine-card conditions grid: preserve its information, units, explanatory controls, and availability distinctions, using Clear Sky styling.

The complete study is preserved on `codex/prototype-theme-concepts` at `14a8df383ca74980c27e50bb72ec3edef3981e9c`, with normal hooks and independent precommit review. Production implementation uses a separate managed worktree. Do not merge the prototype, sample weather, sample radar, switcher, or prototype run command into production. No implementation issue exists for this design yet; the implementation PR can carry the source pointer and decision.

## 2. Problem and desired outcome

The selected prototype makes the forecast easier to scan, but its four sample metrics and simplified views do not represent the app's actual depth. Copying it directly would remove features and could turn fixed demonstration copy into misleading live advice.

Success means:

1. New visitors see a coherent Clear Sky experience and immediately usable location/search controls.
2. Users with weather loaded see location, conditions, feels like, next-hours guidance, and forecast navigation before secondary discovery content.
3. All existing readings and interactions survive the redesign, on both home and canonical city pages.
4. Forecast → Hourly → Radar → learning → return preserves the viewed location and applicable state.
5. Saved themes, units, account preferences, and data recovery continue to work.
6. Data is readable in light surfaces, including subtle labels and pollen categories in the supplied screenshot.

## 3. Scope and boundaries

### Included

- Complete Clear Sky semantic tokens, shared component styles, default resolution, selectors, and preference persistence compatibility.
- Responsive forecast composition with the full data inventory in section 6.
- Existing home/city hero, next-hours summary, hourly strip, daily forecast, expanded day details, metric cards, AQI, Moon, and embedded radar.
- Sidebar links to real radar and real lessons, plus preservation of the existing local/global updates rail.
- Palette and relevant density adjustments for `/hourly`, outdoor planning, radar controls, education hub, guides, glossary, and existing lesson diagrams.
- Readability and theme compatibility corrections on shared navigation, forms, dialogs, tooltips, footer, dashboard, and specialized tools.
- First-visit, loading, stale, partial, unavailable, empty, error, and account transition states.
- Tests, before/after visual evidence, local code review, and CI/bot review for the eventual implementation PR.

### Excluded

- New weather sources, meteorological models, scoring formulas, or provider contracts.
- New educational articles, a learning-progress system, new search/ranking algorithms, or a lesson-content expansion.
- New map engines, map data, radar products, or changes to hazard thresholds and semantic scales.
- Replacing the existing theme system, auth architecture, or preferences service.
- Building the four unselected theme concepts or introducing automatic day/night switching.
- A broad accessibility remediation project. Changed surfaces must be accessible; unrelated legacy findings remain separately tracked.
- A sitewide information-architecture rewrite, unrelated security/infrastructure changes, or analytics infrastructure.

## 4. Visual system

### 4.1 Palette foundation

These are the selected prototype's starting colors. Adjust secondary shades when necessary to meet contrast requirements while preserving the visual direction.

| Role | Starting value | Use |
|---|---|---|
| Canvas | `#F0F5FA` | Page background |
| Surface | `#FFFFFF` | Cards, menus, dialogs |
| Primary text | `#172F49` | Headings and readings |
| Secondary text | `#52677F` | Supporting text, units, timestamps |
| Action/focus | `#2165CE` | Links, primary actions, selection |
| Soft emphasis | `#E3EDFA` | Outlook panel, selected subtle surfaces |
| Divider | `#CFDEEB` | Decorative separation; strengthen where a control boundary requires contrast |
| Illustration sun | `#F4C261` | Decorative weather illustration, not a warning scale |

Use the existing semantic CSS variables and `themeTokens` interfaces. Keep HSL tuples and complete CSS color values in their respective existing token formats; do not copy the prototype's local variable shortcuts into global tokens. Supply foreground/background pairs for primary, secondary, muted, accent, popover, card, input, ring, and existing terminal-compatible aliases.

Clear Sky is a light theme. Audit code that treats only `daybreak` as light, including hero chips and feels-like deltas. Prefer shared semantic styling rather than adding a new set of scattered theme-name checks.

### 4.2 Typography and shape

- Retain IBM Plex Sans for UI and explanatory prose; Inconsolata/tabular numerals for weather readings and compact metadata.
- Retain the tight heading character from A. Do not shrink body copy to force the full data set into the prototype's height.
- Primary body/detail copy: 14–16 px; compact supporting labels normally at least 12 px. Prototype micro-label sizes are not a production requirement.
- Responsive hero temperature approximately 72–110 px; supporting metrics approximately 24–32 px.
- Fine borders, restrained shadows, small radii, generous separation between groups. No text glow on light backgrounds.
- Sky decoration stays inside the weather hero and never obscures data. Match an existing condition-aware icon to real conditions; do not show the sample sun/cloud in every weather state.
- No new motion requirement. Honor reduced motion and preserve explicit control of radar playback.

### 4.3 Semantic color and readability

- Warning, AQI, UV, wind/hazard, and radar scales keep their meanings across themes. Cobalt is an interface accent, not a replacement for warning severity.
- Pair status colors with words/icons. Unknown must not look like a favorable reading.
- Meet 4.5:1 contrast for normal text, 3:1 for large text, and 3:1 for meaningful control boundaries/focus indicators on changed surfaces.
- Check actual text/background pairs for category badges, tooltips, secondary labels, pollen types, map overlays, chart axes, and disabled states. Do not solve low contrast by making all categories visually identical.

## 5. Layout and user journeys

### 5.1 First visit without weather

Preserve `PRD-first-visit-weather.md`:

- Compact location action and a functional “Search for a location…” field.
- One automatic device-location request when existing settings permit it; native permission behavior remains browser-controlled.
- Search stays usable during permission/detection. Preserve the 15-second recovery, cancellation, and late-result guards.
- Show a single concise error with retry/manual search when appropriate.
- No sample Seattle forecast, empty metric grid, oversized onboarding card, discovery sidebar, footer, or random-city list before weather loads.
- Keep concise guidance in the initial server shell so a new visitor does not see a blank screen.

### 5.2 Loaded forecast: desktop

At approximately 1200 px viewport and above, use a centered shell of up to approximately 1280 px. Use a flexible main column plus a 280–320 px discovery sidebar for the upper forecast region. Main content must remain readable; collapse the sidebar sooner if available width requires it.

Upper region order:

1. Existing site header and working location/search controls.
2. Existing local/global updates rail where available; official/local hazard information remains ahead of decorative discovery.
3. Location-aware Forecast / Hourly / Radar / Read the sky navigation.
4. Main column: current-weather hero → next-few-hours summary → existing hourly preview.
5. Sidebar: radar entry point → learning entry point. Use navigation cards with real destinations; do not mount a second radar map or additional weather fetch just to decorate the sidebar.

Below the upper region, use the full content width:

6. Existing multi-day forecast, retaining the available day count and immediately adjacent selected-day detail.
7. “Current conditions” nine-card grid, in the existing information groups: UV / feels like / sun times; humidity / pressure / wind; precipitation / visibility / pollen.
8. Existing embedded radar plus AQI and Moon detail, laid out together where room permits. Preserve callers that deliberately suppress the embedded map.
9. Existing lower discovery, city links, and normal footer after weather is available.

The sidebar adds shortcuts. It does not replace the embedded radar, full AQI/Moon information, or any condition card. Remove only duplicated prototype summary cards, not production data. Sidebar is not sticky in the initial release, avoiding overlay and tall-content issues.

### 5.3 Tablet and mobile

- Below the desktop sidebar breakpoint, stack primary weather content first. Place discovery shortcuts after primary weather detail; do not interleave learning promotions ahead of conditions.
- DOM/keyboard order follows the meaningful reading order. CSS placement must not produce a confusing focus jump across columns.
- Conditions grid: three columns at desktop width, two where each card remains usable (starting around 640 px), one on narrow phones.
- Keep all nine cards visible in normal page flow. Do not hide them behind “More,” remove fields, or force side-scrolling to find conditions.
- Preserve existing intentional horizontal forecast strips with discoverable scrolling and keyboard controls; no document-wide overflow.
- Longer values, translated place names, pressure units, pollen labels, and dates wrap without truncating the information needed to understand them.
- Ensure comfortable touch targets, visible focus, and usable layouts at 320, 390, 768, 1024, and 1440 px, plus browser text zoom.

### 5.4 Connected pages

- `/` and `/weather/[city]` use the same data-complete forecast presentation while retaining their respective bootstrap, canonical, and SEO behavior.
- `/hourly` keeps all existing hours, day markers, metric units, location time zone, and the Today/Tomorrow, 1-/2-hour outdoor planner with complete-window tradeoffs.
- `/radar` keeps the actual map, selected place, frame timestamp/age, playback, scrubbing, Latest state, controls, loading/error states, and return/lesson navigation. Its production map must never be replaced by the sample SVG.
- `/education`, glossary, cloud/system/phenomenon details, and `/education/weather-skills` use Clear Sky typography and tokens while preserving content, citations, diagrams, keyboard interactions, and return links. The prototype's three accordion snippets are not replacements for guides.
- Dashboard, travel, stargazer, hazards, space weather, aviation, news/blog, profile/auth, and remaining existing routes receive palette compatibility and readability checks. They retain their specialized structure and capabilities.
- Use existing journey builders/redirect guards for place and return URLs. Global header navigation remains global; local journey links carry the viewed location.

## 6. Data preservation contract

For a fixed existing fixture and the same selected unit/time/location, every currently displayed field must remain available after the redesign. “Present somewhere in the API response” does not count as preserved. Record before/after rendered evidence.

| Surface | Information/interactions that must remain | Production owner/reference |
|---|---|---|
| Current weather | Location, condition/description, temperature/unit, feels like, temperature delta, available high/low, local-time context, existing save/search/refresh affordances | `hero-weather-card.tsx`, home/city controllers |
| Next hours | Existing data-derived ranges, precipitation trend/probability explanation, wind summary, period/time zone, both hourly and planner links, unavailable state | `forecast-brief.tsx`, `lib/weather/forecast-brief.ts` |
| Hourly preview/detail | Available hours, temperatures, condition icons, precipitation chances and current existing detailed readings; selected-unit formatting and day/DST context | `lazy-hourly-forecast.tsx`, `/hourly` |
| Daily forecast | All available forecast days, high/low, conditions, selection, expanded description, precipitation chance, humidity, wind/direction, pressure, visibility, and other currently rendered details including sun times | `forecast.tsx`, `forecast-details.tsx` |
| UV | Index, category, scale, explanation | `weather-display.tsx`, `metric-info-tooltip.tsx` |
| Feels like | Value, unit, actual-temperature comparison/direction, explanation | Same |
| Sun times | Sunrise and sunset, local-time interpretation, appropriate unavailable/no-event state where supplied | Same |
| Humidity | Percentage, category/scale, explanation | Same |
| Pressure | Value and actual supplied unit, category, explanation | Same |
| Wind | Sustained speed/unit, direction indicator/text, available gusts, category, explanation | Same |
| Precipitation | Existing 24-hour total with unit and accumulation period; preserve any supplied quality/availability context. Probability remains a separate metric | Same; `usePrecipitationHistory` |
| Visibility | Value/unit, category or unavailable status, explanation | Same |
| Pollen | Tree, grass, weed categories and currently exposed constituent detail; explanatory control and supported/unavailable distinctions | `pollen-display.tsx` |
| Air quality | Existing AQI scale/value, category, explanatory details, and pollutant readings already exposed | `air-quality-display.tsx` |
| Moon | Phase, illumination, icon, available moonset/full-moon information, observing-night/time-zone context, explanatory control, unavailable state | `weather-display.tsx` |
| Radar | Current real provider layer and map controls, location, frame age/timestamp, embedded/full-map link and return behavior | `lazy-weather-map.tsx`, radar components |
| Updates/discovery | Existing local alerts, storm outlook, global headline and tonight's-sky cards according to their visibility/coverage rules | `home/home-hub.tsx` |
| Saved weather | Saved/default locations, load/retry/stale feedback, account isolation, and current dashboard behavior | Session/dashboard hooks and components |

### Data interpretation rules

- Production text comes from existing data/summary utilities. Do not ship sample phrases such as “mostly dry until 5 PM” or label a period “good outdoors” independently of those utilities and hazard context.
- Keep units attached to values; do not relabel an unchanged number. Pressure currently arrives as a formatted string; visibility and historical precipitation have their own existing units. Audit their actual contracts rather than deriving every unit from °C/°F.
- A missing/nonfinite value must not produce a fabricated zero, a normal pressure, “clear,” “safe,” or a reassuring severity badge. Fix renderer fallbacks touched by this work; provider/model contract redesign remains out of scope.
- Preserve valid zero readings. Optional Moon context must not create dangling separators.
- Derived values already supplied as approximations must retain honest context; do not elevate them to direct observations through new labels.
- Current readings, selected-day forecasts, and historical accumulations remain explicitly distinct.
- Preserve stale/offline/retry context already exposed by data owners. Do not invent “updated just now” timestamps for a cache hit or theme switch.
- No additional provider/auth/database request should occur simply because the theme or layout changes. Reuse existing snapshots and one map instance per existing surface.

## 7. Default theme and saved preferences

### Resolution policy

| Situation | Required outcome |
|---|---|
| First visit, no valid saved preference | Clear Sky from the initial default shell |
| Valid existing free local preference | Preserve it, including Daybreak/Nord |
| Signed in, valid local preference | Preserve existing local-over-account precedence |
| Signed in, no valid local preference, valid account theme | Use account preference |
| Invalid/obsolete local value | Normalize through existing migration rules; do not let invalid local data block a valid account preference |
| No valid local or account choice | Clear Sky |
| Logged-out user carrying a restricted theme | Fall back to Clear Sky under existing access rules |
| Explicit theme change | Update UI and use the existing local/account persistence path; do not reset city, units, selected forecast day, or map state |
| Preference save failure | Keep the current local choice usable and retain existing failure handling; do not imply a server save succeeded |

Do not mass-update existing preference rows or overwrite stored Daybreak selections. Existing code may have stored a default without recording whether it was manually chosen; preserve those values rather than guessing intent.

### Compatibility work required

Repository inspection found:

- `lib/theme-config.ts` currently defaults to Daybreak and defines six allowed themes.
- `lib/validations/preferences.ts` and the default-row creation in `app/api/user/preferences/route.ts` still use Nord.
- Migration `20260905_user_preferences_theme_daybreak.sql` permits the six existing identifiers in `user_preferences_theme_check`.
- An earlier migration sets the database column default to Nord.
- `__tests__/theme-constraint-parity.test.ts` compares the allowed database theme list with application configuration.

Add `clear-sky` consistently to the configuration, selector, validation, and an additive database migration. Align defaults for newly created preference rows with `DEFAULT_THEME`; change the database default for future rows without rewriting existing rows. Inspect generated types and all theme maps for exhaustive assumptions. Verify actual deployed schema during implementation rather than treating migration history as proof of live state.

Deploy the compatible additive database constraint/default before the application can save the new identifier. Preserve every existing allowed value and all RLS/access policies. Exercise authenticated preference round-trip in a controlled environment; do not mutate unrelated user preferences for testing.

For rollback, switch the application default back while retaining the new identifier and its rendering support. Do not roll back the database constraint to a list that rejects already-saved `clear-sky` values. An older application rollback must be checked for unknown-theme normalization before release.

## 8. Architecture and implementation boundaries

| Area | Expected change | Guardrail |
|---|---|---|
| Theme configuration/provider | Add Clear Sky and consistent default/persistence resolution | Keep current provider/auth ownership; no new auth subscriber |
| `app/theme.css`, `app/globals.css`, `lib/theme-tokens.ts` | Complete semantic palette and shared state styles | Avoid prototype variable collisions and global hard-coded overrides |
| Root layout/initial shell | Default theme identity, metadata/browser color where appropriate | No new hydration mismatch or blank-first-paint behavior |
| `components/weather-display.tsx` | Compose forecast sections and complete metric grid in selected hierarchy | Extract only focused presentation components needed for this work; do not fork the full data flow per theme |
| Home/city presentation | Fit search, updates, journey, forecast and sidebar together | Preserve `useWeatherController`, `useWeatherSession`, city seeding and late-response protections |
| Discovery cards | Reuse existing safe journey/lesson links | No extra radar instance, invented live status, or static sample links |
| Hourly/radar/education | Styling and spacing against real components | Preserve state machines, forecast calculations, map lifecycle, citations, and URL behavior |
| Preferences schema/API/DB | Additive theme support and future-row defaults | No mass backfill, policy changes, or unrelated database cleanup |

Production should reuse existing forecast and lesson components/data interfaces. Rebuild the selected visual ideas with those components; do not promote the monolithic throwaway prototype.

SEO remains intact: canonical city URLs, metadata, initial HTML links/content required by existing SEO checks, and existing route behavior. No production `prototype`, `variant`, or sample-data path is introduced.

## 9. Proposed implementation sequence

One coherent PR is preferred, with these focused commit boundaries. This is a delivery outline, not authorization to publish from this documentation task.

1. **Theme compatibility foundation:** register Clear Sky, semantic tokens, default-resolution rules, preference compatibility migration, and focused theme/default tests.
2. **Shared chrome:** header/search/forms/dialogs/footer and readable component states; retain first-visit behavior and saved theme choices.
3. **Forecast composition:** shared home/city hero, next-hours summary, hourly preview, sidebar, and responsive reading order.
4. **Full weather detail:** nine conditions cards, complete daily detail, AQI/Moon, embedded radar, tooltips, and unavailable-state correctness.
5. **Hourly and radar:** real planning layout/readability, location continuity, map overlays and controls, frame-age visibility.
6. **Learning and remaining-route compatibility:** real education surfaces/diagrams/citations; targeted readability fixes on dashboard and other specialized pages.
7. **Release verification and documentation:** data-parity evidence, focused regression coverage, cross-theme/browser screenshots, production checks, and finalized PR description.

Tests belong with the behavior they protect, not solely in the final commit. If a chunk needs a correction, keep follow-up commits focused. Run the user's local `code-review` skill against the complete final diff, fix verified findings, then complete normal hooks and publication checks when implementation/pushing is authorized. The prototype branch stays separate.

## 10. Acceptance criteria

| ID | Pass condition |
|---|---|
| CS-01 | Clear Sky is the free default for a fresh visitor and new preference defaults agree across app/API/DB. |
| CS-02 | Existing valid saved themes survive reload, login, logout where allowed, and deployment without forced conversion. |
| CS-03 | All nine conditions cards and every applicable row in section 6 are present with matching data and working explanations. |
| CS-04 | Home and city pages share the selected forecast composition; daily selection still exposes complete detail. |
| CS-05 | Sidebar appears only with loaded weather and sufficient width; it never replaces metrics or mounts a duplicate map. |
| CS-06 | First-visit location/search, denial/retry/timeout, pending-search usability, and late-response protections remain intact; no first-visit footer/city list. |
| CS-07 | Forecast/hourly/radar/learning journeys preserve place/time/return context; radar playback cannot overwrite navigation away. |
| CS-08 | Missing, partial, zero, stale, and unsupported data render honestly with no new favorable defaults. |
| CS-09 | Theme changes preserve weather/account/UI state and do not independently trigger new weather fetching. |
| CS-10 | Changed surfaces meet contrast/focus/keyboard/zoom requirements; all existing themes remain legible. |
| CS-11 | Desktop/mobile production renders show no document overflow, hydration errors, new uncaught exceptions, or avoidable layout shifts. |
| CS-12 | Real maps, real lessons, source citations, SEO/canonicals and existing specialized tools remain functional; no prototype code or fixed sample content ships. |
| CS-13 | Local review is clear, normal hooks pass, and every applicable CI/advisory check and current bot review is settled before readiness. |

## 11. Verification and evidence

### Before/after baseline

Before implementation, run the current production build and capture the same seeded city, time, units, viewport, and data fixtures used after the change. Create a field-by-field parity checklist from section 6. Include a complete-data fixture, sparse/unsupported data, valid zeros, stale saved weather, long place labels, and active hazards. Record changes in reading order separately from changes in data.

### Focused automated coverage

- Default/theme list/DB constraint parity and preference round-trip; invalid storage, legacy identifiers, existing Daybreak/Nord, authenticated restricted themes, and logout fallback.
- Full metric rendering/value/unit parity, missing/nonfinite and zero values, explanation controls, selected-day detail, and optional Moon context.
- First-visit flows, city/session recovery, no duplicated fetch/map caused by styling, and location-preserving journeys.
- Planner and radar state regressions only where composition/styles affect behavior. Do not rewrite meteorology tests to match the design.

Existing useful suites include `theme-config`, `theme-constraint-parity`, `theme-contrast`, `weather-display-visibility`, `weather-journey`, city-page SEO/identity tests, and E2E `themes`, `home-first-visit`, `weather-ui-journey`, `journey-recovery`, `weather-data-reliability`, `outdoor-planning`, and `radar`.

### Browser verification

Use a production build for final evidence. Cover Chromium and Firefox, desktop and mobile, for home/city forecast, complete metrics, hourly/planner, radar, and education. Check representative remaining routes under Clear Sky and smoke-test all retained themes. Verify keyboard-only navigation, focus after tooltip/dialog dismissal, readable badges, 200% zoom, reduced motion, long labels, mobile controls, and return links. Manually inspect the current screenshot's pollen-label readability.

Use stable assertions about content, state, and destinations. Update layout-only expectations when justified; do not weaken field-presence assertions to make the redesign pass. Account for streamed hidden DOM duplicates with visible/semantic locators.

### Build and performance

- Run targeted tests first, then the full unit suite, production build, both TypeScript projects, lint, and Knip for the completed shared-theme change.
- Run the relevant production browser matrix once after integrated changes; repeat affected checks for subsequent fixes.
- Keep current CI and Lighthouse thresholds unchanged. The checked-in Lighthouse configuration currently enforces desktop performance of at least 0.85 using five runs; confirm the effective workflow at execution time.
- Measure populated forecast as well as fresh home, plus radar and a learning page. The homepage CI URL alone cannot prove the loaded forecast remains fast.
- Compare repeated runs under equivalent conditions. Investigate a median performance drop over five points or new CLS over 0.1; a single noisy run is diagnostic, not proof of regression.
- Preserve lazy loading and reserved dimensions. Do not bring map engines/astronomy computation into the initial forecast bundle as part of decoration. Investigate material bundle/request increases against baseline.

Save actual results, screenshots, parity checklist, known limitations, and any pre-existing failures in a dedicated implementation verification document. This PRD defines the checks; it does not claim that production Clear Sky has passed them.

## 12. Release, risks, and completion

| Risk | Mitigation |
|---|---|
| Attractive prototype loses production detail | Inventory-driven parity test and full-page screenshots; nine visible condition cards are mandatory |
| New theme fails to save | Additive schema compatibility before app rollout; constraint parity and authenticated round-trip |
| Saved user choice is overwritten | Preserve valid stored preferences; no bulk migration of old values |
| Daybreak-only light-style checks make Clear Sky unreadable | Audit light/dark assumptions and semantic contrast, including pollen/AQI badges |
| Sidebar adds latency or displaces useful weather | Navigation-only sidebar, one existing embedded map, weather-first mobile order |
| Sample claims/images become misleading live content | Real summary utilities and condition icons; exclude all prototype/sample branches |
| Large shared-theme diff breaks specialized tools | Route coverage table, representative theme smoke checks, focused corrective changes |
| Rollback rejects new saved values | Retain `clear-sky` support/constraint; revert default or presentation separately |

Completion requires the acceptance table, recorded parity evidence, normal local validation, the requested independent local code review, and successful applicable CI/CD and bot feedback checks on the latest PR head. Merging is a separate user action unless explicitly authorized.

There are no unresolved product questions needed to understand this spec. Deployment facts (live database constraint, preference creation paths, effective CI checks) must be verified during implementation. Any newly discovered feature removal, data-contract change, or broader redesign must be called out explicitly rather than silently folded into this scope.
