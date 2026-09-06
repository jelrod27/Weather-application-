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

import type { UserPreferences, UserPreferencesUpdate } from '@/lib/supabase/types'

interface PreferencesResponse {
  preferences: UserPreferences
  error?: string
}

// Fetch user preferences
export const fetchUserPreferences = async (): Promise<UserPreferences | null> => {
  try {
    const response = await fetch('/api/user/preferences', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      // If preferences don't exist (404), create them
      if (response.status === 404 || response.status === 401) {
        return null
      }
      console.error('Failed to fetch preferences:', response.statusText)
      return null
    }

    const data: PreferencesResponse = await response.json()
    return data.preferences
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return null
  }
}

// Update user preferences
export const updateUserPreferencesAPI = async (updates: UserPreferencesUpdate): Promise<UserPreferences | null> => {
  try {
    const response = await fetch('/api/user/preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      console.error('Failed to update preferences:', response.statusText)
      return null
    }

    const data: PreferencesResponse = await response.json()
    return data.preferences
  } catch (error) {
    console.error('Error updating user preferences:', error)
    return null
  }
}

// Create initial user preferences
const createUserPreferences = async (
  initialPrefs: { theme?: string; units?: string } = {}
): Promise<UserPreferences | null> => {
  try {
    const response = await fetch('/api/user/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(initialPrefs),
    })

    if (!response.ok) {
      console.error('Failed to create preferences:', response.statusText)
      return null
    }

    const data: PreferencesResponse = await response.json()
    return data.preferences
  } catch (error) {
    console.error('Error creating user preferences:', error)
    return null
  }
}

// Update theme preference specifically
const updateThemePreference = async (theme: string): Promise<boolean> => {
  try {
    const updatedPrefs = await updateUserPreferencesAPI({ theme })
    return !!updatedPrefs
  } catch (error) {
    console.error('Error updating theme preference:', error)
    return false
  }
}