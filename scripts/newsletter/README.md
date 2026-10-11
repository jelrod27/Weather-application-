# Newsletter generator

Generates the 16bitweather.co weekly blog posts on two cadences.

- **Wednesday — topic deep-dive.** Pulls one of 16 topics via weighted-random rotation, finds a current-news angle, writes a 600–900-word piece.
- **Sunday — Rearview + Roadmap.** Recap of past 7 days using real data (Iowa Mesonet, NOAA SPC, NOAA SWPC, USGS) plus seven UTC days of point forecasts for nine named cities. Source coverage and publication rules are defined by [issue #675](https://github.com/jelrod27/Weather-application-/issues/675), phase 2.

See [`planning/prds/PRD-newsletter-redesign.md`](../../planning/prds/PRD-newsletter-redesign.md) for the design.

## Layout

```
scripts/newsletter/
  index.ts                 # CLI entrypoint
  topics.ts                # 16-topic catalog + weighted-random selection
  voice.ts                 # voice spec + forbidden-phrase regex sweep
  state.ts                 # frontmatter-based history queries (12-week lookback)
  images.ts                # 51-entry public-domain image catalog + selectImages
  validate-images.ts       # HEAD/ranged-GET validator for the catalog
  repetition.ts            # Anthropic API wrapper, judge similarity, key-phrase extraction
  news.ts                  # news-angle finder hitting /api/news/rss
  wednesday.ts             # Wednesday topic pipeline
  sunday.ts                # Sunday Rearview + Roadmap pipeline
  publish.ts               # audited complete post / nonpublic partial draft writer
  data/
    mesonet.ts             # Iowa State Mesonet (NWS warnings archive)
    spc-reports.ts         # NOAA SPC daily storm reports
    space-weather.ts       # NOAA SWPC summary
    earthquakes.ts         # USGS FDSN significant/M4.5+ interval queries
    forecast.ts            # Open-Meteo seven UTC days of city point forecasts
```

## Run locally

```bash
# Wednesday topic deep-dive (writes a nonpublic review candidate)
ANTHROPIC_API_KEY=sk-... npx tsx scripts/newsletter/index.ts --cadence wednesday

# Sunday rearview + roadmap
ANTHROPIC_API_KEY=sk-... npx tsx scripts/newsletter/index.ts --cadence sunday

# Dry-run — generates without writing a candidate; preserves run/coverage diagnostics
ANTHROPIC_API_KEY=sk-... npx tsx scripts/newsletter/index.ts --cadence wednesday --dry-run
```

`NEWSLETTER_MODEL` is optional and defaults to `claude-sonnet-4-6`.

## Validate the image catalog

```bash
npm run validate:images
```

Exits non-zero on any non-200 URL. Run after editing `images.ts`.

## Manual workflow dispatch

Both workflows accept a `dry_run` boolean input.

- `gh workflow run newsletter-wednesday.yml` — schedule a real run
- `gh workflow run newsletter-wednesday.yml -f dry_run=true` — dry run only
- `gh workflow run newsletter-sunday.yml -f dry_run=true`

## Inspect run metadata

Every generated post records its run state in YAML frontmatter:

```yaml
cadence: wednesday_topic
topic_slug: volcanoes
topic_title: Volcanoes & Atmospheric Impact
theme: Mid-Atlantic SO2 plume reaches stratosphere
opener_hash: 7d2f9e10
key_phrases:
  - sulfate aerosol blanket
  - VAAC bulletin radius
similarity_max: 0.42
similarity_judge: claude-sonnet-4-6
model_used: claude-sonnet-4-6
images_used:
  - st-helens-eruption-1980
  - eyjafjallajokull-2010
generation_retries: 1
word_count: 742
```

Use `rg -l 'cadence: wednesday_topic' content/blog/*.md` to find all Wednesday posts. The 12-week lookback is computed from the `date` field.

## Failure modes

- **Valid empty archive query** → observed zero within that query scope. HTTP failures, absent payloads, malformed records and missing SPC days remain unknown. No usable Sunday evidence means a fatal run with an audit and no narrative.
- **Image catalog starved** → Wednesday can publish without body images if the topic pool is exhausted; Sunday uses partial relevant lanes. Expand catalog (`scripts/newsletter/images.ts`) when a topic repeatedly falls back to the generated OG hero.
- **Anthropic 429 / 5xx** → wrapper bubbles up the status. Re-run after a cool-down or upgrade rate limits.
- **Voice violations** → up to 2 regenerations. After that, post persists with violations recorded — the next run will see them in the deny list.
- **Similarity > 0.85** → up to 2 regenerations with trigger phrases injected into deny list. Persists either way; the score lands in `similarity_max` for trend monitoring.

## Curating the topic catalog

`topics.ts` holds 16 entries with extended descriptions used as system prompt context. To add a topic, append a slug to `TOPIC_SLUGS`, add the entry to `TOPICS`, and update `TOPIC_NEIGHBORS` in `images.ts` so the image pool can fall back gracefully.

## Curating the image catalog

`images.ts` holds the verified public-domain/attribution-compatible catalog. To add: append an `ImageEntry`, run `npm run validate:images`, fix any 404s. Sources used: NASA SDO, NOAA NESDIS GOES-16, NOAA SWPC, NOAA OPC, NOAA CPC, NOAA SPC, USGS, USDA Drought Monitor, Wikimedia Commons via `Special:FilePath`.

Both newsletter workflows run a hard post gate before opening a PR:

```bash
npx tsx scripts/newsletter/validate-post.ts content/blog/<post>.md --audit
```

The validator rejects placeholder images, disallowed image hosts, `images_used` mismatches, and missing `image_audit` metadata when a generated post embeds catalog images. Sunday also checks for obvious narrative/image mismatches such as solar or drought imagery in a tornado/earthquake-led post.


## Coverage and publication

Each Sunday run uses seven **completed noon-to-noon UTC SPC days**, with an exclusive end. A run before noon uses the previous noon as its end. Mesonet and USGS queries use that same interval. Kp and X-ray samples are filtered to it; missing cadence slots prevent a complete-period peak claim. Forecast dates start at midnight UTC on the run date and cover seven days. These are city point forecasts, not evidence for a regional jet stream, MJO, ridge or trough analysis.

Collectors return validated values plus a source audit. The audit records URL, retrieval time, requested interval, actual contiguous coverage, observation bounds, record count, expected/observed units and reasons for gaps. A valid zero is usable evidence. Missing, malformed, stale and unsupported data never become zero, quiet conditions or a complete weekly ranking. NWS totals here cover only unique TO.W/SV.W/FF.W/MA.W/EW.W events issued in the interval; other polygon products, watches and zone warnings are outside the labeled scope. SPC reports are preliminary reports, not a count of confirmed tornadoes.

`newsletter-output/run.json` distinguishes `complete`, `partial` and `fatal`, plus the generation/validation/ready stage. Complete and partial generation return exit 0; fatal generation or validation returns exit 1. `newsletter-output/coverage.json` survives later model/validation failures. Workflows upload the run report, source audits and nonpublic candidates even on failure. No key is needed for collection/tests; generation still requires the existing Anthropic key.

- **Complete:** writes `content/blog/<post>.md`, a source audit and a content-bound coverage receipt. The workflow opens a normal PR; it never merges automatically.
- **Partial:** writes `content/newsletter-drafts/<id>/<post>.md` and `content/newsletter-audits/<id>.json`. The workflow opens a draft PR. Merging that PR as-is publishes nothing.
- **Fatal:** no evidence-based narrative is generated; the failure report remains an artifact. A later validation failure retains the candidate for inspection but opens no PR.

Wednesday's existing aggregator cannot establish original-source completeness. Its bounded headline sample is marked partial; the curated topic outline permits an evergreen review candidate when headlines fail. Current-event claims require an editor to check the linked originals. This remains a deliberate review gate until the news-source health work can supply stronger evidence.

All new or changed generated public posts must pass the same coverage gate in PR CI. Public loaders exclude unresolved/invalid candidates from listings, direct slug lookup, related posts, RSS, sitemap, education highlights and generation history. `lib/newsletter/legacy-posts.json` contains hashes of pre-gate posts so unchanged historical posts remain visible without editing their frontmatter. It is a fixed compatibility snapshot, not a way to exempt new posts. Changed legacy generated posts require an audit and review; create a candidate and use the same process below.

## Review and promote a partial candidate

1. Read the candidate and its `publication_id` audit. Check source links and exact date windows. Correct unsupported claims in the draft, keeping the generated **Source coverage** disclosure intact. If updating evidence, update the audit and regenerate the disclosure from `coverageDisclosure`; do not turn gaps into complete status without evidence.
2. Create a JSON object mapping **every incomplete source ID** to the disposition taken in the prose. For example:

   ```json
   {
     "swpc-xray": "Retained the available-interval peak, removed the weekly-maximum claim, and disclosed the missing minutes."
   }
   ```

3. Validate and record explicit human review (replace paths/name with the actual candidate, dispositions file and reviewer):

   ```bash
   npx tsx scripts/newsletter/validate-post.ts content/newsletter-drafts/<id>/<post>.md --draft --audit
   npx tsx scripts/newsletter/review.ts record content/newsletter-drafts/<id>/<post>.md --reviewer "Editor name" --acknowledge-limitations --dispositions dispositions.json
   npx tsx scripts/newsletter/review.ts promote content/newsletter-drafts/<id>/<post>.md
   npx tsx scripts/newsletter/validate-post.ts content/blog/<post>.md --audit
   ```

4. Commit the public post, audit and `.review.json` receipt in a reviewed PR. Retain the original audit and reader-visible limitations; promotion does not erase partial coverage. Keep the source candidate for history. The command refuses to overwrite an existing public file. Revisions to already-published posts should be reviewed as candidates, then explicitly replace the public file in the PR with the reviewed bytes.

Approval binds the **entire candidate (body and frontmatter)** and **exact audit**, normalizing only checkout line endings. Changing either requires another review. Review receipts are repository records, not cryptographic authentication of a human identity; branch protection and code review remain the authorization boundary. Image catalog/allow-list/narrative checks, gitleaks and existing secret scoping remain required.

## Provider contracts and offline verification

- [SPC daily report window and preliminary report conventions](https://www.spc.noaa.gov/climo/reports/today.html)
- [NOAA planetary K-index](https://www.swpc.noaa.gov/products/planetary-k-index): three-hour observations; the shared full-series parser supports modern `Kp`/`kp`/`kp_index` objects and legacy array rows. The app continues to request its latest eight samples.
- [IEM API](https://mesonet.agron.iastate.edu/api/1/): `vtec/sbw_interval` includes multiple product types/polygon updates; only the labeled warning types are counted, deduplicated by year/WFO/phenomenon/significance/event ID.
- [USGS FDSN query](https://earthquake.usgs.gov/fdsnws/event/1/): exact bounds, M4.5+ and significance >600 as separate queries; truncation and invalid rows require partial status.
- [Open-Meteo forecast API](https://open-meteo.com/en/docs): explicit UTC dates, Fahrenheit and inches; daily array alignment, ranges and units are validated independently for each city.

Recorded payloads in `__tests__/fixtures/newsletter/` include retrieval URLs, UTC times and excerpt limits in `provenance.json`. They prove the inspected NOAA interval had a Kp peak of 7, alongside the actual SPC/IEM/USGS/Open-Meteo schemas. Clearly synthetic cases in `__tests__/newsletter/data-integrity.test.ts` exercise failures and boundary values with a fixed clock. They cover both Kp formats, early-window peaks, zeroes, malformed/stale data, independent failures, missing SPC days, warning identity/window handling, query boundaries and partial city forecasts. `publication.test.ts` exercises draft storage, actual public loaders, promotion/hash invalidation and the git-diff PR gate without network or model calls.
