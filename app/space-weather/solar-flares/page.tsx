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
      'They are decades of X-ray brightness, each ten times the one below it. A and B are background, C flares are common and mostly harmless, M flares can cause brief radio blackouts on the sunlit side of Earth, and X flares are the strongest. The number after the letter is the multiplier inside that decade, so X2 is twice X1 and twenty times M1.',
  },
  {
    question: 'Does a solar flare mean I will see the aurora?',
    answer:
      'Not on its own. A flare is light and arrives in about eight minutes, and light does not cause aurora. What matters is whether the flare came with a coronal mass ejection aimed at Earth, which takes one to three days to arrive and shows up as a rise in solar wind speed and a southward Bz. Watch the Kp index for the geomagnetic response instead.',
  },
  {
    question: 'How current is the reading on this page?',
    answer:
      'It is the most recent long-band sample from the GOES X-ray sensor, published by NOAA SWPC and refreshed every five minutes. Flares are classified on the 0.1 to 0.8 nanometre channel, which is the one this page reads.',
  },
  {
    question: 'What does a flare actually affect?',
    answer:
      'The X-rays ionise the dayside upper atmosphere, which absorbs high-frequency radio. Aviation and marine HF users, and amateur radio operators, notice it first as a fadeout lasting minutes to an hour. Strong flares can also add noise to GPS and briefly upset satellite instruments. Nothing on the ground is at risk from the flare itself.',
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
          This page tracks one number: how brightly the Sun is shining in X-rays right now, measured
          by the GOES satellites and published by NOAA. That number is what a solar flare is. When
          a magnetic field on the Sun snaps into a simpler shape, the energy released heats plasma
          to tens of millions of degrees, and the X-ray flux jumps for anywhere from a few minutes
          to a few hours.
        </p>
        <p>
          The classification is logarithmic, which is why it looks strange at first. Each letter is
          ten times brighter than the one before, so the difference between a C1 and an X1 is a
          factor of a thousand. Most days sit in the B or C range and nothing happens. An M flare
          is worth noticing. An X flare is worth watching, and the largest on record, in November
          2003, saturated the sensors somewhere past X28.
        </p>
        <p>
          The thing most people get wrong is the connection to aurora. A flare travels at the speed
          of light and reaches Earth in about eight minutes, and it produces no aurora at all. What
          produces aurora is a coronal mass ejection, a slower cloud of magnetised plasma that may
          or may not accompany a flare and may or may not be aimed at us. If one is, it arrives a
          day or three later, and you will see it first as a jump in{' '}
          <Link
            href={intentHref('solar-wind')}
            className="text-weather-primary underline underline-offset-2"
          >
            solar wind speed
          </Link>{' '}
          and then as a rising{' '}
          <Link
            href={intentHref('kp-index')}
            className="text-weather-primary underline underline-offset-2"
          >
            Kp index
          </Link>
          .
        </p>
        <p>
          Flare activity follows the roughly eleven-year solar cycle, and the current cycle has been
          running ahead of forecast, which is why X flares have been common enough recently to reach
          the general news. For what a given flare means for a night of{' '}
          <Link href="/stargazer" className="text-weather-primary underline underline-offset-2">
            observing
          </Link>
          , the honest answer is usually nothing at all, unless it came with a CME.
        </p>
      </IntentPageShell>
    </PageWrapper>
  )
}
