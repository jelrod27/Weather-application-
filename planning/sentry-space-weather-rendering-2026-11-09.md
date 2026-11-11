# Space-weather rendering and scales recovery

## Scope

Implements the November 9 Sentry investigation and the request to fix all findings,
run local Standards and Spec reviews against `origin/main`, and open a PR.

- [WEB-13](https://justin-elrod.sentry.io/issues/16BIT-WEATHER-WEB-13): eight
  production static-to-dynamic errors on the Kp intent page; breadcrumbs also
  show the hub failing. Shared NOAA recovery conditionally uses `no-store`.
- [WEB-12](https://justin-elrod.sentry.io/issues/16BIT-WEATHER-WEB-12): five
  handled scales freshness failures. Cached data was returned successfully;
  the event does not establish whether NOAA itself was stale.

## Requirements

1. Render the hub and all four live intent pages consistently at request time,
   so conditional uncached NOAA recovery cannot cause static-to-dynamic errors.
2. Preserve individual feed caching and existing cache lifetimes.
3. Retry stale or undated scales JSON through the existing bounded uncached
   recovery path before reporting unavailable.
4. Keep freshness and scale-quality checks: stale, future, undated, malformed,
   or failed recovery must not establish quiet conditions. Fresh zero is valid.
5. Add regression coverage that inspects the actual production build, since
   mocked fetch tests do not exercise Next's rendering classification.
6. Keep the change scoped to these failures; do not suppress Sentry reporting
   or change upstream URLs, freshness windows, or retry limits.

## Verification approach

The observation recovery suite reproduced four scales failures before the fix.
The production manifest guard reproduced five statically rendered routes before
the fix. Run `npm run build` before `npm run test:production:space-weather`;
the guard checks both route existence and absence from the prerender manifest.
The CI build job runs this guard after its normal production build.

Playwright verifies server-rendered HTML for all five routes. Run it against
`next start` with `PLAYWRIGHT_TEST_BASE_URL` for production coverage; the default
CI browser job starts `next dev`. The existing space-weather suite covers
unavailable and recovery states. Unit tests cover bounded recovery, fresh zero,
stale/future/invalid timestamps, missing observations, and upstream failure.

## Operational considerations

Space-weather HTML is rendered per request instead of using the full-route
static cache. NOAA fetches retain their five- or fifteen-minute data caches;
only recovery bypasses them. Upstream outages can still exhaust recovery and
must remain visible as unavailable. Production resolution requires deployment
and subsequent Sentry observation; local checks alone do not establish it.

## Local results

- `TMPDIR=/private/tmp npm test -- --runInBand`: 326 suites, 2,833 tests passed.
  The first full run exposed a metadata-only jsdom test importing server APIs;
  a scoped `connection` mock keeps that suite focused on static metadata.
- `npm run build`: passed; all five space-weather pages are dynamic.
- `npm run test:production:space-weather`: all five build guards passed.
- `npm run typecheck` and `npm run typecheck:tests`: passed.
- `npm run lint`: no errors, 89 existing warnings. Changed-file lint is clean.
- `npm run knip`: passed, with existing configuration hints.
- Production `next start` on port 3107, followed by both space-weather
  Playwright suites with `PLAYWRIGHT_TEST_BASE_URL`: 24 tests passed across
  Chromium and Firefox.
- Desktop Lighthouse spot check on `/space-weather`: performance 65,
  accessibility 88, best practices 96, SEO 100. This is a measurement rather
  than a passing performance gate: cumulative layout shift was 0.517, requiring
  separate performance investigation. No before/after attribution is claimed.
- Full Playwright and the configured multi-run Lighthouse matrix are left to
  CI; the local runs focus on the affected routes and browser interactions.
