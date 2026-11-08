# Radar and alert reliability verification — November 8, 2026

## Alert state batching: already corrected

PR #704's existing `lib/services/severe-alert-monitor-state.ts` deduplicates place IDs and reads state with `.in(...)` filters in batches of 100, selecting only the ID and `active_alert_ids` columns. The HTTP-level regression suite exercises 205 guest IDs across three requests, cross-batch state, duplicate account IDs, empty input, malformed rows, transport failures, and failed-batch isolation. The monitor suite also checks that unreadable state does not become empty delivery history or block later account/guest recipients.

These reference suites passed locally. Historical Sentry occurrence counts alone do not establish a remaining unbatched-query defect. No alert logic or delivery ownership changed in this follow-up.

## Radar root cause and correction

The RainViewer tile loader previously threw the same generic `Error` for every non-2xx status. With no usable cached image, the route sent all such errors through `logRouteError`, creating a Sentry defect exception even for a known missing image. Conversely, stale fallback returned before reporting any failed refresh, hiding unexpected upstream failures whenever old bytes were available.

The loader now preserves the upstream HTTP status in a local typed error. Only HTTP 404 is classified as a known missing image. The route records a warning breadcrumb with tile path, upstream status, and whether a stale fallback was used. Without cached image bytes, it returns a JSON 404 with `Cache-Control: no-store` and the tile quota headers. It does not return a transparent or otherwise synthetic successful image. A 404 is not labeled an expired frame: the status alone cannot prove that cause. HTTP 410 remains unexpected because no RainViewer-specific 410 contract was established.

Other HTTP errors and transport failures retain the existing error-reporting path, now also when a stale tile is served. The shared logger's existing timeout handling is unchanged. Unexpected HTTP failures return JSON 502 without cached bytes and include `no-store` plus quota headers.

The existing allowlist, isolated tile quota, eight-second upstream timeout, 512-entry bound, request coalescing, ten-minute fresh lifetime, and one-hour total stale lifetime remain intact. Stale fallback stays outside the loader so a failed refresh cannot re-stamp old bytes as fresh. Client retries and unavailable behavior are unchanged.

## Verification

- Regression first: the new route suite produced seven expected behavioral failures against the original implementation; the three existing alert/client recovery suites passed. Failures demonstrated 404 becoming 502, missing no-store/status diagnostics, and silent stale refresh failures.
- After the fix: `npm test -- --runInBand __tests__/radar-tile-route.test.ts __tests__/severe-alert-monitor-state.test.ts __tests__/severe-alert-monitor.test.ts __tests__/radar-tile-recovery.test.ts` passed all **49 tests in four suites**. The new route suite contains 11 cases, including four table-driven unexpected HTTP statuses.
- Real route, cache, API wrapper, response objects, and error utilities are exercised; only external fetch, quota lookup, and Sentry delivery are mocked. Coverage includes 404 failure classification, unexpected 400/410/429/500, transport failure, concurrent loading/refresh failure, exact fresh/stale boundaries, recovery after rejection, preserved PNG bytes, allowlist rejection, and quota rejection.
- `npx eslint 'app/api/radar/tile/[...path]/route.ts' __tests__/radar-tile-route.test.ts` completed with no errors or warnings.
- A full Jest run was started, then canceled for the parent task's coordinated dependency installation/integrated run. Before cancellation, `__tests__/newsletter/publication.test.ts` showed its known macOS temporary-path failures in the four `prepares a merge-to-publish PR` cases (`wednesday_topic`/`sunday_rearview`, partial true/false). That invocation omitted the plan's `TMPDIR=/private/tmp`; it is not a successful full-suite result. The integrated run must use the canonical temporary directory.

## Limits and follow-ups

No live provider call or post-deploy Sentry trend was used as a substitute for deterministic regressions. Missing imagery still reaches the client as a failed request when there are no bounded cached bytes. Server cache state remains warm-instance only. Independent review, central test TypeScript inclusion, both TypeScript projects, full Jest with canonical `TMPDIR`, production build, and affected browser checks are coordinated by the parent task before publishing the combined PR.
