import { Suspense } from 'react'
import { safeJsonLd } from '@/lib/utils'
import SpaceWeatherSeoContent, {
  buildSpaceWeatherAppJsonLd,
  buildSpaceWeatherFaqJsonLd,
  formatSwpcTimeTag,
} from '@/components/space-weather/space-weather-seo-content'
import SpaceWeatherClient from './space-weather-client'
import { fetchSwpcJson } from '@/lib/services/swpc-proxy'
import { parsePlanetaryKpIndex } from '@/lib/services/swpc-kp'

async function loadKpSnapshot(): Promise<{ kp: number; timeTag: string } | null> {
  try {
    const payload = await fetchSwpcJson(
      'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
      { next: { revalidate: 300 } },
    )
    const { current } = parsePlanetaryKpIndex(payload)
    if (!current) return null
    return { kp: current.kp, timeTag: current.timeTag }
  } catch (error) {
    console.error('[space-weather]', error)
    return null
  }
}

export default async function SpaceWeatherPage() {
  const kpSnapshot = await loadKpSnapshot()
  const dateModified = kpSnapshot?.timeTag
    ? formatSwpcTimeTag(kpSnapshot.timeTag)?.iso
    : undefined
  const appJsonLd = buildSpaceWeatherAppJsonLd(dateModified)
  const faqJsonLd = buildSpaceWeatherFaqJsonLd()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(appJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
      />
      <Suspense
        fallback={
          <div className="container mx-auto px-4 py-16 font-mono text-center text-weather-muted">
            Loading space weather monitor…
          </div>
        }
      >
        <SpaceWeatherClient />
      </Suspense>
      <SpaceWeatherSeoContent
        kp={kpSnapshot?.kp ?? null}
        kpTimeTag={kpSnapshot?.timeTag ?? null}
      />
    </>
  )
}
