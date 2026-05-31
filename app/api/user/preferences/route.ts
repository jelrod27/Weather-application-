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
 * Report issues: https://github.com/deephouse23/Weather-application-/issues
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter'
import {
  updatePreferencesSchema,
  createPreferencesSchema,
  formatValidationErrors,
} from '@/lib/validations/preferences'

// GET /api/user/preferences - Fetch user preferences
export async function GET(request: NextRequest) {
  try {
    const rateLimit = await rateLimitRequest(request)
    if (!rateLimit.allowed) return rateLimit.response

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (prefError && prefError.code !== 'PGRST116') {
      console.error('Error fetching user preferences:', prefError)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    return NextResponse.json({
      preferences: preferences || {
        user_id: user.id,
        theme: 'nord',
        temperature_unit: 'fahrenheit',
        wind_unit: 'mph',
        auto_location: false,
        notifications_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

// PUT /api/user/preferences - Update user preferences
export async function PUT(request: NextRequest) {
  try {
    const rateLimit = await rateLimitRequest(request)
    if (!rateLimit.allowed) return rateLimit.response

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate input with Zod schema
    const parseResult = updatePreferencesSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(formatValidationErrors(parseResult.error), { status: 400 })
    }

    // Build updates object with only defined fields
    const validatedData = parseResult.data
    const updates: Record<string, string | boolean> = {}
    for (const [key, value] of Object.entries(validatedData)) {
      if (value !== undefined) {
        updates[key] = value
      }
    }

    const { data: updatedPreferences, error: updateError } = await supabase
      .from('user_preferences')
      // The supabase-js generic infers `never` for our local Database type
      // (it expects a PostgrestVersion marker we don't generate). Column set
      // matches the live schema (see migrations/20260509_user_preferences_align.sql).
      // @ts-expect-error - supabase-js Database generic mismatch, not a column mismatch
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user preferences:', updateError)
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json({ preferences: updatedPreferences })
  } catch (error) {
    console.error('Error updating user preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}

// POST /api/user/preferences - Create initial user preferences
export async function POST(request: NextRequest) {
  try {
    const rateLimit = await rateLimitRequest(request)
    if (!rateLimit.allowed) return rateLimit.response

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate input with Zod schema (applies defaults)
    const parseResult = createPreferencesSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(formatValidationErrors(parseResult.error), { status: 400 })
    }

    const { theme, temperature_unit } = parseResult.data

    // Create initial preferences
    const initialPreferences: Record<string, string | boolean> = {
      user_id: user.id,
      theme,
      temperature_unit,
      wind_unit: 'mph',
      auto_location: false,
      notifications_enabled: true,
    }

    const { data, error } = await supabase
      .from('user_preferences')
      // See PUT for why this @ts-expect-error is required (supabase-js generic mismatch).
      // @ts-expect-error - supabase-js Database generic mismatch, not a column mismatch
      .insert(initialPreferences)
      .select()
      .single()

    if (error) {
      console.error('Error creating user preferences:', error)
      return NextResponse.json(
        { error: 'Failed to create preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json({ preferences: data })
  } catch (error) {
    console.error('Error creating user preferences:', error)
    return NextResponse.json(
      { error: 'Failed to create preferences' },
      { status: 500 }
    )
  }
}