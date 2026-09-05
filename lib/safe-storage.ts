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
 * Safe localStorage wrapper that handles SSR/static generation
 * Only accesses localStorage when window exists (client-side)
 */

export const safeStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') {
      return null
    }
    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.warn('Failed to get localStorage item:', key, error)
      return null
    }
  },

  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') {
      return
    }
    try {
      // This is a generic storage wrapper. Callers are responsible for not persisting
      // sensitive data (e.g. auth tokens, precise user location) in clear text.
      // codeql[js/clear-text-storage-of-sensitive-data]: suppress
      localStorage.setItem(key, value)
    } catch (error) {
      console.warn('Failed to set localStorage item:', key, error)
    }
  },

  removeItem: (key: string): void => {
    if (typeof window === 'undefined') {
      return
    }
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('Failed to remove localStorage item:', key, error)
    }
  },

  clear: (): void => {
    if (typeof window === 'undefined') {
      return
    }
    try {
      localStorage.clear()
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }
  },

  getAllKeys: (): string[] => {
    if (typeof window === 'undefined') {
      return []
    }
    try {
      return Object.keys(localStorage)
    } catch (error) {
      console.warn('Failed to get localStorage keys:', error)
      return []
    }
  }
}