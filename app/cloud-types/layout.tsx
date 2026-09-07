/**
 * 16-Bit Weather Platform - Cloud Types Layout
 * SEO metadata for cloud atlas educational content
 */

import type { Metadata } from 'next'
import { cloudDatabase } from '@/data/cloud-types'
import { buildCloudTypesFaqJsonLd } from '@/lib/education/cloud-types-faq'
import { safeJsonLd } from '@/lib/utils'

const CLOUD_COUNT = cloudDatabase.length
const OG_IMAGE = `/api/og?title=Cloud+Types+Guide&subtitle=${CLOUD_COUNT}+Cloud+Types+Explained`
const DESCRIPTION = `Identify ${CLOUD_COUNT} cloud types with the 16-bit cloud atlas: cirrus, cumulus, stratus, cumulonimbus and rare forms like mammatus and lenticular, with altitude and weather cues.`

export const metadata: Metadata = {
  // The root layout's title template appends the brand.
  title: `Cloud Atlas: ${CLOUD_COUNT} Cloud Types Explained`,
  description: DESCRIPTION,
  keywords: 'cloud types, cloud identification, cirrus clouds, cumulus clouds, stratus clouds, cumulonimbus, cloud atlas, cloud formations, meteorology, weather education, nimbostratus, altocumulus, mammatus clouds, lenticular clouds',
  openGraph: {
    title: '16-Bit Cloud Atlas - Cloud Types Guide',
    description: `Interactive guide to ${CLOUD_COUNT} cloud types. Learn cloud identification with altitude, temperature and weather prediction data.`,
    url: 'https://www.16bitweather.co/cloud-types',
    siteName: '16 Bit Weather',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Cloud Types Atlas - 16 Bit Weather',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '16-Bit Cloud Atlas - Cloud Types Guide',
    description: `Interactive guide to ${CLOUD_COUNT} cloud types with identification tips`,
    images: [OG_IMAGE],
  },
  alternates: {
    canonical: 'https://www.16bitweather.co/cloud-types',
  },
}

export default function CloudTypesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(buildCloudTypesFaqJsonLd()) }}
      />
      {children}
    </>
  )
}
