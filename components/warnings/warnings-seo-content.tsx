import Link from 'next/link'
import { safeJsonLd } from '@/lib/utils'

export const WARNINGS_FAQS = [
  {
    question: 'What warnings does the warning desk show?',
    answer:
      'Every active National Weather Service warning, watch, and advisory for the United States — Tornado, Severe Thunderstorm, Flash Flood, winter, marine, and heat products — each with its official headline, hazard, impacts, instruction, and alert polygon.',
  },
  {
    question: 'How does the desk decide which warnings are local to me?',
    answer:
      'Set a pin and the local lane lists only Warning Events whose polygon covers it, ranked by event type and then CAP severity, urgency, and certainty. Events that sit close to the pin without covering it appear in a nearby strip, and geometry that cannot be resolved is never treated as local.',
  },
  {
    question: 'How fresh is the warning data?',
    answer:
      'Source Messages are pulled from the NWS CAP feed every minute, and the desk reports its Freshness State as fresh, delayed, or unavailable so you can tell whether you are looking at current data or a stale snapshot.',
  },
  {
    question: 'Can I be notified when a warning covers my location?',
    answer:
      'Yes. Bitwatch sends email and optional browser push Delivery for a Protected Place with no account required. It is a supplemental heads-up only — it does not replace Wireless Emergency Alerts, NOAA Weather Radio, or instructions from local officials.',
  },
] as const

export function buildWarningsFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: WARNINGS_FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}

/**
 * Server-rendered crawlable copy for /warnings. The live desk bails out of
 * SSR (it reads search params), so this section carries the page's evergreen
 * explanation of what the warning desk is and how to read it.
 */
export default function WarningsSeoContent() {
  return (
    <section
      className="mx-auto max-w-3xl px-4 py-10 font-mono text-sm leading-relaxed text-muted-foreground"
      aria-labelledby="warnings-seo-heading"
      data-testid="warnings-seo-content"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(buildWarningsFaqJsonLd()) }}
      />
      <h2
        id="warnings-seo-heading"
        className="mb-4 text-xl font-bold uppercase tracking-wide text-primary"
      >
        About the NWS warning desk
      </h2>
      <p className="mb-4 text-foreground">
        This is a live desk for United States National Weather Service warnings, built around one
        question: does this warning cover the place you care about? Drop a pin and the local lane
        lists the Warning Events whose polygon contains it, ordered by event type first — Tornado,
        then Flash Flood, then Severe Thunderstorm — and then by the CAP severity, urgency, and
        certainty the forecaster assigned. A nearby strip catches events that come close without
        covering you, and everything else stays in the national stream.
      </p>
      <p className="mb-4 text-foreground">
        Open any Warning Event for the full official text — hazard, source, impacts, and the NWS
        instruction — beside the alert polygon on a map, Storm Prediction Center Day 1 risk context,
        and recent storm reports. Ended, expired, and cancelled events drop out of the ranked lists
        rather than sorting to the bottom; an expiry is never an all clear.
      </p>
      <p className="mb-6 text-foreground">
        The desk is free and needs no account. To be told about a warning instead of checking for
        one, subscribe to{' '}
        <Link href="/alerts" className="text-primary underline underline-offset-2">
          Bitwatch alerts
        </Link>
        , watch the storms themselves on{' '}
        <Link href="/radar" className="text-primary underline underline-offset-2">
          live radar
        </Link>
        , or read the day ahead on the{' '}
        <Link href="/severe" className="text-primary underline underline-offset-2">
          severe weather outlook
        </Link>
        .
      </p>

      <h3 className="mb-3 text-lg font-semibold text-primary">Warnings FAQ</h3>
      <dl className="space-y-4">
        {WARNINGS_FAQS.map((faq) => (
          <div key={faq.question}>
            <dt className="font-semibold text-foreground">{faq.question}</dt>
            <dd className="mt-1">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
