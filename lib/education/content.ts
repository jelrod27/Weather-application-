/**
 * Long-form Guide content.
 *
 * Prose lives in per-Entry markdown under `content/education/`; the structured
 * fields stay on the Entry in `data/*.ts`. Mirrors `lib/blog/index.ts`.
 * Server-only — this reads the filesystem.
 *
 * Entries without a markdown file return null, which is a legitimate state:
 * most Entries are Atlas rows rather than Guides. See planning/adr/0001.
 */

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

import { isKnownDiagramId } from '@/lib/education/diagrams'
import type { EducationEntryKind } from '@/lib/education/entries'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'education')

const KIND_DIRECTORY: Record<EducationEntryKind, string> = {
  cloud: 'clouds',
  'weather-system': 'weather-systems',
  phenomenon: 'phenomena',
}

/**
 * Guides may cite only official meteorological authorities. Exact hostnames
 * rather than a suffix match, because `endsWith('weather.gov')` would also
 * accept `notweather.gov`. Add hosts here as Guides need them — a citation on
 * an unlisted host is dropped, and `readSources` warns so that shows up at
 * build time rather than as a quietly missing entry in the Sources section.
 */
const ALLOWED_SOURCE_HOSTS: ReadonlySet<string> = new Set([
  'weather.gov',
  'www.weather.gov',
  'forecast.weather.gov',
  'www.noaa.gov',
  'www.spc.noaa.gov',
  'www.nhc.noaa.gov',
  'www.nssl.noaa.gov',
])

/** Whether a Guide may cite this URL. Exported so tests assert the real rule. */
export function isAllowedSourceUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  return parsed.protocol === 'https:' && ALLOWED_SOURCE_HOSTS.has(parsed.hostname)
}

/** Slugs address files on disk, so they are restricted rather than sanitised. */
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export interface GuideSource {
  label: string
  url: string
}

export interface GuideDiagram {
  id: string
  /** Verbatim snippet from the body; the diagram is placed after that paragraph. */
  insertAfter: string
}

export interface GuideContent {
  kind: EducationEntryKind
  slug: string
  title: string
  summary: string
  /** ISO date the prose was last checked against its sources. */
  reviewed: string
  /** ISO date the prose was first drafted; empty for hand-written Guides. */
  generated: string
  sources: GuideSource[]
  diagrams: GuideDiagram[]
  body: string
}

function readSources(raw: unknown): GuideSource[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const { label, url } = item as Record<string, unknown>
    if (typeof label !== 'string' || typeof url !== 'string') return []
    if (!isAllowedSourceUrl(url)) {
      // Loud, because a silently dropped citation vanishes from both the
      // Sources section and the JSON-LD with a green build.
      console.warn(`[education] Guide citation dropped, host not allowed: ${url}`)
      return []
    }
    return [{ label, url }]
  })
}

function readDiagrams(raw: unknown): GuideDiagram[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const { id, insertAfter } = item as Record<string, unknown>
    if (typeof id !== 'string' || typeof insertAfter !== 'string') return []
    // The registry is the gate: an id nobody registered never reaches render.
    if (!isKnownDiagramId(id)) return []
    return [{ id, insertAfter }]
  })
}

/**
 * A frontmatter date, as a `YYYY-MM-DD` string.
 *
 * `reviewed: 2026-08-29` is a YAML timestamp, and js-yaml hands gray-matter a
 * Date for it — the same coercion `lib/blog/index.ts` documents for a post's
 * `date`. A plain `typeof === 'string'` test therefore threw the value away,
 * and the Guide rendered with no "Checked against sources" line and no
 * `dateModified` in its JSON-LD, on a green build.
 */
function readDate(raw: unknown): string {
  if (typeof raw === 'string') return isCalendarDate(raw.trim()) ? raw.trim() : ''
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw.toISOString().slice(0, 10)
  return ''
}

/**
 * Whether a string is a real `YYYY-MM-DD` date. V8 rolls `2026-02-30` over to
 * March 1 rather than rejecting it, so a typo in frontmatter would otherwise
 * publish a sitemap lastmod and a `dateModified` the Guide never declared.
 * Exported so tests assert the real rule.
 */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/**
 * Returns the Guide for one Entry, or null when the Entry has no Guide, the
 * slug is not a safe slug, or required frontmatter is missing.
 */
export function getGuideContent(kind: EducationEntryKind, slug: string): GuideContent | null {
  if (!SAFE_SLUG.test(slug)) return null

  const filePath = path.join(CONTENT_DIR, KIND_DIRECTORY[kind], `${slug}.md`)
  if (!fs.existsSync(filePath)) return null

  const { data, content } = matter(fs.readFileSync(filePath, 'utf8'))
  const title = typeof data.title === 'string' ? data.title : null
  const summary = typeof data.summary === 'string' ? data.summary : null
  if (!title || !summary) return null

  return {
    kind,
    slug,
    title,
    summary,
    reviewed: readDate(data.reviewed),
    generated: readDate(data.generated),
    sources: readSources(data.sources),
    diagrams: readDiagrams(data.diagrams),
    body: content.trim(),
  }
}

/**
 * When a Guide's prose last changed, for the sitemap: the review date, else the
 * generation date. Null when the Entry has no Guide or the Guide carries
 * neither date, so the caller falls back to its bucketed default rather than
 * advertising a change that never happened.
 */
export function getGuideLastModified(kind: EducationEntryKind, slug: string): Date | null {
  const guide = getGuideContent(kind, slug)
  // readDate has already rejected anything that is not a real calendar date.
  const stamp = guide?.reviewed || guide?.generated
  return stamp ? new Date(`${stamp}T00:00:00Z`) : null
}

/** Slugs of every Entry of this kind that has a Guide. */
export function getGuideSlugs(kind: EducationEntryKind): string[] {
  const dir = path.join(CONTENT_DIR, KIND_DIRECTORY[kind])
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.slice(0, -3))
    .filter((slug) => SAFE_SLUG.test(slug))
}
