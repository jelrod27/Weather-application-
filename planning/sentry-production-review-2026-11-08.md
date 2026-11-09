# Sentry production review — November 8, 2026

Scope: every issue with activity in the preceding seven days in `justin-elrod/16bit-weather-web`, including resolved/ignored issues. Sentry returned eight unresolved groups. Error-event aggregates confirmed production activity; counts below are seven-day counts, not lifetime totals. Inspection was read-only and no issues were manually resolved.

## Findings

| Sentry issue | Events | Production impact and disposition |
| --- | ---: | --- |
| [W — X-ray freshness](https://justin-elrod.sentry.io/issues/16BIT-WEATHER-WEB-W) | 20 | New on release `7c04dac`: handled route errors return HTTP 500 and no live X-ray reading. Latest breadcrumb contains a successful Vercel persistent-cache read, without a fresh NOAA request. This patch refreshes unusable cached observations before declaring the feed unavailable. |
| [X — live Kp unavailable](https://justin-elrod.sentry.io/issues/16BIT-WEATHER-WEB-X) | 2 | Same release and cache-read pattern: aurora guidance returns HTTP 500, null Kp/viewline and unavailable activity. Same recovery fix, also applied to the Kp API and the server-rendered Kp/flare page loaders. |
| [V — alerts fetch failed](https://justin-elrod.sentry.io/issues/16BIT-WEATHER-WEB-V) | 1 | Production NWS transport failure. A single failed connection previously failed the collection. This patch adds one retry within the original caller deadline. Exhausted failures still report unavailable, never an empty all-clear. |
| [K — alerts socket closed](https://justin-elrod.sentry.io/issues/16BIT-WEATHER-WEB-K) | 1 | Older variant of the NWS transport failure; covered by the same bounded retry. |
| [T — radar tile 404](https://justin-elrod.sentry.io/issues/16BIT-WEATHER-WEB-T) | 490 | Last seen on November 6, before the merged missing-imagery correction in PR #708 (`5c6f4ac` in its source branch). Current code preserves truthful 404/stale-image handling and distinguishes missing tiles from unexpected faults. No redundant rewrite. |
| [S — NASA 503](https://justin-elrod.sentry.io/issues/16BIT-WEATHER-WEB-S) | 1 | Last seen before PR #706 (`c99da9d`) replaced the failing NASA gateway with the public CCMC DONKI endpoint and bounded requests/recovery UI. Current failure handling remains visible. |
| [G — NASA timeout](https://justin-elrod.sentry.io/issues/16BIT-WEATHER-WEB-G) | 2 | Same older flare-catalog path and existing PR #706 fix. |
| [Q — cron N+1 calls](https://justin-elrod.sentry.io/issues/16BIT-WEATHER-WEB-Q) | 880 performance events | Production-tagged scheduled-job spans. PR #704 (`bae7f23`) replaced per-recipient state reads with batches of 100. Last seen before that fix; current batching and deduplication tests remain in place. |

No tracked user IDs were attached to these server events. The zero user counts do not establish zero visitor impact. W/X prove intermittent production endpoint degradation, rather than a site-wide outage. Both endpoints returned HTTP 200 during a point-in-time production check after the last recorded failures.

Cache staleness is supported by the breadcrumbs and by reproduction against the local code, but Sentry did not retain the observation payloads. An upstream publication delay can produce the same freshness failure. The patch handles both cases: refresh once, apply the unchanged freshness/quality rules again, and remain unavailable if the provider still has no usable observation. It does not relax freshness thresholds or suppress reporting.

## Change and verification

The SWPC JSON helper accepts an optional observation validator. Malformed or unusable JSON triggers one `no-store` recovery request with Next revalidation options removed, at most four seconds and no transport retries. Healthy cached data takes the existing single-request path. NWS uses the existing retry helper with one retry and its existing outer request deadline. Retry backoff now stops immediately when that deadline aborts.

Regression tests were observed failing before their corresponding fixes: stale-cache recovery for five consumers, NWS connection recovery, and cancellation during HTTP/network retry backoff. Fresh observations and genuine Kp zero remain available; stale, future and invalid observations remain unavailable after unsuccessful recovery.

Initial broad verification exposed existing macOS `/var` versus `/private/var` newsletter fixture paths (four failures in `newsletter/publication.test.ts`) and fake-clock retry stalls (five failures in `nws-news-feed.test.ts` / `news-source-integrity.test.ts`). The documented `TMPDIR=/private/tmp` invocation resolves the former. The latter tests now retain real timeout timers while freezing observation dates; all outcome assertions remain. Playwright browser binaries were updated locally after the dependency update; the first browser-launch failure did not reach application assertions.

Independent review caught retry backoff extending beyond the caller deadline. An abort-aware delay and regression tests corrected it; re-review found no remaining material issues.

| Final local check | Result |
| --- | --- |
| `TMPDIR=/private/tmp npm test -- --runInBand` | 326 suites / 2,824 tests passed |
| `npm run build` | Passed, including application TypeScript checks |
| `npm run typecheck:tests` | Passed |
| `npm run lint` | Zero errors; 89 existing warnings |
| Space Weather + warnings Playwright, Chromium and Firefox | 20 passed |
| Live requests against local production server | HTTP 200 for X-ray, aurora, Kp and location alerts |
| `git diff --check` | Passed |

Full Playwright and Lighthouse are left to CI; local browser validation covers the affected Space Weather and warnings flows in both browsers. Upstream outages can still exhaust recovery. Merge and deployment are required before production recurrence can be evaluated.
