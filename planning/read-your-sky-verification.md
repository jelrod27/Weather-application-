# Read your sky — layout A implementation

Issue: [#664](https://github.com/jelrod27/Weather-application-/issues/664). User selected **A — Field note** on October 9, 2026. Implementation branch: `feat/read-your-sky`, based on `dde9e5c`. The three-option prototype remains separately preserved at `prototype/read-your-sky` (`e11ff26`). The user subsequently authorized fixing all review findings, pushing this branch, and opening its PR. Merge and production deployment remain separate steps.

## Implemented behavior

- Home, city, and hourly forecast journeys use **Read your sky** with the viewed coordinates, readable place, timezone, and safe return URL. No device-location substitution.
- A dedicated noindex page uses the selected Field note hierarchy: current explanation beside one matching original scientific schematic, then a short two-hour cloud-cover outlook and conditional learning tip.
- The provider boundary checks units, ranges, nulls, absolute timestamps, timezone, and receipt/current freshness. Current data older than 30 minutes, future current values, or unusable cloud fields do not become local clear skies. Receipt time is not presented as model-run time.
- Current broad layers remain independent; they are not added to obtain the provider's total. Text and illustration share one validated snapshot. Cloud genera are conditional learning examples only.
- Missing layers narrow the explanation; missing outlook retains current data. No current estimate explicitly switches to general learning and a general illustration. Clear and night presentations, retry, timeout, expired data, direct place search, and cancellation of obsolete location requests are covered.
- Lesson, Education hub, Atlas, and Guide links retain the selected-place sky return and its original weather destination. The hub's cards and altitude activity preserve the same context. Existing static education URLs continue working. The Education Hub's generic Atlas tile now says “Explore cloud types.”

## Code-review fixes

Standards and specification reviewers independently reviewed the complete change against `dde9e5c`, then verified that all five findings were resolved:

- Known total cloud coverage remains visible whenever layer details are incomplete, including **80% total / [0, unknown, unknown]**. Missing totals still show supported layers without inventing coverage.
- Returning through the Education hub, its cards, or the lesson's hub link retains the selected-place sky and forecast destinations.
- Unexpected sky and place-search failures have contextual diagnostics. Expected HTTP failures and intentional request cancellation retain their quiet recovery paths.
- Imports follow the repository's documented order.
- Related page, route, and browser tests are grouped into named suites. Regression checks exercise incomplete data, diagnostic behavior, cancellation, and the hub navigation paths.

## Main files

- [Page and interaction](../app/read-your-sky/sky-reading.tsx), [illustration](../app/read-your-sky/sky-illustration.tsx), [styles](../app/read-your-sky/sky-reading.module.css).
- [Provider validation and explanations](../lib/sky/estimate.ts), [selected-place context](../lib/sky/context.ts), [API route](../app/api/read-your-sky/route.ts), and the narrow request in [existing Open-Meteo service](../lib/open-meteo.ts).
- [Forecast journey](../components/weather-journey.tsx), [safe links](../lib/weather/journey.ts), [learning context links](../components/education/weather-learning-link.tsx).
- [Data tests](../__tests__/sky/estimate.test.ts), [page tests](../__tests__/sky/page.test.tsx), [route tests](../__tests__/sky/route.test.ts), [browser journey tests](../tests/e2e/read-your-sky.spec.ts).

## Verification

Release validation on October 9, 2026 used Node **22.23.3** and **`npm ci`** from the committed lockfile: Next **16.3.8**, Playwright **1.63.0**, TypeScript **6.0.3**. After the review fixes, the feature worktree's independent installation and a clean production build were used for the checks below. No package or lockfile changes were necessary.

| Check | Result |
|---|---|
| Targeted Jest, sky and education | **238 passed across 20 suites** after the review fixes. All are included in the full-suite run below. |
| Chromium browser suite | **7 passed against the production build**, using the locked Playwright and matching Chromium: desktop/mobile forecast → sky → lesson → Atlas → Education hub → Atlas → Guide → return; lesson → hub → encyclopedia card → return; failure and keyboard retry; clear night/partial layers/missing outlook/staleness; direct search; main-page entry. No retries. |
| Whole Jest suite (`npm run test:ci`) | **2,270 passed across all 285 suites**. |
| Database security tests (`npm run test:security-db`) | **9 passed** on the implementation before review; no database code changed in the review fixes. |
| Repository lint | **0 errors**, 93 existing warnings. |
| Knip | **Passed**, existing configuration hints only. |
| Application TypeScript | **Passed**, including the production build's generated route checks. |
| Test TypeScript | **Passed**. The new tests are included in `tsconfig.tests.json`. |
| Production build (`npm run build`) | **Passed** with the same placeholder public environment values as CI. Both `/read-your-sky` and `/api/read-your-sky` are present in the completed build. |
| Lighthouse (`npm run lighthouse`) | **Passed**, all five homepage runs using the unchanged repository configuration. Median scores: performance **100**, accessibility **100**, best practices **92**, SEO **100**. This is the existing homepage gate, not a separate sky-page audit. |
| Live browser → local API → Open-Meteo → explanation/illustration | **Passed** for Portland's real model snapshot, including nighttime and overlapping layers. This checks the data path, not meteorological accuracy. |
| Responsive review | 390px mobile and desktop reviewed; no mobile horizontal overflow. Latest live preview had no browser console errors. |
| Whitespace and staged secret scan | Checked during closeout. |

An earlier shared installation used Node 26 and older dependencies, causing test/type/build failures that also reproduced on main. **None reproduces with Node 22 and the committed lockfile.** Both checkouts now have locked dependencies; stale generated development artifacts were preserved outside the build directory before the clean build. No unrelated application changes or test/CI relaxations were needed.

**Not run locally:** Full repository E2E; the affected journey suite ran against the production server. Remote security and Preview Smoke must run on the published PR. Production Smoke applies after an authorized deployment. No CI gate was disabled or bypassed.

## Provider access and scope

The sky request reuses the application's existing public Open-Meteo endpoint and timeout/rate-limit infrastructure. It is requested only on page entry, place change, or explicit retry: eight current fields plus one hourly field, three hourly slots, one coordinate, no daily/NBM/astronomy request and no automatic provider polling. Thus even counting both current and hourly field lists, the request has nine variable slots, below the provider's more-than-ten-variable accounting threshold. See [Open-Meteo documentation](https://open-meteo.com/en/docs) and [call accounting](https://open-meteo.com/en/pricing), checked October 9, 2026.

Technical access succeeded. The repository does not establish the production site's commercial-access arrangement or actual traffic budget. Verify that existing arrangement before release; no service was purchased and no credentials or account configuration were changed. New text/illustrations are authored here; linked provider/licence and scientific attribution is shown on the page.

## Review locally

From this implementation checkout: `npx next dev --webpack --hostname 127.0.0.1 --port 3016`.

Open [Read your sky](http://localhost:3016/read-your-sky?lat=45.5152&lon=-122.6784&label=Portland%2C+Oregon&tz=America%2FLos_Angeles), or follow **Read your sky** from the local main forecast. Weather changes over time; the saved [desktop](read-your-sky-previews/desktop.jpg) and [mobile](read-your-sky-previews/mobile.jpg) images capture the reviewed moment.

Local release validation and the two-axis code review are complete. The PR must satisfy the normal CI/security and preview gates before merge. Production release is not part of this authorization.
