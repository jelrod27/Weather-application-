import type { Metadata } from 'next'
import { Suspense } from 'react'
import PageWrapper from '@/components/page-wrapper'
import AlertsLanding from './alerts-landing'

const BASE_URL = 'https://www.16bitweather.co'

export const metadata: Metadata = {
  title: 'Bitwatch — Free NWS warning email and browser alerts | 16 Bit Weather',
  description:
    'Get US NWS Tornado, Severe Thunderstorm, and Flash Flood warnings by email or browser push. No account. Polygon match on your pin. Supplemental heads-up only.',
  openGraph: {
    title: 'Bitwatch | 16 Bit Weather',
    description:
      'Free guest email and browser alerts for US NWS warnings that cover your pin. No account required.',
    url: `${BASE_URL}/alerts`,
    siteName: '16 Bit Weather',
    locale: 'en_US',
    type: 'website',
  },
  alternates: { canonical: `${BASE_URL}/alerts` },
}

export default function AlertsPage() {
  return (
    <PageWrapper>
      <Suspense
        fallback={
          <div className="max-w-3xl mx-auto px-4 py-10 font-mono text-muted-foreground animate-pulse">
            Loading Bitwatch…
          </div>
        }
      >
        <AlertsLanding />
      </Suspense>
    </PageWrapper>
  )
}
