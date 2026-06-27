'use client'

import type { PostHog } from 'posthog-js'
import type { AnalyticsEventName } from '@/lib/analytics/events'

let posthogClient: PostHog | null = null
let initPromise: Promise<PostHog | null> | null = null

function getPostHogKey(): string | undefined {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY
}

function getPostHogHost(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
}

/** Lazy-init PostHog on the client. No-ops when the key is unset (local dev). */
export async function initPostHog(): Promise<PostHog | null> {
  if (typeof window === 'undefined') return null
  if (posthogClient) return posthogClient
  if (initPromise) return initPromise

  const key = getPostHogKey()
  if (!key) return null

  initPromise = import('posthog-js').then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: getPostHogHost(),
      person_profiles: 'identified_only',
      capture_pageview: false,
      capture_pageleave: true,
    })
    posthogClient = posthog
    return posthog
  })

  return initPromise
}

export function captureAnalyticsEvent(
  event: AnalyticsEventName,
  properties?: Record<string, unknown>,
): void {
  void initPostHog().then((client) => {
    client?.capture(event, properties)
  })
}

export function identifyAnalyticsUser(
  userId: string,
  traits?: Record<string, unknown>,
): void {
  void initPostHog().then((client) => {
    client?.identify(userId, traits)
  })
}

export function resetAnalyticsUser(): void {
  posthogClient?.reset()
  posthogClient = null
  initPromise = null
}

export function capturePageView(url: string): void {
  void initPostHog().then((client) => {
    client?.capture('$pageview', { $current_url: url })
  })
}
