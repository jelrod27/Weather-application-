import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import WeatherSystemDetail from '@/components/education/weather-system-detail'
import {
  FEATURED_DETAIL_SLUGS,
  getEducationDetailHref,
  getWeatherSystemBySlug,
} from '@/lib/education/entries'

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return FEATURED_DETAIL_SLUGS['weather-system'].map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const system = getWeatherSystemBySlug(slug)
  if (!system) return { title: 'Weather System Not Found' }

  const url = `https://www.16bitweather.co${getEducationDetailHref('weather-system', slug)}`
  const title = `${system.name} — Weather Systems Guide`

  return {
    title: `${title} | 16 Bit Weather`,
    description: system.description16bit,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: system.formationProcess.slice(0, 160),
      url,
      type: 'article',
    },
  }
}

export default async function WeatherSystemDetailPage({ params }: PageProps) {
  const { slug } = await params
  const system = getWeatherSystemBySlug(slug)
  if (!system) notFound()
  return <WeatherSystemDetail system={system} />
}
