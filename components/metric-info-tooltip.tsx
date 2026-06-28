"use client"

/**
 * Metric Info Popover
 *
 * Small info icon that appears in the corner of weather metric cards.
 * Click to show a brief definition and a link to the glossary.
 *
 * Uses Radix Popover (NOT Tooltip) because the content contains an
 * interactive "Learn more" link. Radix Tooltip is designed for
 * non-interactive descriptive text only — keyboard users cannot Tab
 * into tooltip content. Popover stays open while users interact with
 * it, making the link keyboard-accessible.
 */

import React from "react"
import Link from "next/link"
import { Info } from "lucide-react"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { getMetricDefinition } from "@/lib/weather-definitions"

interface MetricInfoTooltipProps {
  metricId: string
}

export function MetricInfoTooltip({ metricId }: MetricInfoTooltipProps): React.ReactNode {
  const metric = getMetricDefinition(metricId)
  if (!metric) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="absolute top-2 right-2 z-10 p-1.5 rounded-full text-muted-foreground opacity-40 hover:opacity-100 hover:bg-primary/10 transition-all duration-200 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1"
          aria-label={`Learn about ${metric.name}`}
        >
          <Info size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="max-w-[280px] p-3 w-auto"

      >
        <p className="font-semibold text-sm mb-1">{metric.name}</p>
        <p className="text-xs leading-relaxed text-popover-foreground/80 mb-2">
          {metric.brief}
        </p>
        <Link
          href={`/education/glossary#${metric.id}`}
          className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
        >
          Learn more →
        </Link>
      </PopoverContent>
    </Popover>
  )
}
