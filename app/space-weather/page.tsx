import { Suspense } from 'react'
import { safeJsonLd } from '@/lib/utils'
import SpaceWeatherSeoContent, {
  buildSpaceWeatherAppJsonLd,
  buildSpaceWeatherFaqJsonLd,
} from '@/components/space-weather/space-weather-seo-content'
import SpaceWeatherClient from './space-weather-client'

export default function SpaceWeatherPage() {
  const appJsonLd = buildSpaceWeatherAppJsonLd()
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
      <SpaceWeatherSeoContent />
    </>
  )
}
