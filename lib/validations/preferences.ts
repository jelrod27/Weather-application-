/**
 * Zod validation schemas for user preferences
 *
 * Provides type-safe validation for the preferences API endpoints.
 * Uses Zod for runtime validation with TypeScript type inference.
 */

import { z } from 'zod'
import { DEFAULT_THEME, THEME_LIST, type ThemeType } from '@/lib/theme-config'

// Unit type enums (matching database schema)
export const temperatureUnitSchema = z.enum(['celsius', 'fahrenheit'])
export const windUnitSchema = z.enum(['mph', 'kmh', 'ms'])

// Theme validation using existing THEME_LIST
// Cast needed because Zod requires at least one element in the tuple
export const themeSchema = z.enum(THEME_LIST as [ThemeType, ...ThemeType[]])

/**
 * Schema for PUT requests - updating existing preferences
 * All fields are optional since partial updates are allowed
 * .strict() rejects unknown fields to prevent injection
 *
 * Field set matches the live `public.user_preferences` schema after the
 * 2026-05-09 alignment migration. Adding new fields requires both a DB
 * migration and a UI surface — see `lib/theme-config.ts` for theme values.
 */
export const updatePreferencesSchema = z.object({
  theme: themeSchema.optional(),
  temperature_unit: temperatureUnitSchema.optional(),
  wind_unit: windUnitSchema.optional(),
  auto_location: z.boolean().optional(),
  notifications_enabled: z.boolean().optional(),
}).strict()

/**
 * Schema for POST requests - creating initial preferences
 * Uses defaults for required fields
 */
export const createPreferencesSchema = z.object({
  theme: themeSchema.default(DEFAULT_THEME),
  temperature_unit: temperatureUnitSchema.default('fahrenheit'),
}).strict()

// Inferred types for internal use
type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>
type CreatePreferencesInput = z.infer<typeof createPreferencesSchema>

/**
 * Helper to format Zod errors into a user-friendly structure
 */
export function formatValidationErrors(error: z.ZodError) {
  return {
    error: 'Validation failed',
    details: error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  }
}
