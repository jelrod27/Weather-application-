"use client"

/**
 * Weather Glossary Page
 *
 * In-depth definitions of all weather metrics displayed on the dashboard.
 * Each section explains what the metric is, how it's measured, what values mean,
 * and practical tips for everyday use.
 */

import React from "react"
import Link from "next/link"
import PageWrapper from "@/components/page-wrapper"
import { themeTokens } from '@/lib/theme-tokens'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getAllMetrics } from "@/lib/weather-definitions"
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
  ArrowLeft,
  Lightbulb,
  Ruler,
  BarChart3,
  type LucideIcon,
} from "lucide-react"

const METRIC_ICONS: Record<string, LucideIcon> = {
  'uv-index': Sun,
  'humidity': Droplets,
  'pressure': Gauge,
  'wind': Wind,
  'visibility': Eye,
  'feels-like': Thermometer,
  'precipitation': CloudRain,
  'pollen': Leaf,
  'sun-times': Sunrise,
  'moon-phase': Moon,
}

export default function GlossaryPage() {
  const themeClasses = themeTokens.weather
  const metrics = getAllMetrics()

  return (
    <PageWrapper>
      <div className={cn("container mx-auto px-4 py-8", themeClasses.background)}>
        {/* Back link */}
        <Link
          href="/learn"
          className={cn(
            "inline-flex items-center gap-1.5 text-sm font-mono mb-6 hover:underline transition-colors",
            themeClasses.accentText
          )}
        >
          <ArrowLeft size={14} />
          Back to Weather Guide
        </Link>

        {/* Header */}
        <div className="mb-10">
          <h1
            className={cn(
              "text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 font-mono",
              themeClasses.accentText,
              themeClasses.glow
            )}
          >
            WEATHER GLOSSARY
          </h1>
          <p className={cn("text-base sm:text-lg font-mono max-w-3xl", themeClasses.text)}>
            Understand every weather metric on your dashboard. Each entry explains what the measurement
            means, how it&apos;s calculated, what the values indicate, and practical tips you can use every day.
          </p>
        </div>

        {/* Quick Navigation */}
        <Card className={cn("container-nested mb-10", themeClasses.background)}>
          <CardContent className="p-4">
            <p className={cn("text-xs font-mono uppercase tracking-widest mb-3", themeClasses.text)}>
              Jump to metric
            </p>
            <div className="flex flex-wrap gap-2">
              {metrics.map((metric) => {
                const Icon = METRIC_ICONS[metric.id]
                return (
                  <a
                    key={metric.id}
                    href={`#${metric.id}`}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors",
                      "border border-primary/20 hover:border-primary/60 hover:bg-primary/10"
                    )}
                  >
                    {Icon && <Icon size={12} />}
                    {metric.name}
                  </a>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Metric Sections */}
        <div className="space-y-8">
          {metrics.map((metric) => {
            const Icon = METRIC_ICONS[metric.id]
            return (
              <section
                key={metric.id}
                id={metric.id}
                className="scroll-mt-24"
              >
                <Card className="weather-card-gradient border-0 border-t-2 border-t-primary/40 shadow-md">
                  <CardHeader className="pb-4 pt-6 px-6">
                    <CardTitle className={cn(
                      "text-xl sm:text-2xl font-bold tracking-wide uppercase flex items-center gap-3 font-mono",
                      themeClasses.headerText
                    )}>
                      {Icon && <Icon size={22} className="text-primary" />}
                      {metric.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 space-y-6">
                    {/* What is it? */}
                    <div>
                      <h3 className={cn(
                        "text-sm font-bold uppercase tracking-widest mb-2 flex items-center gap-2 font-mono",
                        themeClasses.accentText
                      )}>
                        <BarChart3 size={14} />
                        What is it?
                      </h3>
                      <p className={cn("text-sm leading-relaxed", themeClasses.text)}>
                        {metric.detailed}
                      </p>
                    </div>

                    {/* How is it measured? */}
                    <div>
                      <h3 className={cn(
                        "text-sm font-bold uppercase tracking-widest mb-2 flex items-center gap-2 font-mono",
                        themeClasses.accentText
                      )}>
                        <Ruler size={14} />
                        How is it measured?
                      </h3>
                      <p className={cn("text-sm leading-relaxed", themeClasses.text)}>
                        {metric.howMeasured}
                      </p>
                    </div>

                    {/* Value Ranges */}
                    <div>
                      <h3 className={cn(
                        "text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2 font-mono",
                        themeClasses.accentText
                      )}>
                        <BarChart3 size={14} />
                        What do the values mean?
                      </h3>
                      <div className="grid gap-2">
                        {metric.ranges.map((range) => (
                          <div
                            key={range.label}
                            className={cn(
                              "flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg",
                              "bg-background/50 border border-primary/10"
                            )}
                          >
                            <div className="flex items-center gap-2 sm:min-w-[160px]">
                              <Badge
                                variant="outline"
                                className="border-primary/30 font-mono text-xs"
                              >
                                {range.label}
                              </Badge>
                              <span className={cn("text-xs font-mono tabular-nums", themeClasses.accentText)}>
                                {range.range}
                              </span>
                            </div>
                            <p className={cn("text-xs leading-relaxed", themeClasses.text)}>
                              {range.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Practical Tips */}
                    <div>
                      <h3 className={cn(
                        "text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2 font-mono",
                        themeClasses.accentText
                      )}>
                        <Lightbulb size={14} />
                        Practical Tips
                      </h3>
                      <ul className="space-y-2">
                        {metric.practicalTips.map((tip, i) => (
                          <li
                            key={i}
                            className={cn(
                              "flex items-start gap-2 text-sm leading-relaxed",
                              themeClasses.text
                            )}
                          >
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
          })}
        </div>

        {/* Back to top */}
        <div className="text-center mt-10">
          <a
            href="#"
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold rounded transition-colors",
              themeClasses.accentBg
            )}
          >
            Back to top
          </a>
        </div>
      </div>
    </PageWrapper>
  )
}
