import type { Metadata } from 'next'
import Link from 'next/link'
import PageWrapper from '@/components/page-wrapper'
import IntentPageShell, {
  buildIntentMetadata,
  buildIntentPageJsonLd,
  type IntentFaq,
} from '@/components/space-weather/intent-page-shell'
import { formatSwpcTimeTag } from '@/lib/space-weather/time-tag'
import { getSpaceWeatherIntent, intentHref } from '@/lib/space-weather/intents'
import { loadCurrentFlare } from '@/lib/space-weather/xray'
import { safeJsonLd } from '@/lib/utils'

const INTENT = getSpaceWeatherIntent('solar-flares')!

export const metadata: Metadata = buildIntentMetadata(INTENT, {
  title: 'Solar Flare Monitor',
  subtitle: 'Live GOES X-Ray Class',
})

/** Live values are stamped into the copy, so refresh alongside the hub. */
export const revalidate = 300

const FAQS: readonly IntentFaq[] = [
  {
    question: 'What do the letters A, B, C, M and X mean?',
    answer:
      'These classes describe X-ray flux in the 0.1–0.8 nanometre band. At the same numerical multiplier, each letter is ten times the preceding class: C1 to M1 is 10 times, and C1 to X1 is 100 times. X2 is twice X1. A flare is classified by its peak flux, not by its total energy or duration.',
  },
  {
    question: 'Does a solar flare mean I will see the aurora?',
    answer:
      'No. A flare is a burst of radiation. A coronal mass ejection (CME) is an eruption of plasma and magnetic field that may accompany one. An Earth-directed CME can disturb our magnetic field, but travel time and impact vary. Solar-wind streams can also drive geomagnetic activity. Aurora visibility depends on that response, your location, darkness and clouds.',
  },
  {
    question: 'How current is the reading on this page?',
    answer:
      'This page requests the latest available GOES 0.1–0.8 nanometre sample from NOAA SWPC on a five-minute refresh schedule. Check the displayed observation time for its age. The class shown describes that sample, which can include background emission; it is not necessarily the peak class of a flare event.',
  },
  {
    question: 'What does a flare actually affect?',
    answer:
      'Strong flares increase ionisation on the sunlit side of Earth and can disrupt high-frequency radio communication. NOAA rates these radio blackouts on its R scale. Geomagnetic storms from disturbed solar wind are a separate process, with possible effects on navigation, satellites and power systems.',
  },
] as const

export default async function SolarFlaresPage() {
  const flare = await loadCurrentFlare()
  const updated = flare ? formatSwpcTimeTag(flare.timeTag) : null

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
          flare ? (
            <p className="text-weather-text">
              Current X-ray flux:{' '}
              <strong className="text-2xl text-weather-primary">{flare.label}</strong>{' '}
              <span className="text-weather-muted">
                ({flare.flux.toExponential(1)} W/m²)
              </span>
            </p>
          ) : (
            <p className="text-weather-text">
              The GOES X-ray feed is not responding right now. The{' '}
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
          A solar flare is a burst of radiation released as magnetic energy in the Sun&apos;s
          atmosphere is converted into heat and particle motion. GOES satellites measure the
          resulting X-ray flux, alongside background emission. The reading here is a current
          sample; an event&apos;s class is assigned using its peak.
        </p>
        <p>
          In the 0.1–0.8 nanometre band, C1 is 10⁻⁶ W/m², M1 is 10⁻⁵ W/m² and X1 is
          10⁻⁴ W/m². C1 → M1 → X1 is two tenfold steps: X1 has 100 times the X-ray flux of
          C1. The number multiplies the class threshold, so X2 has twice the flux of X1.
          These are flux comparisons, not comparisons of total energy released.
        </p>
        <p>
          Flare radiation reaches Earth in about eight minutes. CMEs travel much more slowly,
          and only some encounter Earth. Their magnetic orientation matters as well as speed.
          For possible geomagnetic effects, follow{' '}
          <Link
            href={intentHref('solar-wind')}
            className="text-weather-primary underline underline-offset-2"
          >
            solar wind speed
          </Link>{' '}
          and the{' '}
          <Link
            href={intentHref('kp-index')}
            className="text-weather-primary underline underline-offset-2"
          >
            Kp index
          </Link>
          .
        </p>
        <p>
          A large flare alone cannot predict aurora at your location. For a night of{' '}
          <Link href="/stargazer" className="text-weather-primary underline underline-offset-2">
            observing
          </Link>
          , also check your local cloud cover, darkness and NOAA&apos;s aurora forecast.
        </p>
        <p>
          Sources:{' '}
          <a href="https://www.swpc.noaa.gov/products/goes-x-ray-flux" className="text-weather-primary underline underline-offset-2">NOAA GOES X-ray flux</a>,{' '}
          <a href="https://www.swpc.noaa.gov/noaa-scales-explanation" className="text-weather-primary underline underline-offset-2">NOAA space-weather scales</a>,{' '}
          <a href="https://science.nasa.gov/sun/solar-storms-and-flares/" className="text-weather-primary underline underline-offset-2">NASA solar storms and flares</a>.
        </p>
      </IntentPageShell>
    </PageWrapper>
  )
}
