import { Suspense } from 'react'
import { safeJsonLd } from '@/lib/utils'
import RadarSeoContent, { buildRadarFaqJsonLd } from '@/components/radar/radar-seo-content'
import RadarClient from './radar-client'

export default function RadarPage() {
  const faqJsonLd = buildRadarFaqJsonLd()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
      />
      <RadarSeoContent />
      <Suspense
        fallback={
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black text-zinc-400">
            Loading radar…
          </div>
        }
      >
        <RadarClient />
      </Suspense>
    </>
  )
}
