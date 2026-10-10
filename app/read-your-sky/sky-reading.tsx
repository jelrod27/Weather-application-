'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { ArrowLeft, ArrowRight, BookOpen, Clock3, MapPin, RefreshCw } from 'lucide-react'
import Navigation from '@/components/navigation'
import WeatherSearch from '@/components/weather-search'
import { getReadYourSkyHref, getWeatherLessonHref } from '@/lib/weather/journey'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import { isAbortError } from '@/lib/abort-error'
import { describeSky, describeSkyOutlook, formatSkyTime, isSkyFresh, skyEstimateSchema } from '@/lib/sky/estimate'
import SkyIllustration from './sky-illustration'
import styles from './sky-reading.module.css'
import type { ReactElement } from 'react'
import type { SkyContext } from '@/lib/sky/context'
import type { SkyEstimate } from '@/lib/sky/estimate'

const placeSchema = z.object({ name: z.string().min(1), state: z.string().optional(), country: z.string().optional(), lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) })
const GENERAL = { title: 'Start with what you can see', description: 'Cloud shapes can help you compare types. The illustration is a general example, not a view of your selected location.', tip: 'Compare broad layers, rounded patches, and delicate streaks. Their appearance helps you distinguish clouds; a model percentage alone cannot identify them.' }
const PLACE_ERROR = 'Location not found or unavailable. Try a city and region, or try again.'

interface SkyReadingProps { context: SkyContext }
interface SkyClock { serverTimeAtReceipt: number; receivedAt: number; receivedWallTime: number }

export default function SkyReading({ context }: SkyReadingProps): ReactElement {
  const router = useRouter()
  const [estimate, setEstimate] = useState<SkyEstimate | null>(null)
  const [loading, setLoading] = useState(Boolean(context.coordinates))
  const [attempt, setAttempt] = useState(0)
  const [now, setNow] = useState(0)
  const clock = useRef<SkyClock | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [showSearch, setShowSearch] = useState(!context.coordinates)
  const searchAbort = useRef<AbortController | null>(null)
  const lat = context.coordinates?.lat
  const lon = context.coordinates?.lon

  useEffect(() => {
    const tick = (): void => {
      const anchor = clock.current
      if (!anchor) return
      // Monotonic time survives clock corrections; wall elapsed also covers browser/OS sleep.
      const elapsed = Math.max(0, performance.now() - anchor.receivedAt, Date.now() - anchor.receivedWallTime)
      setNow(anchor.serverTimeAtReceipt + elapsed)
    }
    tick()
    const interval = setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', tick) }
  }, [])

  useEffect(() => {
    if (lat === undefined || lon === undefined) return
    const controller = new AbortController()
    async function load(): Promise<void> {
      setLoading(true)
      const requestStarted = performance.now()
      const requestWallTime = Date.now()
      try {
        const response = await fetchWithTimeout(`/api/read-your-sky?${new URLSearchParams({ lat: String(lat), lon: String(lon) })}`, {
          signal: controller.signal, cache: 'no-store', timeoutMs: 12_000, maxRetries: 0,
        })
        if (!response.ok) {
          if (!controller.signal.aborted) setEstimate(null)
          return
        }
        const parsed = skyEstimateSchema.safeParse(await response.json())
        if (!parsed.success) throw new Error('Invalid sky response')
        if (!controller.signal.aborted) {
          const receivedAt = performance.now()
          const receivedWallTime = Date.now()
          // One-way latency is unknown. The full request/body duration conservatively bounds
          // transport age, so delayed responses cannot extend freshness or keep past outlook hours.
          const requestDuration = Math.max(0, receivedAt - requestStarted, receivedWallTime - requestWallTime)
          const serverTimeAtReceipt = parsed.data.fetchedAt + requestDuration
          clock.current = { serverTimeAtReceipt, receivedAt, receivedWallTime }
          setEstimate(parsed.data)
          setNow(serverTimeAtReceipt)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          if (!isAbortError(error)) console.error('[Read your sky: load estimate]', error)
          setEstimate(null)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [lat, lon, attempt])

  useEffect(() => () => searchAbort.current?.abort(), [])

  async function search(query: string): Promise<void> {
    searchAbort.current?.abort()
    const controller = new AbortController()
    searchAbort.current = controller
    setSearching(true)
    setSearchError('')
    try {
      const response = await fetchWithTimeout(`/api/weather/geocoding?${new URLSearchParams({ q: query, limit: '1' })}`, { signal: controller.signal, timeoutMs: 12_000, maxRetries: 0 })
      if (!response.ok) {
        if (!controller.signal.aborted) setSearchError(PLACE_ERROR)
        return
      }
      const data: unknown = await response.json()
      const parsed = placeSchema.safeParse(Array.isArray(data) ? data[0] : data)
      if (!parsed.success) throw new Error('Invalid place response')
      if (controller.signal.aborted) return
      const place = parsed.data
      router.push(getReadYourSkyHref({ location: [place.name, place.state, place.country].filter(Boolean).join(', '), coordinates: { lat: place.lat, lon: place.lon } }))
      setShowSearch(false)
    } catch (error) {
      if (!controller.signal.aborted) {
        if (!isAbortError(error)) console.error('[Read your sky: place search]', error)
        setSearchError(PLACE_ERROR)
      }
    } finally { if (!controller.signal.aborted) setSearching(false) }
  }

  const fresh = !loading && estimate !== null && isSkyFresh(estimate, now)
  const current = fresh ? estimate.current : null
  const reading = current ? describeSky(current) : GENERAL
  const timezone = context.timezone ?? estimate?.timezone ?? 'UTC'
  const outlook = fresh ? describeSkyOutlook({ ...estimate, timezone }, now) : null
  const skyHref = getReadYourSkyHref({ location: context.label, coordinates: context.coordinates ?? undefined, timezone }, context.returnHref)
  const atlasHref = `/cloud-types?${new URLSearchParams({ returnTo: skyHref })}`

  return <div className={styles.page}>
    <Navigation weatherLocation={context.label || undefined} />
    <main className={styles.main}>
      <div className={styles.topline}>
        <Link className={styles.back} href={context.returnHref} prefetch={false}><ArrowLeft size={14} aria-hidden="true" />Back to {context.label ? `${context.label}’s weather` : 'your forecast'}</Link>
        {context.coordinates && <button type="button" className={styles.back} aria-expanded={showSearch} onClick={() => setShowSearch(value => !value)}>Change place</button>}
      </div>
      <header className={styles.header}><div><p className={styles.location}><MapPin size={14} aria-hidden="true" />{context.label || 'CHOOSE A PLACE'}</p><h1>Read your sky<span>.</span></h1></div><p>A little context for<br />what’s above you.</p></header>
      {showSearch && <section className={styles.search} aria-label="Choose a place"><p>Select the place whose sky you want to understand.</p><WeatherSearch onSearch={query => void search(query)} isLoading={searching} error={searchError} hideLocationButton /></section>}
      <div className={styles.fieldLayout} aria-busy={loading}>
        <section className={styles.summary} aria-label="Current sky">
          <span className={styles.eyebrow}>{loading ? 'Getting your sky estimate' : current ? 'Your sky now' : 'General learning'}</span>
          <h2>{loading ? `Checking the sky near ${context.label}…` : context.coordinates && !current ? `We don’t have a current sky estimate for ${context.label}.` : reading.title}</h2>
          <p className={styles.description}>{loading ? 'The explanation and illustration will appear together when current information is available.' : reading.description}</p>
          {current && <p className={styles.source}>Weather-model estimate · <time dateTime={new Date(current.time).toISOString()}>{formatSkyTime(current.time, timezone)}</time></p>}
          {!loading && estimate && !fresh && <p className={styles.source}>The previous estimate at {formatSkyTime(estimate.current.time, timezone)} is too old to describe the sky now.</p>}
          {context.coordinates && <button className={styles.retry} type="button" disabled={loading} onClick={() => setAttempt(value => value + 1)}><RefreshCw size={14} aria-hidden="true" />{loading ? 'Checking…' : current ? 'Refresh estimate' : 'Try again'}</button>}
          <p className="sr-only" role="status">{loading ? 'Loading sky estimate' : current ? 'Sky estimate updated' : 'Current estimate unavailable; general learning shown'}</p>
        </section>
        <div className={styles.fieldVisual}>
          {loading ? <div className={styles.placeholder} aria-hidden="true">Connecting the picture to your place…</div> : <SkyIllustration frame={current} title={reading.title} />}
        </div>
        <section className={styles.outlook} aria-label="Two-hour outlook">
          <h2 className={styles.eyebrow}><Clock3 size={14} aria-hidden="true" />Over the next two hours</h2>
          <p>{loading ? 'Waiting for the current estimate.' : outlook?.text ?? 'A local outlook will appear when current sky information is available.'}</p>
          {outlook && outlook.hours.length > 0 && <div className={styles.times}>
            <div><span>Now</span><strong>{current?.total === null ? '—' : `${Math.round(current!.total!)}%`}</strong><small>cloud cover</small></div>
            {outlook.hours.map(hour => <div key={hour.time}><time dateTime={new Date(hour.time).toISOString()}>{formatSkyTime(hour.time, timezone)}</time><strong>{Math.round(hour.total!)}%</strong><small>forecast cloud cover</small></div>)}
          </div>}
        </section>
        {!loading && <section className={styles.tip} aria-label="Cloud reading tip"><h2 className={styles.eyebrow}><BookOpen size={13} aria-hidden="true" />{current ? 'When you look outside' : 'General learning'}</h2><p>{reading.tip}</p><Link href={getWeatherLessonHref('clouds', skyHref)} prefetch={false}>Learn to compare cloud shapes<ArrowRight size={14} aria-hidden="true" /></Link></section>}
      </div>
      <footer className={styles.footer}><div><strong>Keep looking. Keep learning.</strong><p>Examples help you compare shapes; they don’t identify the clouds overhead.</p></div><Link href={atlasHref} prefetch={false}>Browse the Cloud Atlas<ArrowRight size={15} aria-hidden="true" /></Link></footer>
      <details className={styles.data}><summary>About this estimate & scientific sources</summary>
        <p>Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>). We turn model values into explanatory text and an original schematic. Your view may differ from the model grid near your place.</p>
        <p>Layer percentages overlap; they are not added. Shapes and heights are illustrative, not measured cloud bases or detected cloud types. Missing values mean unavailable, not clear.</p>
        {estimate && <p>Retrieved {formatSkyTime(estimate.fetchedAt, timezone)}. This is the response retrieval time, not the model run time. Current estimates expire after 30 minutes under our refresh policy.</p>}
        <p>Learn more: <a href="https://open-meteo.com/en/docs" target="_blank" rel="noopener noreferrer">provider field definitions</a>, <a href="https://cloudatlas.wmo.int/en/observing-clouds.html" target="_blank" rel="noopener noreferrer">WMO cloud observation</a>, and <a href="https://www.weather.gov/lmk/cloud_classification" target="_blank" rel="noopener noreferrer">NWS cloud descriptions</a>.</p>
      </details>
      {current && <p className={styles.source}>Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> · explanation and illustration by 16-Bit Weather.</p>}
    </main>
  </div>
}
