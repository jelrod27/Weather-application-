# Education Guides — pipeline review and plan (2026-09-01)

Outcome of a review session after PR #567 merged. Direction and hard decisions are in
`planning/education-hub-direction.md` and `planning/adr/0001`–`0003`; this note carries the
state of the queue, what the review found, and the plan being executed. **If a later session is
unsure what to do next on the Guides, read the status table at the bottom first.**

## State when the review ran

| | |
|---|---|
| Guides live | 3 of 29: Cumulonimbus, Cirrus, Cyclones |
| Queue remaining | 26: 15 weather systems, 5 clouds, 6 phenomena |
| Runs on 2026-09-01 | Anticyclones failed on 1 claim, Depressions on 6; both before #567 merged |
| Analytics | Vercel Web Analytics disabled at the project level (API returns 404); component is mounted |

Both failures were upstream of the model. Anticyclones died on a 500 mb ridge claim with no ridge
source in scope; Depressions was commissioned by its own brief to state a millibars-per-hour rate
no source gives. #567 rewrote that brief and tagged Basic Wave Patterns with `pressure`.

## Assessment

What is being built: a 29-page evergreen reference section where every published number has
been matched, in code, to a verbatim quote from a NOAA or NWS page, and a person has then read
it. The design is sound — sources and diagrams by id, a fact check that refuses to trust the
judge, a queue that cannot grow past 29, a validator that re-checks through the site's own
loader. #567 is the evidence: pre-gate Cirrus shipped seven ungrounded numbers; post-gate
Cyclones had three wording issues out of 22 claims, none numeric.

### Pipeline: the weak point is grounding breadth, not the gate

- **Eight candidates, ties by catalog order.** Anticyclones was never offered Origin of Wind
  (the only page explaining subsidence and fair weather) or the inversion glossary entry its
  winter-fog focus needs. Tropical Cyclones was offered Derechos, Bow Echoes and Wind Damage but
  not the Saffir-Simpson page or Tropical Cyclone Structure that its brief names. Verified by
  running `sourcesForTags` against the briefs.
- **Five briefs cannot be grounded from the catalog at all.** No offered source mentions
  sprites, ball lightning, thundersnow, the polar vortex or atmospheric rivers. Found live:
  `https://www.weather.gov/safety/cold-polar-vortex` and
  `https://www.noaa.gov/stories/what-are-atmospheric-rivers`. NSSL pages (`www.nssl.noaa.gov`,
  an allowed host) that likely cover sprites and thundersnow were unreachable from the review
  sandbox; check from a workstation.
- **The fact retry was a fresh draft at temperature 0.7.** Depressions went from seven
  unsupported claims to six *different* ones. An in-place edit converges; a re-roll does not.
- **The writer invents illustrative figures** ("10 mb over 200 km", "40 mph for 36 hours").
  The gate rightly treats every digit as a claim.
- **Briefs still commission uncitable specifics.** Sprites asked for "1989", Tropical Cyclones
  for "26°C", Microbursts for aviation history — the class #567 fixed for Depressions.
- **Docs were stale.** README and CLAUDE.md said only clouds render Guides; all three kinds do
  since #562.

### SEO: under-served

- **No measurement.** Web Analytics is off at the project level. Enabling is a dashboard toggle
  (Project → Analytics); no MCP tool does it. Search Console is not integrated in the repo.
- **Each Guide has one crawlable inbound link**, from `/education`. The weather-systems atlas
  link sits inside a click-to-expand card; the cloud and phenomena atlases have no Guide links.
  Guide bodies carry no links by design and the template has no related-Guides block.
- **Sitemap lastmod is synthetic** (first of the month for every education URL), so #567's real
  edits to two live pages signalled nothing.
- **Article schema lacks `datePublished` and `image`.** `generated` is in frontmatter but the
  loader drops it. `BreadcrumbList` exists on glossary and city pages, not Guides.
- **The 26 unfinished pages are the section's quality signal** — uppercase titles, truncated
  data-field descriptions. Under ADR-0001's own reasoning, finishing them is the biggest lever.

## Plan

### PR 1 — pipeline hardening (`education/pipeline-hardening`)

1. Candidates 8 → 12; `sourcesForTags` weights a source by the *position* of the matched tag in
   the brief (first tag heaviest), so a first-tag match outranks a stray last-tag match.
2. Optional `pin: string[]` per brief in `topics.ts`; pinned ids are always offered. A test
   asserts every pin resolves in the catalog.
3. One retry loop over prose gates *and* the fact check, budget of 4, every retry an in-place
   edit of the previous draft (previous body + correction in the prompt; low temperature where
   the model accepts one).
4. Voice delta: no illustrative or hypothetical numbers — every figure is a sourced measurement.
5. The judge returns the verbatim draft sentence per claim; the unexamined-number check reads
   figures from that sentence too, so a rounded paraphrase no longer flags the sentence.
6. Test: no focus line contains a year (dated events are uncitable).
7. Model: `EDUCATION_MODEL`, default `claude-opus-5`, separate from `NEWSLETTER_MODEL`. The
   shared wrapper sends `temperature` only to models that accept it (Opus 5 / Sonnet 5 / Opus
   4.7+ reject sampling parameters with a 400), takes a per-call timeout, and fails on
   `stop_reason` `max_tokens` or `refusal` instead of returning a truncated or empty body.
   Server-side refusal fallbacks are deliberately *not* enabled: a fallback would silently swap
   the model that wrote a Guide while `model_used` in frontmatter names another.
8. Docs: README and CLAUDE.md corrected; workflow env switched to `EDUCATION_MODEL`.

### PR 2 — catalog and brief audit

Add the polar vortex and atmospheric rivers pages; verify NSSL candidates locally and add what
resolves (`npm run validate:education-sources`); rewrite the sprites, tropical-cyclones,
microbursts, ball-lightning and thundersnow focus lines to what the sources can carry; add pins.

Findings from the workstation check (`education/catalog-brief-audit`):

- **NSSL is not citable from this pipeline.** `www.nssl.noaa.gov` serves only its leaf
  certificate (issuer Sectigo DV R36, no intermediate in the chain), so `curl` and Node's `fetch`
  both fail verification; browsers pass because they fetch the missing intermediate themselves.
  This is server-side, so GitHub Actions would fail the same way. The host stays on the allow
  list; nothing is catalogued from it until NOAA fixes the chain.
- **Sprites** are covered by JetStream's *Positive and Negative Side of Lightning* (altitudes,
  positive strokes, elves). **Ball lightning** appears on exactly one NWS page on an allowed
  host, the Weather-Ready Nation lightning-types kit (`/wrn/summer-lightning-sm`); the passage
  sits at ~8.7K characters, inside the 12K text budget. The sibling kit pages carry the same text
  past the cut and are not catalogued.
- **Thundersnow** has no NWS topic page. Three NWS office write-ups carry the mechanism
  (El Paso on conditional symmetric instability, New York on elevated instability and steep
  mid-level lapse rates, Chicago on snowfall rates with lightning). The "muffled thunder" line
  was dropped from the focus — no source explains it.
- **Microbursts**: the Birmingham and Amarillo office pages plus the *dry* and *wet microburst*
  glossary entries. The aviation-history line was dropped.
- **Tropical Cyclones**: the brief no longer names 26°C; JetStream gives the threshold in
  Fahrenheit, and the Celsius figure commissioned a conversion the fact check could not verify.
  Added the NHC storm-surge overview and the *tropical cyclone*, *eye*, *storm surge* glossary
  entries.
- **Polar Vortex**: the NWS safety explainer plus NWS Bismarck's sudden-stratospheric-warming
  page (stratospheric vs tropospheric vortex, wave breaking, wind reversal, displacement or split).
- `sourcesForTags` now halves weights down the tag list so each tag outweighs all later tags
  combined; with linear weights the atmospheric-rivers page (`ocean` + `flood`) tied a
  `tropical`-only glossary entry and won on catalog order.
- `htmlToText` decodes `&ndash;`, `&mdash;`, curly quotes, `&hellip;` and `&deg;` — office pages
  use them, and `15&ndash;50 cm` left encoded cannot be matched by a judge quoting "15–50 cm".

### PR 3 — SEO (independent of 1 and 2)

Enable Web Analytics (dashboard). Move topic tags into `lib/education/` so the page can render a
code-generated Related Guides block from shared tags (keeps ADR-0002: the model still writes no
links). Server-render Guide links on the three atlas pages. Add `datePublished`, `image` and
`BreadcrumbList` to the Guide schema. Drive sitemap `lastModified` from `reviewed`/`generated`.

### Then dispatch

Anticyclones, Depressions, the remaining weather systems, then clouds, then phenomena last
(they depend on PR 2). About two a day; each needs a human read for `reviewed:`.

## Status

| Step | State |
|---|---|
| PR 1 pipeline hardening | merged (#568). First Opus 5 dry run hit the 16K ceiling thinking at default effort; now `medium` effort (`EDUCATION_EFFORT`) with a 32K ceiling |
| PR 2 catalog and briefs | in progress (`education/catalog-brief-audit`). Catalog 98 → 114 entries, all resolving; seven briefs rewritten or pinned; NSSL unreachable (broken TLS chain, see above) |
| PR 3 SEO | not started |
| Web Analytics toggle | not done — needs the dashboard |
| Anticyclones re-run | unblocked by PR 1; not yet run |
