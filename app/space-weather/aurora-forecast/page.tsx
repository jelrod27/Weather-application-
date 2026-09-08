import type { Metadata } from 'next'
import Link from 'next/link'
import PageWrapper from '@/components/page-wrapper'
import IntentPageShell, {
  buildIntentPageJsonLd,
  type IntentFaq,
} from '@/components/space-weather/intent-page-shell'
import { formatSwpcTimeTag } from '@/components/space-weather/space-weather-seo-content'
import { getSpaceWeatherIntent, intentHref } from '@/lib/space-weather/intents'
import { kpLevel } from '@/lib/space-weather/kp-scale'
import { fetchSwpcJson } from '@/lib/services/swpc-proxy'
import { parseKpForecast, parsePlanetaryKpIndex, type KpSample } from '@/lib/services/swpc-kp'
import { safeJsonLd } from '@/lib/utils'

const BASE_URL = 'https://www.16bitweather.co'
const INTENT = getSpaceWeatherIntent('aurora-forecast')!
const CANONICAL = `${BASE_URL}${intentHref(INTENT.slug)}`
const OG_IMAGE = `/api/og?title=${encodeURIComponent('Aurora Forecast Tonight')}&subtitle=${encodeURIComponent('Live Kp and the Viewline')}`

const KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'
const KP_FORECAST_URL =
  'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json'

export const metadata: Metadata = {
  title: INTENT.title,
  description: INTENT.description,
  keywords: INTENT.keywords,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: INTENT.title,
    description: INTENT.description,
    url: CANONICAL,
    siteName: '16 Bit Weather',
    type: 'website',
    locale: 'en_US',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Aurora Forecast Tonight' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: INTENT.title,
    description: INTENT.description,
    images: [OG_IMAGE],
  },
}

/** Live values are stamped into the copy, so refresh alongside the hub. */
export const revalidate = 300

/** Current planetary Kp, or null when SWPC is unreachable. */
async function loadCurrentKp(): Promise<KpSample | null> {
  try {
    const payload = await fetchSwpcJson(KP_URL, { next: { revalidate: 300 } })
    return parsePlanetaryKpIndex(payload).current
  } catch (error) {
    console.error('[space-weather/aurora-forecast]', error)
    return null
  }
}

/** Kp expected over the next day, or null when the feed carries nothing ahead. */
async function loadTonightOutlook(): Promise<{
  expected: number
  maxExpected: number
  hours: number
} | null> {
  try {
    const payload = await fetchSwpcJson(KP_FORECAST_URL, { next: { revalidate: 900 } })
    if (!Array.isArray(payload)) return null

    // parseKpForecast owns the window: the eight three-hour blocks at or after
    // now, keeping the one already in progress. Filtering here as well used to
    // drop that block, so the outlook skipped the most immediate period.
    const forecast = parseKpForecast(payload)
    return forecast ? { ...forecast, hours: forecast.blocks * 3 } : null
  } catch (error) {
    console.error('[space-weather/aurora-forecast]', error)
    return null
  }
}

const FAQS: readonly IntentFaq[] = [
  {
    question: 'Will I see the aurora tonight?',
    answer:
      'Compare the live Kp at the top of this page with the viewline it puts you on, then check the rest: full darkness, clear sky, a low or absent moon, no city glow to your north, and an unobstructed northern horizon. Kp decides whether the aurora is within reach of your latitude at all; the rest of that list decides whether you actually see it.',
  },
  {
    question: 'What Kp do I need at my latitude?',
    answer:
      'From central Alaska, northern Canada or northern Scandinavia, quiet conditions are often enough. The far north of the lower 48 generally needs Kp 5, the northern tier around Kp 6, and states such as Iowa, New York or Washington want Kp 7. Seeing it from the latitude of Kansas or Virginia takes a G5 storm, which happens a few times a solar cycle.',
  },
  {
    question: 'What time of night and which direction?',
    answer:
      'Look north, and concentrate on the hours around local midnight, when your longitude rotates under the most active part of the auroral oval. Displays arrive in substorm bursts that brighten for twenty to forty minutes and then fade, so a blank sky at 10pm says little about midnight. Autumn and spring weeks are statistically the most productive.',
  },
  {
    question: 'How far ahead can an aurora forecast be trusted?',
    answer:
      'The NOAA three-day Kp outlook is a planning tool, not a promise — it tells you which nights are worth staying up for. Real confidence arrives fifteen to sixty minutes ahead, when the solar wind reaches the spacecraft at L1 and you can see whether the magnetic field is pointing south. NOAA’s OVATION model turns that into a thirty-minute nowcast of where the oval will sit.',
  },
] as const

export default async function AuroraForecastPage() {
  const [current, outlook] = await Promise.all([loadCurrentKp(), loadTonightOutlook()])
  const updated = current ? formatSwpcTimeTag(current.timeTag) : null
  const level = current ? kpLevel(current.kp) : null

  return (
    <PageWrapper>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(buildIntentPageJsonLd(INTENT, updated?.iso)),
        }}
      />
      <IntentPageShell
        intent={INTENT}
        updatedLabel={updated?.label ?? null}
        reading={
          current && level ? (
            <>
              <p className="text-weather-text">
                Live planetary Kp:{' '}
                <strong className="text-2xl text-weather-primary">
                  {current.kp.toFixed(2)}
                </strong>{' '}
                <span className="text-weather-muted">({level.storm})</span>
              </p>
              <p className="mt-2 text-weather-text">
                On a clear, dark night the aurora may come into view low on the northern horizon
                from about{' '}
                <strong className="text-weather-primary">{level.viewlineExample}</strong>.
              </p>
              {outlook ? (
                <p className="mt-2 text-weather-text">
                  NOAA expects Kp near {outlook.expected.toFixed(1)} over the next {outlook.hours}{' '}
                  hours, peaking around Kp {outlook.maxExpected.toFixed(1)} (
                  {kpLevel(outlook.maxExpected).storm}).
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-weather-text">
              The NOAA planetary K-index feed is not responding right now, so there is no live
              viewline to show. The{' '}
              <Link
                href="/space-weather"
                className="text-weather-primary underline underline-offset-2"
              >
                full monitor
              </Link>{' '}
              retries continuously.
            </p>
          )
        }
        faqs={FAQS}
      >
        <p>
          The place list above is the viewline: roughly where the aurora may become visible low on
          the northern horizon tonight, on a clear and properly dark night, at the Kp being measured
          right now. It is not where the aurora is overhead. Standing under the curtains means being
          inside the auroral oval itself, several degrees of latitude further north. From the
          viewline you are looking at the top of something hundreds of kilometres away, which
          usually reads as a pale grey-green glow rather than the saturated colour in photographs —
          a camera on a few seconds of exposure picks up colour your eyes cannot.
        </p>
        <p>
          Kp is necessary but nowhere near sufficient. Four other things have to line up: real
          darkness, which high-latitude summers never deliver; a clear sky to the north; a moon that
          is down or new; and enough distance from town that its glow does not sit exactly where you
          are looking. A Kp 7 night under overcast is nothing at all, and a Kp 5 night from a dark
          rural site with a clean northern horizon can be memorable. Local cloud, moon phase and
          darkness windows are on the{' '}
          <Link href="/stargazer" className="text-weather-primary underline underline-offset-2">
            stargazer page
          </Link>
          .
        </p>
        <p>
          Timing matters as much as the number. The oval is brightest near magnetic midnight, so the
          hours either side of local midnight are worth more than the whole evening before them, and
          activity comes in substorm bursts that flare for twenty to forty minutes and then subside.
          Give it time rather than checking once. The weeks around the equinoxes are statistically
          the most productive of the year, because the geometry between the Earth&apos;s field and
          the incoming solar wind couples more easily then.
        </p>
        <p>
          Treat the multi-day outlook as a planning tool and nothing firmer. The honest lead time is
          short: the{' '}
          <Link
            href={intentHref('solar-wind')}
            className="text-weather-primary underline underline-offset-2"
          >
            solar wind measured at L1
          </Link>{' '}
          gives fifteen to sixty minutes of warning, and it is the southward magnetic field there,
          not the speed, that decides whether a display happens. The{' '}
          <Link
            href={intentHref('kp-index')}
            className="text-weather-primary underline underline-offset-2"
          >
            Kp index
          </Link>{' '}
          on this page is the confirmation that it already did, which is why aurora chasing rewards
          watching the upstream data and going outside anyway.
        </p>
      </IntentPageShell>
    </PageWrapper>
  )
}
