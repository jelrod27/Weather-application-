# Exemplar Guide — cumulonimbus (scope)

First PR of the education direction (`planning/education-hub-direction.md`). One Entry Guide taken
all the way, so that a wrong decision costs one Guide instead of twenty-nine.

## Done means

`/education/cloud-types/cumulonimbus` serves ~900 words of NOAA-grounded prose in the reading face,
with two Surface Analysis diagrams placed inside the prose, server-rendered — and the other 34
clouds render exactly as they do today.

## Work

**1. Content storage and loader** — new
- `content/education/clouds/cumulonimbus.md`. Frontmatter: `entryKind`, `entrySlug`, `title`,
  `summary`, `sources[]`, `diagrams[]` (id + `insertAfter` anchor), `reviewed`.
- `lib/education/content.ts` — `getGuideContent(kind, slug)`, fs + `gray-matter`, server-only.
  Mirrors `lib/blog/index.ts`. Returns `null` when no markdown exists, so the other 34 clouds are
  untouched by construction.

**2. Diagram registry** — new
- `lib/education/diagrams.ts` — id → `{ component, title, alt, caption }`. Authors and generators
  reference diagrams *by id only*, the same containment `images.ts` + `image-selection.ts` give
  images (ADR-0002).
- `components/education/diagrams/storm-cross-section.tsx` — updraft and downdraft, anvil at the
  tropopause, gust front drawn in cold-front notation, precipitation shaft, mammatus. Mechanism.
- `components/education/diagrams/cloud-altitude-plot.tsx` — Cb spanning 1,000–60,000 ft against the
  standard altitude bands. **Parameterized by cloud**, so it is built once here and reused by all 34
  remaining cloud Guides.

**3. Notation tokens** — new, additive
- `--notation-cold`, `--notation-warm`, `--notation-occluded`, `--notation-ink`, `--notation-grid`
  on `:root` in `globals.css`. Not in `theme.css`, not per-theme (ADR-0003).
- Substrate reads the existing `--bg` / `--text` / `--border`.

**4. Reading typography** — new, additive
- `--font-reading` on `:root`; a `.guide-prose` class carrying the face, a ~65ch measure, type scale
  and spacing. Mono retained for captions, labels and data. `app/theme.css` untouched.

**5. Rendering** — modify
- `app/education/cloud-types/[slug]/page.tsx`: load guide content; render the long-form layout when
  present, current behaviour otherwise.
- Split `components/education/cloud-detail.tsx` — server component for content, `ShareButtons` kept
  as a client island. Drops `useTheme()` from the static path.
- `react-markdown` + `rehype-sanitize` + `remark-gfm`, with a component map that resolves diagram
  anchors against the registry.

**6. Content** — new, hand-assembled
- ~900 words from NWS JetStream and the NWS Glossary, cited. Shape: what it is → how it forms → how
  to recognise it → what it means for you → the hazards.
- Deliberately hand-assembled. Building the generator before anyone has seen a good Guide is
  backwards; the generator is a later PR that copies whatever this one proves.

**7. Metadata** — modify
- Description from the guide summary, not `description16bit` — that field is flavour text
  ("Massive storm tower reaching max altitude limit"), not a search description.
- JSON-LD for the Guide.

**8. Tests** — extend
- `__tests__/education-entries.test.ts`: loader resolves a Guide and returns `null` for Entries
  without one.
- `__tests__/education-hub-security.test.ts`: a `diagrams[]` id absent from the registry is dropped,
  not rendered.

## Out of scope, deliberately

The generation pipeline · the other 28 Entry Guides and 7 Collection Guides · the Hub redesign and
its live surface analysis chart · the `theme-utils` refactor and the other 72 client components ·
URL restructuring · analytics enablement (do that separately, and before this lands, so there is a
baseline).

## Risks and traps

- **Jest mocks the markdown stack.** `react-markdown`, `rehype-sanitize` and `remark-gfm` are
  replaced via `moduleNameMapper` (`jest.config.mjs`), so a unit test asserting sanitisation would
  be asserting against the mock. Registry-id rejection is testable in unit; actual HTML sanitisation
  needs an E2E or a test that imports the real library explicitly.
- **The cross-section diagram is the time sink.** The altitude plot amortises across 34 Guides; the
  cross-section does not. If the budget slips, it slips here.
- **`tsconfig.json` includes `.next/dev/types/**`,** which `next build` does not regenerate. Deleting
  any route leaves `npm run typecheck` failing on stale validators until `next dev` runs again or the
  directory is removed. This bit during the dead-code sweep and will bite again.

## Still to decide

- Content path: `content/education/clouds/` as above, or a flatter `content/guides/`.
- The reading face — whether it is IBM Plex Sans (already loaded, zero cost) or a new text face.
- The display face for Guide titles. Both want to be seen rather than specified in prose.
