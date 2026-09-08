import { Suspense } from 'react'
import { safeJsonLd } from '@/lib/utils'
import SpaceWeatherSeoContent, {
  buildSpaceWeatherAppJsonLd,
  buildSpaceWeatherFaqJsonLd,
} from '@/components/space-weather/space-weather-seo-content'
import SpaceWeatherClient from './space-weather-client'
import { formatSwpcTimeTag } from '@/lib/space-weather/time-tag'
import { loadCurrentKp } from '@/lib/space-weather/kp'

export default async function SpaceWeatherPage() {
  const kpSnapshot = await loadCurrentKp('space-weather')
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
