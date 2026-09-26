import Link from 'next/link'
import { safeJsonLd } from '@/lib/utils'

export const STARGAZER_FAQS = [
  {
    question: 'How is a beginner observing hour chosen?',
    answer:
      'Start here compares complete future one-hour periods using forecast clouds, precipitation, wind and suitable targets for your equipment. Directions use the middle of that hour. Targets are checked every 15 minutes; objects move and visibility is never guaranteed. The separate 0–100 photography score in Conditions is for imaging and is unavailable when required measurements are missing.',
  },
  {
    question: 'What is the difference between seeing and transparency?',
    answer:
      'Seeing describes how steady the atmosphere is — good seeing means stars twinkle less and high magnification on planets and double stars holds up. Transparency describes how clear it is — good transparency means faint galaxies and nebulae stand out. Thin cirrus can wreck transparency while total cloud cover still reads low.',
  },
  {
    question: 'What is the Bortle scale?',
    answer:
      'The Bortle scale describes sky darkness from class 1, very dark, to class 9, inner city. Where population data is available, this page shows a rough population-based estimate, not a sky measurement. Nearby lights, haze and terrain can change the view. This estimate does not determine beginner target eligibility.',
  },
  {
    question: 'What can I actually observe tonight?',
    answer:
      'Choose a city, future hour and equipment in Start here to see up to three reviewed targets. Bright planets look like points to your eyes, and faint objects often look like pale patches rather than photographs. The full catalog offers 151 reference guides with search and equipment filters; a catalog listing is not a claim that an object is visible tonight.',
  },
] as const

export function buildStargazerFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: STARGAZER_FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}

/** Server-rendered crawlable copy for /stargazer, below the command center. */
export default function StargazerSeoContent() {
  return (
    <section
      className="mx-auto max-w-3xl px-4 py-10 font-mono text-sm leading-relaxed text-muted-foreground"
      aria-labelledby="stargazer-seo-heading"
      data-testid="stargazer-seo-content"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(buildStargazerFaqJsonLd()) }}
      />
      <h2
        id="stargazer-seo-heading"
        className="mb-4 text-xl font-bold uppercase tracking-wide text-primary"
      >
        About tonight&apos;s stargazing forecast
      </h2>
      <p className="mb-4 text-foreground">
        Choose a city and explore a beginner observing plan, weather tradeoffs and things to look for.
        Start with your eyes or choose binoculars or a small telescope. Each suggestion includes
        a direction, height and realistic description. Missing or stale weather is labeled clearly;
        refresh before relying on a suggested hour.
      </p>
      <p className="mb-4 text-foreground">
        Conditions retains detailed hourly weather and photography scores. Targets, Events and
        Launches offer more depth. Forecast cloud cover describes an area; it cannot confirm a
        clear view in a particular direction or account for nearby lights, trees and buildings.
      </p>
      <p className="mb-6 text-foreground">
        Browse the full{' '}
        <Link href="/stargazer/objects" className="text-primary underline underline-offset-2">
          deep-sky object catalog
        </Link>{' '}
        for observing notes on all Messier objects and selected NGC, IC and Sharpless targets. When aurora is the
        target instead, check the{' '}
        <Link href="/space-weather" className="text-primary underline underline-offset-2">
          space weather monitor
        </Link>{' '}
        for the Kp index, and use{' '}
        <Link href="/radar" className="text-primary underline underline-offset-2">
          live radar
        </Link>{' '}
        to follow precipitation nearby; rain radar does not show all cloud cover.
      </p>

      <h3 className="mb-3 text-lg font-semibold text-primary">Stargazing FAQ</h3>
      <dl className="space-y-4">
        {STARGAZER_FAQS.map((faq) => (
          <div key={faq.question}>
            <dt className="font-semibold text-foreground">{faq.question}</dt>
            <dd className="mt-1">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
