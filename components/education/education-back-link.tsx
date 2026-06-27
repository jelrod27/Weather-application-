'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/theme-provider'
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils'

interface EducationBackLinkProps {
  href?: string
  label?: string
  className?: string
}

export default function EducationBackLink({
  href = '/education',
  label = 'Back to Education Hub',
  className,
}: EducationBackLinkProps) {
  const { theme } = useTheme()
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather')

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-mono mb-6 hover:underline transition-colors',
        themeClasses.accentText,
        className,
      )}
    >
      <ArrowLeft size={14} />
      {label}
    </Link>
  )
}
