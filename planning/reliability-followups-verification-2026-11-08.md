# Reliability and accuracy follow-ups — local release evidence

Base: `661081d8d001104feb931ba4e60ce56ff30175a3`. Branch: `codex/reliability-followups-2026-11-08`. The user requested five separate area commits, local testing and repairs before one GitHub PR. No merge, production database mutation, provider purchase, paid trial or hook bypass is part of this work.

## Areas and disposition

| Area | Result | Detailed evidence |
| --- | --- | --- |
| Dependency security / CodeQL | Patched the high development-tooling `body-parser` advisory and moderate modern `glob`/`minimatch` advisories without downgrading the application/toolchain. CodeQL #332 is documented as an intended remote-content-to-Markdown flow, with real filesystem confinement tests. | [Security verification](./security-followups-verification-2026-11-08.md) |
| Alerts / radar | Confirmed PR #704 already batches alert-state reads; no redundant batching rewrite. Missing radar images return honest uncached 404s and diagnostic breadcrumbs; unexpected failures remain reportable, including bounded stale fallback. | [Radar/alert verification](./radar-alert-followups-verification-2026-11-08.md) |
| Newsletter | Deterministic calendar/clock context, bounded consistency checks, correction retries and a hard failure gate before publishing; edited posts with refreshed receipts cannot bypass it. This is not a general factual verifier. | [Temporal verification](./newsletter-temporal-verification-2026-11-08.md) |
| Space Weather | Correct monthly/smoothed sunspot semantics, bulletin classification, truthful unavailable/stale/future handling, strict source/time joins, actual chart coverage/refresh, real imagery identities/manifests, image recovery, and accessible navigation. | [Accuracy](./space-weather-accuracy-verification-2026-11-08.md), [imagery](./space-weather-imagery-verification-2026-11-08.md) |
| Cloud-type research | Completed issue #666's bounded source investigation with a **no-go for production**. The short retained DWD sample and unresolved accuracy/rights gates do not support launch. Existing cloud-cover UI is unchanged. | [Source audit](./research/cloud-types-source-audit-2026-11-08.md), [v2 decision](./prds/PRD-read-your-sky-cloud-types.md) |

## Final local checks

| Check | Result |
| --- | --- |
| Clean baseline Jest | 315 suites / 2,666 tests passed |
| Final reviewed Jest, `TMPDIR=/private/tmp npm test -- --runInBand` | **324 suites / 2,769 tests passed** |
| Standalone cloud research unittest suite | **11 passed**, including original multi-subset BUFR fixtures and full denominators |
| `npm run typecheck` and `npm run typecheck:tests` | Passed, including explicit new/touched test-project inclusions |
| `npm run lint` | Passed; zero errors and 89 existing warnings |
| Normally ignored newsletter scripts, forced scoped lint | Zero errors; ten existing console-statement warnings |
| `npm run knip` | Passed; existing configuration hints only |
| Final `npm run build` | Passed |
| Full Playwright against the intended local development harness | **376 passed / 4 existing skips**, Chromium and Firefox, 380 scenarios in 32 files |
| Production-build affected browser checks | All 14 Space Weather scenarios passed; Firefox desktop/mobile news-image load/error cases passed after native-lazy-load synchronization |
| Lighthouse desktop, five runs | Passed; median performance **100**, accessibility 100, best practices 92, SEO 100 |
| Lighthouse mobile, three runs per URL | Completed; median performance **88 forecast / 88 radar / 89 sky** |
| Fresh npm audit before push | **Zero high, moderate or critical**; five affected package entries for one unpatched low `deepmerge` advisory |
| Independent area reviews and final whole-branch review | Clear after the corrections below |
| `git diff --check` and normal commit hooks | Passed |

Browser runs used ports 3107 (production) and 3108 (development), preserving existing default-port servers. Lighthouse used the repository's thresholds and run counts, with only local host/port and artifact directories adapted. Desktop and mobile ran sequentially. Mobile's only assertion warning was sky SEO 66 because `app/read-your-sky/page.tsx` intentionally specifies `index: false`; performance scores remained above the existing thresholds. Reports and logs are local under `/private/tmp/weather-followups/`.

The four existing browser skips are the real-session login redirect and the profile save-error mock case, each in both browsers. No real account, production notification delivery or Sentry source-map upload was exercised. The production-server exploratory full run correctly rejected mock authentication; authenticated UI fixtures were subsequently run in the repository's intended nonproduction harness, without changing the production auth boundary.

## Repairs made before pushing

- Unit and route regressions were observed failing before the corresponding behavior changes.
- Review caught an adversarial test fixture crossing a TypeScript topic union; the test now documents that one runtime-input boundary, leaving production types unchanged.
- Newsletter review reproduced three edge cases: an earlier duplicate source-coverage heading hiding later prose, a count qualifier mistaken for a clock qualifier, and explicit years on both endpoints of a cross-year range. All have failing-then-passing regressions. Only the exact audit-bound trailing disclosure is excluded.
- Space Weather review added mutation-tested same-source/different-instant wind joins and equivalent UTC forms. Whole-branch review reproduced active coronagraph-camera reselection erasing manual frames; a guard now preserves frames, position and controls.
- Research review reproduced contradictory clear/type and clear/positive-cover classifications. They now abstain as unclassified. All 1,515 captured reports retain identical mapped results, so the measured summary did not change.
- Browser testing corrected the active-tab locator, a post-reload hydration wait, and native lazy-image scrolling in Firefox. All original outcome assertions remain; no timeout increases or synthetic image-error callbacks were used.

Next.js dev normalized the generated warning heading in `AGENTS.md` from level one to level two. Its instruction text and generated block are preserved. The final production build restored production type imports in `next-env.d.ts`.

## Live local API smoke and limits

After the final production build, live local requests returned HTTP 200 for sunspots, Kp, scales, wind, X-ray, C2 coronagraph and the solar-image proxy. The monthly sunspot response identified October 2026; C2 returned 12 actual manifest frames; the solar image was PNG with NOAA SUVI / 195 Å identity. An initial scales request was unavailable under the freshness guard; subsequent fresh requests recovered to 200. These are point-in-time checks, not an upstream availability guarantee. Existing oversized RTSW cache warnings and framework deprecation warnings remain outside this accuracy correction.

The remaining `deepmerge` advisory has no patched release and remains visible. CodeQL #332 remains open for explicit repository disposition; no blanket suppression was added. Research source retention prevents reproducing a full historical input batch after it expires unless a matching raw copy is retained; committed fixtures and offline aggregation remain reproducible. Commercial access, source rights/costs, meteorological review and classifier validation remain launch gates. No production scientific cloud-name feature was enabled.
