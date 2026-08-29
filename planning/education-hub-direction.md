# Education hub — direction (2026-08-29)

Outcome of a grilling session on the education surface. Terminology is in `CONTEXT.md`
("Education Language"); the three hard decisions are in `planning/adr/0001`–`0003`. This note
carries the plan and the findings that did not warrant an ADR.

## Thesis

The education surface exists to drive organic search traffic through rich, evergreen
reference content. Every decision below is downstream of that.

## Where it started

- 76 Entries, 29 published Guides — 47 Entries had no URL.
- Median published Guide: 84 words (clouds), 86 (systems), 186 (phenomena). Whole corpus: 8,317 words.
- Zero images or diagrams anywhere on the surface. One interactive element (a 4-question quiz).
- By contrast the automated blog had ~48,000 words across 40 illustrated posts — the pipeline
  was feeding perishable dated posts while the evergreen pages, the ones that compound in
  search, got nothing.

## Decisions

| # | Decision | Recorded in |
|---|----------|-------------|
| 1 | Goal is organic search acquisition | this note |
| 2 | Depth over breadth — hold at 29 Entry Guides, ~900 words each | ADR-0001 |
| 3 | Content grounded in NWS JetStream + NWS Glossary, through the newsletter gates, human-reviewed | ADR-0002 |
| 4 | Visual language is Surface Analysis — meteorology's own chart notation | ADR-0003 |
| 5 | Storage is frontmatter markdown + a diagram registry; never MDX | ADR-0002 |
| 6 | The other 47 Entries get ~7 themed Collection Guides | ADR-0001 |
| 7 | The Hub becomes a live surface analysis chart (SPC outlooks, Bitwatch Warning Events, radar), each plotted feature linking to its Guide | this note |
| 8 | `--font-reading` on `:root`, education-scoped; mono kept for labels and data; `theme.css` untouched | ADR-0003 |
| 9 | Ship one exemplar Guide end to end first | this note |

## Sourcing notes

NOAA/NWS **text** is public domain (17 U.S.C. § 105) and safe to adapt. NOAA-hosted **images**
are not automatically — pages sometimes carry third-party photos that do not inherit that
status, so each image needs checking individually. The WMO International Cloud Atlas is WMO
copyright; do not lift from it.

## First PR — exemplar Guide

Cumulonimbus, taken all the way: NOAA-sourced prose through the gates, markdown storage,
two authored Surface Analysis diagrams, `--font-reading` applied, server-rendered. It exercises
every decision above at once, so a wrong decision costs one Guide instead of twenty-nine.

Enable Vercel Web Analytics and Search Console before the content lands, so there is a baseline.

## Found, not acted on

- **`app/learn/` is dead code.** `/learn` and `/learn/glossary` are `permanent: true` redirects in
  `next.config.mjs`, and Next checks redirects before the filesystem
  (`node_modules/next/dist/docs/.../redirects.md:39`), so the 236 lines in `app/learn/page.tsx`
  and `layout.tsx` are unreachable. They also advertise "10 cloud formations" (there are 35) and
  12 phenomena (there are 25). Knip misses them because App Router pages are entry points.
- **`lib/theme-utils.ts` is mostly ceremony.** Across 170 lines the `theme` parameter is read in
  exactly two expressions: `glow: theme === 'daybreak' ? '' : 'glow'` (line 55) and one inside
  `getRetroEffects`, which is never exported and never called. Everything else returned is a
  constant Tailwind class that already resolves per-theme through CSS variables. 84 components
  are `'use client'` to consume it, including every education surface — static reference pages
  shipping a context subscription to read a value that does not vary. Roughly 80 lines
  (`getThemeGradients`, `BREAKPOINTS`, `getResponsiveFontSize`, `COMPONENT_SIZES`, `ANIMATIONS`,
  `PIXEL_EFFECTS`, `getGlowClass`, `getRetroEffects`) are defined, never exported, never called.
  Deliberately out of scope: an 84-file refactor should not ride along on a content redesign.
- **No analytics.** Vercel Web Analytics returns 404 for the project; no Search Console
  integration in the repo. The acquisition goal is currently unmeasurable.
- **Stale site metadata.** `app/layout.tsx` still sells "Dark Terminal, Miami Vice, and Tron Grid
  themes." None of the three exist; the themes are nord, daybreak, synthwave84, dracula,
  cyberpunk, matrix.
- **Two hand-synced palette sources.** `lib/theme-tiers.ts:21` documents that its swatches must be
  copied by hand from `app/theme.css`. Nothing enforces it.

## Open

- Which display face for Guide titles — wants to be seen, not specified in prose.
- The URL split: Atlases live at `/cloud-types` etc. while Guides live under `/education/`.
  Incoherent, but moving them means 301s against pages that may already rank. Current leaning is
  to leave the URLs and fix only the naming in code.
- Frontal notation on the Hub needs a WPC surface-analysis source the repo does not have. The rest
  of that chart (SPC outlooks, Warning Events, radar) uses data already owned.
