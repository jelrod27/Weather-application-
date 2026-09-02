/**
 * Every shareable Guide URL of one kind, as plain links.
 *
 * The atlas pages are click-to-expand cards, so a Guide link inside a card is
 * not in the HTML until someone opens it. This list is static — no hooks, no
 * state — so it is in the server-rendered markup whichever component renders
 * it, and a crawler reaching the atlas finds every Guide of that kind.
 */

import Link from 'next/link'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getShareableGuideEntries, type EducationEntryKind } from '@/lib/education/entries'

const HEADING: Record<EducationEntryKind, string> = {
  cloud: 'CLOUD GUIDES',
  'weather-system': 'WEATHER SYSTEM GUIDES',
  phenomenon: 'PHENOMENON GUIDES',
}

interface GuideIndexProps {
  kind: EducationEntryKind
}

export default function GuideIndex({ kind }: GuideIndexProps) {
  const guides = getShareableGuideEntries().filter((entry) => entry.kind === kind)
  if (guides.length === 0) return null

  return (
    <Card className="mt-8 max-w-4xl mx-auto container-nested">
      <CardHeader>
        <CardTitle
          className="text-lg font-mono uppercase text-center"
          style={{ color: 'var(--weather-primary)' }}
        >
          {HEADING[kind]}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <nav aria-label={`${HEADING[kind].toLowerCase()} to read and share`}>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm font-mono">
            {guides.map((entry) => (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--weather-primary)' }}
                >
                  {entry.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </CardContent>
    </Card>
  )
}
