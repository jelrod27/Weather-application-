/**
 * 16-Bit Weather Platform - v1.0.0
 * 
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 * 
 * Use Limitation: 5 users
 * See LICENSE file for full terms
 * 
 * BETA SOFTWARE NOTICE:
 * This software is in active development. Features may change.
 * Report issues: https://github.com/deephouse23/Weather-application-/issues
 */

/**
 * Pollen Count Display Component
 * Displays pollen data for tree, grass, and weed categories with color coding
 */

import { cn } from '@/lib/utils'
import { getPollenColor } from '@/lib/air-quality-utils'
import type { ThemeType } from '@/lib/theme-config'

interface PollenData {
  tree: Record<string, string>
  grass: Record<string, string>
  weed: Record<string, string>
}

interface PollenDisplayProps {
  pollen: PollenData
  theme: ThemeType
  className?: string
  minimal?: boolean
}

interface PollenCategoryProps {
  categoryName: string
  categoryData: Record<string, string>
  theme: ThemeType
  minimal?: boolean
}

function PollenCategory({ categoryName, categoryData, theme, minimal }: PollenCategoryProps) {
  // Theme-aware text styles using CSS variables
  const textStyles = minimal ? 'text-white/80' : 'text-foreground'

  // Filter out empty / unavailable entries
  const validData = Object.entries(categoryData).filter(
    ([_, category]) => category !== 'No Data' && category !== 'Unavailable',
  )

  const renderPollenData = () => {
    if (validData.length === 0) {
      return (
        <p className={cn("text-sm whitespace-nowrap", textStyles)}>
          No Data
        </p>
      )
    }

    if (minimal) {
      return (
        <ul className="space-y-1 leading-tight">
          {validData.map(([plant, category]) => (
            <li key={plant}>
              <div className={cn("text-[11px] truncate", textStyles)} title={plant}>
                {plant}
              </div>
              <div className={cn("text-xs font-semibold whitespace-nowrap", getPollenColor(category))}>
                {category}
              </div>
            </li>
          ))}
        </ul>
      )
    }

    return validData.map(([plant, category]) => (
      <p key={plant} className={cn("text-sm whitespace-nowrap", getPollenColor(category))}>
        {plant}: {category}
      </p>
    ))
  }

  return (
    <div>
      <p className={cn("text-sm font-medium mb-1", textStyles)}>
        {categoryName}
      </p>
      {renderPollenData()}
    </div>
  )
}

export function PollenDisplay({ pollen, theme, className, minimal = false }: PollenDisplayProps) {
  // Theme-aware styles using CSS variables
  const styles = minimal
    ? {
        container: '',
        header: '',
        text: 'text-white/80',
        border: 'border-white/20'
      }
    : {
        container: 'bg-card border-primary glow-subtle',
        header: 'text-primary',
        text: 'text-foreground',
        border: 'border-primary/40'
      };

  return (
    <div
      className={cn(
        !minimal && "p-4 rounded-lg text-center border-0",
        !minimal && styles.container,
        className
      )}
    >
      {/* Header */}
      <h2 className={cn("text-xl font-semibold mb-2", styles.header, minimal && "text-lg mb-2 text-center md:text-left")}>
        Pollen Count
      </h2>

      {/* Pollen Categories Grid */}
      <div className={cn("grid gap-2", minimal ? "grid-cols-3 md:grid-cols-1 lg:grid-cols-3" : "grid-cols-3")}>
        <PollenCategory
          categoryName="Tree"
          categoryData={pollen.tree}
          theme={theme}
          minimal={minimal}
        />
        <PollenCategory
          categoryName="Grass"
          categoryData={pollen.grass}
          theme={theme}
          minimal={minimal}
        />
        <PollenCategory
          categoryName="Weed"
          categoryData={pollen.weed}
          theme={theme}
          minimal={minimal}
        />
      </div>
    </div>
  )
}