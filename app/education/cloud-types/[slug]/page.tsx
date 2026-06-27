import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CloudDetail from '@/components/education/cloud-detail'
import {
  FEATURED_DETAIL_SLUGS,
  getCloudBySlug,
  getEducationDetailHref,
} from '@/lib/education/entries'

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return FEATURED_DETAIL_SLUGS.cloud.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const cloud = getCloudBySlug(slug)
  if (!cloud) return { title: 'Cloud Type Not Found' }

  const url = `https://www.16bitweather.co${getEducationDetailHref('cloud', slug)}`
  const title = `${cloud.name} — Cloud Atlas`

  return {
    title: `${title} | 16 Bit Weather`,
    description: cloud.description16bit,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: cloud.weatherPrediction,
      url,
      type: 'article',
    },
  }
}

export default async function CloudDetailPage({ params }: PageProps) {
  const { slug } = await params
  const cloud = getCloudBySlug(slug)
  if (!cloud) notFound()
  return <CloudDetail cloud={cloud} />
}
