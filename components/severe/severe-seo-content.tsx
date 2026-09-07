import Link from 'next/link'
import { safeJsonLd } from '@/lib/utils'

export const SEVERE_FAQS = [
  {
    question: 'What is an SPC convective outlook?',
    answer:
      'It is the Storm Prediction Center forecast for organised thunderstorm risk across the United States. Day 1 covers today into tonight, Day 2 tomorrow, and Day 3 the day after, and each map shades the country by how likely severe storms are and how bad they could get.',
  },
  {
    question: 'What do the risk categories mean?',
    answer:
      'From lowest to highest: General Thunderstorms, Marginal, Slight, Enhanced, Moderate, and High. Marginal means isolated severe storms are possible; Enhanced means numerous severe storms are expected; Moderate and High are reserved for outbreaks with a widespread damaging or life-threatening potential.',
  },
  {
    question: 'Why does Day 3 only show a categorical outlook?',
    answer:
      'The Storm Prediction Center does not publish separate tornado, wind, and hail probability outlooks that far out, so Day 3 offers the categorical map only. Day 1 and Day 2 add the individual hazard layers.',
  },
  {
    question: 'What is the difference between a watch and a warning?',
    answer:
      'An outlook or watch says conditions favour severe storms over a region and gives you time to prepare. A warning means a specific storm is happening now and covers a much smaller polygon — those Warning Events are listed live below the outlook maps and on the warning desk.',
  },
] as const

export function buildSevereFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: SEVERE_FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}

/** Server-rendered crawlable copy for /severe, below the outlook maps. */
export default function SevereSeoContent() {
  return (
    <section
      className="mx-auto max-w-3xl px-4 py-10 font-mono text-sm leading-relaxed text-muted-foreground"
      aria-labelledby="severe-seo-heading"
      data-testid="severe-seo-content"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(buildSevereFaqJsonLd()) }}
      />
      <h2
        id="severe-seo-heading"
        className="mb-4 text-xl font-bold uppercase tracking-wide text-primary"
      >
        How to read the severe weather outlook
      </h2>
      <p className="mb-4 text-foreground">
        This page pairs the two halves of a severe weather day. On top are the Storm Prediction
        Center convective outlooks for Day 1, Day 2, and Day 3: the categorical map that shades the
        country from General Thunderstorms through Marginal, Slight, Enhanced, Moderate, and High,
        plus the individual tornado, wind, and hail layers on Days 1 and 2.
      </p>
      <p className="mb-4 text-foreground">
        Below the maps is what is actually happening right now — active National Weather Service
        Warning Events filtered to tornado, thunderstorm, wind, hail, and flood, sorted with the most
        severe first and refreshed every few minutes. Read the outlook to decide whether today needs
        watching; read the warning list to find out whether a storm is already on someone.
      </p>
      <p className="mb-6 text-foreground">
        For polygon-level detail on a single event, open the{' '}
        <Link href="/warnings" className="text-primary underline underline-offset-2">
          warning desk
        </Link>
        . To watch the storms move, use{' '}
        <Link href="/radar" className="text-primary underline underline-offset-2">
          live radar
        </Link>
        , and to be told when a warning covers your pin, subscribe to{' '}
        <Link href="/alerts" className="text-primary underline underline-offset-2">
          Bitwatch alerts
        </Link>
        .
      </p>

      <h3 className="mb-3 text-lg font-semibold text-primary">Severe weather FAQ</h3>
      <dl className="space-y-4">
        {SEVERE_FAQS.map((faq) => (
          <div key={faq.question}>
            <dt className="font-semibold text-foreground">{faq.question}</dt>
            <dd className="mt-1">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
