'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Cloud, Radar, Wind } from 'lucide-react'
import PageWrapper from '@/components/page-wrapper'
import CloudAltitudePlot from '@/components/education/diagrams/cloud-altitude-plot'
import StormCrossSection from '@/components/education/diagrams/storm-cross-section'
import { cloudDatabase } from '@/data/cloud-types'
import { cn } from '@/lib/utils'
import { getWeatherLessonHref } from '@/lib/weather/journey'
import type { ReactElement } from 'react'
import type { WeatherLesson as LessonId } from '@/lib/weather/journey'

interface LessonStep {
  label: string
  title: string
  explanation: string
  lookFor: string
  source: { label: string; href: string }
}

interface Lesson {
  name: string
  introduction: string
  steps: [LessonStep, LessonStep, LessonStep]
  guide: { label: string; href: string }
}

// Scientific prose checked against these primary references on 2026-09-26.
const LESSONS: Record<LessonId, Lesson> = {
  clouds: {
    name: 'Read the clouds',
    introduction: 'Start with shape: a low layer, delicate streaks, or a deep tower.',
    steps: [
      {
        label: 'Layers', title: 'Stratus: a low, even layer',
        explanation: 'Stratus often looks like a gray blanket with a fairly even base. It can produce drizzle; sometimes it breaks into ragged patches.',
        lookFor: 'Look for a broad layer rather than a tall, isolated tower.',
        source: { label: 'WMO Cloud Atlas: Stratus', href: 'https://cloudatlas.wmo.int/en/clouds-genera-stratus.html' },
      },
      {
        label: 'Wisps', title: 'Cirrus: delicate streaks high above',
        explanation: 'Cirrus has thin white strands, patches or narrow bands with a silky or hairlike texture. Shape and height together help distinguish it from a low cloud deck.',
        lookFor: 'Compare the fine streaks with the broad stratus layer in step one.',
        source: { label: 'WMO Cloud Atlas: Cirrus', href: 'https://cloudatlas.wmo.int/en/clouds-genera-cirrus.html' },
      },
      {
        label: 'Towers', title: 'Cumulonimbus: a cloud with depth',
        explanation: 'Cumulonimbus grows into a large tower. Its upper part often flattens into an anvil, while the base can look dark. A cloud shape alone does not tell you when rain will reach your location.',
        lookFor: 'Notice how the tower spans several cloud layers. Check your forecast and current warnings for local conditions.',
        source: { label: 'WMO Cloud Atlas: Cumulonimbus', href: 'https://cloudatlas.wmo.int/en/clouds-genera-cumulonimbus.html' },
      },
    ],
    guide: { label: 'Explore the cloud atlas', href: '/cloud-types' },
  },
  storms: {
    name: 'Inside a storm',
    introduction: 'Follow the air through a thunderstorm: moisture, rising air and outflow.',
    steps: [
      {
        label: 'Ingredients', title: 'Moisture, instability and lift',
        explanation: 'Thunderstorms need moist air, an unstable atmosphere and a lifting mechanism. Lift starts air moving upward; instability allows it to keep rising.',
        lookFor: 'The warm arrow shows air entering the storm. This diagram explains a process, not today’s storm risk.',
        source: { label: 'NOAA: What causes a thunderstorm?', href: 'https://www.nesdis.noaa.gov/about/k-12-education/severe-weather/what-causes-thunderstorm' },
      },
      {
        label: 'Updraft', title: 'Rising air feeds the cloud',
        explanation: 'An updraft carries warm, moist air upward and helps the cloud grow taller. A mature thunderstorm can contain strong upward and downward air currents at the same time.',
        lookFor: 'Trace the upward arrow through the tower toward the spreading cloud top.',
        source: { label: 'NOAA: What causes a thunderstorm?', href: 'https://www.nesdis.noaa.gov/about/k-12-education/severe-weather/what-causes-thunderstorm' },
      },
      {
        label: 'Outflow', title: 'Sinking air spreads at the ground',
        explanation: 'Rain-cooled air descends in a downdraft. When it reaches the ground it spreads outward; the leading edge is called a gust front.',
        lookFor: 'Follow the blue arrow down and outward. Use official warnings for safety decisions; this illustration cannot locate a hazard.',
        source: { label: 'NOAA: Thunderstorm outflow and bow echoes', href: 'https://www.noaa.gov/jetstream/derechos/bow-echoes' },
      },
    ],
    guide: { label: 'Explore weather systems', href: '/weather-systems' },
  },
  radar: {
    name: 'Read radar with your forecast',
    introduction: 'Use radar for recent precipitation patterns and the forecast for what may happen next.',
    steps: [
      {
        label: 'Echoes', title: 'Read the legend before the color',
        explanation: 'Radar measures returned energy from targets in the atmosphere. Reflectivity colors describe echo strength; they are not a probability of rain. The radar beam samples above the ground, so a return need not match conditions at your feet.',
        lookFor: 'Check the map’s own legend and coverage. A blank area alone does not prove that it is dry.',
        source: { label: 'NWS: Using and understanding Doppler radar', href: 'https://www.weather.gov/mkx/using-radar' },
      },
      {
        label: 'History', title: 'Check the frame time and age',
        explanation: 'Our RainViewer animation shows past frames. Each frame is a mosaic that can combine observations from different times. Playing it helps compare recent patterns; it does not predict an arrival time.',
        lookFor: 'Read the selected frame time and age before interpreting the loop. The newest available frame can still be delayed.',
        source: { label: 'RainViewer: Weather Maps API', href: 'https://www.rainviewer.com/api/weather-maps-api.html' },
      },
      {
        label: 'Forecast', title: 'A probability answers a different question',
        explanation: 'The hourly precipitation probability estimates the chance of more than 0.1 mm of precipitation in the hour ending at the listed time. It does not describe how intense a radar echo is or guarantee rain at a particular minute.',
        lookFor: 'Compare the forecast hours for your plans, then use radar history for recent context. Neither gives a precise rain arrival here.',
        source: { label: 'Open-Meteo: Hourly weather variables', href: 'https://open-meteo.com/en/docs' },
      },
    ],
    guide: { label: 'Explore the weather glossary', href: '/education/glossary' },
  },
}

const CLOUD_NAMES = ['STRATUS', 'CIRRUS', 'CUMULONIMBUS']
const LESSON_IDS: LessonId[] = ['clouds', 'storms', 'radar']
const FOCUS_STYLE = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--weather-primary)]'

interface LessonDiagramProps {
  lesson: LessonId
  step: number
}

function LessonDiagram({ lesson, step }: LessonDiagramProps): ReactElement {
  if (lesson === 'radar') {
    return (
      <div className="space-y-3 p-5" aria-label="Radar and forecast comparison">
        {[{ title: 'Radar echoes', text: 'Strength of returned energy', Icon: Radar },
          { title: 'Radar history', text: 'Past frames → newest available', Icon: ArrowRight },
          { title: 'Hourly forecast', text: 'Chance of precipitation', Icon: Cloud }].map(({ title, text, Icon }, index) => (
          <div key={title} className={cn('flex items-center gap-3 rounded-lg border p-4', index === step ? 'border-[var(--weather-primary)] bg-[var(--bg-elev)]' : 'border-border')}>
            <Icon aria-hidden="true" className="h-7 w-7 shrink-0 text-[var(--weather-primary)]" />
            <div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{text}</p></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <svg viewBox="0 0 360 250" role="img" aria-label={lesson === 'clouds' ? `${CLOUD_NAMES[step]} shown within the cloud layers` : 'Storm cross-section: warm air rises, rain-cooled air sinks and spreads outward'} className="w-full text-[var(--text)]">
      {lesson === 'clouds' ? (
        <>
          {[{ label: 'High', y: 55 }, { label: 'Middle', y: 115 }, { label: 'Low', y: 175 }].map(({ label, y }) => (
            <g key={label}><path d={`M 78 ${y + 30} H 335`} stroke="hsl(var(--border))" strokeDasharray="4 4" /><text x="16" y={y + 4} fill="currentColor" fontSize="14">{label}</text></g>
          ))}
          {step === 0 && <path d="M 106 164 Q 135 150 157 165 Q 195 153 229 165 Q 268 151 315 165 L 315 189 H 106 Z" fill="var(--weather-primary)" fillOpacity="0.2" stroke="var(--weather-primary)" strokeWidth="2" />}
          {step === 1 && <g fill="none" stroke="var(--weather-primary)" strokeWidth="3" strokeLinecap="round"><path d="M 115 60 Q 159 49 183 37 M 165 72 Q 218 62 249 44 M 242 70 Q 277 61 311 43" /></g>}
          {step === 2 && <path d="M 163 195 L 163 113 Q 135 91 157 68 L 111 54 Q 195 28 321 49 Q 288 72 245 69 L 239 195 Z" fill="var(--weather-primary)" fillOpacity="0.2" stroke="var(--weather-primary)" strokeWidth="2" />}
          <text x="205" y="236" textAnchor="middle" fill="currentColor" fontSize="14">{CLOUD_NAMES[step]}</text>
        </>
      ) : (
        <>
          <path d="M 120 196 L 121 110 Q 95 86 122 65 L 66 47 Q 160 13 313 44 Q 284 69 218 67 L 218 196 Z" fill="var(--weather-primary)" fillOpacity="0.1" stroke="hsl(var(--border))" strokeWidth="2" />
          <path d="M 72 209 Q 158 220 158 102" stroke="var(--weather-accent)" strokeWidth={step < 2 ? 5 : 3} fill="none" /><path d="M 150 115 L 158 98 L 166 115" fill="none" stroke="var(--weather-accent)" strokeWidth="3" />
          <text x="22" y="154" fill="currentColor" fontSize="14">Warm air</text><text x="22" y="172" fill="currentColor" fontSize="14">rises</text>
          <path d="M 224 108 Q 215 208 303 209" stroke="var(--weather-primary)" strokeWidth={step === 2 ? 5 : 3} fill="none" /><path d="M 290 201 L 308 209 L 290 217" fill="none" stroke="var(--weather-primary)" strokeWidth="3" />
          <text x="247" y="125" fill="currentColor" fontSize="14">Cool air</text><text x="247" y="143" fill="currentColor" fontSize="14">sinks</text>
          <text x="260" y="242" textAnchor="middle" fill="currentColor" fontSize="14">Outflow</text>
        </>
      )}
      <path d="M 16 219 H 342" stroke="var(--text-muted)" strokeWidth="2" />
    </svg>
  )
}

interface WeatherSkillsProps {
  initialLesson?: LessonId
  returnHref?: string | null
}

export default function WeatherSkills({ initialLesson = 'clouds', returnHref }: WeatherSkillsProps): ReactElement {
  const [step, setStep] = useState(0)
  const lesson = LESSONS[initialLesson]
  const current = lesson.steps[step]
  const cloud = cloudDatabase.find((entry) => entry.name === CLOUD_NAMES[step])

  return (
    <PageWrapper>
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 text-[var(--text)] sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link href={returnHref ?? '/'} className={cn('inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--weather-primary)] hover:underline', FOCUS_STYLE)}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />{returnHref ? 'Back to your weather' : 'Open local forecast'}
          </Link>
          <Link href="/education" className={cn('py-3 text-[var(--text-muted)] hover:underline', FOCUS_STYLE)}>Education hub</Link>
        </div>
        <header>
          <p className="mb-2 text-xs font-mono uppercase tracking-wide text-[var(--weather-primary)]">Weather skills · 3 steps each</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Make sense of the sky</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">Short illustrated lessons to use alongside your local weather.</p>
        </header>

        <nav aria-label="Weather lessons" className="grid gap-2 sm:grid-cols-3">
          {LESSON_IDS.map((id) => {
            const Icon = id === 'clouds' ? Cloud : id === 'storms' ? Wind : Radar
            return (
              <Link
                key={id}
                href={getWeatherLessonHref(id, returnHref ?? '')}
                aria-current={id === initialLesson ? 'page' : undefined}
                className={cn(
                  'flex min-h-12 items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold',
                  id === initialLesson
                    ? 'border-[var(--weather-primary)] bg-[var(--bg-elev)] text-[var(--weather-primary)]'
                    : 'border-border hover:border-[var(--weather-primary)]',
                  FOCUS_STYLE,
                )}
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                {LESSONS[id].name}
              </Link>
            )
          })}
        </nav>

        <section aria-labelledby="lesson-title" className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 id="lesson-title" className="text-xl font-bold">{lesson.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{lesson.introduction}</p>
          <ol aria-label="Lesson steps" className="my-5 grid grid-cols-3 gap-2">
            {lesson.steps.map((item, index) => (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => setStep(index)}
                  aria-current={index === step ? 'step' : undefined}
                  aria-controls="lesson-step"
                  className={cn(
                    'min-h-11 w-full rounded-md border px-2 py-2 text-xs sm:text-sm',
                    index === step
                      ? 'border-[var(--weather-primary)] font-semibold text-[var(--weather-primary)]'
                      : 'border-border text-[var(--text-muted)]',
                    FOCUS_STYLE,
                  )}
                >
                  {index + 1}. {item.label}
                </button>
              </li>
            ))}
          </ol>
          <div className="grid items-start gap-6 md:grid-cols-2">
            <figure className="min-w-0 overflow-hidden rounded-lg border border-border bg-[var(--bg)]">
              <LessonDiagram lesson={initialLesson} step={step} />
              <figcaption className="border-t border-border px-4 py-3 text-xs leading-relaxed text-[var(--text-muted)]">
                {initialLesson === 'radar'
                  ? 'Concept diagram · no live or sample weather data.'
                  : 'Simplified illustration · not to scale or a view of current conditions.'}
              </figcaption>
            </figure>
            <div id="lesson-step" aria-live="polite" aria-atomic="true" className="space-y-4">
              <p className="text-xs font-mono text-[var(--weather-primary)]">Step {step + 1} of 3</p>
              <h3 className="text-lg font-semibold">{current.title}</h3>
              <p className="text-sm leading-relaxed">{current.explanation}</p>
              <p className="rounded-lg border-l-4 border-[var(--weather-accent)] bg-[var(--bg-elev)] p-3 text-sm leading-relaxed">
                <strong>Try this: </strong>{current.lookFor}
              </p>
              <a
                href={current.source.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn('inline-block text-xs leading-relaxed text-[var(--weather-primary)] underline underline-offset-4', FOCUS_STYLE)}
              >
                {current.source.label} <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep((previous) => previous - 1)}
              disabled={step === 0}
              className={cn('inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 py-2 text-sm disabled:opacity-40', FOCUS_STYLE)}
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />Previous
            </button>
            {step < 2 ? (
              <button
                type="button"
                onClick={() => setStep((previous) => previous + 1)}
                className={cn('inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--weather-primary)] px-4 py-2 text-sm font-semibold text-[var(--weather-primary)]', FOCUS_STYLE)}
              >
                Next step<ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href={returnHref ?? '/'}
                className={cn('inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--weather-primary)] px-4 py-2 text-sm font-semibold text-[var(--weather-primary)]', FOCUS_STYLE)}
              >
                {returnHref ? 'Back to your weather' : 'Open local forecast'}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            )}
          </div>
        </section>

        {initialLesson !== 'radar' && (
          <details className="rounded-lg border border-border bg-card p-4">
            <summary className={cn('cursor-pointer text-sm font-semibold', FOCUS_STYLE)}>
              Explore the detailed {initialLesson === 'clouds' ? 'altitude' : 'storm'} diagram
            </summary>
            <div
              role="region"
              aria-label="Detailed diagram; scroll horizontally on small screens"
              tabIndex={0}
              className={cn('mt-4 overflow-x-auto', FOCUS_STYLE)}
            >
              <div className="min-w-[640px]">
                {initialLesson === 'clouds' && cloud ? <CloudAltitudePlot context={{ cloud }} /> : <StormCrossSection context={{}} />}
              </div>
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Illustrative heights vary with location and conditions. Scroll the diagram sideways on a small screen.
            </p>
          </details>
        )}
        <Link
          href={lesson.guide.href}
          className={cn('inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--weather-primary)] hover:underline', FOCUS_STYLE)}
        >
          {lesson.guide.label}<ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </PageWrapper>
  )
}
