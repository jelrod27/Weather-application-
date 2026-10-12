"use client"

import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { safeStorage } from '@/lib/safe-storage'
import type { ThemeType } from '@/lib/theme-config'
import { THEME_LIST, FREE_THEMES, DEFAULT_THEME } from '@/lib/theme-config'
import { useAuth } from '@/lib/auth'
import { updateUserPreferencesAPI } from '@/lib/services/preferences-service'
import { userCacheService } from '@/lib/user-cache-service'

export type Theme = ThemeType

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  availableThemes: Theme[]
  isAuthenticated: boolean
  /** Apply a theme visually only — no persistence, no auth gate (previews). */
  previewTheme: (theme: Theme) => void
  /** Restore a theme visually only, e.g. ending a preview. */
  restoreTheme: (theme: Theme) => void
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

interface ThemeSaveState {
  userId: string | null
  queue: Promise<void>
  latestSelection: number
  pending: number
  lastSavedTheme: Theme
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
  const activeUserIdRef = useRef<string | null>(user?.id ?? null)
  const saveStateRef = useRef<ThemeSaveState>({
    userId: user?.id ?? null,
    queue: Promise.resolve(),
    latestSelection: 0,
    pending: 0,
    lastSavedTheme: theme,
  })

  useLayoutEffect(() => {
    themeRef.current = theme
    activeUserIdRef.current = user?.id ?? null
  }, [theme, user?.id])

  const getSaveState = (userId: string | null): ThemeSaveState => {
    if (saveStateRef.current.userId !== userId) {
      saveStateRef.current = {
        userId,
        queue: Promise.resolve(),
        latestSelection: 0,
        pending: 0,
        lastSavedTheme: themeRef.current,
      }
    }
    return saveStateRef.current
  }

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
    if (authLoading || !mounted) return

    getSaveState(user?.id ?? null)

    if (!user) {
      const guestTheme = FREE_THEMES.includes(themeRef.current as ThemeType)
        ? themeRef.current
        : DEFAULT_THEME
      if (guestTheme !== themeRef.current) {
        setThemeState(DEFAULT_THEME)
        safeStorage.setItem('weather-edu-theme', DEFAULT_THEME)
      }
      document.cookie = `weather-theme=${guestTheme}; path=/; max-age=31536000; SameSite=Lax`
      return
    }

    const localTheme = normalizeTheme(safeStorage.getItem('weather-edu-theme'))
    if (localTheme) return

    const dbTheme = normalizeTheme(preferences?.theme)
    if (dbTheme) {
      setThemeState(dbTheme)
    }
  }, [user, preferences?.theme, authLoading, mounted])

  const setTheme = (newTheme: Theme) => {
    if (!isAuthenticated && !FREE_THEMES.includes(newTheme)) {
      return
    }

    const saveState = getSaveState(user?.id ?? null)
    if (isAuthenticated && saveState.pending === 0) {
      saveState.lastSavedTheme = themeRef.current
    }
    const selection = ++saveState.latestSelection
    setThemeState(newTheme)

    if (typeof window !== 'undefined') {
      safeStorage.setItem('weather-edu-theme', newTheme)
      document.cookie = `weather-theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`
    }

    if (isAuthenticated) {
      ++saveState.pending
      const persist = async () => {
        if (saveStateRef.current !== saveState || activeUserIdRef.current !== saveState.userId) {
          --saveState.pending
          return
        }
        try {
          const updated = await updateUserPreferencesAPI({ theme: newTheme })
          if (!updated) throw new Error('Theme preference was not saved')

          saveState.lastSavedTheme = newTheme
          if (saveStateRef.current === saveState && activeUserIdRef.current === saveState.userId && saveState.latestSelection === selection) {
            userCacheService.mirrorServerPreferences(updated)
            await refreshPreferences()
          }
        } catch (e) {
          console.error('Failed to save theme preference; restoring previous theme', e)
          if (saveStateRef.current === saveState && activeUserIdRef.current === saveState.userId && saveState.latestSelection === selection) {
            const restoredTheme = saveState.lastSavedTheme
            setThemeState(restoredTheme)
            safeStorage.setItem('weather-edu-theme', restoredTheme)
            document.cookie = `weather-theme=${restoredTheme}; path=/; max-age=31536000; SameSite=Lax`
          }
        } finally {
          --saveState.pending
        }
      }
      saveState.queue = saveState.queue.then(persist, persist)
    }
  }

  const previewTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const restoreTheme = (previousTheme: Theme) => {
    setThemeState(previousTheme)
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

    const background = getComputedStyle(root).getPropertyValue('--background').trim()
    if (background) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.name = 'theme-color'
        document.head.appendChild(meta)
      }
      meta.content = `hsl(${background})`
    }
  }, [theme, mounted])

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        availableThemes,
        isAuthenticated,
        previewTheme,
        restoreTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
