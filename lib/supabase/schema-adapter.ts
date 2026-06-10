/**
 * Schema adapter to handle differences between TypeScript types and actual database schema
 */

import type { SavedLocation } from './types'

// Actual database schema
export interface DbSavedLocation {
  id: string
  user_id: string | null
  city_name: string
  city: string | null
  state: string | null
  country: string
  latitude: number
  longitude: number
  is_favorite: boolean
  nickname: string | null
  emoji: string | null
  is_default: boolean | null
  created_at: string
}

// Convert from database format to app format
export function dbToSavedLocation(dbLocation: DbSavedLocation): SavedLocation {
  return {
    id: dbLocation.id,
    user_id: dbLocation.user_id || '',
    location_name: dbLocation.city_name,
    city: dbLocation.city || dbLocation.city_name,
    state: dbLocation.state,
    country: dbLocation.country,
    latitude: dbLocation.latitude,
    longitude: dbLocation.longitude,
    is_favorite: dbLocation.is_favorite,
    custom_name: dbLocation.nickname,
    notes: null, // Database doesn't have notes
    created_at: dbLocation.created_at,
    updated_at: dbLocation.created_at // Database doesn't have updated_at
  }
}

// Convert from app format to database format
export function savedLocationToDb(location: Partial<SavedLocation>): Partial<DbSavedLocation> {
  const dbLocation: Partial<DbSavedLocation> = {
    user_id: location.user_id,
    city_name: location.location_name,
    city: location.city,
    state: location.state,
    country: location.country,
    latitude: location.latitude,
    longitude: location.longitude,
    is_favorite: location.is_favorite,
    nickname: location.custom_name,
    emoji: '📍',
    is_default: false
  }
  
  // Remove undefined values
  return Object.fromEntries(
    Object.entries(dbLocation).filter(([_, v]) => v !== undefined)
  ) as Partial<DbSavedLocation>
}