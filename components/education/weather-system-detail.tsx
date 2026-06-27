'use client'

import Link from 'next/link'
import { ShareButtons } from '@/components/share-buttons'
import EducationBreadcrumb from '@/components/education/education-breadcrumb'
import EducationBackLink from '@/components/education/education-back-link'
import PageWrapper from '@/components/page-wrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { WeatherSystemData } from '@/data/weather-systems'
import { getEducationDetailHref, systemSlug } from '@/lib/education/entries'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/theme-provider'
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils'

interface WeatherSystemDetailProps {
  system: WeatherSystemData
}

export default function WeatherSystemDetail({ system }: WeatherSystemDetailProps) {
  const { theme } = useTheme()
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather')
  const slug = systemSlug(system)
  const url = `https://www.16bitweather.co${getEducationDetailHref('weather-system', slug)}`

  return (
    <PageWrapper>
      <div className={cn('container mx-auto px-4 py-8 max-w-4xl', themeClasses.background)}>
        <EducationBreadcrumb
          items={[
            { label: 'Education', href: '/education' },
            { label: 'Weather Systems', href: '/weather-systems' },
            { label: system.name },
          ]}
        />
        <EducationBackLink href="/weather-systems" label="All weather systems" />

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">{system.emoji}</div>
          <h1 className={cn('text-3xl md:text-5xl font-bold font-mono uppercase', themeClasses.headerText, themeClasses.glow)}>
            {system.name}
          </h1>
          <p className={cn('text-sm font-mono mt-2', themeClasses.secondaryText)}>{system.classification}</p>
          <ShareButtons
            config={{ title: `${system.name} — Weather Systems`, text: system.description16bit, url }}
            className="mt-4 justify-center"
          />
        </div>

        <Card className={cn('container-primary mb-6', themeClasses.background)}>
          <CardContent className="p-6">
            <p className={cn('font-mono text-sm italic text-center', themeClasses.text)}>&ldquo;{system.description16bit}&rdquo;</p>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <Card className="container-nested">
            <CardHeader><CardTitle className="font-mono text-sm uppercase">Formation</CardTitle></CardHeader>
            <CardContent className="text-sm font-mono">{system.formationProcess}</CardContent>
          </Card>
          <Card className="container-nested">
            <CardHeader><CardTitle className="font-mono text-sm uppercase">Impact</CardTitle></CardHeader>
            <CardContent className="text-sm font-mono">{system.weatherImpact}</CardContent>
          </Card>
        </div>

        <Card className="container-nested mb-6">
          <CardHeader><CardTitle className="font-mono text-sm uppercase">Technical specs</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm font-mono">
            <div className="flex justify-between gap-4"><span className="opacity-70">Wind</span><span>{system.windSpeed}</span></div>
            {system.pressureRange && (
              <div className="flex justify-between gap-4"><span className="opacity-70">Pressure</span><span>{system.pressureRange}</span></div>
            )}
            {system.temperatureRange && (
              <div className="flex justify-between gap-4"><span className="opacity-70">Temperature</span><span>{system.temperatureRange}</span></div>
            )}
            <div className="flex justify-between gap-4"><span className="opacity-70">Regions</span><span className="text-right">{system.geographicRegions}</span></div>
            <Badge variant="outline" className="font-mono mt-2">{system.rarity.replace('-', ' ')}</Badge>
          </CardContent>
        </Card>

        {system.notableEvent && (
          <Card className="container-nested mb-6">
            <CardHeader><CardTitle className="font-mono text-sm uppercase">Famous encounter</CardTitle></CardHeader>
            <CardContent className="text-sm font-mono">{system.notableEvent}</CardContent>
          </Card>
        )}

        {system.etymology && (
          <Card className="container-nested mb-6">
            <CardHeader><CardTitle className="font-mono text-sm uppercase">Etymology</CardTitle></CardHeader>
            <CardContent className="text-sm font-mono">{system.etymology}</CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/severe" className={cn('text-sm font-mono font-bold uppercase underline', themeClasses.accentText)}>
            Open Severe Weather lab →
          </Link>
          <Link href="/weather-systems" className={cn('text-sm font-mono uppercase', themeClasses.text)}>
            Browse all systems
          </Link>
        </div>
      </div>
    </PageWrapper>
  )
}
