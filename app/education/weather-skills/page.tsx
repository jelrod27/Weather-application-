import WeatherSkills from '@/components/education/weather-skills'
import { getWeatherReturnHref } from '@/lib/weather/journey'
import type { Metadata } from 'next'
import type { ReactElement } from 'react'

export const metadata: Metadata = {
  title: 'Weather Skills: Clouds, Storms and Radar',
  description: 'Three short illustrated lessons to help you recognize clouds, understand storms, and read radar alongside your forecast.',
  alternates: { canonical: 'https://www.16bitweather.co/education/weather-skills' },
}

interface WeatherSkillsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function WeatherSkillsPage({ searchParams }: WeatherSkillsPageProps): Promise<ReactElement> {
  const query = await searchParams
  const lesson = query.lesson === 'storms' || query.lesson === 'radar' ? query.lesson : 'clouds'
  const returnHref = getWeatherReturnHref(typeof query.returnTo === 'string' ? query.returnTo : null)

  return <WeatherSkills key={lesson} initialLesson={lesson} returnHref={returnHref} />
}
