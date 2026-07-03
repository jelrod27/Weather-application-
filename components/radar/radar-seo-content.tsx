import Link from 'next/link'

const BASE_URL = 'https://www.16bitweather.co'

export const RADAR_FAQS = [
  {
    question: 'What radar data does 16 Bit Weather use?',
    answer:
      'The live radar map uses RainViewer global precipitation composites with animated frames, layered with NWS severe weather alerts, SPC convective outlooks, and storm reports when available.',
  },
  {
    question: 'Is the weather radar free to use?',
    answer:
      'Yes. The radar terminal at 16bitweather.co is free — search any city, animate recent precipitation, and jump to related warnings or severe outlook tools without an account.',
  },
  {
    question: 'How often does the radar update?',
    answer:
      'RainViewer frames refresh as new composite imagery is published, typically every few minutes. Severe weather overlays pull from live NWS and SPC sources for active warnings and outlooks.',
  },
  {
    question: 'Can I see tornado or severe thunderstorm warnings on the radar?',
    answer:
      'Yes. Enable NWS alert overlays on the map or open the Warnings command center for filtered tornado, severe thunderstorm, flood, and winter alerts with map context.',
  },
] as const

export function buildRadarFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: RADAR_FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}

/**
 * Server-rendered crawlable copy for /radar. Stays in the DOM while the
 * fullscreen client map loads on top.
 */
export default function RadarSeoContent() {
  return (
    <article
      className="mx-auto max-w-3xl px-4 py-8 text-sm leading-relaxed text-zinc-300"
      aria-label="About the live weather radar"
    >
      <h1 className="mb-4 text-2xl font-bold font-mono text-cyan-300">
        Live Weather Radar Map — Global Precipitation &amp; Severe Overlays
      </h1>
      <p className="mb-4">
        Track rain, snow, and thunderstorms on an animated global precipitation radar powered by
        RainViewer. Search any city, scrub through recent frames, and layer NWS warnings, SPC
        outlooks, and storm reports to see where severe weather intersects with active precipitation.
      </p>
      <p className="mb-4">
        Use this page as your radar command center during active weather: zoom to your location,
        watch echo tops move, then jump to the{' '}
        <Link href="/warnings" className="text-cyan-400 underline underline-offset-2">
          Warnings command center
        </Link>{' '}
        for filtered NWS alerts or the{' '}
        <Link href="/severe" className="text-cyan-400 underline underline-offset-2">
          Severe Weather outlook
        </Link>{' '}
        for SPC convective outlook maps and live warning panels.
      </p>
      <p className="mb-6">
        Data sources include RainViewer radar composites, National Weather Service alert polygons,
        Storm Prediction Center outlooks, and Iowa Environmental Mesonet storm reports. All overlays
        are free on {BASE_URL.replace('https://', '')} — no account required.
      </p>

      <h2 className="mb-3 text-lg font-semibold font-mono text-white">Radar FAQ</h2>
      <dl className="space-y-4">
        {RADAR_FAQS.map((faq) => (
          <div key={faq.question}>
            <dt className="font-semibold text-white">{faq.question}</dt>
            <dd className="mt-1 text-zinc-400">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}
