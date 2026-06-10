'use client'

import { ThemeProvider } from '@/components/theme-provider'
import type { ReactNode } from 'react'

export default function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  )
}