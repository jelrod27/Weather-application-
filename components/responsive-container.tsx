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
 * Report issues: https://github.com/jelrod27/Weather-application-/issues
 */

/**
 * Responsive Container Component
 * Ensures perfect mobile responsiveness across all screen sizes
 */

import { cn } from '@/lib/utils'

interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function ResponsiveContainer({ 
  children, 
  className,
  maxWidth = 'full',
  padding = 'md'
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-full'
  }

  const paddingClasses = {
    none: '',
    sm: 'px-2 py-2',
    md: 'px-4 py-4',
    lg: 'px-6 py-6'
  }

  return (
    <div className={cn(
      'container mx-auto w-full',
      maxWidthClasses[maxWidth],
      paddingClasses[padding],
      'min-h-0', // Prevent layout issues
      className
    )}>
      {children}
    </div>
  )
}

// Mobile-first responsive grid
export function ResponsiveGrid({ 
  children, 
  className,
  cols = { sm: 1, md: 2, lg: 3 }
}: {
  children: React.ReactNode
  className?: string
  cols?: { sm?: number, md?: number, lg?: number }
}) {
  const smColsMap: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }
  const mdColsMap: Record<number, string> = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  }
  const lgColsMap: Record<number, string> = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
  }

  const gridClasses = cn(
    'grid gap-4 w-full',
    smColsMap[cols.sm || 1],
    cols.md && mdColsMap[cols.md],
    cols.lg && lgColsMap[cols.lg],
    className
  )

  return (
    <div className={gridClasses}>
      {children}
    </div>
  )
}