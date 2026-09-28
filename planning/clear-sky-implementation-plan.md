# Clear Sky Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Ship the selected Clear Sky default and data-complete forecast layout in one PR.
**Architecture:** Extend the existing theme registry and semantic CSS; preserve the weather/session owners. Compose real forecast components into a main column, discovery sidebar, full conditions grid and secondary radar/AQI/Moon region. Additive preference compatibility precedes rollout.
**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, Supabase, Jest, Playwright.
**Spec:** `planning/prds/PRD-clear-sky.md`.

## Global Constraints

- No prototype/sample weather enters production; all nine cards, forecasts and specialized tools remain.
- Preserve valid saved themes, the existing first-visit flow, units, place/return URLs and account isolation.
- One PR, normal hooks, local build/tests and user-selected Matt Pocock Standards/Spec review before push.
- No new weather providers/dependencies, no theme-triggered weather requests, no policy changes or preference backfill.

## Review Focus

- Invalid stored theme cannot block a valid account preference (Task 1 provider regression).
- A zero reading must survive; missing readings must not become favorable badges (Task 4 sparse fixture).
- Long city labels and large pressure values must wrap at 320 px (Task 7 browser matrix).
- Sidebar shortcuts preserve coordinate-based locations and safe return URLs (Task 3 journey regression).
- A saved Daybreak account must remain Daybreak after default/schema changes (Task 1 persistence regression).

## Task 1: Theme foundation and preference compatibility

**Files:** `lib/theme-config.ts`, `lib/theme-tiers.ts`, `components/theme-provider.tsx`, `lib/validations/preferences.ts`, `app/api/user/preferences/route.ts`, `app/theme.css`, `app/layout.tsx`, additive `supabase/migrations/*clear_sky.sql`; theme/provider/constraint tests.
**Interfaces:** Extend `ThemeType` with `clear-sky`; produce `DEFAULT_THEME`, `isLightTheme(theme: string): boolean`; use existing `setTheme` persistence path.
- [x] Extend configuration expectations to seven themes and three free choices; add default and provider precedence tests.
  ```ts
  expect(DEFAULT_THEME).toBe('clear-sky')
  expect(FREE_THEMES).toContain('daybreak')
  expect(FREE_THEMES).toContain('clear-sky')
  ```
- [x] Run `npm test -- --runInBand theme-config theme-constraint-parity`; expect failures before registration/migration.
- [x] Register tokens/defaults and selector entry; normalize local values before applying local-over-account precedence. Preserve all valid existing values.
- [x] Create additive constraint/default migration through the Supabase migration API; verify it locally with a disposable database and inspect live schema read-only.
- [x] Run focused theme/preferences tests; review and commit foundation.

## Task 2: Shared chrome and light-theme presentation

**Files:** `app/globals.css`, `components/hero-weather-card.tsx`, `lib/theme-tokens.ts`, existing theme and browser tests.
**Interfaces:** Consume semantic tokens and `isLightTheme`; retain all current component APIs.
- [x] Extend existing contrast tests to Clear Sky; test foreground/action/muted pairs.
- [x] Suppress glows in the new light theme, style control states, give borders/input/focus readable values, and remove daybreak-only light assumptions.
- [x] Check header/search/dialog/footer states and first-visit regression with existing tests.
- [x] Review and commit shared presentation.

## Task 3: Forecast composition and discovery

**Files:** `components/weather-display.tsx`, `components/forecast-brief.tsx`, `components/hero-weather-card.tsx`, new `components/weather/forecast-discovery.tsx`, related CSS; home/city and journey tests.
**Interfaces:** Discovery consumes `Pick<WeatherData, 'location' | 'coordinates' | 'timezone'>`; links use `getWeatherJourneyLinks` / `getWeatherLessonHref`. No fetch or map instance.
- [x] Add rendered coverage for sidebar destinations and the hero → summary → hourly order.
- [x] Compose current/brief/hourly in the main column and real navigation cards in a desktop sidebar; preserve no-weather gating in current owners.
- [x] Render one discovery instance at the matching desktop/mobile DOM position for keyboard order; daily forecast and detail span full width; mobile discovery follows weather detail.
- [x] Run journey/home/city tests; review and commit.

## Task 4: Complete conditions and missing-data behavior

**Files:** `components/weather-display.tsx`, new focused conditions presentation component if needed, `components/pollen-display.tsx`, `components/air-quality-display.tsx`, weather display tests.
**Interfaces:** Preserve `WeatherDisplayProps`; metric presentation consumes the existing weather/precipitation snapshots and semantic styles.
- [x] Pin all nine card labels, supplied readings, explanation triggers, units, zero values and missing values in rendered tests.
  ```ts
  for (const name of ['UV Index', 'Feels Like', 'Sun Times', 'Humidity', 'Pressure', 'Wind', 'Precipitation', 'Visibility', 'Pollen']) {
    expect(screen.getByText(name)).toBeInTheDocument()
  }
  ```
- [x] Move the full grid before secondary radar/AQI/Moon; use 1/2/3 columns; preserve daily selection/detail and showRadar behavior.
- [x] Avoid favorable null defaults and misleading missing-data badges; retain unit/data contracts and metric explanations.
- [x] Run display, tooltip, pollen, AQI, Moon and forecast tests; review and commit.

## Task 5: Hourly and radar compatibility

**Files:** hourly/planner components, radar UI styles/components only where necessary; existing planning/radar tests.
**Interfaces:** No data/state-machine interface changes; consume new tokens.
- [x] Inspect real Clear Sky hourly/planner/radar screens and affected style sources.
- [x] Correct actual light-theme contrast and density defects; preserve frame age, playback, latest state and cancellation on departure.
- [x] Run outdoor-planning/radar unit and focused production E2E checks.
- [x] Review and commit any necessary corrections.

## Task 6: Learning and route compatibility

**Files:** education components/diagrams and shared surface styles; compatibility fixes on other real routes where inspection shows defects.
**Interfaces:** Preserve guide content, citations, safe return routes and domain-specific tools.
- [x] Inspect education hub, glossary, lessons/detail; verify keyboard links/return and real sources.
- [x] Inspect dashboard/travel/stargazer/hazards/space/aviation/blog/auth under Clear Sky; fix theme-specific readability without changing feature logic.
- [x] Run relevant tests and browser checks; review and commit.

## Task 7: Integrated verification and publication

**Files:** tests, `planning/clear-sky-verification.md`, PRD/index status and source reference.
- [x] Capture complete/sparse/zero/stale/hazard fixtures and before/after inventory; run desktop/mobile Chromium/Firefox checks plus retained-theme smoke checks.
- [x] Run full units, production build, both type projects, lint, Knip, database tests and Lighthouse; log actual evidence and limitations.
- [x] Run the user-selected Matt Pocock Standards/Spec review on the full local branch and fix verified findings with focused regressions.
- [ ] Review all staged changes before normal commits. Push branch and open/attach one PR with concise scope, validation and migration ordering.
- [ ] Monitor applicable CI/CD and read actual current bot comments/reviews; no merge without user approval.

## Execution rulings

- User explicitly authorized full implementation and PR publication; proceed without another planning approval round.
- Preserve the existing prototype checkout and unrelated audit artifacts. Work in the managed Clear Sky worktree, starting at `53bd65b`.
- Verification must record facts; task checkboxes stay incomplete until the named work is complete.

## Actual delivery boundaries

Nine coherent commits: theme/schema foundation; shared Clear Sky presentation; complete AQI/pollen rendering; forecast composition and condition parity; radar/narrow-screen compatibility; browser regression coverage; final forecast contrast/progress semantics; tablet header compatibility; reviewed specification and evidence. Hourly and education inherit the semantic theme successfully and need no unrelated redesign commits.

Bugbot was unavailable (`unknown agent_type 'bugbot'` on both required attempts). The user explicitly selected Matt Pocock's code-review skill instead. Both independent axes found the desktop focus-order issue; Spec also found partial Moon data defaulting to zero. Both were fixed and independently re-reviewed clear. Subsequent radar/mobile corrections were also reviewed clear.
