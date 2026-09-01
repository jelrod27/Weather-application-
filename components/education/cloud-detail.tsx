'use client'

import Link from 'next/link'
import { ShareButtons } from '@/components/share-buttons'
import EducationBreadcrumb from '@/components/education/education-breadcrumb'
import EducationBackLink from '@/components/education/education-back-link'
import PageWrapper from '@/components/page-wrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { CloudData } from '@/data/cloud-types'
import { cloudSlug, getEducationDetailHref } from '@/lib/education/entries'
import { cn } from '@/lib/utils'
import { themeTokens } from '@/lib/theme-tokens'

interface CloudDetailProps {
  cloud: CloudData
  /** Server-rendered Related Guides block, passed in because this is a client island. */
  related?: React.ReactNode
}

export default function CloudDetail({ cloud, related }: CloudDetailProps) {
  const themeClasses = themeTokens.weather
  const slug = cloudSlug(cloud)
  const url = `https://www.16bitweather.co${getEducationDetailHref('cloud', slug)}`

  return (
    <PageWrapper>
      <div className={cn('container mx-auto px-4 py-8 max-w-4xl', themeClasses.background)}>
        <EducationBreadcrumb
          items={[
            { label: 'Education', href: '/education' },
            { label: 'Cloud Atlas', href: '/cloud-types' },
            { label: cloud.name },
          ]}
        />
        <EducationBackLink href="/cloud-types" label="All cloud types" />

        <div className="text-center mb-8">
          <Badge variant="outline" className="font-mono mb-3">[{cloud.abbreviation}]</Badge>
          <h1 className={cn('text-3xl md:text-5xl font-bold font-mono uppercase', themeClasses.headerText, themeClasses.glow)}>
            {cloud.name}
          </h1>
          <p className={cn('text-sm font-mono mt-2', themeClasses.secondaryText)}>
            {cloud.category.toUpperCase()} · {cloud.cloudType.toUpperCase()}
          </p>
          <ShareButtons
            config={{ title: `${cloud.name} — Cloud Atlas`, text: cloud.description16bit, url }}
            className="mt-4 justify-center"
          />
        </div>

        <Card className={cn('container-primary mb-6', themeClasses.background)}>
          <CardContent className="p-6">
            <p className={cn('font-mono text-sm italic text-center', themeClasses.text)}>&ldquo;{cloud.description16bit}&rdquo;</p>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <Card className="container-nested">
            <CardHeader><CardTitle className="font-mono text-sm uppercase">Formation</CardTitle></CardHeader>
            <CardContent className="text-sm font-mono">{cloud.formation}</CardContent>
          </Card>
          <Card className="container-nested">
            <CardHeader><CardTitle className="font-mono text-sm uppercase">Weather signal</CardTitle></CardHeader>
            <CardContent className="text-sm font-mono">{cloud.weatherPrediction}</CardContent>
          </Card>
        </div>

        <Card className="container-nested mb-6">
          <CardHeader><CardTitle className="font-mono text-sm uppercase">Technical specs</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm font-mono">
            <div className="flex justify-between gap-4"><span className="opacity-70">Altitude</span><span>{cloud.altitudeRange}</span></div>
            <div className="flex justify-between gap-4"><span className="opacity-70">Appearance</span><span className="text-right">{cloud.appearance}</span></div>
            <div className="flex justify-between gap-4"><span className="opacity-70">Fun fact</span><span className="text-right">{cloud.funFact}</span></div>
            <Badge variant="outline" className="font-mono mt-2">{cloud.rarity}</Badge>
          </CardContent>
        </Card>

        {cloud.etymology && (
          <Card className="container-nested mb-6">
            <CardHeader><CardTitle className="font-mono text-sm uppercase">Etymology</CardTitle></CardHeader>
            <CardContent className="text-sm font-mono">{cloud.etymology}</CardContent>
          </Card>
        )}

        {related}

        <div className="flex flex-wrap gap-4 justify-center mt-8">
          <Link href="/radar" className={cn('text-sm font-mono font-bold uppercase underline', themeClasses.accentText)}>
            Open Radar lab →
          </Link>
          <Link href="/cloud-types" className={cn('text-sm font-mono uppercase', themeClasses.text)}>
            Browse all clouds
          </Link>
        </div>
      </div>
    </PageWrapper>
  )
}
