/**
 * Guards the title and description budget that the root title template makes
 * possible.
 *
 * `app/layout.tsx` sets `title.template = '%s | 16 Bit Weather'`, so a child
 * segment's own title is rendered with a 17-character brand suffix appended.
 * Keeping the segment title at or under 43 characters keeps the rendered
 * `<title>` inside the ~60 characters Google shows. Descriptions are held to
 * 160 for the same reason.
 *
 * Routes whose metadata needs request context (city, blog post, Guide, warning
 * detail, deep-sky object) are covered by their own builder tests.
 */

import fs from 'fs'
import path from 'path'
import type { Metadata } from 'next'

/** The suffix `title.template` appends to every child title. */
const BRAND_SUFFIX = ' | 16 Bit Weather'
const MAX_RENDERED_TITLE = 60
const MAX_SEGMENT_TITLE = MAX_RENDERED_TITLE - BRAND_SUFFIX.length
const MAX_DESCRIPTION = 160

/** Layout modules that export a static `metadata` object, discovered from disk. */
function staticMetadataLayouts(): string[] {
  const appDir = path.join(process.cwd(), 'app')
  const found: string[] = []

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'api') continue
        walk(full)
      } else if (entry.name === 'layout.tsx') {
        const source = fs.readFileSync(full, 'utf-8')
        if (source.includes('export const metadata')) {
          found.push(path.relative(appDir, full))
        }
      }
    }
  }

  walk(appDir)
  return found.sort()
}

describe('static route metadata fits a search result', () => {
  const layouts = staticMetadataLayouts()

  it('finds the layouts to check', () => {
    // The root layout plus the hub layouts; a big drop means the walk broke.
    expect(layouts.length).toBeGreaterThan(15)
    expect(layouts).toContain('layout.tsx')
    expect(layouts).toContain('severe/layout.tsx')
  })

  it.each(layouts)('%s has a title that survives the brand suffix', async (relativePath) => {
    const mod = (await import(`@/app/${relativePath.replace(/\.tsx$/, '')}`)) as {
      metadata?: Metadata
    }
    const title = mod.metadata?.title
    if (title == null) return

    if (typeof title === 'string') {
      expect(title.length).toBeLessThanOrEqual(MAX_SEGMENT_TITLE)
      expect(title).not.toContain('16 Bit Weather')
      expect(title).not.toContain('16-Bit Weather')
      return
    }

    // Only the root layout defines the template, and its default is rendered
    // without the suffix, so it gets the full 60 characters.
    if ('template' in title && title.template) {
      expect(title.template).toBe(`%s${BRAND_SUFFIX}`)
      expect(String(title.default).length).toBeLessThanOrEqual(MAX_RENDERED_TITLE)
    }
  })

  it.each(layouts)('%s has a description Google will not truncate', async (relativePath) => {
    const mod = (await import(`@/app/${relativePath.replace(/\.tsx$/, '')}`)) as {
      metadata?: Metadata
    }
    const description = mod.metadata?.description
    if (typeof description !== 'string') return

    expect(description.length).toBeLessThanOrEqual(MAX_DESCRIPTION)
  })
})
