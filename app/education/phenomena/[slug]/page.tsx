import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PhenomenonDetail from '@/components/education/phenomenon-detail'
import {
  FEATURED_DETAIL_SLUGS,
  getEducationDetailHref,
  getPhenomenonBySlug,
} from '@/lib/education/entries'

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return FEATURED_DETAIL_SLUGS.phenomenon.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const phenomenon = getPhenomenonBySlug(slug)
  if (!phenomenon) return { title: 'Phenomenon Not Found' }

  const url = `https://www.16bitweather.co${getEducationDetailHref('phenomenon', slug)}`
  const title = `${phenomenon.name} — 16-Bit Takes`

  return {
    title: `${title} | 16 Bit Weather`,
    description: phenomenon.description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: phenomenon.description,
      url,
      type: 'article',
    },
  }
}

export default async function PhenomenonDetailPage({ params }: PageProps) {
  const { slug } = await params
  const phenomenon = getPhenomenonBySlug(slug)
  if (!phenomenon) notFound()
  return <PhenomenonDetail phenomenon={phenomenon} />
}
