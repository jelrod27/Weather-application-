"use client"

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { safeStorage } from '@/lib/safe-storage'
import type { ThemeType} from '@/lib/theme-config';
import { THEME_LIST, FREE_THEMES, DEFAULT_THEME } from '@/lib/theme-config'
import { supabase } from '@/lib/supabase/client'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

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

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [hasLocalTheme, setHasLocalTheme] = useState(false)
  const themeRef = useRef<Theme>(theme)
  themeRef.current = theme

  const availableThemes: Theme[] = isAuthenticated ? THEME_LIST : FREE_THEMES

  useEffect(() => {
    setMounted(true)

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        setIsAuthenticated(true)
        fetchUserPreferences(session.user.id)
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
      setLoading(false)
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        setUser(session.user)
        setIsAuthenticated(true)
        fetchUserPreferences(session.user.id)
      } else {
        setUser(null)
        setIsAuthenticated(false)
        // Drop premium theme back to free default on logout. Phase 4 removed
        // the NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE bypass that used to skip this
        // for E2E themes.spec — the test should sign in with a real fixture
        // user instead of relying on a client bundle env var.
        const current = themeRef.current
        if (!FREE_THEMES.includes(current as ThemeType)) {
          setThemeState(DEFAULT_THEME)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserPreferences = async (userId: string, forceApply = false) => {
    try {
      if (hasLocalTheme && !forceApply) {
        return
      }

      const { data } = await supabase
        .from('user_preferences')
        .select('theme')
        .eq('user_id', userId)
        .single() as { data: { theme: string } | null, error: any }

      if (data && data.theme) {
        const dbTheme = data.theme === 'miami' || data.theme === 'nord' ? 'nord' : data.theme
        if (THEME_LIST.includes(dbTheme as Theme)) {
          const localTheme = safeStorage.getItem('weather-edu-theme')
          if (!localTheme || forceApply) {
            setThemeState(dbTheme as Theme)
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch theme preferences", e)
    }
  }

  const saveThemePreference = async (newTheme: Theme) => {
    if (!isAuthenticated || !user) return

    try {
      await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme })
      })
    } catch (e) {
      console.error("Failed to save theme preference", e)
    }
  }

  const setTheme = async (newTheme: Theme) => {
    if (!isAuthenticated && !FREE_THEMES.includes(newTheme as any)) {
      return
    }

    setThemeState(newTheme)
    setHasLocalTheme(true)

    if (typeof window !== 'undefined') {
      safeStorage.setItem('weather-edu-theme', newTheme)
    }

    if (isAuthenticated) {
      saveThemePreference(newTheme)
    }
  }

  const toggleTheme = () => {
    const list = availableThemes
    const currentIndex = list.indexOf(theme)
    const nextIndex = (currentIndex + 1) % list.length
    setTheme(list[nextIndex])
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let savedTheme = safeStorage.getItem('weather-edu-theme') as string | null
      if (savedTheme === 'miami' || savedTheme === 'dark') {
        savedTheme = DEFAULT_THEME
        safeStorage.setItem('weather-edu-theme', DEFAULT_THEME)
      }
      if (savedTheme && THEME_LIST.includes(savedTheme as Theme)) {
        setThemeState(savedTheme as Theme)
      }
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement
    const body = window.document.body

    THEME_LIST.forEach(t => {
      root.classList.remove(t)
      body.classList.remove(`theme-${t}`)
    })

    root.classList.add(theme)
    root.setAttribute('data-theme', theme)
    body.classList.add(`theme-${theme}`)

  }, [theme, mounted])

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      toggleTheme,
      availableThemes,
      isAuthenticated
    }}>
      {children}
    </ThemeContext.Provider>
  )
}
