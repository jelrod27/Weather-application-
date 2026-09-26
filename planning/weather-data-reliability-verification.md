# Weather reliability verification

Scope: [approved requirements](prds/PRD-weather-data-reliability.md) and [execution plan](weather-data-reliability-plan.md), based on main9268e34. One PR; no migrations, new providers or accessibility workstream.

## Outcomes

| Area | Verified result |
| --- | --- |
| Saved weather | Coalesced bounded server cache;5min fresh/30min maximum fallback; failed refresh keeps original receipt time; explicit retry; malformed current weather rejected. |
| Card lifecycle | Preferences resolve before requests; coordinate/account changes ignore late responses and cancel requests; response unit labels; separate loading/list-error/empty states; unknown AQI/UV stay unavailable. |
| Radar | Newest frame shows elapsed age; paused clock advances; Latest selection, history, playback and lesson/return navigation remain working. |
| Moon | Forecast server enrichment matches Stargazer for NY/London/DST/polar cases; explicit observing night/date/zone; no invented moonset fallback. Engine chunk absent from initial forecast script tags. |
| Travel | Worst-point hazard/score/place/time separate from average; partial/no data explicit; future noon uses the location's calendar across DST; Fly/Drive/day flows intact. Personal trip numerical scoring unchanged; missing input produces unavailable. |

## Checks

- Baseline267 suites/2066 tests. Final274 suites/2098 tests pass.
- Production build; main and test TypeScript projects pass.
- Lint:0 errors/93 existing warnings. Knip passes.
- Production Chromium/Firefox, desktop1280px/mobile390px:70 cases covered.68 initially passed; two existing radar assertions still expected the intentionally removed LATEST-only age label. Both were changed to require age plus the separate Latest pressed state and passed on rerun.
- All20 new reliability browser scenarios passed, including simultaneous successful/failed saved cards, retry, failed-refresh retention, m/s preference, absent AQI/UV, paused radar, NY/London Moon, worst/average travel and missing coverage.
- Live read-only local-server smoke: New York and London dashboard HTTP200, independent wind units and distinct source/receipt timestamps; live travel and Moon UI verified. No production account writes.
- Clean desktop Lighthouse on New York forecast:97 performance,94 accessibility,96 best practices,100 SEO; CLS0.048. This is one diagnostic run, not the five-run CI median. Known shared contrast issues are deferred; localhost lacks Vercel analytics scripts.
- Initial post-browser smoke/Lighthouse hit the local rate limiter. Discarded those results; restarted only the owned local server, then repeated cleanly. No rate limit policy changed.
- Normal commit hooks pass; push hooks run before publication.

Logs: `/tmp/weather-reliability-final-{unit,build,testtypes,lint,knip,e2e}.log`; `/tmp/weather-reliability-radar-e2e-correction.log`; `/tmp/weather-reliability-lighthouse-clean.json`; `/tmp/weather-reliability-live-smoke.json`. Browser screenshots are `/tmp/weather-reliability-{dashboard,travel}-{390,1280}.png`.

## Local code-review

Independent Standards and Spec reviews completed on the full working diff before commits. Standards:0 findings. Spec:1 response-unit finding; fixed with a red/green rendering regression and independently rechecked clear. Final committed comparison uses `git diff 9268e34c9ccf2c492a588b5b0b20d2538c73c976...HEAD` before push.

## Remaining limits

The cache is per-instance memory; cold starts have no previous snapshot. Provider availability cannot be guaranteed. Travel samples are point-in-time weather, not a route safety guarantee or a departure forecast. Full accessibility remediation and unrelated site issues remain deferred. CI and bot review begin after PR creation and are separate from local validation.
