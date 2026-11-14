import Link from 'next/link'
import { safeJsonLd } from '@/lib/utils'
import type { ReactElement } from 'react'

export const WINTER_FAQS = [
  {
    question: 'What does the national snow probability map show?',
    answer: 'The Weather Prediction Center map shows the chance of snowfall exceeding a selected 4, 8, or 12 inch threshold during the displayed source period. It is regional guidance, not an expected local accumulation or snow depth forecast. Check the exact valid times beside the map; Day 1 is a source forecast period, not necessarily your local calendar day.',
  },
  {
    question: 'How are ice probability and winter impacts different?',
    answer: 'The ice layer shows the chance of ice accumulation exceeding 0.25 inches. The Winter Storm Severity Index shows regional impact categories from winter conditions. An impact category is not a probability or an accumulation amount, and neither product guarantees road conditions or school closure decisions.',
  },
  {
    question: 'What is included in the local winter forecast?',
    answer: 'Search for a city or ZIP code in the contiguous United States to load NWS snow and ice accumulation blocks, hourly temperature, wind, precipitation chance, and source-written forecast periods for the next 72 hours. Local totals include known, non-overlapping published intervals wholly within that window. Ongoing and boundary-crossing blocks are displayed whole but excluded from totals; they do not estimate the amount remaining. Missing or incomplete data is marked unknown or partial.',
  },
  {
    question: 'How often does the Winter forecast refresh?',
    answer: 'While this page is visible, it checks its selected outlook, local forecast, and winter alerts every five minutes. Source issuance times, validity periods, and retrieval times are shown separately. A failed refresh can retain the same selection with a stale label; expired national overlays are hidden. A source outage is never reported as no winter risk.',
  },
  {
    question: 'Can I share a local forecast without an account?',
    answer: 'Yes. Selecting a location adds its coordinates and place name to the page address. Use Copy forecast link or share your browser address to reopen that location. Forecasts change as official guidance updates, so a shared link opens the latest available forecast rather than a frozen forecast image.',
  },
] as const

export function buildWinterFaqJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: WINTER_FAQS.map(faq => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })),
  }
}

/** Crawlable education stays in the server tree outside the interactive workspace. */
export default function WinterSeoContent(): ReactElement {
  return <section className="mx-auto max-w-4xl px-4 py-10 text-sm leading-relaxed text-muted-foreground" aria-labelledby="winter-seo-heading" data-testid="winter-seo-content">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(buildWinterFaqJsonLd()) }} />
    <h2 id="winter-seo-heading" className="mb-4 text-xl font-mono font-bold uppercase tracking-wide text-primary">Read the winter forecast</h2>
    <div className="space-y-4 mb-8">
      <p>Winter forecasts answer several different questions. Probabilities describe the chance of crossing a threshold. Local accumulation describes a forecast amount over published intervals. The Winter Storm Severity Index describes potential regional impacts. None of these is snow depth: existing snow on the ground can settle, melt, or drift independently of new snowfall.</p>
      <p>National outlooks cover the contiguous United States. Their broad contours do not resolve every mountain slope, neighborhood, or lake-effect band. Use your selected NWS point forecast for local amounts and read the forecaster narrative for timing and uncertainty. A six-hour accumulation block cannot establish the exact minute snow starts or stops. Forecast details can change as a storm develops.</p>
      <p>The winter alert panel supports the forecast with official watches, warnings, and advisories. With a place selected, it requests alerts at that point; otherwise it shows the national winter feed. An empty successful result and an unavailable source have different meanings. Alert severity alone cannot predict whether a road is passable.</p>
      <p>Read full alert instructions at the <Link href="/warnings" className="text-primary underline underline-offset-4">warning desk</Link>, follow precipitation on <Link href="/radar" className="text-primary underline underline-offset-4">live radar</Link>, and explore how winter storms form in the <Link href="/weather-systems" className="text-primary underline underline-offset-4">weather systems guides</Link>. Official forecasts and source timestamps are linked in each panel. This independent presentation uses NWS and WPC guidance and does not claim better forecast accuracy than the original sources.</p>
    </div>
    <h3 className="mb-4 text-lg font-mono font-bold text-primary">Winter forecast FAQ</h3>
    <dl className="space-y-5">{WINTER_FAQS.map(faq => <div key={faq.question}><dt className="font-semibold text-foreground">{faq.question}</dt><dd className="mt-1">{faq.answer}</dd></div>)}</dl>
  </section>
}
