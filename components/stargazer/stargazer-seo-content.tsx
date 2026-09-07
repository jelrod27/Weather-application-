import Link from 'next/link'
import { safeJsonLd } from '@/lib/utils'

export const STARGAZER_FAQS = [
  {
    question: 'What does the stargazing score mean?',
    answer:
      'It is a single 0–100 read on how good tonight looks from your location, weighted mostly by cloud cover, then moon interference, then seeing and transparency, with a small penalty for ground conditions such as wind, humidity, and dew risk. The card also names the one factor that is holding the score down.',
  },
  {
    question: 'What is the difference between seeing and transparency?',
    answer:
      'Seeing describes how steady the atmosphere is — good seeing means stars twinkle less and high magnification on planets and double stars holds up. Transparency describes how clear it is — good transparency means faint galaxies and nebulae stand out. Thin cirrus can wreck transparency while total cloud cover still reads low.',
  },
  {
    question: 'What is the Bortle scale?',
    answer:
      'The Bortle scale rates night sky darkness from 1, a pristine dark site where the Milky Way casts shadows, to 9, an inner-city sky. The page estimates a Bortle class for your location so you know which targets are realistic before you drive anywhere.',
  },
  {
    question: 'What can I actually observe tonight?',
    answer:
      'The targets tab ranks deep sky objects that are up and well placed for your date and location, and the full deep-sky catalog lists every Messier object plus NGC, IC, and Sharpless targets with best months, magnitude, and imaging notes.',
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
        Stargazer answers the question every observer asks at dusk: is tonight worth setting up for?
        Search a location and it scores the night from cloud cover, moon phase and illumination,
        seeing, transparency, and ground conditions, then tells you the best window to be outside and
        when true astronomical darkness starts and ends.
      </p>
      <p className="mb-4 text-foreground">
        The tabs go deeper. Conditions breaks the night down hour by hour; targets ranks deep sky
        objects that are actually up from your latitude on your date; events lists visible ISS
        passes; launches tracks upcoming rocket launches. An estimated Bortle class for the search
        location tells you how much light pollution you are fighting.
      </p>
      <p className="mb-6 text-foreground">
        Browse the full{' '}
        <Link href="/stargazer/objects" className="text-primary underline underline-offset-2">
          deep-sky object catalog
        </Link>{' '}
        for observing notes on every Messier, NGC, IC, and Sharpless target. When aurora is the
        target instead, check the{' '}
        <Link href="/space-weather" className="text-primary underline underline-offset-2">
          space weather monitor
        </Link>{' '}
        for the Kp index, and use{' '}
        <Link href="/radar" className="text-primary underline underline-offset-2">
          live radar
        </Link>{' '}
        to see whether the clouds are clearing in time.
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
