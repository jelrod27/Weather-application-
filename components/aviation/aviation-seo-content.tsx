import Link from 'next/link'
import { safeJsonLd } from '@/lib/utils'

export const AVIATION_FAQS = [
  {
    question: 'What is a METAR and how do I read one?',
    answer:
      'A METAR is the routine surface observation an airport files roughly every hour: wind, visibility, cloud layers, temperature, dew point, and altimeter setting in a fixed order. Flight categories summarise it — VFR, MVFR, IFR, and LIFR — from the ceiling and visibility in that report.',
  },
  {
    question: 'What is the difference between a SIGMET and an AIRMET?',
    answer:
      'Both are in-flight advisories. A SIGMET covers weather hazardous to all aircraft, such as severe turbulence, severe icing, volcanic ash, or thunderstorm areas. An AIRMET covers less extreme conditions that still matter to smaller or lighter aircraft, such as moderate turbulence, moderate icing, and low ceilings.',
  },
  {
    question: 'Where does the live aircraft map get its data?',
    answer:
      'Aircraft positions come from community ADS-B receivers, so coverage is best over populated areas and can thin out over oceans and remote terrain. Weather layers come from NOAA Aviation Weather Center products and the National Weather Service.',
  },
  {
    question: 'Can I use this for flight planning?',
    answer:
      'No. Everything here is educational and illustrative, including the airport misery scores. Use official sources and an approved briefing service for dispatch, flight planning, and any operational decision.',
  },
] as const

export function buildAviationFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: AVIATION_FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}

/**
 * Server-rendered crawlable copy for /aviation. The tracker itself reads
 * search params and so bails out of SSR; this section renders outside that
 * boundary and carries the page's evergreen aviation weather explanation.
 */
export default function AviationSeoContent() {
  return (
    <section
      className="mx-auto max-w-3xl px-4 py-10 font-mono text-sm leading-relaxed text-muted-foreground"
      aria-labelledby="aviation-seo-heading"
      data-testid="aviation-seo-content"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(buildAviationFaqJsonLd()) }}
      />
      <h2
        id="aviation-seo-heading"
        className="mb-4 text-xl font-bold uppercase tracking-wide text-primary"
      >
        About the aviation weather tracker
      </h2>
      <p className="mb-4 text-foreground">
        This page puts live traffic and live weather on the same screen. The sky map plots aircraft
        from ADS-B broadcasts in near real time; click one, or search a callsign, to see its
        identity, altitude, ground speed, track, and resolved route, then read a weather brief for
        the origin and destination airports.
      </p>
      <p className="mb-4 text-foreground">
        Underneath sits the meteorology a flight actually runs into. The hub board scores major
        airports from their current METAR observations and in-flight advisories, and the detail
        console opens SIGMETs, AIRMETs, turbulence built from pilot reports, and raw METARs along a
        route you enter. It is a good way to see why a delay is happening long before an airline
        explains it.
      </p>
      <p className="mb-6 text-foreground">
        Everything here is educational, not operational. For weather on the ground instead of in the
        air, try{' '}
        <Link href="/radar" className="text-primary underline underline-offset-2">
          live radar
        </Link>
        , the{' '}
        <Link href="/warnings" className="text-primary underline underline-offset-2">
          warning desk
        </Link>
        , or the{' '}
        <Link href="/travel" className="text-primary underline underline-offset-2">
          travel hub
        </Link>{' '}
        if you are driving instead.
      </p>

      <h3 className="mb-3 text-lg font-semibold text-primary">Aviation weather FAQ</h3>
      <dl className="space-y-4">
        {AVIATION_FAQS.map((faq) => (
          <div key={faq.question}>
            <dt className="font-semibold text-foreground">{faq.question}</dt>
            <dd className="mt-1">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
