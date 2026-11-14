# Space Weather performance and accessibility — November 13, 2026

## Scope and reproduction

Requested: reproduce the Space Weather performance and accessibility problems, fix the causes, and run relevant checks. Measurements use baseline commit `35f7e4595120845a59da4de04307918a3b9cc0bf`. The implementation preserves the provider contract. Publication of this change is authorized separately; this verification record does not establish production deployment or field performance.

A fresh production build served `/space-weather` on port 3107. Playwright's Chromium PerformanceObserver recorded cumulative layout shifts of 0.514 desktop and 0.773 mobile. The trace identified the footer moving when the terminal replaced its small fallback. The default command tab and its visible widgets then arrived through additional client-only imports. The mobile status badge also grew when LOADING changed to longer status text. The solar viewer's fixed-height ancestor clipped the wavelength controls.

Axe found unnamed image/message controls, inadequate text contrast, duplicate navigation landmarks, skipped heading order, and explanatory content outside the main landmark. Extending the inspection to the other tabs reproduced low-contrast chart labels, missing ENLIL playback/slider names, and text whose opacity pulsed below the contrast requirement. Tests exercise populated widgets and unavailable readings, rather than relying on healthy NOAA responses.

## Changes

- Render the terminal and default Command Center immediately. Keep the other four tabs lazy-loaded. Preserve NOAA request-time rendering, feed caches, recovery and freshness rules.
- Place server-rendered explanatory content inside the existing main landmark, before the footer. Give navigation landmarks distinct names and the terminal a real level-two heading.
- Reserve the longest status-badge width; keep missing scale slots visible and explicitly unavailable. Remove the solar viewer's clipping wrapper and reserve square image space.
- Use scoped light/dark status colors and theme-aware chart labels, strokes and axes. Keep explicit severity text. Remove text-opacity pulses and the skeleton-to-message color transition. Improve the shared light footer and nationwide intensity badge contrast.
- Use the existing Radix dialog for the expanded solar image, with focus trapping, Escape close and focus restoration. Name image refresh, message navigation, playback and slider controls. Enlarge message targets and provide a persistent pause/resume control.
- Pin axe-core as a direct development dependency; it was already installed transitively through Lighthouse. Preserve unrelated package-lock metadata.

## Review fixes

Independent read-only review found a runtime-constructed Tailwind class for the extreme Kp value tile, premature axe scans of nested loading widgets, and empty rather than populated data in successful layout tests. Badge classes are now literal; Kp 8 has an explicit nontransparent-background assertion. Audits wait for nested modules and actual flare, chart, scale and playback content. The layout tests reuse complete endpoint fixtures. The ENLIL fixture image is intercepted so slider readiness cannot depend on NOAA image availability. A final Firefox audit reproduced an unreadable ENLIL loading caption in Nord; removing its opacity/pulse corrected that failure before the final 76-case rerun.

## Lighthouse comparison

| Metric | Desktop before → after | Mobile before → after |
| --- | --- | --- |
| Performance score | 67 → 93 | 64 → 87 |
| Accessibility score | 91 → 100 | 88 → 100 |
| Cumulative layout shift | 0.483 → 0.042 | 0.741 → 0.001 |
| Largest-contentful paint | 2.33 s → 1.73 s | 3.92 s → 4.06 s |

All five final desktop runs scored 93 performance / 100 accessibility; all three mobile runs scored 87 / 100. Mobile largest-contentful paint remains about 4.1 seconds and did not improve in this run. It is the server-rendered introductory paragraph, rather than the solar image; shared render-blocking/font/bundle work would need separate investigation. No mobile LCP improvement is claimed.

The same Lighthouse 13.5.0 installation and Chromium binary are used before and after, against `next start`, without browser API mocks. Desktop uses Lighthouse's explicit desktop configuration for five runs; mobile uses its default mobile configuration for three runs. Reported summaries are per-metric medians. Live imagery and feed responses vary, so these are local lab measurements rather than a production availability or field-performance guarantee.

The initial exploratory script passed a CLI-only preset flag to the Lighthouse JavaScript API. Those reports, named `before-*`, are excluded from this comparison. Only the correctly configured `baseline-*` and final reports count.

## Verification

**Final production browser matrix: 76 passed in Chromium and Firefox**, including 30 populated tab/theme axe scans, loading/failure layout checks, keyboard dialog behavior, SSR recovery, forecast layouts and guest theme journeys. Review follow-up found no remaining actionable issue.

Repeated Lighthouse completed: five desktop and three mobile runs. Both median performance scores exceed the repository’s corresponding desktop/mobile thresholds, and accessibility is 100.

Representative HTML reports, selected by median performance, are retained locally under `/private/tmp/space-weather-perf/` as `baseline-desktop.html`, `verified-desktop.html`, `baseline-mobile.html` and `verified-mobile.html`. These local artifacts are not published in the repository; the table above uses per-metric medians.

Already verified on the reviewed production source:

- Production build passed.
- Full Jest: 326 suites / 2,835 tests passed.
- Repository lint: zero errors / 87 existing warnings; targeted test-file lint is clean.
- Application and test TypeScript projects passed.
- Five production rendering guards passed.
- Knip passed with existing configuration hints.
- Whitespace checks passed.

Relevant browser scope: Space Weather rendering/recovery, populated and failed-feed layout at 390px and 1350px, no-JavaScript shell, keyboard dialog behavior, and axe across all five tabs in Clear Sky, Daybreak and Nord. Shared forecast/theme browser checks cover the small navigation/footer changes. Firefox checks the journeys and accessibility; numerical layout-shift assertions run only in Chromium because Firefox does not expose that PerformanceObserver entry type.

The full site E2E suite and default home/radar/sky Lighthouse matrix are not rerun: this task targets Space Weather and the shared navigation/footer semantics. Auth-mocking theme tests require the development harness and are excluded from the production run. No real account flow, notification delivery, manual screen-reader certification or production deployment is exercised.

Raw logs, screenshots, and Lighthouse JSON reports are under `/private/tmp/space-weather-perf/`.

## Publication verification — November 14, 2026

The dedicated branch is based on current `origin/main` (`2c38309`), which includes the already-merged rendering fix and unrelated newsletter/blog changes. A fresh full Jest run passed all 326 suites / 2,840 tests, including the five additional newsletter cases. A fresh production build and all five rendering guards also passed. Prior production browser and Lighthouse results above remain dated implementation evidence.

## Files changed

- `__tests__/compact-scales.test.tsx`
- `__tests__/space-weather-messages.test.tsx`
- `__tests__/space-weather-nav.test.tsx`
- `__tests__/space-weather-status.test.tsx`
- `__tests__/space-weather-tabs.test.tsx`
- `__tests__/space-weather/imagery-viewers.test.tsx`
- `app/clear-sky.css`
- `app/space-weather/page.tsx`
- `app/space-weather/space-weather-client.tsx`
- `components/navigation.tsx`
- `components/page-wrapper.tsx`
- `components/space-weather/AuroraForecastMap.tsx`
- `components/space-weather/CompactScales.tsx`
- `components/space-weather/CoronagraphAnimation.tsx`
- `components/space-weather/EnlilModelViewer.tsx`
- `components/space-weather/KpIndexGauge.tsx`
- `components/space-weather/SolarCommandTerminal.tsx`
- `components/space-weather/SolarFlareTimeline.tsx`
- `components/space-weather/SolarWindStats.tsx`
- `components/space-weather/SpaceWeatherAlertTicker.tsx`
- `components/space-weather/SpaceWeatherCharts.tsx`
- `components/space-weather/SpaceWeatherNav.tsx`
- `components/space-weather/SpaceWeatherScales.tsx`
- `components/space-weather/SunImageViewer.tsx`
- `components/space-weather/SunspotDisplay.tsx`
- `components/space-weather/XRayFluxChart.tsx`
- `components/space-weather/space-weather.module.css`
- `components/space-weather/tabs/CommandCenterTab.tsx`
- `package-lock.json`
- `package.json`
- `planning/space-weather-performance-accessibility-2026-11-13.md`
- `tests/e2e/space-weather-accessibility.spec.ts`
- `tsconfig.tests.json`
