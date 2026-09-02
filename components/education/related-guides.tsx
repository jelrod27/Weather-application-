/**
 * Related Guides, chosen in code from shared subject tags.
 *
 * The Guide prose carries no links (planning/adr/0002: the model writes none
 * and the body gate rejects them), so this block is where a Guide page links to
 * its neighbours. It links only to published Guide URLs and renders nothing
 * when no tags are shared, rather than padding the list.
 */

import Link from 'next/link'

import type { EducationEntryKind } from '@/lib/education/entries'
import { getRelatedGuides } from '@/lib/education/topics'

interface RelatedGuidesProps {
  kind: EducationEntryKind
  slug: string
}

export default function RelatedGuides({ kind, slug }: RelatedGuidesProps) {
  const related = getRelatedGuides(kind, slug)
  if (related.length === 0) return null

  return (
    <section className="mt-10 pt-6 border-t border-subtle" aria-labelledby="related-guides">
      <h2 id="related-guides" className="guide-eyebrow">
        Related guides
      </h2>
      <ul className="mt-3 space-y-3">
        {related.map((entry) => (
          <li key={entry.href}>
            <Link
              href={entry.href}
              className="guide-data underline underline-offset-2"
              style={{ color: 'var(--weather-primary)' }}
            >
              {entry.title}
            </Link>
            <p className="guide-data mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {entry.summary}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
