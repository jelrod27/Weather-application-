'use client'

import Link from 'next/link'
import {
  Cloud,
  Zap,
  BookOpen,
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
import PageWrapper from '@/components/page-wrapper'
import LearningCard from '@/components/learn/LearningCard'
import CloudAltitudeStack from '@/components/education/cloud-altitude-stack'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShareButtons } from '@/components/share-buttons'
import { countEncyclopediaEntries, countShareableGuidePages } from '@/lib/education/entries'
import type { EducationEntryRef } from '@/lib/education/entries'
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
  shareableGuides: EducationEntryRef[]
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
    description: 'Active warnings and SPC outlook.',
  },
  {
    href: '/space-weather',
    icon: Sun,
    title: 'Space Weather',
    description: 'Kp index, aurora, and solar wind.',
  },
  {
    href: '/stargazer',
    icon: Star,
    title: 'Stargazer',
    description: 'Sky clarity and moon phase.',
  },
  {
    href: '/radar',
    icon: Radar,
    title: 'Radar',
    description: 'Reflectivity and velocity loops.',
  },
  {
    href: '/earth-sciences',
    icon: Activity,
    title: 'Earth Sciences',
    description: 'Quakes, volcanoes, and planetary context.',
  },
  {
    href: '/news',
    icon: Newspaper,
    title: 'News Feed',
    description: 'NOAA, NASA, and USGS headlines.',
  },
]

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl sm:text-2xl font-bold font-mono uppercase tracking-wide text-primary">
        {title}
      </h2>
      {description && (
        <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-3xl leading-relaxed">
          {description}
        </p>
      )}
    </div>
  )
}

export default function EducationHubClient({ latestPosts, shareableGuides }: EducationHubClientProps) {
  const encyclopediaCount = countEncyclopediaEntries()
  const glossaryCount = getAllMetrics().length + getAllConcepts().length
  const shareableGuideCount = countShareableGuidePages()

  const educationTopics = [
    {
      href: '/weather-systems',
      icon: Zap,
      title: 'Weather Systems',
      description:
        'Sixteen major storm types with formation notes, threat levels, and historical case studies.',
      itemCount: weatherSystemsDatabase.length,
    },
    {
      href: '/cloud-types',
      icon: Cloud,
      title: 'Cloud Atlas',
      description:
        'Genera, species, varieties, and rare formations with altitude and weather signals.',
      itemCount: cloudDatabase.length,
    },
    {
      href: '/fun-facts',
      icon: BookOpen,
      title: '16-Bit Takes',
      description:
        'Rare phenomena from ball lightning to thundersnow — science with retro flavor.',
      itemCount: weatherPhenomena.length,
    },
    {
      href: '/education/glossary',
      icon: BookMarked,
      title: 'Weather Glossary',
      description: 'Dashboard metrics plus spotter concepts like CAPE, supercells, and dew point.',
      itemCount: glossaryCount,
    },
  ]

  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-12">
        {/* Hero */}
        <div className="space-y-4">
          <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
            // Learn // Explore // Spot
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-mono uppercase text-primary">
            Education Hub
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed">
            Encyclopedias, glossary reference, live weather tools, and weekly blog deep dives — all
            in one place.
          </p>
          <ShareButtons
            config={{
              title: 'Weather Education Hub',
              text: 'Learn meteorology with interactive weather lessons at 16bitweather.co',
              url: 'https://www.16bitweather.co/education',
            }}
            className="mt-2"
          />
        </div>

        {/* Compact stats */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground border-y border-border/50 py-4">
          <span>
            <strong className="text-foreground font-mono">{encyclopediaCount}</strong> encyclopedia
            entries
          </span>
          <span>
            <strong className="text-foreground font-mono">{glossaryCount}</strong> glossary terms
          </span>
          <span>
            <strong className="text-foreground font-mono">{shareableGuideCount}</strong> shareable
            guides
          </span>
        </div>

        {/* Start here */}
        <section>
          <SectionHeading
            title="Start here"
            description="New to meteorology? Follow this path before diving into the full encyclopedia."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {START_HERE.map((item) => (
              <Card key={item.step} className="container-nested h-full border border-border/60">
                <CardContent className="p-5 flex flex-col h-full">
                  <span className="text-xs font-mono font-bold text-primary">{item.step}</span>
                  <h3 className="text-lg font-semibold text-foreground mt-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 flex-1 leading-relaxed">
                    {item.description}
                  </p>
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-primary hover:underline"
                  >
                    {item.cta}
                    <ArrowRight size={14} />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Main encyclopedia — moved up */}
        <section>
          <SectionHeading
            title="Encyclopedia"
            description="Browse the full reference libraries. Each section opens into detailed entries."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {educationTopics.map((topic) => (
              <LearningCard key={topic.href} {...topic} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeading
            title="Shareable guides"
            description="Direct links to reference pages — each has a canonical URL for search and sharing."
          />
          <nav aria-label="Shareable education guides" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {shareableGuides.map((guide) => (
              <Link
                key={guide.href}
                href={guide.href}
                className="text-sm text-muted-foreground hover:text-primary transition-colors py-1 leading-snug"
              >
                {guide.title}
                <span className="text-xs ml-2 opacity-60 capitalize">{guide.kind.replace('-', ' ')}</span>
              </Link>
            ))}
          </nav>
        </section>

        {latestPosts.length > 0 && (
          <section>
            <div className="flex items-end justify-between gap-4 mb-5">
              <h2 className="text-xl sm:text-2xl font-bold font-mono uppercase tracking-wide text-primary">
                Latest from the blog
              </h2>
              <Link href="/blog" className="text-sm font-semibold text-primary hover:underline shrink-0 pb-1">
                All posts
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {latestPosts.map((post, index) => (
                <Link key={index} href={post.href} className="block h-full group">
                  <Card className="h-full border border-border/60 hover:border-primary/40 transition-colors">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {decodeHtmlEntities(post.title)}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">{post.displayDate}</p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {decodeHtmlEntities(post.summary)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionHeading
            title="Live labs"
            description="Pair what you read with live data from the rest of the site."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LIVE_LABS.map((lab) => {
              const Icon = lab.icon
              return (
                <Link key={lab.href} href={lab.href} className="block group">
                  <Card className="border border-border/60 hover:border-primary/40 transition-colors">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="p-2 rounded-md bg-primary/15 text-primary shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {lab.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                          {lab.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Quiz at bottom — optional practice */}
        <section>
          <SectionHeading
            title="Practice"
            description="A quick four-question check on cloud altitude layers. Wrong answers let you retry immediately."
          />
          <CloudAltitudeStack />
        </section>

        <Card className="border border-border/60 text-center">
          <CardContent className="p-8">
            <h2 className="text-xl font-mono font-bold uppercase text-primary">Stay curious</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              New guides, glossary terms, and blog dispatches added regularly.
            </p>
            <p className="text-xs font-mono text-muted-foreground mt-4">Last updated: June 2026</p>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
