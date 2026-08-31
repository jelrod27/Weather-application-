# Education Guide generator

Drafts one long-form Entry Guide into `content/education/`, gates it, and leaves it
for review on a PR. The design decisions it implements are in
`planning/education-hub-direction.md` and `planning/adr/0001`–`0003`.

## What it will and will not write

The queue is the **29 Entries already published as Guide URLs**, not the 76 Entries in
the databases. Asking for one of the other 47 is refused with a pointer to ADR-0001 —
those are Atlas rows, and coverage for them comes from Collection Guides rather than a
page each. The queue empties at 29 and does not refill.

Only kinds whose detail route actually loads `getGuideContent` are generated for; today
that is `cloud`. A Guide written for a kind whose route ignores it would sit unread, so
the generator refuses and says which route to wire. `KINDS_WITH_GUIDE_RENDERING` in
`queue.ts` records the list and a test reads the routes to keep it honest.

## Run locally

```bash
# What is done, what is queued, what is not wired yet
npm run education:guide -- --list

# Next queued Entry whose route renders Guides
ANTHROPIC_API_KEY=sk-... npm run education:guide -- --next

# A specific Entry, without writing anything
ANTHROPIC_API_KEY=sk-... npm run education:guide -- --slug cirrus --dry-run
```

`NEWSLETTER_MODEL` selects the model and defaults to `claude-sonnet-4-6` — the same
variable the newsletter uses, because the two pipelines share `callAnthropic`.

## Layout

```
scripts/education/
  index.ts             # CLI: --list, --next, --slug, --kind, --dry-run
  queue.ts             # the eligible 29, the queue, the render-path guard
  topics.ts            # per-Entry source tags and focus line
  sources.ts           # NOAA/NWS source catalog, cited by id only
  grounding.ts         # fetch + HTML-to-text; also backs validate-sources
  brief.ts             # the Entry's physical fields, as prompt context
  voice.ts             # newsletter voice spec plus the Guide delta
  draft.ts             # the two model calls: prose, then metadata
  gates.ts             # length, shape, register, containment
  generate.ts          # ground -> draft -> gate -> retry -> finalize
  publish.ts           # frontmatter writer
  validate-guide.ts    # post-write gate, run by the workflow
  validate-sources.ts  # npm run validate:education-sources
```

## How a run works

1. **Ground.** `topics.ts` gives the Entry its subject tags; `sources.ts` ranks the
   catalog against them; `grounding.ts` fetches the top 8. Only pages that actually
   came back are citable, and fewer than 3 fails the run rather than drafting from
   recall — the line the newsletter takes when Iowa Mesonet returns empty.
2. **Draft.** The voice spec, the cumulonimbus Guide as the standard, and the fetched
   source text go in as cached system blocks. The model returns prose only.
3. **Gate.** `gates.ts` checks length, section count, register, and containment: no
   links, URLs, images, raw HTML or code fences. Failures are fed back as a correction,
   twice. A draft that still fails raises — a Guide is evergreen and indexed, so
   publishing a broken one is worse than failing the run.
4. **Fact-check.** `fact-check.ts` asks whether the prose says only what the sources
   say — the one thing no other gate checks. See below.
5. **Finalize.** A second call writes the search summary, picks which offered sources
   the prose rests on, and places diagrams by registry id with a verbatim anchor. Every
   anchor is resolved through `buildGuideSegments`, the same function the page uses, so
   a diagram cannot be promised in frontmatter and silently dropped at render.
6. **Publish.** `publish.ts` resolves source ids to citations and writes the file.

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
agency, is not: those trigger one retry naming the offending claims, and if they survive
it the run raises `UnsupportedClaimError` rather than shipping. Everything else is
recorded — in `fact_check_*` frontmatter on the page itself, and as a checklist in the
PR body, so a reviewer reads flagged lines instead of 900 words.

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

`sources.ts` holds NOAA JetStream pages, NWS safety pages, SPC/NHC references and NWS
Glossary entries, each tagged by subject. To add one, append an entry, tag it, and run:

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

## Failure modes

- **Fewer than 3 sources resolved** → `NoGroundingError`. Re-run when the NOAA hosts are
  reachable. Do not draft without them.
- **Gates still failing after 2 retries** → `GuideGateError`, naming every check. Nothing
  is written.
- **A number or agency claim the sources do not state** → `UnsupportedClaimError` after
  one retry, naming each claim. Nothing is written. Usually means the source catalog is
  missing a page the Guide needs; add it and re-run rather than loosening the gate.
- **Entry not in the eligible 29** → `IneligibleEntryError` pointing at ADR-0001.
- **No brief for the Entry** → add its tags and focus line to `topics.ts`.
- **Anthropic 429 / 5xx** → the shared wrapper bubbles the status up. Re-run after a
  cool-down.
