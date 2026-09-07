import Link from 'next/link'
import { safeJsonLd } from '@/lib/utils'

export const WINTER_FAQS = [
  {
    question: 'What is the difference between a winter storm warning and a winter weather advisory?',
    answer:
      'A Winter Storm Warning means hazardous winter weather that meets local warning criteria is expected or already happening, and travel is likely to become dangerous. An advisory covers lesser amounts of snow, sleet, or freezing rain that are still enough to make roads and sidewalks treacherous.',
  },
  {
    question: 'What does a blizzard warning actually require?',
    answer:
      'A Blizzard Warning is about wind and visibility, not snowfall totals. It needs sustained wind or frequent gusts of 35 mph or more together with falling or blowing snow that cuts visibility below a quarter mile for at least three hours.',
  },
  {
    question: 'Why are ice storm warnings treated so seriously?',
    answer:
      'Freezing rain glazes every exposed surface. An Ice Storm Warning is issued for damaging accumulations of ice, generally a quarter inch or more, which is enough to bring down tree limbs and power lines and to make roads effectively impassable.',
  },
  {
    question: 'How often does this page update?',
    answer:
      'The list is drawn from the live National Weather Service alert feed and refreshes every five minutes, ordered with the most severe Warning Events first. When the country is quiet it will correctly show no active winter alerts.',
  },
] as const

export function buildWinterFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: WINTER_FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}

/** Server-rendered crawlable copy for /winter, below the live alert list. */
export default function WinterSeoContent() {
  return (
    <section
      className="mx-auto max-w-3xl px-4 py-10 font-mono text-sm leading-relaxed text-muted-foreground"
      aria-labelledby="winter-seo-heading"
      data-testid="winter-seo-content"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(buildWinterFaqJsonLd()) }}
      />
      <h2
        id="winter-seo-heading"
        className="mb-4 text-xl font-bold uppercase tracking-wide text-primary"
      >
        About the winter weather watch
      </h2>
      <p className="mb-4 text-foreground">
        This page filters the national National Weather Service alert feed down to the cold-season
        products: winter storm watches and warnings, winter weather advisories, blizzard warnings,
        ice storm warnings, lake effect snow, extreme cold and wind chill, hard freeze, and frost.
        Each row shows the severity the forecaster assigned, the counties or zones covered, the
        headline, and how long the alert has left to run.
      </p>
      <p className="mb-4 text-foreground">
        Severity is the fastest way to triage the list. Extreme and Severe rows are the ones that
        close roads and schools; Moderate and Minor are usually advisories, where the risk is a slick
        commute rather than a shut-down. Because the feed is national, an empty page in July is the
        expected result, not a fault.
      </p>
      <p className="mb-6 text-foreground">
        For the polygon, the full official instruction, and pin-first ranking on any of these events,
        open the{' '}
        <Link href="/warnings" className="text-primary underline underline-offset-2">
          warning desk
        </Link>
        . Watch the snow band itself on{' '}
        <Link href="/radar" className="text-primary underline underline-offset-2">
          live radar
        </Link>
        , or read what drives these storms in the{' '}
        <Link href="/weather-systems" className="text-primary underline underline-offset-2">
          weather systems guides
        </Link>
        .
      </p>

      <h3 className="mb-3 text-lg font-semibold text-primary">Winter weather FAQ</h3>
      <dl className="space-y-4">
        {WINTER_FAQS.map((faq) => (
          <div key={faq.question}>
            <dt className="font-semibold text-foreground">{faq.question}</dt>
            <dd className="mt-1">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
