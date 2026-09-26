# PR 3: Correct weather education

Approved scope: [remediation sequence](weather-ux-remediation-scope.md), informed by the [UX audit](ux-audit-2026-09-25.md#correct-the-science-before-expanding-the-library). Audience: everyday users first, with depth for enthusiasts.

Baseline: PR 2 merged as `5e19b27f8d1d5aae7c8941b3788eb916117c1944` (#628). Deliver four coherent commits in one PR.

1. **Cloud taxonomy.** Keep exactly the ten WMO genera; classify lenticularis as a species and mamma/asperitas as supplementary features, with appropriate parent genera. Align atlas counts, filters, explanations, the lenticular guide, and FAQ/structured data. Link to the relevant WMO definitions. Keep familiar entry names and URLs.
2. **Solar-flare explanations.** Correct C1 → X1 to 100 times the measured X-ray flux. Explain the band, class multiplier and current reading versus an event's peak. Keep the visible FAQ and its structured data consistent. Distinguish flare radiation, CMEs, and geomagnetic effects without promising aurora or a fixed arrival time. Cite NOAA/NASA.
3. **Claims and attribution.** Review all existing phenomenon cards in `data/fun-facts.ts`, starting with ball lightning. Replace unsupported numerical rates, historical anecdotes, absolute claims, and speculative mechanisms with supportable wording or explicit uncertainty. Supply accessible primary-source links on cards and detail pages, and include citations in their structured data. Label editorial rarity/hazard ratings and playful analogies so they cannot be mistaken for official measurements. Sources must support retained claims; a general reference alone does not validate a specific statistic.
4. **Current product descriptions.** Align Education and About copy with shipped capabilities: RainViewer precipitation composites, current weather providers, forecast/learning tools and existing coverage. Remove promises of Doppler velocity, retired games, and the removed interactive AI subsystem. Preserve the creator's story and current visual identity.

## Verification and review

Use focused regressions for category membership, citation rendering/metadata, and existing filters/guide routes. Do not test every prose sentence. Check touched desktop/mobile journeys, the production build, both TypeScript projects and lint. Validate source destinations and document any unavailable references rather than treating a successful URL response as factual verification.

Use the code-review skill's separate Standards and Spec reviews after implementation, resolve findings, and push/open the PR with normal hooks enabled. CI supplies the broader browser and Lighthouse checks. Babysit the PR; merge only with explicit user approval.

## Boundaries

This is a correction and attribution pass over the named education surfaces, not certification of the entire blog/archive. New lessons, image libraries, general keyboard/mobile redesigns, providers, database changes and broader UI work remain separately scoped. Preserve unrelated local files, including `.agents/`.

## Implementation verification — 2026-09-25

- All four scoped changes implemented; all 25 phenomenon entries reviewed and supplied with sources.
- 76 focused unit tests and six production-mode Chromium checks passed (1280px and 390px). About accordions and the Education radar description also checked in the browser.
- Production build, both TypeScript projects, lint, guide validation and whitespace checks passed. Lint reports existing repository warnings; no lint errors.
- Standards review: two test issues fixed and re-reviewed; no remaining findings. Spec review: no remaining findings.
- Source reachability check: 45 of 51 unique destinations returned HTTP 200. Automated requests received 403s for APS, two USGS pages and two NOAA JetStream pages; NSSL failed to connect. Keep these authoritative references, but do not interpret automated access restrictions as verified reader access. Source content was evaluated separately from HTTP status using available primary pages, papers and indexed official excerpts.
- The full browser matrix and Lighthouse were left to PR CI; local checks focused on the changed flows. Broader cloud-table claims and other long-form articles remain outside this correction pass.

## Local review follow-up — 2026-09-26

- Repeated the separate Standards and Spec reviews against the PR 2 baseline. Both reviews are clear after fixing duplicate Sources sections in the long-form phenomenon template.
- Combined Guide and Entry citations into one list, deduplicated by URL to match structured data. Added rendering regressions for overlapping sources and a Guide with no sources of its own; included the new TSX test in the test type check.
- Both regressions failed before the fix and passed afterward. Nine focused citation/metadata tests, the production build, test type check, and targeted lint passed. The broader browser matrix and Lighthouse remain in PR CI.
