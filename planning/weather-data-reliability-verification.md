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

## PR 634 review follow-up

CodeRabbit completed its original review through `e1b08aa`; seven CSV/PNG audit artifacts were excluded by repository configuration. All applicable CI/CD checks passed on that head, including Build, Chromium, preview E2E, Lighthouse and Vercel. Later heads require their own checks and incremental review.

- CodeQL's adapter-test semicolon finding was corrected in `bcc2b83`; all 26 adapter tests, scoped lint, both TypeScript projects and independent Standards/Spec reviews passed.
- The real saved-location query helper swallowed Supabase errors as empty results. It now retains error capture and throws to the hook's generic failure/retry state. The regression uses the actual helper with a mocked Supabase query response, covering failure, successful retry and obsolete account success/error responses. No database schema, access policy or production data changed.
- Legacy cached Moon data can omit observing-night metadata. Rendering now joins only present context fields and hides an empty context line; neither/either/both fields and unavailable Moon data are covered.
- Before-fix regressions reproduced the swallowed query failure and orphan Moon separators. After correction: 59 focused tests, all 274 suites/2,104 tests, production build and test TypeScript passed. Scoped lint has zero errors and six existing database warnings. Independent incremental Standards and Spec reviews each found zero issues. Local browser/Lighthouse checks were not repeated for these two small corrections; repository CI reruns those checks after push.

The bot's blanket 80% docstring threshold is not a repository requirement; no documentation-padding change was made. Its inferred forced-refresh provider-load concern is retained as a rollout observation, not dismissed as disproven: coordinate validation, existing request limits and same-key in-flight coalescing remain; original receipt times require avoiding a second response cache. Measure provider request volume across server instances before adding a separate refresh budget. No new load evidence or mandatory policy change was identified in this review.

At follow-up validation, CodeRabbit's next included review was rate-limited until approximately September 27, 00:43 UTC. Completed original coverage does not establish review of the corrective commits; the monitor waits for a fresh incremental review before declaring readiness.

Logs: `/tmp/weather-pr634-bot-regressions-before.log`, `/tmp/weather-pr634-bot-focused.log`, `/tmp/weather-pr634-bot-full-unit.log`, `/tmp/weather-pr634-bot-build.log`.
