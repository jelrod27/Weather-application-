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
import { KP_LEVELS, kpLevel } from '@/lib/space-weather/kp-scale'
import { loadCurrentKp } from '@/lib/space-weather/kp'
import { safeJsonLd } from '@/lib/utils'

const INTENT = getSpaceWeatherIntent('kp-index')!

export const metadata: Metadata = buildIntentMetadata(INTENT, {
  title: 'Live Kp Index',
  subtitle: 'Geomagnetic Storm Scale',
})

/** Live values are stamped into the copy, so refresh alongside the hub. */
export const revalidate = 300

/**
 * The whole-number Kp band a level covers. `KP_LEVELS` runs high to low, so a
 * level ends one Kp below the level above it, and G5 has no upper bound.
 */
function kpBand(index: number): string {
  const level = KP_LEVELS[index]!
  if (index === 0) return `Kp ${level.minKp}`
  const upper = KP_LEVELS[index - 1]!.minKp - 1
  return upper > level.minKp ? `Kp ${level.minKp}–${upper}` : `Kp ${level.minKp}`
}

const FAQS: readonly IntentFaq[] = [
  {
    question: 'What is the Kp index right now?',
    answer:
      'The reading at the top of this page is the most recent planetary K index published by NOAA SWPC, on a 0 to 9 scale. It covers the three-hour window that just closed. SWPC issues it as a near-real-time estimate from a subset of ground observatories, so the definitive Kp published later by GFZ Potsdam can differ by a fraction of a step.',
  },
  {
    question: 'Is the Kp index a forecast?',
    answer:
      'No. Kp measures geomagnetic disturbance that has already happened, averaged across a network of magnetometer observatories over a three-hour window. NOAA publishes a separate three-day Kp forecast for the days ahead, and the solar wind readings from the L1 spacecraft give roughly fifteen to sixty minutes of genuine advance warning.',
  },
  {
    question: 'What Kp do I need to see the aurora?',
    answer:
      'It depends entirely on your latitude. From Fairbanks or Reykjavík, Kp 2 is often enough, and southern Alaska or northern Scotland want Kp 3. Kp 5 brings the viewline to the US–Canada border, Kp 6 to the northern edge of Washington, Montana and North Dakota, and Kp 7 as far south as Minnesota, Wisconsin and Maine. Oregon, Iowa and Pennsylvania need a G4, and northern California, Kansas and Virginia a G5. Each step up the scale drags the viewline roughly two to three degrees further south.',
  },
  {
    question: 'How does Kp map to the NOAA G-scale?',
    answer:
      'Kp 5 is G1 minor, 6 is G2 moderate, 7 is G3 strong, 8 is G4 severe and 9 is G5 extreme. Below Kp 5 there is no G number at all — Kp 4 is described as active, Kp 3 as unsettled, and anything below that as quiet. The G-scale is the one written for operators, because it describes consequences rather than a magnetometer deflection.',
  },
] as const

export default async function KpIndexPage() {
  const current = await loadCurrentKp('space-weather/kp-index')
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
                Current planetary Kp:{' '}
                <strong className="text-2xl text-weather-primary">
                  {current.kp.toFixed(2)}
                </strong>{' '}
                <span className="text-weather-muted">({level.storm})</span>
              </p>
              <p className="mt-2 text-weather-text">{level.meaning}</p>
            </>
          ) : (
            <p className="text-weather-text">
              The NOAA planetary K-index feed is not responding right now. The{' '}
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
        refreshLabel="every five minutes"
      >
        <p>
          The number in the box is the planetary K index: one figure, 0 to 9, for how disturbed
          Earth&apos;s magnetic field has been over the last three hours. It is built from a network
          of magnetometer observatories spread around the world. Each one records how far the
          horizontal field wandered from its quiet-day baseline during the window, that deviation
          becomes a local K value, and the weighted average across the network is Kp. The scale is
          quasi-logarithmic, so the step from 7 to 8 covers far more disturbance than the step from
          1 to 2.
        </p>
        <p>
          Kp is a measurement, not a forecast. The three-hour window has to close before the value
          exists, so what you are reading describes what the magnetosphere already did rather than
          what it is about to do. For warning you have to look upstream, at the{' '}
          <Link
            href={intentHref('solar-wind')}
            className="text-weather-primary underline underline-offset-2"
          >
            solar wind arriving at L1
          </Link>
          , which leads the ground response by roughly fifteen to sixty minutes depending on how
          fast the plasma is moving. This page re-reads the feed every five minutes, but a new
          planetary value only appears every three hours.
        </p>
        <p>
          The word <em>planetary</em> is the part that misleads people. Kp is an average, and a
          single observatory can be far more disturbed than the planetary figure suggests. A
          substorm can light up one band of longitudes for twenty minutes while Kp sits at 4, which
          is why the aurora sometimes appears on a night the index called unremarkable — and why a
          high Kp is no promise that your own patch of sky is active. The scale also runs out at
          the top: once a storm is deep into 9, Kp has nothing left to say about how much worse it
          is getting.
        </p>
        <p>
          From Kp 5 upward NOAA labels the disturbance on the G-scale, and that is the label with
          operational meaning: grid operators watch it for geomagnetically induced currents, HF
          radio operators for absorption at high latitudes, satellite operators for drag and surface
          charging. Below 5 there is no G number at all. For what a given reading means for a night
          outdoors, the{' '}
          <Link
            href={intentHref('aurora-forecast')}
            className="text-weather-primary underline underline-offset-2"
          >
            aurora forecast
          </Link>{' '}
          turns it into a viewline, and the{' '}
          <Link
            href={intentHref('solar-flares')}
            className="text-weather-primary underline underline-offset-2"
          >
            flare monitor
          </Link>{' '}
          covers what the Sun is doing to cause it.
        </p>

        <h2 className="mb-2 mt-8 text-lg font-semibold text-weather-primary">
          The geomagnetic storm scale
        </h2>
        <dl className="space-y-3">
          {KP_LEVELS.map((entry, index) => (
            <div key={entry.storm}>
              <dt className="font-bold text-weather-text">
                {entry.storm}
                <span className="text-weather-muted"> — {kpBand(index)}</span>
              </dt>
              <dd className="text-weather-muted">{entry.meaning}</dd>
            </div>
          ))}
        </dl>
      </IntentPageShell>
    </PageWrapper>
  )
}
