"use client"

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { safeStorage } from '@/lib/safe-storage'
import type { ThemeType } from '@/lib/theme-config'
import { THEME_LIST, FREE_THEMES, DEFAULT_THEME } from '@/lib/theme-config'
import { useAuth } from '@/lib/auth'
import { updateUserPreferencesAPI } from '@/lib/services/preferences-service'

export type Theme = ThemeType

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  availableThemes: Theme[]
  isAuthenticated: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

function normalizeTheme(raw: string | null | undefined): Theme | null {
  if (!raw) return null
  const migrated = raw === 'miami' || raw === 'dark' ? DEFAULT_THEME : raw === 'nord' ? 'nord' : raw
  return THEME_LIST.includes(migrated as Theme) ? (migrated as Theme) : null
}

interface ThemeProviderProps {
  children: React.ReactNode
}

/**
 * Owns theme presentation only (data-theme / classList / localStorage).
 * Auth session and user_preferences rows come from AuthProvider — do not
 * subscribe to Supabase auth here.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const { user, preferences, loading: authLoading, refreshPreferences } = useAuth()
  const isAuthenticated = Boolean(user)

  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME)
  const [mounted, setMounted] = useState(false)
  const themeRef = useRef<Theme>(theme)
  themeRef.current = theme

  const availableThemes: Theme[] = isAuthenticated ? THEME_LIST : FREE_THEMES

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    setMounted(true)
    const saved = safeStorage.getItem('weather-edu-theme')
    if (saved === 'miami' || saved === 'dark') {
      safeStorage.setItem('weather-edu-theme', DEFAULT_THEME)
    }
    const normalized = normalizeTheme(safeStorage.getItem('weather-edu-theme'))
    if (normalized) {
      setThemeState(normalized)
    }
  }, [])

  // Apply server theme when auth prefs arrive, unless a local theme already wins.
  // Drop premium themes on logout.
  useEffect(() => {
    if (authLoading) return

    if (!user) {
      if (!FREE_THEMES.includes(themeRef.current as ThemeType)) {
        setThemeState(DEFAULT_THEME)
        safeStorage.setItem('weather-edu-theme', DEFAULT_THEME)
      }
      return
    }

    const localTheme = safeStorage.getItem('weather-edu-theme')
    if (localTheme) return

    const dbTheme = normalizeTheme(preferences?.theme)
    if (dbTheme) {
      setThemeState(dbTheme)
    }
  }, [user, preferences?.theme, authLoading])

  const setTheme = async (newTheme: Theme) => {
    if (!isAuthenticated && !FREE_THEMES.includes(newTheme)) {
      return
    }

    setThemeState(newTheme)

    if (typeof window !== 'undefined') {
      safeStorage.setItem('weather-edu-theme', newTheme)
    }

    if (isAuthenticated) {
      try {
        const updated = await updateUserPreferencesAPI({ theme: newTheme })
        if (updated) {
          await refreshPreferences()
        }
      } catch (e) {
        console.error('Failed to save theme preference', e)
      }
    }
  }

  const toggleTheme = () => {
    const list = availableThemes
    const currentIndex = list.indexOf(theme)
    const nextIndex = (currentIndex + 1) % list.length
    void setTheme(list[nextIndex])
  }

  useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement
    const body = window.document.body

    THEME_LIST.forEach((t) => {
      root.classList.remove(t)
      body.classList.remove(`theme-${t}`)
    })

    root.classList.add(theme)
    root.setAttribute('data-theme', theme)
    body.classList.add(`theme-${theme}`)
  }, [theme, mounted])

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        availableThemes,
        isAuthenticated,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
