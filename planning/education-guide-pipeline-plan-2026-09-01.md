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
| PR 1 pipeline hardening | in progress (this branch). First Opus 5 dry run hit the 16K ceiling thinking at default effort; now `medium` effort (`EDUCATION_EFFORT`) with a 32K ceiling |
| PR 2 catalog and briefs | not started |
| PR 3 SEO | not started |
| Web Analytics toggle | not done — needs the dashboard |
| Anticyclones re-run | blocked on PR 1 |
