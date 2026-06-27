'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/theme-provider'
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils'

export interface EducationBreadcrumbItem {
  label: string
  href?: string
}

interface EducationBreadcrumbProps {
  items: EducationBreadcrumbItem[]
  className?: string
}

export default function EducationBreadcrumb({ items, className }: EducationBreadcrumbProps) {
  const { theme } = useTheme()
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather')

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex flex-wrap items-center gap-1 text-xs font-mono mb-6', className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
            {index > 0 && (
              <ChevronRight size={12} className={cn('opacity-50', themeClasses.text)} aria-hidden />
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className={cn('hover:underline transition-colors', themeClasses.accentText)}
              >
                {item.label}
              </Link>
            ) : (
              <span className={cn(isLast ? themeClasses.headerText : themeClasses.text, isLast && 'font-bold')}>
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
