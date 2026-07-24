"use client"

import React from "react"
import PageWrapper from "@/components/page-wrapper"
import { useTheme } from "@/components/theme-provider"
import { getComponentStyles, type ThemeType } from "@/lib/theme-utils"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { getAllMetrics } from "@/lib/weather-definitions"
import { getAllConcepts } from "@/lib/weather-concepts"
import EducationBreadcrumb from "@/components/education/education-breadcrumb"
import { GlossaryEntryCard } from "@/components/education/glossary-entry-card"
import {
  Sun,
  Droplets,
  Gauge,
  Wind,
  Eye,
  Thermometer,
  CloudRain,
  Leaf,
  Sunrise,
  Moon,
  Zap,
  type LucideIcon,
} from "lucide-react"

const METRIC_ICONS: Record<string, LucideIcon> = {
  'uv-index': Sun,
  humidity: Droplets,
  pressure: Gauge,
  wind: Wind,
  visibility: Eye,
  'feels-like': Thermometer,
  precipitation: CloudRain,
  pollen: Leaf,
  'sun-times': Sunrise,
  'moon-phase': Moon,
}

const CONCEPT_ICONS: Record<string, LucideIcon> = {
  supercell: Zap,
  cape: Zap,
  mesocyclone: Wind,
  'wind-shear': Wind,
  updraft: CloudRain,
  'dew-point': Droplets,
}

function JumpNav({
  title,
  items,
  icons,
}: {
  title: string
  items: { id: string; name: string }[]
  icons: Record<string, LucideIcon>
}) {
  const { theme } = useTheme()
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather')

  return (
    <div className="mb-6">
      <p className={cn('text-xs font-mono uppercase tracking-widest mb-3', themeClasses.text)}>{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const Icon = icons[item.id]
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors',
                'border border-primary/20 hover:border-primary/60 hover:bg-primary/10',
              )}
            >
              {Icon && <Icon size={12} />}
              {item.name}
            </a>
          )
        })}
      </div>
    </div>
  )
}

export default function GlossaryPage() {
  const { theme } = useTheme()
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather')
  const metrics = getAllMetrics()
  const concepts = getAllConcepts()

  return (
    <PageWrapper>
      <div className={cn('container mx-auto px-4 py-8', themeClasses.background)}>
        <EducationBreadcrumb
          items={[
            { label: 'Education', href: '/education' },
            { label: 'Weather Glossary' },
          ]}
        />

        <div className="mb-10">
          <h1
            className={cn(
              'text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 font-mono',
              themeClasses.accentText,
              themeClasses.glow,
            )}
          >
            WEATHER GLOSSARY
          </h1>
          <p className={cn('text-base sm:text-lg font-mono max-w-3xl', themeClasses.text)}>
            Dashboard metrics and storm-spotter concepts in one reference. Each entry explains what it
            means, how it is measured, what values indicate, and practical tips you can use every day.
          </p>
        </div>

        <Card className={cn('container-nested mb-10', themeClasses.background)}>
          <CardContent className="p-4">
            <JumpNav title="Dashboard metrics" items={metrics} icons={METRIC_ICONS} />
            <JumpNav title="Meteorology concepts" items={concepts} icons={CONCEPT_ICONS} />
          </CardContent>
        </Card>

        <div className="space-y-10">
          <div>
            <h2 className={cn('text-2xl font-bold font-mono uppercase mb-6', themeClasses.headerText)}>
              Dashboard Metrics
            </h2>
            <div className="space-y-8">
              {metrics.map((metric) => (
                <GlossaryEntryCard
                  key={metric.id}
                  metric={metric}
                  icon={METRIC_ICONS[metric.id]}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className={cn('text-2xl font-bold font-mono uppercase mb-6', themeClasses.headerText)}>
              Meteorology Concepts
            </h2>
            <div className="space-y-8">
              {concepts.map((concept) => (
                <GlossaryEntryCard
                  key={concept.id}
                  metric={concept}
                  icon={CONCEPT_ICONS[concept.id]}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-10">
          <a
            href="#"
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold rounded transition-colors',
              themeClasses.accentBg,
            )}
          >
            Back to top
          </a>
        </div>
      </div>
    </PageWrapper>
  )
}
