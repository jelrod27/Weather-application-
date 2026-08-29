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

/** Guides may cite only official meteorological authorities. */
const ALLOWED_SOURCE_HOSTS: ReadonlySet<string> = new Set([
  'www.weather.gov',
  'www.noaa.gov',
  'www.spc.noaa.gov',
  'www.nhc.noaa.gov',
  'www.nssl.noaa.gov',
  'forecast.weather.gov',
])

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
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return []
    }
    if (parsed.protocol !== 'https:') return []
    if (!ALLOWED_SOURCE_HOSTS.has(parsed.hostname)) return []
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
    reviewed: typeof data.reviewed === 'string' ? data.reviewed : '',
    sources: readSources(data.sources),
    diagrams: readDiagrams(data.diagrams),
    body: content.trim(),
  }
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
