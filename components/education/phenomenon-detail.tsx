'use client'

import Link from 'next/link'
import { ShareButtons } from '@/components/share-buttons'
import EducationBreadcrumb from '@/components/education/education-breadcrumb'
import EducationBackLink from '@/components/education/education-back-link'
import PageWrapper from '@/components/page-wrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { WeatherPhenomena } from '@/data/fun-facts'
import { getEducationDetailHref } from '@/lib/education/entries'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/theme-provider'
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils'

interface PhenomenonDetailProps {
  phenomenon: WeatherPhenomena
}

export default function PhenomenonDetail({ phenomenon }: PhenomenonDetailProps) {
  const { theme } = useTheme()
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather')
  const url = `https://www.16bitweather.co${getEducationDetailHref('phenomenon', phenomenon.id)}`

  return (
    <PageWrapper>
      <div className={cn('container mx-auto px-4 py-8 max-w-4xl', themeClasses.background)}>
        <EducationBreadcrumb
          items={[
            { label: 'Education', href: '/education' },
            { label: '16-Bit Takes', href: '/fun-facts' },
            { label: phenomenon.name },
          ]}
        />
        <EducationBackLink href="/fun-facts" label="All phenomena" />

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">{phenomenon.emoji}</div>
          <h1 className={cn('text-3xl md:text-5xl font-bold font-mono uppercase', themeClasses.headerText, themeClasses.glow)}>
            {phenomenon.name}
          </h1>
          <p className={cn('text-sm font-mono mt-2', themeClasses.secondaryText)}>
            {phenomenon.category} · {phenomenon.rarity}
          </p>
          <ShareButtons
            config={{ title: `${phenomenon.name} — 16-Bit Takes`, text: phenomenon.description, url }}
            className="mt-4 justify-center"
          />
        </div>

        <Card className={cn('container-primary mb-6', themeClasses.background)}>
          <CardContent className="p-6">
            <p className={cn('font-mono text-sm', themeClasses.text)}>{phenomenon.description}</p>
            <p className={cn('font-mono text-xs italic mt-4', themeClasses.secondaryText)}>{phenomenon.bitFact}</p>
          </CardContent>
        </Card>

        {phenomenon.scientificMechanism && (
          <Card className="container-nested mb-6">
            <CardHeader><CardTitle className="font-mono text-sm uppercase">The science</CardTitle></CardHeader>
            <CardContent className="text-sm font-mono">{phenomenon.scientificMechanism}</CardContent>
          </Card>
        )}

        <Card className="container-nested mb-6">
          <CardHeader><CardTitle className="font-mono text-sm uppercase">How to spot it</CardTitle></CardHeader>
          <CardContent className="text-sm font-mono">{phenomenon.howToSpot}</CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <Card className="container-nested">
            <CardHeader><CardTitle className="font-mono text-sm uppercase">Where</CardTitle></CardHeader>
            <CardContent className="text-sm font-mono">{phenomenon.whereToSee}</CardContent>
          </Card>
          <Card className="container-nested">
            <CardHeader><CardTitle className="font-mono text-sm uppercase">Best season</CardTitle></CardHeader>
            <CardContent className="text-sm font-mono">{phenomenon.bestSeason}</CardContent>
          </Card>
        </div>

        {phenomenon.historicalOccurrence && (
          <Card className="container-nested mb-6">
            <CardHeader><CardTitle className="font-mono text-sm uppercase">Famous encounter</CardTitle></CardHeader>
            <CardContent className="text-sm font-mono">{phenomenon.historicalOccurrence}</CardContent>
          </Card>
        )}

        <ul className="space-y-2 mb-6">
          {phenomenon.facts.map((fact) => (
            <li key={fact} className={cn('text-sm font-mono flex gap-2', themeClasses.text)}>
              <span className={themeClasses.accentText}>▸</span>
              {fact}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/fun-facts" className={cn('text-sm font-mono uppercase', themeClasses.text)}>
            Browse all phenomena
          </Link>
        </div>
      </div>
    </PageWrapper>
  )
}
