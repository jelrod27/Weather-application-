import type { CaptureResult, PostHogConfig } from 'posthog-js'

interface PostHogSettings {
  token: string
  options: Partial<PostHogConfig>
}

// Keep the ingestion identity, navigation metrics, and coarse browser metadata.
// Unknown SDK properties stay out, including values derived from URL parameters.
const ALLOWED_PROPERTIES = new Set([
  'token', 'distinct_id', '$device_id', '$session_id', '$window_id',
  '$lib', '$lib_version', '$insert_id', '$is_identified', '$process_person_profile',
  '$current_url', '$host', '$pathname', '$referrer', '$referring_domain',
  '$initial_current_url', '$initial_referrer', '$initial_referring_domain',
  '$session_entry_url', '$session_entry_referrer', '$session_entry_referring_domain',
  '$session_entry_pathname', '$search_engine', '$session_entry_search_engine',
  '$browser', '$browser_version', '$browser_language', '$browser_language_prefix',
  '$os', '$os_version', '$device_type',
  '$screen_height', '$screen_width', '$viewport_height', '$viewport_width',
  '$pageview_id', '$prev_pageview_id', '$prev_pageview_pathname', '$prev_pageview_duration',
])

/** Keep credentials, locations, and capability tokens out of analytics URLs. */
export function sanitizePostHogEvent(event: CaptureResult): CaptureResult | null {
  if (event.event !== '$pageview' && event.event !== '$pageleave') return null

  const properties: CaptureResult['properties'] = {}

  for (const [key, value] of Object.entries(event.properties)) {
    const isScrollMetric = /^\$prev_pageview_(last|max)_(scroll|content)(_percentage)?$/.test(key)
      && typeof value === 'number'
    if (!ALLOWED_PROPERTIES.has(key) && !isScrollMetric) continue
    if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) continue

    if (/url|referrer/i.test(key) && typeof value === 'string' && value !== '$direct') {
      try {
        const url = new URL(value)
        if (url.protocol === 'https:' || url.protocol === 'http:') {
          properties[key] = `${url.origin}${url.pathname}`
        }
      } catch {
        // Malformed attribution is safer to omit than to forward verbatim.
      }
    } else {
      properties[key] = value
    }
  }

  return { ...event, properties, $set: undefined, $set_once: undefined }
}

export function getPostHogSettings(): PostHogSettings | null {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.replace(/\/+$/, '')

  if (
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production' ||
    !token ||
    !host ||
    !['https://us.i.posthog.com', 'https://eu.i.posthog.com'].includes(host)
  ) {
    return null
  }

  return {
    token,
    options: {
      api_host: host,
      defaults: '2026-08-30',
      capture_pageview: 'history_change',
      capture_pageleave: true,
      persistence: 'localStorage',
      person_profiles: 'never',
      autocapture: false,
      capture_dead_clicks: false,
      capture_exceptions: false,
      capture_performance: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_product_tours: true,
      disable_external_dependency_loading: true,
      advanced_disable_flags: true,
      save_campaign_params: false,
      disable_capture_url_hashes: true,
      respect_dnt: true,
      opt_out_persistence_by_default: true,
      before_send: sanitizePostHogEvent,
    },
  }
}
