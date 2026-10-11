import Link from 'next/link'
import { safeJsonLd } from '@/lib/utils'

export const NEWS_FAQS = [
  {
    question: 'Where do these stories come from?',
    answer:
      'Official and scientific feeds include USGS, NASA, the National Weather Service, the Storm Prediction Center, the National Hurricane Center, and publishers such as ScienceDaily and Phys.org. Open Source coverage to see which feeds were checked and any unavailable or incomplete results.',
  },
  {
    question: 'How current is the feed?',
    answer:
      'Each source has its own freshness budget. Source coverage shows the last successful check and any limits. The header shows when the response was assembled, which may reuse earlier source checks. Delayed reports cannot verify current conditions; an unavailable source does not mean there are no hazards.',
  },
  {
    question: 'Can I follow only one kind of hazard?',
    answer:
      'Yes. The category filter narrows the wire to earthquakes, volcanoes, severe weather, hurricanes, space, climate, or general science, and the search box matches on headline, description, source, and location.',
  },
  {
    question: 'Is this a substitute for official warnings?',
    answer:
      'No. This is a national and global overview with a bounded selection of reports. Happening Now is limited to verified active NWS warnings. Use the warning desk for coverage of a specific place and follow instructions from the issuing agency.',
  },
] as const

export function buildNewsFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: NEWS_FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}

/** Server-rendered crawlable copy for /news, below the live wire. */
export default function NewsSeoContent() {
  return (
    <section
      className="mx-auto max-w-3xl px-4 py-10 font-mono text-sm leading-relaxed text-muted-foreground"
      aria-labelledby="news-seo-heading"
      data-testid="news-seo-content"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(buildNewsFaqJsonLd()) }}
      />
      <h2
        id="news-seo-heading"
        className="mb-4 text-xl font-bold uppercase tracking-wide text-primary"
      >
        About the Earth and space news wire
      </h2>
      <p className="mb-4 text-foreground">
        This is a hazard wire rather than a headline aggregator. It pulls from the agencies that
        actually issue the information — USGS for earthquakes and volcano alerts, the National
        Weather Service and Storm Prediction Center for severe weather, the National Hurricane Center
        for the tropics, NASA and NOAA for space and climate — and mixes in science publishers for
        the longer explanations.
      </p>
      <p className="mb-4 text-foreground">
        Happening Now shows verified active NWS warnings. Outlooks, event reports, and science
        reading carry separate labels, and delayed reports remain outside the active section.
        Filter by category or search across headlines, sources, and place names to follow one story.
      </p>
      <p className="mb-6 text-foreground">
        Follow anything you find here into the tools: the{' '}
        <Link href="/warnings" className="text-primary underline underline-offset-2">
          warning desk
        </Link>{' '}
        for live alerts,{' '}
        <Link href="/earth-sciences" className="text-primary underline underline-offset-2">
          earth sciences
        </Link>{' '}
        for the earthquake catalog,{' '}
        <Link href="/space-weather" className="text-primary underline underline-offset-2">
          space weather
        </Link>{' '}
        for solar activity, or the{' '}
        <Link href="/blog" className="text-primary underline underline-offset-2">
          weather blog
        </Link>{' '}
        for the weekly write-up.
      </p>

      <h3 className="mb-3 text-lg font-semibold text-primary">News feed FAQ</h3>
      <dl className="space-y-4">
        {NEWS_FAQS.map((faq) => (
          <div key={faq.question}>
            <dt className="font-semibold text-foreground">{faq.question}</dt>
            <dd className="mt-1">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
