/**
 * Long-form Guide layout for a cloud Entry.
 *
 * Server component. The client islands are the ones that genuinely need to be
 * — PageWrapper, the breadcrumb, and ShareButtons — so the prose and the
 * diagrams are rendered on the server. Used only for Entries that have a
 * markdown Guide; everything else still renders CloudDetail.
 */

import Link from 'next/link'

import EducationBackLink from '@/components/education/education-back-link'
import EducationBreadcrumb from '@/components/education/education-breadcrumb'
import GuideBody from '@/components/education/guide-body'
import RelatedGuides from '@/components/education/related-guides'
import PageWrapper from '@/components/page-wrapper'
import { ShareButtons } from '@/components/share-buttons'
import type { CloudData } from '@/data/cloud-types'
import type { GuideContent } from '@/lib/education/content'
import { getEducationDetailHref } from '@/lib/education/entries'

interface CloudGuideProps {
  cloud: CloudData
  guide: GuideContent
}

/** Structured Entry fields worth showing beside the prose, in reading order. */
function specs(cloud: CloudData): { label: string; value: string }[] {
  return [
    { label: 'Altitude', value: cloud.altitudeRange },
    { label: 'Temperature', value: cloud.temperature },
    { label: 'Forms in', value: cloud.formationTime },
    { label: 'Winds', value: cloud.windSpeed },
    { label: 'Pressure', value: cloud.pressureRange },
    { label: 'Density', value: cloud.density },
    ...(cloud.energy ? [{ label: 'Energy', value: cloud.energy }] : []),
    { label: 'Signals', value: cloud.weatherPrediction },
  ]
}

export default function CloudGuide({ cloud, guide }: CloudGuideProps) {
  const url = `https://www.16bitweather.co${getEducationDetailHref('cloud', guide.slug)}`

  return (
    <PageWrapper>
      <article className="max-w-3xl mx-auto px-4 py-8">
        <EducationBreadcrumb
          items={[
            { label: 'Education', href: '/education' },
            { label: 'Cloud Atlas', href: '/cloud-types' },
            { label: guide.title },
          ]}
        />
        <EducationBackLink href="/cloud-types" label="All cloud types" />

        <header className="mb-8">
          <p className="guide-eyebrow">
            {`Cloud Atlas · ${cloud.category} · ${cloud.abbreviation}`}
          </p>
          <h1 className="guide-title text-4xl sm:text-5xl mt-3">{guide.title}</h1>
          <p
            className="mt-4 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-reading)', color: 'var(--text-muted)' }}
          >
            {guide.summary}
          </p>
          <ShareButtons
            config={{ title: `${guide.title} — Cloud Atlas`, text: guide.summary, url }}
            className="mt-5"
          />
        </header>

        <GuideBody body={guide.body} diagrams={guide.diagrams} context={{ cloud }} />

        <section className="mt-12 pt-6 border-t border-subtle">
          <h2 className="guide-eyebrow">At a glance</h2>
          <dl className="guide-data mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {specs(cloud).map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-4 py-1 border-b border-subtle">
                <dt style={{ color: 'var(--text-muted)' }}>{label}</dt>
                <dd className="text-right">{value}</dd>
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

        <RelatedGuides kind="cloud" slug={guide.slug} />

        <nav className="mt-10 pt-6 border-t border-subtle flex flex-wrap gap-x-6 gap-y-2 guide-data">
          <Link href="/cloud-types" style={{ color: 'var(--weather-primary)' }}>
            Browse all clouds
          </Link>
          <Link href="/radar" style={{ color: 'var(--weather-primary)' }}>
            Open the radar lab
          </Link>
        </nav>
      </article>
    </PageWrapper>
  )
}
