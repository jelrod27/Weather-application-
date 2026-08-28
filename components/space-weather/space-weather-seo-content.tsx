import Link from 'next/link'

const BASE_URL = 'https://www.16bitweather.co'

export const SPACE_WEATHER_FAQS = [
  {
    question: 'What is a space weather monitor?',
    answer:
      'A space weather monitor tracks solar and geomagnetic conditions in near real time — solar flares (X-ray flux), the planetary Kp index, solar wind speed and density, sunspots, and aurora outlooks — so you can see storm risk as it develops.',
  },
  {
    question: 'What does the Kp index measure?',
    answer:
      'The Kp index is a 0–9 scale of global geomagnetic activity. Higher Kp means a stronger geomagnetic storm and a better chance of aurora at lower latitudes. Live Kp and recent history are shown on this page from NOAA SWPC data.',
  },
  {
    question: 'How do I track solar flares and solar storms?',
    answer:
      'Watch GOES X-ray flux for flare class (C, M, X), check SWPC scales for radio blackout and radiation storm levels, and follow solar wind and Kp for geomagnetic response. This solar flare monitor and storm tracker combines those feeds in one terminal.',
  },
  {
    question: 'Where does 16 Bit Weather get space weather data?',
    answer:
      'Primary sources are NOAA Space Weather Prediction Center (scales, Kp, solar wind, alerts), NASA SDO imagery, and ESA/NASA SOHO coronagraph frames. Data refreshes automatically while you keep the page open.',
  },
] as const

export function buildSpaceWeatherFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: SPACE_WEATHER_FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}

export function formatSwpcTimeTag(timeTag: string): { iso: string; label: string } | null {
  const trimmed = timeTag.trim()
  if (!trimmed) return null
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)
  const withT = /T/.test(trimmed) ? trimmed : trimmed.replace(' ', 'T')
  const normalized = hasZone ? withT : `${withT}Z`
  const ms = Date.parse(normalized)
  if (Number.isNaN(ms)) return null
  const iso = new Date(ms).toISOString()
  return { iso, label: `${iso.slice(0, 16).replace('T', ' ')} UTC` }
}

export function buildSpaceWeatherAppJsonLd(dateModified?: string): {
  '@context': string
  '@type': 'WebApplication'
  name: string
  description: string
  url: string
  applicationCategory: string
  operatingSystem: string
  dateModified?: string
  offers: { '@type': 'Offer'; price: string; priceCurrency: string }
} {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Space Weather Monitor',
    description:
      'Free solar flare monitor and space weather tracker with live Kp index, solar wind, aurora forecast, and geomagnetic storm alerts.',
    url: `${BASE_URL}/space-weather`,
    applicationCategory: 'WeatherApplication',
    operatingSystem: 'Any',
    ...(dateModified ? { dateModified } : {}),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  }
}

interface SpaceWeatherSeoContentProps {
  kp?: number | null
  kpTimeTag?: string | null
}

/**
 * Server-rendered crawlable copy for /space-weather. Renders below the
 * interactive terminal so Google can index monitor/tracker intent copy.
 */
export default function SpaceWeatherSeoContent({
  kp = null,
  kpTimeTag = null,
}: SpaceWeatherSeoContentProps) {
  const updated = kpTimeTag ? formatSwpcTimeTag(kpTimeTag) : null

  return (
    <article
      className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-weather-muted font-mono"
      aria-label="About the space weather monitor"
      data-testid="space-weather-seo-content"
    >
      {kp != null && updated ? (
        <p className="mb-4 text-weather-text">
          Last NOAA SWPC Kp reading:{' '}
          <strong className="text-weather-primary">{kp.toFixed(1)}</strong>
          {' '}at{' '}
          <time dateTime={updated.iso}>{updated.label}</time>
          .
        </p>
      ) : null}
      <h2 className="mb-4 text-xl font-bold text-weather-primary uppercase tracking-wide">
        Solar Flare Monitor &amp; Space Weather Tracker
      </h2>
      <p className="mb-4 text-weather-text">
        Use this free space weather monitor to follow solar activity in real time: X-ray flare
        class, planetary Kp index, solar wind plasma, sunspot regions, SWPC scales, and aurora
        forecast guidance. It is built for anyone watching geomagnetic storms — from aurora
        chasers to radio operators and aviation weather hobbyists.
      </p>
      <p className="mb-4 text-weather-text">
        Start with current scales and alerts, then drill into Kp history, solar wind speed, and
        flare timelines. Pair storm watches with the{' '}
        <Link href="/stargazer" className="text-weather-primary underline underline-offset-2">
          Stargazer sky forecast
        </Link>{' '}
        when aurora potential rises, or read the weekly context on the{' '}
        <Link href="/blog" className="text-weather-primary underline underline-offset-2">
          weather blog
        </Link>
        .
      </p>
      <p className="mb-6 text-weather-text">
        All feeds on {BASE_URL.replace('https://', '')}/space-weather are free and update while the
        page is open — no account required.
      </p>

      <h3 className="mb-3 text-lg font-semibold text-weather-primary">Space Weather FAQ</h3>
      <dl className="space-y-4">
        {SPACE_WEATHER_FAQS.map((faq) => (
          <div key={faq.question}>
            <dt className="font-semibold text-weather-text">{faq.question}</dt>
            <dd className="mt-1">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}
