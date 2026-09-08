import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { safeJsonLd } from '@/lib/utils'
import {
  SPACE_WEATHER_BASE,
  intentHref,
  siblingIntents,
  type SpaceWeatherIntent,
} from '@/lib/space-weather/intents'

const BASE_URL = 'https://www.16bitweather.co'

/**
 * Metadata for an intent page, from the registry entry alone.
 *
 * The four pages carried a hand-maintained copy of this block each — the same
 * canonical, openGraph and twitter fields, differing only in the OG image
 * wording. That is precisely the drift the registry exists to prevent, and
 * metadata is the part of these pages that the whole exercise is about: a
 * canonical or a title that silently diverges on one page is a ranking bug
 * nothing in CI would catch.
 */
export function buildIntentMetadata(
  intent: SpaceWeatherIntent,
  og: { title: string; subtitle: string },
): Metadata {
  const canonical = `${BASE_URL}${intentHref(intent.slug)}`
  const image = `/api/og?title=${encodeURIComponent(og.title)}&subtitle=${encodeURIComponent(og.subtitle)}`

  return {
    title: intent.title,
    description: intent.description,
    keywords: intent.keywords,
    alternates: { canonical },
    openGraph: {
      title: intent.title,
      description: intent.description,
      url: canonical,
      siteName: '16 Bit Weather',
      type: 'website',
      locale: 'en_US',
      images: [{ url: image, width: 1200, height: 630, alt: og.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: intent.title,
      description: intent.description,
      images: [image],
    },
  }
}

export interface IntentFaq {
  question: string
  answer: string
}

/**
 * FAQPage markup built from the same array the page renders, so the structured
 * data can never describe an answer a reader cannot see.
 */
export function buildIntentFaqJsonLd(faqs: readonly IntentFaq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}

export function buildIntentPageJsonLd(
  intent: SpaceWeatherIntent,
  dateModified?: string,
): Record<string, unknown> {
  const url = `${BASE_URL}${intentHref(intent.slug)}`
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: intent.title,
    description: intent.description,
    url,
    isPartOf: { '@type': 'WebSite', name: '16 Bit Weather', url: BASE_URL },
    ...(dateModified ? { dateModified } : {}),
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Space Weather',
          item: `${BASE_URL}${SPACE_WEATHER_BASE}`,
        },
        { '@type': 'ListItem', position: 3, name: intent.label, item: url },
      ],
    },
  }
}

interface IntentPageShellProps {
  intent: SpaceWeatherIntent
  /** The live reading this page exists to answer, rendered above the prose. */
  reading: ReactNode
  /** When the live reading was taken, for the dateModified stamp and caption. */
  updatedLabel?: string | null
  /** How often this page's reading refreshes, e.g. "every five minutes". */
  refreshLabel?: string
  children: ReactNode
  faqs: readonly IntentFaq[]
}

/**
 * Shared frame for a space-weather intent page: breadcrumb, heading, the live
 * reading, the page's own prose, its FAQ, and links back to the hub and across
 * to the sibling intents.
 */
export default function IntentPageShell({
  intent,
  reading,
  updatedLabel = null,
  refreshLabel = 'every five minutes',
  children,
  faqs,
}: IntentPageShellProps) {
  const siblings = siblingIntents(intent.slug)

  return (
    <article
      className="mx-auto max-w-3xl px-4 py-8 font-mono text-sm leading-relaxed text-weather-muted"
      data-testid={`intent-${intent.slug}`}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(buildIntentFaqJsonLd(faqs)) }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 text-xs uppercase tracking-wider">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <span aria-hidden="true"> / </span>
        <Link href={SPACE_WEATHER_BASE} className="hover:underline">
          Space weather
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-weather-text">{intent.label}</span>
      </nav>

      <h1 className="mb-4 text-xl font-bold uppercase tracking-wide text-weather-primary sm:text-2xl">
        {intent.title}
      </h1>

      <section
        className="mb-6 rounded-md border border-weather-primary/40 bg-weather-bg-elev p-4"
        aria-label="Current reading"
      >
        {reading}
        {updatedLabel ? (
          <p className="mt-2 text-xs text-weather-muted">
            NOAA SWPC, {updatedLabel}. Refreshes {refreshLabel}.
          </p>
        ) : null}
      </section>

      <div className="space-y-4 text-weather-text">{children}</div>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-weather-primary">
        {intent.label} FAQ
      </h2>
      <dl className="space-y-4">
        {faqs.map((faq) => (
          <div key={faq.question}>
            <dt className="font-bold text-weather-text">{faq.question}</dt>
            <dd className="mt-1">{faq.answer}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-8 border-t border-weather-primary/20 pt-6">
        <h2 className="mb-3 text-lg font-semibold text-weather-primary">
          The rest of the space weather desk
        </h2>
        <p className="mb-3">
          The{' '}
          <Link
            href={SPACE_WEATHER_BASE}
            className="text-weather-primary underline underline-offset-2"
          >
            full space weather monitor
          </Link>{' '}
          carries every feed on one screen: scales and alerts, flare timelines, Kp history, solar
          wind plasma, sunspot regions, coronagraph frames and SDO imagery.
        </p>
        <ul className="space-y-1.5">
          {siblings.map((sibling) => (
            <li key={sibling.slug}>
              <Link
                href={intentHref(sibling.slug)}
                className="text-weather-primary underline underline-offset-2"
              >
                {sibling.label}
              </Link>
              <span className="text-weather-muted"> — {sibling.blurb}</span>
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}
