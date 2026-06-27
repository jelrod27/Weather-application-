'use client'

/**
 * Shared glossary entry card for metrics and meteorological concepts.
 */

import React from 'react'
import type { LucideIcon } from 'lucide-react'
import { BarChart3, Lightbulb, Ruler } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/theme-provider'
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { WeatherMetricDefinition } from '@/lib/weather-definitions'

interface GlossaryEntryCardProps {
  metric: WeatherMetricDefinition
  icon?: LucideIcon
}

export function GlossaryEntryCard({ metric, icon: Icon }: GlossaryEntryCardProps) {
  const { theme } = useTheme()
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather')

  return (
    <section id={metric.id} className="scroll-mt-24">
      <Card className="weather-card-gradient border-0 border-t-2 border-t-primary/40 shadow-md">
        <CardHeader className="pb-4 pt-6 px-6">
          <CardTitle
            className={cn(
              'text-xl sm:text-2xl font-bold tracking-wide uppercase flex items-center gap-3 font-mono',
              themeClasses.headerText,
            )}
          >
            {Icon && <Icon size={22} className="text-primary" />}
            {metric.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-6">
          <div>
            <h3
              className={cn(
                'text-sm font-bold uppercase tracking-widest mb-2 flex items-center gap-2 font-mono',
                themeClasses.accentText,
              )}
            >
              <BarChart3 size={14} />
              What is it?
            </h3>
            <p className={cn('text-sm leading-relaxed', themeClasses.text)}>{metric.detailed}</p>
          </div>

          <div>
            <h3
              className={cn(
                'text-sm font-bold uppercase tracking-widest mb-2 flex items-center gap-2 font-mono',
                themeClasses.accentText,
              )}
            >
              <Ruler size={14} />
              How is it measured?
            </h3>
            <p className={cn('text-sm leading-relaxed', themeClasses.text)}>{metric.howMeasured}</p>
          </div>

          <div>
            <h3
              className={cn(
                'text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2 font-mono',
                themeClasses.accentText,
              )}
            >
              <BarChart3 size={14} />
              What do the values mean?
            </h3>
            <div className="grid gap-2">
              {metric.ranges.map((range) => (
                <div
                  key={range.label}
                  className={cn(
                    'flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg',
                    'bg-background/50 border border-primary/10',
                  )}
                >
                  <div className="flex items-center gap-2 sm:min-w-[160px]">
                    <Badge variant="outline" className="border-primary/30 font-mono text-xs">
                      {range.label}
                    </Badge>
                    <span className={cn('text-xs font-mono tabular-nums', themeClasses.accentText)}>
                      {range.range}
                    </span>
                  </div>
                  <p className={cn('text-xs leading-relaxed', themeClasses.text)}>{range.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3
              className={cn(
                'text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2 font-mono',
                themeClasses.accentText,
              )}
            >
              <Lightbulb size={14} />
              Practical Tips
            </h3>
            <ul className="space-y-2">
              {metric.practicalTips.map((tip, i) => (
                <li key={i} className={cn('flex items-start gap-2 text-sm leading-relaxed', themeClasses.text)}>
                  <span className="text-primary mt-0.5 font-bold">&#x203A;</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
