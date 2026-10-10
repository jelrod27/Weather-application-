# Read your sky — layout A implementation

Issue: [#664](https://github.com/jelrod27/Weather-application-/issues/664). User selected **A — Field note** on October 9, 2026. Local implementation branch: `feat/read-your-sky`, based on `dde9e5c`. The three-option prototype remains separately preserved at `prototype/read-your-sky` (`e11ff26`). No push, PR, merge, or deployment has been performed.

## Implemented behavior

- Home, city, and hourly forecast journeys use **Read your sky** with the viewed coordinates, readable place, timezone, and safe return URL. No device-location substitution.
- A dedicated noindex page uses the selected Field note hierarchy: current explanation beside one matching original scientific schematic, then a short two-hour cloud-cover outlook and conditional learning tip.
- The provider boundary checks units, ranges, nulls, absolute timestamps, timezone, and receipt/current freshness. Current data older than 30 minutes, future current values, or unusable cloud fields do not become local clear skies. Receipt time is not presented as model-run time.
- Current broad layers remain independent; they are not added to obtain the provider's total. Text and illustration share one validated snapshot. Cloud genera are conditional learning examples only.
- Missing layers narrow the explanation; missing outlook retains current data. No current estimate explicitly switches to general learning and a general illustration. Clear and night presentations, retry, timeout, expired data, direct place search, and cancellation of obsolete location requests are covered.
- Lesson, Atlas, and Guide links retain the selected-place sky return and its original weather destination. Existing static education URLs continue working. The Education Hub's generic Atlas tile now says “Explore cloud types.”

## Main files

- [Page and interaction](../app/read-your-sky/sky-reading.tsx), [illustration](../app/read-your-sky/sky-illustration.tsx), [styles](../app/read-your-sky/sky-reading.module.css).
- [Provider validation and explanations](../lib/sky/estimate.ts), [selected-place context](../lib/sky/context.ts), [API route](../app/api/read-your-sky/route.ts), and the narrow request in [existing Open-Meteo service](../lib/open-meteo.ts).
- [Forecast journey](../components/weather-journey.tsx), [safe links](../lib/weather/journey.ts), [learning context links](../components/education/weather-learning-link.tsx).
- [Data tests](../__tests__/sky/estimate.test.ts), [page tests](../__tests__/sky/page.test.tsx), [route tests](../__tests__/sky/route.test.ts), [browser journey tests](../tests/e2e/read-your-sky.spec.ts).

## Verification

| Check | Result |
|---|---|
| Targeted Jest, including sky, education, journey and existing forecast-source tests | **273 passed across 23 suites** after final runtime changes |
| Chromium browser suite | **6 passed** on final run: desktop/mobile forecast → sky → lesson → Atlas → Guide → return; failure and keyboard retry; clear night/missing layers/outlook/staleness; direct search; main-page entry |
| Whole Jest suite | **2,262 passed; 1 failed**. The unrelated `public-https.test.ts` benchmark address case (`198.18.0.1`) also fails on unchanged main with the same local dependencies. |
| Repository lint | **0 errors**, 93 existing warnings. |
| Knip | **Passed**, existing configuration hints only. |
| Application TypeScript | Passed before production-generated route checks; after build generation, blocked by the three existing route exports below. No errors in the new feature files. |
| Test TypeScript | Blocked by existing `reducedMotion` fixture type errors in `forecast-temperature-policy.spec.ts` and `hourly-daylight.spec.ts`; reproduced on main. The new tests are included in `tsconfig.tests.json`. |
| Production build (`npm run build -- --webpack`) | Compilation reaches TypeScript, then fails on existing non-route exports: `filterEmptyGeometries`, `verifyWebhookSecret`, `handleAuthCallbackWelcome`. Same three failures reproduced by building unchanged main. |
| Live browser → local API → Open-Meteo → explanation/illustration | **Passed** for Portland's real model snapshot, including nighttime and overlapping layers. This checks the data path, not meteorological accuracy. |
| Responsive review | 390px mobile and desktop reviewed; no mobile horizontal overflow. Latest live preview had no browser console errors. |
| Whitespace and staged secret scan | Checked during closeout. |

Initial cold development-route compilation triggered a Fast Refresh reload during one desktop lesson navigation. The final suite passed after routes compiled, without weakening assertions or adding test retries. The local browser also retained an older development bundle under `127.0.0.1`; the final visual review used the fresh `localhost` origin. Production navigation remains subject to the blocked production build and CI gates.

The local installation is Node 26.11.1, Next 16.3.4, and Playwright 1.62.1. CI pins Node 22 and the repository requests newer Next/Playwright ranges. These are existing local dependency differences; no dependency or lockfile change was made. Re-run release validation with the pinned installation before publication.

**Not run:** Lighthouse and production-server browser checks, because the production build is blocked. Full repository E2E was not run; the affected journey suite was run. Remote security, Preview Smoke, and production smoke checks have not run because the branch has not been published or deployed. No CI gate was disabled or bypassed.

## Provider access and scope

The sky request reuses the application's existing public Open-Meteo endpoint and timeout/rate-limit infrastructure. It is requested only on page entry, place change, or explicit retry: eight current fields plus one hourly field, three hourly slots, one coordinate, no daily/NBM/astronomy request and no automatic provider polling. Thus even counting both current and hourly field lists, the request has nine variable slots, below the provider's more-than-ten-variable accounting threshold. See [Open-Meteo documentation](https://open-meteo.com/en/docs) and [call accounting](https://open-meteo.com/en/pricing), checked October 9, 2026.

Technical access succeeded. The repository does not establish the production site's commercial-access arrangement or actual traffic budget. Verify that existing arrangement before release; no service was purchased and no credentials or account configuration were changed. New text/illustrations are authored here; linked provider/licence and scientific attribution is shown on the page.

## Review locally

From this implementation checkout: `npx next dev --webpack --hostname 127.0.0.1 --port 3016`.

Open [Read your sky](http://localhost:3016/read-your-sky?lat=45.5152&lon=-122.6784&label=Portland%2C+Oregon&tz=America%2FLos_Angeles), or follow **Read your sky** from the local main forecast. Weather changes over time; the saved [desktop](read-your-sky-previews/desktop.jpg) and [mobile](read-your-sky-previews/mobile.jpg) images capture the reviewed moment.

Release validation remains incomplete until the baseline environment/failures are resolved and the normal CI/preview gates pass. This is a local feature implementation, not a deployed release.
