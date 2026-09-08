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
import {
  fetchRtswFeeds,
  parseRtswSolarWind,
  type SolarWindCurrent,
} from '@/lib/services/swpc-solar-wind'
import { logRouteError } from '@/lib/error-utils'
import { safeJsonLd } from '@/lib/utils'

const INTENT = getSpaceWeatherIntent('solar-wind')!

export const metadata: Metadata = buildIntentMetadata(INTENT, {
  title: 'Real-Time Solar Wind',
  subtitle: 'Speed, Density and Bz',
})

/** Live values are stamped into the copy, so refresh alongside the hub. */
export const revalidate = 300

interface SolarWindReading extends SolarWindCurrent {
  trend: 'increasing' | 'decreasing' | 'stable'
}

/** Current L1 plasma and field, or null when RTSW is unreachable or empty. */
async function loadSolarWind(): Promise<SolarWindReading | null> {
  try {
    const { windJson, magJson } = await fetchRtswFeeds({
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    })
    const parsed = parseRtswSolarWind(windJson, magJson)
    if (!parsed.available) return null

    // current.timeTag is the tag of the row these values came from. Reading it
    // off the tail of `recent` instead attributed the active spacecraft's
    // numbers to whichever source happened to publish last.
    return { ...parsed.current, trend: parsed.trend }
  } catch (error) {
    logRouteError('space-weather/solar-wind', error)
    return null
  }
}

/** Bz is signed: negative is southward, which is the orientation that couples. */
function bzDescription(bz: number): string {
  if (bz <= -5) return 'strongly southward — the orientation that drives storms'
  if (bz < 0) return 'southward'
  if (bz === 0) return 'flat'
  return 'northward — poorly coupled'
}

/** The parser's trend window is the newest few hundred RTSW samples. */
const TREND_LABEL: Record<SolarWindReading['trend'], string> = {
  increasing: 'rising over the last few hours',
  decreasing: 'falling over the last few hours',
  stable: 'steady over the last few hours',
}

const FAQS: readonly IntentFaq[] = [
  {
    question: 'What is a normal solar wind speed?',
    answer:
      'Ambient solar wind runs about 300 to 500 km/s. A coronal hole facing Earth opens a high-speed stream that pushes it to 600 to 800 km/s for a day or more, and the shock ahead of a fast coronal mass ejection can carry it past 1,000 km/s. Density is usually between 1 and 10 protons per cubic centimetre.',
  },
  {
    question: 'Why does Bz matter more than speed?',
    answer:
      'Bz is the north-south component of the interplanetary magnetic field. When it points south it lies opposite Earth’s field at the dayside, magnetic reconnection opens the magnetosphere, and solar wind energy gets in. Northward Bz keeps the door mostly shut, so 700 km/s with a steady northward field can pass with almost no geomagnetic response, while a slower wind holding Bz at minus 10 nT for hours produces a real storm.',
  },
  {
    question: 'How much warning do these readings give?',
    answer:
      'The measurements come from spacecraft at the L1 point, roughly 1.5 million kilometres upstream, so the plasma being measured reaches Earth in about an hour at 400 km/s and in as little as fifteen minutes ahead of the fastest shocks. That is a real-time measurement with a short lead, not a forecast: nothing here tells you what the solar wind will do tomorrow.',
  },
  {
    question: 'Why does a reading sometimes go missing?',
    answer:
      'The real-time solar wind feed depends on continuous telemetry, and gaps happen — a spacecraft manoeuvre, a flagged instrument, or a dropout at the ground station. This page shows the magnetic field values only when the magnetometer feed carries a usable sample, and says nothing rather than printing a quiet zero that never happened.',
  },
] as const

export default async function SolarWindPage() {
  const wind = await loadSolarWind()
  const updated = wind?.timeTag ? formatSwpcTimeTag(wind.timeTag) : null

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
          wind ? (
            <>
              <p className="text-weather-text">
                Solar wind speed:{' '}
                <strong className="text-2xl text-weather-primary">{wind.speed} km/s</strong>{' '}
                <span className="text-weather-muted">({TREND_LABEL[wind.trend]})</span>
              </p>
              <p className="mt-2 text-weather-text">
                {wind.density !== null ? (
                  <>Density {wind.density} protons/cm³</>
                ) : (
                  <span className="text-weather-muted">Density unavailable in this sample</span>
                )}
                {wind.temperature !== null ? (
                  <> · Temperature {wind.temperature.toLocaleString('en-US')} K</>
                ) : null}
              </p>
              <p className="mt-2 text-weather-text">
                {wind.bz !== null ? (
                  <>
                    Bz{' '}
                    <strong className="text-weather-primary">
                      {wind.bz > 0 ? '+' : ''}
                      {wind.bz} nT
                    </strong>{' '}
                    <span className="text-weather-muted">({bzDescription(wind.bz)})</span>
                    {wind.bt !== null ? (
                      <span className="text-weather-muted"> · Bt {wind.bt} nT</span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-weather-muted">
                    The magnetometer feed has no usable sample right now, so Bz is unavailable.
                  </span>
                )}
              </p>
            </>
          ) : (
            <p className="text-weather-text">
              The NOAA real-time solar wind feed is not responding right now. The{' '}
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
          These numbers come from a spacecraft, not a model. NOAA&apos;s real-time solar wind feed
          carries plasma and magnetic field measurements taken at the L1 Lagrange point, about 1.5
          million kilometres sunward of Earth — roughly one percent of the way to the Sun — where
          DSCOVR sits with the older ACE spacecraft as a backup. Whatever passes the spacecraft
          reaches us next: about an hour at an ordinary 400 km/s, half that in a fast stream, and as
          little as a quarter of an hour ahead of the strongest shocks. That is the entire warning
          window, and it is why this reading is a measurement rather than a forecast.
        </p>
        <p>
          Speed is the headline and the least interesting of the three. The ambient wind blows at
          300 to 500 km/s. When a coronal hole rotates to face Earth it opens a high-speed stream
          that lifts it to 600 or 800 km/s and holds it there for a day or two. A coronal mass
          ejection announces itself differently, as a shock: speed, density, temperature and field
          strength all jump within a minute or two. That simultaneous jump is the clearest single
          signal in the feed that something is about to happen on the ground.
        </p>
        <p>
          Bz is the reading that decides whether any of it matters. It is the north-south component
          of the interplanetary magnetic field, and when it turns negative — southward — it lies
          antiparallel to Earth&apos;s field at the dayside, reconnection peels the magnetosphere
          open, and energy pours in. A strong storm needs Bz held south, several nT or more, for
          hours; a brief dip does little. Bt, the total field strength, is the ceiling, since Bz can
          never exceed it. Fast wind with a northward Bz is a quiet night.
        </p>
        <p>
          The sequence to watch is southward Bz first, then a rising{' '}
          <Link
            href={intentHref('kp-index')}
            className="text-weather-primary underline underline-offset-2"
          >
            Kp index
          </Link>{' '}
          an hour or two later as the ground magnetometers register the substorms, and the{' '}
          <Link
            href={intentHref('aurora-forecast')}
            className="text-weather-primary underline underline-offset-2"
          >
            aurora
          </Link>{' '}
          along with it. Days earlier, the disturbance usually started as an eruption you can trace
          on the{' '}
          <Link
            href={intentHref('solar-flares')}
            className="text-weather-primary underline underline-offset-2"
          >
            flare monitor
          </Link>
          .
        </p>
      </IntentPageShell>
    </PageWrapper>
  )
}
