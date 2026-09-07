import Link from 'next/link'
import { safeJsonLd } from '@/lib/utils'

export const ALERTS_FAQS = [
  {
    question: 'Which warnings does Bitwatch send?',
    answer:
      'US National Weather Service Tornado Warnings, Severe Thunderstorm Warnings, and Flash Flood Warnings. You choose which of the three you want when you subscribe, and you can change the selection later from the manage link in any Delivery.',
  },
  {
    question: 'Do I need an account?',
    answer:
      'No. Confirm an email address and you are a Subscriber. A signed manage link in every email lets you edit your Protected Place, change which warnings you receive, turn on browser push, or unsubscribe — no password, no profile.',
  },
  {
    question: 'How is my location matched to a warning?',
    answer:
      'By polygon. A Protected Place is a single confirmed coordinate, and a Delivery goes out only when the Warning Event polygon actually covers it. Coverage that cannot be resolved is never treated as a match, which is what keeps the volume low enough to be worth reading.',
  },
  {
    question: 'Can this replace my phone’s emergency alerts?',
    answer:
      'No, and it is not meant to. Bitwatch is a supplemental heads-up. Keep Wireless Emergency Alerts on, keep a NOAA Weather Radio if you have one, and follow local officials. A cancellation or an expiry is also not an all clear.',
  },
] as const

export function buildAlertsFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: ALERTS_FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}

/** Server-rendered crawlable copy for /alerts, below the signup form. */
export default function AlertsSeoContent() {
  return (
    <section
      className="mx-auto max-w-3xl px-4 py-10 font-mono text-sm leading-relaxed text-muted-foreground"
      aria-labelledby="alerts-seo-heading"
      data-testid="alerts-seo-content"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(buildAlertsFaqJsonLd()) }}
      />
      <h2
        id="alerts-seo-heading"
        className="mb-4 text-xl font-bold uppercase tracking-wide text-primary"
      >
        How Bitwatch alerts work
      </h2>
      <p className="mb-4 text-foreground">
        Bitwatch watches the National Weather Service feed for you. Every minute it pulls new Source
        Messages, tracks each Warning Event through issuance, material update, cancellation, and
        expiry, and checks whether the alert polygon covers your Protected Place. When it does, you
        get a Delivery by email and, if you enable it, browser push.
      </p>
      <p className="mb-4 text-foreground">
        Each Delivery carries the official headline, what the forecaster says the hazard and impacts
        are, the NWS instruction to follow, and how long the Warning Event runs, plus manage and
        unsubscribe links. You are told about material changes rather than every message, so a long
        tornado event does not turn into a stream of near-identical emails.
      </p>
      <p className="mb-6 text-foreground">
        Set the pin above, pick the warnings you want, and confirm the email. Then browse every
        active alert on the{' '}
        <Link href="/warnings" className="text-primary underline underline-offset-2">
          warning desk
        </Link>
        , watch the storm on{' '}
        <Link href="/radar" className="text-primary underline underline-offset-2">
          live radar
        </Link>
        , or check the day ahead on the{' '}
        <Link href="/severe" className="text-primary underline underline-offset-2">
          severe weather outlook
        </Link>
        .
      </p>

      <h3 className="mb-3 text-lg font-semibold text-primary">Weather alerts FAQ</h3>
      <dl className="space-y-4">
        {ALERTS_FAQS.map((faq) => (
          <div key={faq.question}>
            <dt className="font-semibold text-foreground">{faq.question}</dt>
            <dd className="mt-1">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
