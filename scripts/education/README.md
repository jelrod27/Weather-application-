# Education Guide generator

Drafts one long-form Entry Guide into `content/education/`, gates it, and leaves it
for review on a PR. The design decisions it implements are in
`planning/education-hub-direction.md` and `planning/adr/0001`–`0003`; the plan for
finishing the queue is `planning/education-guide-pipeline-plan-2026-09-01.md`.

## What it will and will not write

The queue is the **29 Entries already published as Guide URLs**, not the 76 Entries in
the databases. Asking for one of the other 47 is refused with a pointer to ADR-0001 —
those are Atlas rows, and coverage for them comes from Collection Guides rather than a
page each. The queue empties at 29 and does not refill.

Only kinds whose detail route actually loads `getGuideContent` are generated for. All
three kinds do today — `cloud`, `weather-system` and `phenomenon` — but the guard stays:
a Guide written for a kind whose route ignores it would sit unread, so the generator
refuses and says which route to wire. `KINDS_WITH_GUIDE_RENDERING` in `queue.ts` records
the list and a test reads the routes to keep it honest.

## Run locally

```bash
# What is done, what is queued, what is not wired yet
npm run education:guide -- --list

# Next queued Entry whose route renders Guides
ANTHROPIC_API_KEY=sk-... npm run education:guide -- --next

# A specific Entry, without writing anything
ANTHROPIC_API_KEY=sk-... npm run education:guide -- --slug cirrus --dry-run
```

`EDUCATION_MODEL` selects the model and defaults to `claude-opus-5`. It is deliberately
separate from the newsletter's `NEWSLETTER_MODEL`: the pipelines share `callAnthropic`,
but a Guide's judge has to find verbatim spans in some 30,000 characters of source text,
which repays a stronger model than a dated post does. `model.ts` is the one place the
model, its reasoning effort, its timeout and its token ceiling are chosen. The shared
wrapper withholds `temperature` from models that reject it (the Claude 5 family, Opus 4.7
and later) and fails the call on a `max_tokens` or `refusal` stop rather than returning a
truncated body.

Effort is `medium` by default (`EDUCATION_EFFORT` overrides: `low`, `medium`, `high`,
`xhigh`, `max`). `xhigh` is refused for `claude-sonnet-4-6`, which does not accept it.
At the model's own default the first Opus 5 dry run spent four minutes and the whole
16,000-token ceiling thinking about a 900-word draft and never reached the prose; the
writing here is grounded in supplied text rather than derived, and medium leaves the
32,000-token ceiling with room to spare. The GitHub Action maps both `EDUCATION_MODEL`
and `EDUCATION_EFFORT` from repository variables; without that mapping the runner would
always use the code defaults.

## Layout

```
scripts/education/
  index.ts             # CLI: --list, --next, --slug, --kind, --dry-run
  queue.ts             # the eligible 29, the queue, the render-path guard
  topics.ts            # per-Entry source tags, pinned sources and focus line
  sources.ts           # NOAA/NWS source catalog, cited by id only; tag-weighted ranking
  grounding.ts         # fetch + HTML-to-text; also backs validate-sources
  brief.ts             # the Entry's physical fields, as prompt context
  voice.ts             # newsletter voice spec plus the Guide delta
  model.ts             # the model, its timeout and its token ceiling
  draft.ts             # the two model calls: prose (or an in-place revision), then metadata
  gates.ts             # length, shape, register, containment
  generate.ts          # ground -> draft -> gate -> fact-check -> retry -> finalize
  publish.ts           # frontmatter writer
  validate-guide.ts    # post-write gate, run by the workflow
  validate-sources.ts  # npm run validate:education-sources
```

## How a run works

1. **Ground.** `topics.ts` gives the Entry its subject tags and any pinned source ids;
   `sources.ts` ranks the catalog against the tags, weighting them in the order the brief
   lists them, and puts the pins first; `grounding.ts` fetches the top 12. Only pages that
   actually came back are citable, and fewer than 3 fails the run rather than drafting
   from recall — the line the newsletter takes when Iowa Mesonet returns empty.
2. **Draft.** The voice spec, the cumulonimbus Guide as the standard, and the fetched
   source text go in as cached system blocks. The model returns prose only.
3. **Gate.** `gates.ts` checks length, section count, register, and containment: no
   links, URLs, images, raw HTML or code fences. Failures go back as a correction
   alongside the draft they refer to, and the model revises that draft in place.
4. **Fact-check.** `fact-check.ts` asks whether the prose says only what the sources
   say — the one thing no other gate checks. See below. A number or agency claim the
   sources do not state goes back the same way, as an in-place edit.
5. **Retry budget.** Steps 3 and 4 share four retries. A draft that still fails after
   them raises — a Guide is evergreen and indexed, so publishing a broken one is worse
   than failing the run.
6. **Finalize.** A second call writes the search summary, picks which offered sources
   the prose rests on, and places diagrams by registry id with a verbatim anchor. Every
   anchor is resolved through `buildGuideSegments`, the same function the page uses, so
   a diagram cannot be promised in frontmatter and silently dropped at render.
7. **Publish.** `publish.ts` resolves source ids to citations and writes the file.

## The fact check, and why the judge is not trusted

Every other gate checks form. A confident wrong number clears all of them, on a page
that lists NWS and NOAA underneath it — which turns a mistake into a misattribution.

Asking a model "is this supported?" and believing the yes is a rubber stamp. So a claim
counts as supported only when the judge returns a **verbatim span from the fetched
source**, and that span is then found in the source text by exact match in code. A
fabricated justification fails mechanically rather than persuasively — the same move the
diagram registry and the source catalog make elsewhere: the model names something, and
code resolves it.

Risk is graded in code, not by the judge. An unsupported sentence about storms needing
moisture is a wording problem. An unsupported number, or an unsupported claim naming an
agency, is not: those go back to the writer as corrections, drawing on the same retry
budget as the prose gates, and if they survive it the run raises `UnsupportedClaimError`
rather than shipping. Everything else is recorded — in `fact_check_*` frontmatter on the
page itself, and as a checklist in the PR body, so a reviewer reads flagged lines instead
of 900 words.

Retries edit the previous draft rather than starting over. The check rests on verbatim
quotes, and a fresh draft at writing temperature re-rolls every sentence: claims that had
verified come back reworded and unverified, next to new ones. The Depressions run of
2026-09-01 went from seven unsupported claims to six different ones that way.

The judge also returns the draft sentence each claim came from. The unexamined-number
check reads figures from that sentence as well as from the judge's restatement, so a
judge that rounds 1013.2 to "about 1013" no longer flags the sentence as never examined.

Grounding is narrowed to `<main>` for this reason too. Every noaa.gov article opens with
the same banner and menu, and that chrome is byte-identical across pages — a quote drawn
from it would verify against any source, letting a claim be "grounded" in a navigation
menu. Narrowing also cut the average page from ~7,500 to ~3,200 characters.

## Why the model never writes a URL

Generated prose is untrusted (ADR-0002). It references sources by catalog id and
diagrams by registry id, and the pipeline resolves both — the containment `images.ts`
and `image-selection.ts` give the newsletter's imagery. A plausible-looking
`weather.gov/...` URL that does not exist cannot reach a published page, and the body
gate rejects links outright.

## `reviewed` is not written by the generator

That field means "prose checked against its sources by a person". The page prints it as
"Checked against sources <date>" and it feeds `dateModified` in the Guide's JSON-LD.
Add it by hand on the PR once the prose has been read against the citations.

## Curating the source catalog

`sources.ts` holds NOAA JetStream pages, NWS safety and office explainers, SPC/NHC
references and NWS Glossary entries, each tagged by subject. To add one, append an entry,
tag it, and run:

```bash
npm run validate:education-sources
```

That goes through the generator's own fetch path, so passing means what the generator
needs: the page resolves, it carries enough text to ground a claim, and it is not an NWS
Glossary miss — those answer HTTP 200 with "there are no matches for", which a status
check alone would happily accept.

`www.noaa.gov` sits behind CloudFront, whose bot rule keys on the first User-Agent
product token — a descriptive UA is refused on every JetStream page while `curl/...` is
served. NOAA's robots.txt does not disallow `/jetstream/`, so `grounding.ts` leads with
the token the filter accepts and carries our identity and contact address behind it.
Keep both halves.

`www.nssl.noaa.gov` is on the allowed-host list but nothing is catalogued from it: the
server sends only its leaf certificate, so `curl` and Node's `fetch` fail verification
(browsers pass because they fetch the missing intermediate themselves). That is
server-side and would fail in CI too. Re-check with `openssl s_client` before adding an
NSSL page.

Ranking weights halve down a brief's tag list, so each tag outweighs every tag after it
combined: a source carrying only the first tag cannot be overtaken by one carrying all
the others. The fetched text is capped at 12,000 characters; a page whose relevant
passage sits past that (the longer Weather-Ready Nation kit pages) is not a usable
source even though it resolves.

### Pinned sources

A focus line that depends on one page — the Saffir-Simpson scale, a subsidence
inversion — names it in the brief's `pin` list in `topics.ts`, and it is offered ahead of
the ranked candidates. Pins are catalog ids; one that is not in the catalog throws. Tag
ranking still carries the rest, so pin the page the brief cannot do without, not
everything relevant.

### Briefs may only ask for what the catalog can cite

The sources are federal reference pages about mechanism. A focus line asking how
deepening is measured in millibars per hour, or when sprites were first photographed,
commissions precisely the claim the fact check then refuses — the Depressions run of
2026-09-01 failed that way. A test rejects any focus line carrying a year; keep the rest
of a brief to mechanism the catalog actually describes.

## Failure modes

- **Fewer than 3 sources resolved** → `NoGroundingError`. Re-run when the NOAA hosts are
  reachable. Do not draft without them.
- **A pinned id not in the catalog** → `UnknownPinnedSourceError`. Fix the brief.
- **Gates still failing after the retry budget** → `GuideGateError`, naming every check.
  Nothing is written.
- **A number or agency claim the sources do not state** → `UnsupportedClaimError` once
  the retry budget is spent, naming each claim. Nothing is written. Usually means the
  source catalog is missing a page the Guide needs; add it (or pin it) and re-run rather
  than loosening the gate.
- **Entry not in the eligible 29** → `IneligibleEntryError` pointing at ADR-0001.
- **No brief for the Entry** → add its tags and focus line to `topics.ts`.
- **The model stopped at `max_tokens` or declined** → the wrapper throws naming the stop.
  Nothing is written.
- **Anthropic 429 / 5xx** → the shared wrapper bubbles the status up. Re-run after a
  cool-down.
