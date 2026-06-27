'use client'

import Link from 'next/link'
import {
  Cloud,
  Zap,
  BookOpen,
  Thermometer,
  BookMarked,
  CloudLightning,
  Sun,
  Star,
  Activity,
  Radar,
  Newspaper,
  ArrowRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/theme-provider'
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils'
import PageWrapper from '@/components/page-wrapper'
import LearningCard from '@/components/learn/LearningCard'
import CloudAltitudeStack from '@/components/education/cloud-altitude-stack'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShareButtons } from '@/components/share-buttons'
import { countEncyclopediaEntries } from '@/lib/education/entries'
import { cloudDatabase } from '@/data/cloud-types'
import { weatherPhenomena } from '@/data/fun-facts'
import { weatherSystemsDatabase } from '@/data/weather-systems'
import { decodeHtmlEntities } from '@/lib/services/rss/html-utils'
import { getAllConcepts } from '@/lib/weather-concepts'
import { getAllMetrics } from '@/lib/weather-definitions'

export interface EducationHubPost {
  slug: string
  title: string
  summary: string
  displayDate: string
  href: string
}

interface EducationHubClientProps {
  latestPosts: EducationHubPost[]
}

const START_HERE = [
  {
    step: '01',
    title: 'Read the sky',
    description: 'Start with common cloud types and altitude layers.',
    href: '/cloud-types',
    cta: 'Cloud Atlas',
  },
  {
    step: '02',
    title: 'Understand storms',
    description: 'Learn fronts, cyclones, and what drives severe weather.',
    href: '/weather-systems',
    cta: 'Weather Systems',
  },
  {
    step: '03',
    title: 'Decode your dashboard',
    description: 'Metrics and spotter concepts explained in plain language.',
    href: '/education/glossary',
    cta: 'Glossary',
  },
]

const LIVE_LABS: { href: string; icon: LucideIcon; title: string; description: string }[] = [
  {
    href: '/severe',
    icon: CloudLightning,
    title: 'Severe Weather',
    description: 'Active warnings and SPC outlook — see what you just studied in the wild.',
  },
  {
    href: '/space-weather',
    icon: Sun,
    title: 'Space Weather',
    description: 'Kp index, aurora, and solar wind tied to upper-atmosphere lessons.',
  },
  {
    href: '/stargazer',
    icon: Star,
    title: 'Stargazer',
    description: 'Sky clarity, moon phase, and seeing conditions for night-sky readers.',
  },
  {
    href: '/radar',
    icon: Radar,
    title: 'Radar',
    description: 'Watch reflectivity and velocity while learning storm structure.',
  },
  {
    href: '/earth-sciences',
    icon: Activity,
    title: 'Earth Sciences',
    description: 'Quakes, volcanoes, and planetary context for weather extremes.',
  },
  {
    href: '/news',
    icon: Newspaper,
    title: 'News Feed',
    description: 'NOAA, NASA, and USGS headlines to extend classroom topics.',
  },
]

export default function EducationHubClient({ latestPosts }: EducationHubClientProps) {
  const { theme } = useTheme()
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather')

  const encyclopediaCount = countEncyclopediaEntries()
  const glossaryCount = getAllMetrics().length + getAllConcepts().length

  const educationTopics = [
    {
      href: '/weather-systems',
      icon: Zap,
      title: 'Weather Systems',
      description:
        'Atmospheric dynamics of 16 major storm types with historical case studies and threat levels.',
      itemCount: weatherSystemsDatabase.length,
    },
    {
      href: '/cloud-types',
      icon: Cloud,
      title: 'Cloud Atlas',
      description:
        'Cloud database covering genera, species, varieties, and rare formations with altitude data.',
      itemCount: cloudDatabase.length,
    },
    {
      href: '/fun-facts',
      icon: BookOpen,
      title: '16-Bit Takes',
      description:
        'The science behind the strange — from ball lightning to thundersnow and rare phenomena.',
      itemCount: weatherPhenomena.length,
    },
    {
      href: '/extremes',
      icon: Thermometer,
      title: 'Extremes',
      description: 'Live hottest and coldest places on Earth with climate context modals.',
      itemCount: undefined,
    },
    {
      href: '/education/glossary',
      icon: BookMarked,
      title: 'Weather Glossary',
      description: 'Dashboard metrics plus storm-spotter concepts — UV, CAPE, supercells, and more.',
      itemCount: glossaryCount,
    },
  ]

  return (
    <PageWrapper>
      <div className={cn('container mx-auto px-4 py-8', themeClasses.background)}>
        <div className="mb-10">
          <h1
            className={cn(
              'text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 font-mono',
              themeClasses.accentText,
              themeClasses.glow,
            )}
          >
            EDUCATION HUB
          </h1>
          <p className={cn('text-base sm:text-lg font-mono max-w-3xl', themeClasses.text)}>
            Your portal to weather knowledge — encyclopedias, live labs, glossary reference, and
            weekly deep dives from the blog.
          </p>
          <ShareButtons
            config={{
              title: 'Weather Education Hub',
              text: 'Learn meteorology with interactive weather lessons at 16bitweather.co',
              url: 'https://www.16bitweather.co/education',
            }}
            className="mt-3"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <Card className={cn('container-nested', themeClasses.background)}>
            <CardContent className="p-4 text-center">
              <div className={cn('text-3xl font-bold font-mono', themeClasses.accentText)}>
                {encyclopediaCount}
              </div>
              <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>Encyclopedia entries</div>
            </CardContent>
          </Card>
          <Card className={cn('container-nested', themeClasses.background)}>
            <CardContent className="p-4 text-center">
              <div className={cn('text-3xl font-bold font-mono', themeClasses.accentText)}>
                {glossaryCount}
              </div>
              <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>Glossary terms</div>
            </CardContent>
          </Card>
          <Card className={cn('container-nested', themeClasses.background)}>
            <CardContent className="p-4 text-center">
              <div className={cn('text-3xl font-bold font-mono', themeClasses.accentText)}>20</div>
              <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>Shareable guides</div>
            </CardContent>
          </Card>
          <Card className={cn('container-nested', themeClasses.background)}>
            <CardContent className="p-4 text-center">
              <div className={cn('text-3xl font-bold font-mono', themeClasses.accentText)}>6</div>
              <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>Live labs</div>
            </CardContent>
          </Card>
        </div>

        <section className="mb-10">
          <h2 className={cn('text-2xl font-bold font-mono uppercase mb-4', themeClasses.headerText)}>
            Start Here
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {START_HERE.map((item) => (
              <Card key={item.step} className={cn('container-nested h-full', themeClasses.background)}>
                <CardContent className="p-5 flex flex-col h-full">
                  <span className={cn('text-xs font-mono font-bold', themeClasses.accentText)}>{item.step}</span>
                  <h3 className={cn('text-lg font-mono font-bold uppercase mt-2', themeClasses.headerText)}>
                    {item.title}
                  </h3>
                  <p className={cn('text-sm font-mono mt-2 flex-1', themeClasses.text)}>{item.description}</p>
                  <Link
                    href={item.href}
                    className={cn(
                      'inline-flex items-center gap-1 mt-4 text-sm font-mono font-bold uppercase',
                      themeClasses.accentText,
                    )}
                  >
                    {item.cta}
                    <ArrowRight size={14} />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <CloudAltitudeStack />
        </section>

        {latestPosts.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className={cn('text-2xl font-bold font-mono uppercase', themeClasses.headerText)}>
                Latest From The Blog
              </h2>
              <Link href="/blog" className={cn('text-xs font-mono font-bold uppercase', themeClasses.accentText)}>
                All posts →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {latestPosts.map((post, index) => (
                <Link key={index} href={post.href} className="block h-full">
                  <Card className={cn('container-nested h-full glow-interactive hover:scale-[1.02] transition-transform', themeClasses.background)}>
                    <CardHeader className="pb-2">
                      <CardTitle className={cn('text-base font-mono uppercase leading-snug', themeClasses.headerText)}>
                        {decodeHtmlEntities(post.title)}
                      </CardTitle>
                      <p className={cn('text-[10px] font-mono uppercase', themeClasses.text)}>
                        {post.displayDate}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <p className={cn('text-sm font-mono line-clamp-3', themeClasses.text)}>
                        {decodeHtmlEntities(post.summary)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mb-10">
          <h2 className={cn('text-2xl font-bold font-mono uppercase mb-4', themeClasses.headerText)}>
            Live Labs
          </h2>
          <p className={cn('text-sm font-mono mb-4 max-w-3xl', themeClasses.text)}>
            Pair lessons with live data — watch the atmosphere while you learn.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {LIVE_LABS.map((lab) => {
              const Icon = lab.icon
              return (
                <Link key={lab.href} href={lab.href} className="block h-full">
                  <Card className={cn('container-nested h-full hover:scale-[1.02] transition-transform', themeClasses.background)}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn('p-2 rounded-md', themeClasses.accentBg)}>
                          <Icon className="w-5 h-5 text-black" />
                        </div>
                        <div>
                          <h3 className={cn('font-mono font-bold uppercase text-sm', themeClasses.headerText)}>
                            {lab.title}
                          </h3>
                          <p className={cn('text-xs font-mono mt-1', themeClasses.text)}>{lab.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="mb-10">
          <h2 className={cn('text-2xl font-bold font-mono uppercase mb-4', themeClasses.headerText)}>
            Encyclopedia
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {educationTopics.map((topic) => (
              <LearningCard key={topic.href} {...topic} />
            ))}
          </div>
        </section>

        <Card className={cn('container-primary text-center', themeClasses.background)}>
          <CardContent className="p-8">
            <h2 className={cn('text-2xl font-bold font-mono mb-3', themeClasses.headerText)}>STAY CURIOUS</h2>
            <p className={cn('text-sm font-mono mb-4', themeClasses.text)}>
              New guides, glossary terms, and blog dispatches added regularly.
            </p>
            <div className={cn('inline-block px-4 py-2 text-xs font-mono font-bold rounded', themeClasses.accentBg)}>
              LAST UPDATED: JUNE 2026
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
