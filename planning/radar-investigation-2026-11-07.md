# Radar precipitation investigation — November 7, 2026

## Assessment

The claim that precipitation is currently broken everywhere is not supported. Live production radar rendered precipitation in the Great Lakes region, Toronto, and London, including a phone viewport and maximum map zoom. The user subsequently confirmed they could see precipitation.

There is a real intermittent failure mode, however: unavailable precipitation images can leave a normal-looking basemap and timeline without any error notice. Production logs independently confirm RainViewer tile 404s. We cannot tie those historical failures to the user's original observation because its location, timestamp, and network trace were not captured.

**Disposition:** no confirmed recent-release regression; confirmed upstream tile failures and a client error-handling gap. No production code changes or deployment were made.

## Production evidence

- Investigated `https://www.16bitweather.co/radar` on November 7, around 8:00–8:05 a.m. Pacific.
- The production alias resolved to deployment `dpl_DQgKNLU9z5vX3pbvEZcfpFupzBoj`, commit `c49f6c116060985526eacd31fa331a4b6c2243b2`.
- `/api/radar/metadata?lat=41.8781&lon=-87.6298` returned HTTP 200 with 13 actual manifest frames. Its generated timestamp was `2026-11-07T15:55:27Z`, with the newest frame at `15:50Z`.
- A sampled proxy tile returned a 512×512 PNG containing 26,777 nontransparent pixels. The precipitation canvas also contained nontransparent pixels and visibly showed weather echoes. This verifies image content and drawing, beyond HTTP success.
- Vercel's radar error cluster reported upstream `RainViewer tile fetch failed: 404`, with a first-seen date of September 14 and a last-seen time of November 5 at 5:34 p.m. Pacific. Its reported count of 510 is cluster metadata, not an established seven-day error rate or count of affected sessions.
- A narrower runtime-log query verified actual failures on the current deployment at `2026-11-06T01:34:11–18Z`, including `/api/radar/tile/v2/radar/e4316d5d698b/512/4/1/7/2/1_1.png`. Multiple frame hashes and tile coordinates failed. The upstream 404 reason is unresolved: the logs do not establish expired frame paths versus temporary upstream unavailability.
- A current 24-hour radar text search returned no matches; an initial seven-day individual-log query timed out. The successful narrow historical query is the evidence for the historical failures. Absence of matches is not proof of zero errors.

## Browser experiments

Live probes used Chromium against production without replacing weather metadata or successful tile content. Counts below are nontransparent precipitation-canvas pixels, not precipitation intensity or geographic coverage measurements.

| Scenario | Result |
| --- | --- |
| Great Lakes / Toronto, zoom 5, normal autoplay | 50 samples at 200 ms intervals; no blank samples after the canvas appeared; 78 HTTP 200 tile responses |
| Same autoplay, adding 900 ms before tile requests continued | Four initial blank samples, then precipitation remained visible; 78 HTTP 200 responses |
| Toronto, map zoom 12, paused | 693,681 pixels; successful native-resolution tile overzoom |
| Toronto, 390×844 phone viewport, paused | 35,092 pixels; six successful tile responses |
| London, zoom 5, paused | 11,702 pixels; four successful tile responses |
| Controlled tile failure, otherwise live production page | Zero precipitation pixels; no unavailable/delayed message; timeline still offered 13 frames |
| Controlled tile service restored while paused | Still zero pixels and zero new tile requests during the following 1.5 seconds |
| Playback started after restoring tile service | Precipitation returned, with 58,410 pixels in the sampled frame |

The failure experiment intercepted only `/api/radar/tile/**`, returning HTTP 502 JSON to match the proxy's response when upstream fetching fails without a cached fallback. This changed only the test browser's responses. It did not cause production server errors or modify the live service.

The short recovery probe does not prove a session remains empty indefinitely: a later manifest poll, new frame, or reload can trigger requests. It establishes that paused radar does not immediately recover by itself when tile service returns.

## Why failure can look like dry weather

1. The metadata API supplies a valid timeline independently of individual precipitation images.
2. `app/api/radar/tile/[...path]/route.ts` throws on upstream non-200 responses. It serves a bounded cached fallback when available, otherwise logs the error and returns HTTP 502.
3. `hooks/useRadarOverlayLoader.ts` creates the precipitation XYZ source without tile-load error state or explicit retry handling. Its `metadataError` concerns the metadata fetch, not image loading.
4. `components/radar-v2/radar-shell.tsx` renders its unavailable/delayed notices from `metadataError`. A successful manifest with failed images therefore leaves normal controls without a warning.

The service worker does not intercept fetches. No radar CSP violations or page JavaScript exceptions occurred in the successful production probes. Those observations narrow the tested cases; they do not rule out every device or network condition.

## Release investigation

- Compared the local October 23 checkout (`ec20d0a`) with the actual production commit using GitHub's compare API. Their radar hooks, tile proxy, metadata pipeline, and radar components do not differ in that comparison. The branches diverge in unrelated city-guide work.
- Production uses Next.js `^16.4.3`, OpenLayers `^10.11.0`, and React `^19.3.1`; local package declarations use Next.js `^16.4.2` and the same OpenLayers/React declarations. Local automated tests are therefore not a byte-for-byte production build test. The live browser experiments exercised production directly.
- The same general tile-source reuse and metadata-only error presentation already existed in radar v2's June 26 release (`b82404f`, PR #449). The September accuracy update (`7587925`, PR #618) improved metadata resilience but did not add tile-failure UI handling.
- Historical error metadata predates the latest October/November releases. This supports treating silent tile failure as an existing reliability gap; it does not establish the date or cause of the user's original symptom.
- No rollback is supported by the available evidence. A dependency regression has not been demonstrated by a controlled before/after comparison.

## Verification and testing gap

- `npm test -- --runInBand radar rainviewer useRadarOverlayLoader`: **17 suites, 54 tests passed**.
- `npx playwright test tests/e2e/radar.spec.ts --project=chromium --workers=2 --reporter=line`: **14 tests passed** against the local dev server.
- Existing E2E tests stub tile responses and assert map-container visibility, controls, and URL behavior. They do not assert precipitation pixels or tile-failure notices. Passing them does not exclude this failure mode.
- No full application suite, production build, Firefox, Safari, or Lighthouse run: this was a radar investigation with no application code changes. Live production probes, targeted Jest, and targeted Chromium E2E were the relevant checks.

## Focused follow-ups

1. Add tile-load health handling so an image failure is distinguishable from an empty successful image. Do not infer failure merely from transparent pixels: dry weather is valid.
2. Add bounded retry/recovery for failed images while paused, and consider a fresh manifest fetch when repeated frame-path 404s occur. Preserve truthful frame timestamps and avoid unbounded stale imagery.
3. Add deterministic browser coverage with visible precipitation fixtures and controlled tile errors/recovery. Assert the drawn overlay and the failure notice.
4. If the symptom returns, capture the radar URL, Pacific timestamp, selected frame, and tile HTTP statuses before reloading. That would allow matching the user's session to server evidence.

RainViewer's [current API documentation](https://www.rainviewer.com/api/weather-maps-api.html), retrieved during this investigation, confirms the manifest path contract, two-hour history at ten-minute intervals, and maximum native tile zoom of 7. The current implementation follows that contract in the tested requests.

## Authorized follow-up: tile recovery implementation

Implemented locally after the investigation, at the user's request. No commit, push, or deployment was performed.

- Precipitation image-load failures now show an accessible status notice while recovery is pending and a reload message when retries are exhausted. Partial image failures remain visible even when other tiles succeed. Valid transparent images remain successful dry-weather data.
- Each tracked failed logical tile gets at most two automatic retries, after 1 and 2 seconds. Retry deadlines and budgets survive animation frame changes, so uninterrupted playback can recover. Retry requests use distinct query strings to avoid Firefox reusing failed image decode results; frame identity and proxy cache keys remain unchanged.
- Pending retries are canceled outside the active frame, zoom, and viewport, when precipitation is hidden, and on React unmount. Failure tracking is capped at 512 entries; replacement image requests retain the logical tile's retry budget.
- Browser tests draw deterministic precipitation PNGs through real OpenLayers canvases and assert their colored pixels, rather than accepting map-container visibility. Coverage includes desktop/phone rendering, corrupt-image and HTTP-error recovery while paused, uninterrupted autoplay, persistent partial failures, exhausted retry budgets, layer toggles, frame/zoom changes, transparent imagery, and client-side navigation cleanup.

Files changed or added for implementation:

- `lib/radar/radar-tile-recovery.ts`
- `hooks/useRadarTileHealth.ts`
- `hooks/useRadarOverlayLoader.ts`
- `hooks/useRadarController.ts`
- `components/radar-v2/radar-shell.tsx`
- `__tests__/radar-tile-recovery.test.ts`
- `__tests__/radar-shell-status.test.tsx`
- `tests/e2e/radar-tile-rendering.spec.ts`
- `tsconfig.tests.json`
- This investigation/verification record.

Final verification:

- `npm test -- --runInBand`: 298 suites / 2,488 tests passed.
- `npx playwright test tests/e2e/radar-tile-rendering.spec.ts tests/e2e/radar.spec.ts --project=chromium --workers=2 --reporter=line`: 23 passed.
- `npx playwright test tests/e2e/radar-tile-rendering.spec.ts --project=firefox --workers=2 --reporter=line`: 9 passed after fixing failed-image cache reuse. An earlier Firefox run was interrupted by dev-server shutdown; a subsequent run exposed the image-cache issue and was superseded by this passing run.
- `npm run typecheck` and `npm run typecheck:tests`: passed.
- `npm run lint`: zero errors, 89 existing warnings.
- `npm run build`: passed.
- Manual phone-sized inspection confirmed the exhausted-retry message remains readable and playback controls remain visible.
- Independent code review: no outstanding findings after resolving animation, replacement-tile, zoom, and navigation-test issues.

The full application E2E suite, Safari/WebKit, and Lighthouse were not run: verification focused on the radar flow, both configured browser engines, the complete unit suite, and the production build. External RainViewer outages can still prevent imagery from loading; the change makes those failures visible and bounds automatic recovery.
