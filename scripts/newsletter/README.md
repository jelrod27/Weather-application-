# Newsletter generator

Generates the 16bitweather.co weekly blog posts on two cadences.

- **Wednesday — topic deep-dive.** Pulls one of 15 topics via weighted-random rotation, finds a current-news angle, writes a 600–900-word piece.
- **Sunday — Rearview + Roadmap.** Recap of past 7 days using real data (Iowa Mesonet, NOAA SPC, NOAA SWPC, USGS) plus a 7-day forward outlook with regional cuts.

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
  news.ts                  # news-angle finder hitting /api/news/aggregate
  wednesday.ts             # Wednesday topic pipeline
  sunday.ts                # Sunday Rearview + Roadmap pipeline
  publish.ts               # frontmatter writer to content/blog/
  data/
    mesonet.ts             # Iowa State Mesonet (NWS warnings archive)
    spc-reports.ts         # NOAA SPC daily storm reports
    space-weather.ts       # NOAA SWPC summary
    earthquakes.ts         # USGS significant week feed
    forecast.ts            # Open-Meteo 7-day outlook with regional cuts
```

## Run locally

```bash
# Wednesday topic deep-dive (writes a markdown file to content/blog/)
ANTHROPIC_API_KEY=sk-... npx tsx scripts/newsletter/index.ts --cadence wednesday

# Sunday rearview + roadmap
ANTHROPIC_API_KEY=sk-... npx tsx scripts/newsletter/index.ts --cadence sunday

# Dry-run — generates but does not write to disk
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

Use `grep -l 'cadence: wednesday_topic' content/blog/*.md` to find all Wednesday posts. The 12-week lookback is computed from the `date` field.

## Failure modes

- **Iowa Mesonet returns empty** → `MesonetEmptyError`, workflow fails. Do not paper over with fabricated content.
- **Image catalog starved** → `selectImages` throws `catalog could not satisfy ...`. Expand catalog (`scripts/newsletter/images.ts`) or shorten the 8-week reuse window.
- **Anthropic 429 / 5xx** → wrapper bubbles up the status. Re-run after a cool-down or upgrade rate limits.
- **Voice violations** → up to 2 regenerations. After that, post persists with violations recorded — the next run will see them in the deny list.
- **Similarity > 0.85** → up to 2 regenerations with trigger phrases injected into deny list. Persists either way; the score lands in `similarity_max` for trend monitoring.

## Curating the topic catalog

`topics.ts` holds 16 entries with extended descriptions used as system prompt context. To add a topic, append a slug to `TOPIC_SLUGS`, add the entry to `TOPICS`, and update `TOPIC_NEIGHBORS` in `images.ts` so the image pool can fall back gracefully.

## Curating the image catalog

`images.ts` holds the verified public-domain/attribution-compatible catalog. To add: append an `ImageEntry`, run `npm run validate:images`, fix any 404s. Sources used: NASA SDO, NOAA NESDIS GOES-16, NOAA SWPC, NOAA OPC, NOAA CPC, NOAA SPC, USGS, USDA Drought Monitor, Wikimedia Commons via `Special:FilePath`.

Sunday posts run an additional hard gate before the workflow opens a PR:

```bash
npx tsx scripts/newsletter/validate-post.ts content/blog/<post>.md --audit
```

The validator rejects placeholder images, disallowed image hosts, `images_used` mismatches, missing Sunday `image_audit` metadata, and obvious narrative/image mismatches such as solar or drought imagery in a tornado/earthquake-led post.
