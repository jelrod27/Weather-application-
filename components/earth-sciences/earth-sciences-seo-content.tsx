import Link from 'next/link'
import { safeJsonLd } from '@/lib/utils'

export const EARTH_SCIENCES_FAQS = [
  {
    question: 'Where does the earthquake data come from?',
    answer:
      'The USGS FDSN event service, proxied through this site so no request goes to USGS from your browser. It covers the last seven days worldwide and refreshes every five minutes, and every row links back to the official USGS event page.',
  },
  {
    question: 'Why does the list start at magnitude 2.5?',
    answer:
      'Below about M2.5 the global catalog becomes a firehose of thousands of very small events, most of them felt by nobody. M2.5 is the practical floor for a readable worldwide list; the filters step up to M4.5+ and M6+ when you only want the significant ones.',
  },
  {
    question: 'What magnitude is actually dangerous?',
    answer:
      'It depends far more on depth, distance, and building stock than on the number alone. As a rough guide, M4.5 is widely felt and rarely damaging, M6 can do serious damage near the epicenter, and M7 and above is a major earthquake. A shallow M5 under a city can be worse than a deep M6 offshore.',
  },
  {
    question: 'What does earthquake depth tell me?',
    answer:
      'Shallow quakes, roughly the top 70 km, put their energy closest to the surface and shake hardest for a given magnitude. Intermediate and deep events, which occur where one plate is subducting beneath another, are felt over a wider area but usually less violently.',
  },
] as const

export function buildEarthSciencesFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: EARTH_SCIENCES_FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}

/** Server-rendered crawlable copy for /earth-sciences, below the quake table. */
export default function EarthSciencesSeoContent() {
  return (
    <section
      className="mx-auto max-w-3xl px-4 py-10 font-mono text-sm leading-relaxed text-muted-foreground"
      aria-labelledby="earth-sciences-seo-heading"
      data-testid="earth-sciences-seo-content"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(buildEarthSciencesFaqJsonLd()) }}
      />
      <h2
        id="earth-sciences-seo-heading"
        className="mb-4 text-xl font-bold uppercase tracking-wide text-primary"
      >
        About the global earthquake monitor
      </h2>
      <p className="mb-4 text-foreground">
        This is a live view of the USGS earthquake catalog for the last seven days, anywhere on
        Earth. Filter by magnitude — M2.5 and up, M4.5 and up, or M6 and up — then sort by time to
        see what just happened or by magnitude to see what mattered most. Magnitudes use the moment
        magnitude scale where USGS publishes one.
      </p>
      <p className="mb-4 text-foreground">
        Each event carries the three numbers that decide how it was felt: magnitude, depth, and the
        location of the epicenter. Depth is the one people skip, and it is often decisive — a shallow
        moderate quake under a populated valley can shake far harder than a deeper, larger one far
        offshore. Click through any row for the full USGS event page with its shake map and felt
        reports.
      </p>
      <p className="mb-6 text-foreground">
        For volcano alerts and the wider hazard wire, see{' '}
        <Link href="/news" className="text-primary underline underline-offset-2">
          Earth and space news
        </Link>
        . For atmospheric hazards, use the{' '}
        <Link href="/warnings" className="text-primary underline underline-offset-2">
          warning desk
        </Link>{' '}
        or{' '}
        <Link href="/severe" className="text-primary underline underline-offset-2">
          severe weather outlooks
        </Link>
        , and for the background science try the{' '}
        <Link href="/education" className="text-primary underline underline-offset-2">
          education hub
        </Link>
        .
      </p>

      <h3 className="mb-3 text-lg font-semibold text-primary">Earthquake FAQ</h3>
      <dl className="space-y-4">
        {EARTH_SCIENCES_FAQS.map((faq) => (
          <div key={faq.question}>
            <dt className="font-semibold text-foreground">{faq.question}</dt>
            <dd className="mt-1">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
