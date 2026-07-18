/**
 * Theme Preview Hook - Manages premium theme previews for non-registered users
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/components/theme-provider'
import type { Theme } from '@/components/theme-provider'
import { isPremiumTheme, THEME_PREVIEW_DURATION, THEME_PREVIEW_WARNING_TIME } from '@/lib/theme-tiers'
import { toastService } from '@/lib/toast-service'
import { useRouter } from 'next/navigation'

interface ThemePreviewState {
  isPreviewActive: boolean
  previewTheme: Theme | null
  timeRemaining: number
  showWarning: boolean
}

export function useThemePreview() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  
  const [previewState, setPreviewState] = useState<ThemePreviewState>({
    isPreviewActive: false,
    previewTheme: null,
    timeRemaining: 0,
    showWarning: false
  })
  
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  // Clear all timers
  const clearTimers = () => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current)
      previewTimerRef.current = null
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }

  // End preview and revert to free theme
  const endPreview = () => {
    clearTimers()
    setTheme('nord' as Theme) // Revert to free dark theme
    setPreviewState({
      isPreviewActive: false,
      previewTheme: null,
      timeRemaining: 0,
      showWarning: false
    })
    
    toastService.info('🎨 Preview ended. Create a free account to unlock all themes!')
  }

  // Start theme preview
  const startPreview = (themeId: string) => {
    if (user || !isPremiumTheme(themeId)) {
      // User is authenticated or theme is free - apply permanently
      setTheme(themeId as Theme)
      return
    }

    // Start preview for non-authenticated user — clear any prior preview timers first
    clearTimers()
    setTheme(themeId as Theme)
    setPreviewState({
      isPreviewActive: true,
      previewTheme: themeId as Theme,
      timeRemaining: THEME_PREVIEW_DURATION / 1000,
      showWarning: false
    })

    // Show preview started toast
    toastService.success(`✨ Previewing ${themeId.charAt(0).toUpperCase() + themeId.slice(1)} theme! Sign up to keep it.`)

    // Countdown timer
    let timeLeft = THEME_PREVIEW_DURATION / 1000
    countdownRef.current = setInterval(() => {
      timeLeft -= 1
      setPreviewState(prev => ({
        ...prev,
        timeRemaining: timeLeft
      }))
      
      if (timeLeft <= 0) {
        endPreview()
      }
    }, 1000)

    // Warning timer
    warningTimerRef.current = setTimeout(() => {
      setPreviewState(prev => ({ ...prev, showWarning: true }))
      toastService.warning('⏰ 5 seconds left! Sign up now to keep this amazing theme.')
    }, THEME_PREVIEW_WARNING_TIME)

    // End preview timer
    previewTimerRef.current = setTimeout(() => {
      endPreview()
    }, THEME_PREVIEW_DURATION)
  }

  // Upgrade to premium (redirect to signup)
  const upgradeAccount = () => {
    clearTimers()
    router.push('/auth?mode=signup')
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [])

  // If user becomes authenticated during preview, make theme permanent
  useEffect(() => {
    if (user && previewState.isPreviewActive) {
      clearTimers()
      setPreviewState({
        isPreviewActive: false,
        previewTheme: null,
        timeRemaining: 0,
        showWarning: false
      })
      toastService.success('🎉 Welcome! All themes are now unlocked for you!')
    }
  }, [user, previewState.isPreviewActive])

  return {
    ...previewState,
    startPreview,
    endPreview,
    upgradeAccount,
    canAccessTheme: (themeId: string) => user || !isPremiumTheme(themeId),
  }
}
