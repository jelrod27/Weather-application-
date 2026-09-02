/**
 * Long-form Guide layout for a phenomenon Entry.
 *
 * Server component, mirroring `cloud-guide.tsx`. Used only for Entries that
 * have a markdown Guide; everything else still renders PhenomenonDetail.
 */

import Link from 'next/link'

import EducationBackLink from '@/components/education/education-back-link'
import EducationBreadcrumb from '@/components/education/education-breadcrumb'
import GuideBody from '@/components/education/guide-body'
import RelatedGuides from '@/components/education/related-guides'
import PageWrapper from '@/components/page-wrapper'
import { ShareButtons } from '@/components/share-buttons'
import type { WeatherPhenomena } from '@/data/fun-facts'
import type { GuideContent } from '@/lib/education/content'
import { diagramContextFor } from '@/lib/education/diagram-context'
import { getEducationDetailHref } from '@/lib/education/entries'

interface PhenomenonGuideProps {
  phenomenon: WeatherPhenomena
  guide: GuideContent
}

interface Spec {
  label: string
  value: string
}

/**
 * Short values, for the two-column right-aligned list.
 *
 * `dangerLevel` is a bare 1-5 integer in the data and means nothing on its own,
 * so it is rendered with its scale. `category` is deliberately absent — it is
 * already the eyebrow above the title.
 */
function measurements(phenomenon: WeatherPhenomena): Spec[] {
  return [
    { label: 'Rarity', value: phenomenon.rarity },
    { label: 'Hazard', value: `${phenomenon.dangerLevel} of 5` },
  ]
}

/**
 * Fields the data stores as prose, which get a full-width block each.
 *
 * These are sentences, not values: `howToSpot` runs 160-227 characters across
 * the six published phenomena and `whereToSee` 118-141. Right-aligned in half a
 * column they render as ragged paragraphs, which is why
 * `phenomenon-detail.tsx` gives each of them its own full-width card.
 */
function notes(phenomenon: WeatherPhenomena): Spec[] {
  return [
    { label: 'How to spot it', value: phenomenon.howToSpot },
    { label: 'Where to see it', value: phenomenon.whereToSee },
    { label: 'Best season', value: phenomenon.bestSeason },
  ]
}

export default function PhenomenonGuide({ phenomenon, guide }: PhenomenonGuideProps) {
  const url = `https://www.16bitweather.co${getEducationDetailHref('phenomenon', guide.slug)}`

  return (
    <PageWrapper>
      <article className="max-w-3xl mx-auto px-4 py-8">
        <EducationBreadcrumb
          items={[
            { label: 'Education', href: '/education' },
            { label: '16-Bit Takes', href: '/fun-facts' },
            { label: guide.title },
          ]}
        />
        <EducationBackLink href="/fun-facts" label="All phenomena" />

        <header className="mb-8">
          <p className="guide-eyebrow">{`Weather Phenomena · ${phenomenon.category}`}</p>
          <h1 className="guide-title text-4xl sm:text-5xl mt-3">{guide.title}</h1>
          <p
            className="mt-4 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-reading)', color: 'var(--text-muted)' }}
          >
            {guide.summary}
          </p>
          <ShareButtons
            config={{ title: `${guide.title} — Weather Phenomena`, text: guide.summary, url }}
            className="mt-5"
          />
        </header>

        <GuideBody
          body={guide.body}
          diagrams={guide.diagrams}
          context={diagramContextFor('phenomenon', guide.slug)}
        />

        <section className="mt-12 pt-6 border-t border-subtle">
          <h2 className="guide-eyebrow">At a glance</h2>
          <dl className="guide-data mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {measurements(phenomenon).map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-4 py-1 border-b border-subtle">
                <dt style={{ color: 'var(--text-muted)' }}>{label}</dt>
                <dd className="text-right">{value}</dd>
              </div>
            ))}
          </dl>
          <dl className="mt-6 space-y-4">
            {notes(phenomenon).map(({ label, value }) => (
              <div key={label}>
                <dt className="guide-eyebrow">{label}</dt>
                <dd
                  className="mt-1 leading-relaxed"
                  style={{ fontFamily: 'var(--font-reading)' }}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {guide.sources.length > 0 && (
          <section className="mt-10">
            <h2 className="guide-eyebrow">Sources</h2>
            <ul className="guide-data mt-3 space-y-1.5">
              {guide.sources.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--weather-primary)' }}
                    className="underline underline-offset-2"
                  >
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
            {guide.reviewed && (
              <p className="guide-data mt-4" style={{ color: 'var(--text-muted)' }}>
                {`Checked against sources ${guide.reviewed}`}
              </p>
            )}
          </section>
        )}

        <RelatedGuides kind="phenomenon" slug={guide.slug} />

        <nav className="mt-10 pt-6 border-t border-subtle flex flex-wrap gap-x-6 gap-y-2 guide-data">
          <Link href="/fun-facts" style={{ color: 'var(--weather-primary)' }}>
            Browse all phenomena
          </Link>
          <Link href="/radar" style={{ color: 'var(--weather-primary)' }}>
            Open the radar lab
          </Link>
        </nav>
      </article>
    </PageWrapper>
  )
}
