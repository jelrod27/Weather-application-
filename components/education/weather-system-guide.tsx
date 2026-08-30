/**
 * Long-form Guide layout for a weather-system Entry.
 *
 * Server component, mirroring `cloud-guide.tsx`: the prose and any diagrams are
 * rendered on the server and only ShareButtons stays a client island. Used only
 * for Entries that have a markdown Guide; everything else still renders
 * WeatherSystemDetail.
 */

import Link from 'next/link'

import EducationBackLink from '@/components/education/education-back-link'
import EducationBreadcrumb from '@/components/education/education-breadcrumb'
import GuideBody from '@/components/education/guide-body'
import PageWrapper from '@/components/page-wrapper'
import { ShareButtons } from '@/components/share-buttons'
import type { WeatherSystemData } from '@/data/weather-systems'
import type { GuideContent } from '@/lib/education/content'
import { getEducationDetailHref } from '@/lib/education/entries'

interface WeatherSystemGuideProps {
  system: WeatherSystemData
  guide: GuideContent
}

/** Structured Entry fields worth showing beside the prose, in reading order. */
function specs(system: WeatherSystemData): { label: string; value: string }[] {
  return [
    { label: 'Classification', value: system.classification },
    ...(system.pressureRange ? [{ label: 'Pressure', value: system.pressureRange }] : []),
    { label: 'Winds', value: system.windSpeed },
    ...(system.temperatureRange ? [{ label: 'Temperature', value: system.temperatureRange }] : []),
    ...(system.rotation ? [{ label: 'Rotation', value: system.rotation }] : []),
    ...(system.diameter ? [{ label: 'Diameter', value: system.diameter }] : []),
    ...(system.duration ? [{ label: 'Duration', value: system.duration }] : []),
    ...(system.seasonalOccurrence ? [{ label: 'Season', value: system.seasonalOccurrence }] : []),
    { label: 'Regions', value: system.geographicRegions },
    { label: 'Impact', value: system.weatherImpact },
  ]
}

export default function WeatherSystemGuide({ system, guide }: WeatherSystemGuideProps) {
  const url = `https://www.16bitweather.co${getEducationDetailHref('weather-system', guide.slug)}`

  return (
    <PageWrapper>
      <article className="max-w-3xl mx-auto px-4 py-8">
        <EducationBreadcrumb
          items={[
            { label: 'Education', href: '/education' },
            { label: 'Weather Systems', href: '/weather-systems' },
            { label: guide.title },
          ]}
        />
        <EducationBackLink href="/weather-systems" label="All weather systems" />

        <header className="mb-8">
          <p className="guide-eyebrow">{`Weather Systems · ${system.classification}`}</p>
          <h1 className="guide-title text-4xl sm:text-5xl mt-3">{guide.title}</h1>
          <p
            className="mt-4 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-reading)', color: 'var(--text-muted)' }}
          >
            {guide.summary}
          </p>
          <ShareButtons
            config={{ title: `${guide.title} — Weather Systems`, text: guide.summary, url }}
            className="mt-5"
          />
        </header>

        {/* No diagram in the registry draws a weather system yet, so the context
            is empty and any id in frontmatter resolves to nothing rather than
            rendering a cloud diagram here. */}
        <GuideBody body={guide.body} diagrams={guide.diagrams} context={{}} />

        <section className="mt-12 pt-6 border-t border-subtle">
          <h2 className="guide-eyebrow">At a glance</h2>
          <dl className="guide-data mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {specs(system).map(({ label, value }) => (
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

        <nav className="mt-10 pt-6 border-t border-subtle flex flex-wrap gap-x-6 gap-y-2 guide-data">
          <Link href="/weather-systems" style={{ color: 'var(--weather-primary)' }}>
            Browse all weather systems
          </Link>
          <Link href="/severe" style={{ color: 'var(--weather-primary)' }}>
            Open the severe weather desk
          </Link>
        </nav>
      </article>
    </PageWrapper>
  )
}
