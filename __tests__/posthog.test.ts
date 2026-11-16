import { getPostHogSettings, sanitizePostHogEvent } from '@/lib/posthog'
import type { CaptureResult } from 'posthog-js'

describe('PostHog production configuration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      NEXT_PUBLIC_VERCEL_ENV: 'production',
      NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: 'phc_test_fixture',
      NEXT_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('uses the Marketplace variables and captures SPA navigation without replay or form capture', () => {
    const settings = getPostHogSettings()
    expect(settings?.token).toBe('phc_test_fixture')
    expect(settings?.options).toMatchObject({
      api_host: 'https://us.i.posthog.com',
      capture_pageview: 'history_change',
      capture_pageleave: true,
      autocapture: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_external_dependency_loading: true,
      capture_exceptions: false,
      persistence: 'localStorage',
      person_profiles: 'never',
      respect_dnt: true,
      opt_out_persistence_by_default: true,
      before_send: sanitizePostHogEvent,
    })
  })

  it.each(['preview', 'development', undefined])('does not collect traffic from Vercel environment %s', environment => {
    if (environment) process.env.NEXT_PUBLIC_VERCEL_ENV = environment
    else delete process.env.NEXT_PUBLIC_VERCEL_ENV
    expect(getPostHogSettings()).toBeNull()
  })

  it('does not collect during local development even with production variables', () => {
    process.env = { ...process.env, NODE_ENV: 'development' }
    expect(getPostHogSettings()).toBeNull()
  })

  it.each(['NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', 'NEXT_PUBLIC_POSTHOG_HOST'])('stays disabled without %s', key => {
    delete process.env[key]
    expect(getPostHogSettings()).toBeNull()
  })

  it.each(['https://eu.i.posthog.com', 'https://us.i.posthog.com'])('supports the Marketplace ingestion region %s', host => {
    process.env.NEXT_PUBLIC_POSTHOG_HOST = host
    expect(getPostHogSettings()?.options.api_host).toBe(host)
  })

  it.each(['http://us.i.posthog.com', 'https://untrusted.example', 'invalid'])('does not send analytics to an invalid ingestion host %s', host => {
    process.env.NEXT_PUBLIC_POSTHOG_HOST = host
    expect(getPostHogSettings()).toBeNull()
  })
})

describe('PostHog event privacy', () => {
  it.each(['$pageview', '$pageleave'])('removes sensitive URL data from %s, including initial and session attribution', eventName => {
    const event: CaptureResult = {
      uuid: 'fixture-event-id',
      event: eventName,
      properties: {
        $current_url: 'https://weather.example/alerts/manage?token=fixture-secret#access_token=fixture-secret',
        $referrer: 'https://weather.example/auth/callback?code=fixture-secret',
        $initial_current_url: 'https://weather.example/?lat=39.74&lon=-104.99',
        $session_entry_url: 'https://weather.example/?q=private-address',
        $session_entry_referrer: 'https://search.example/search?q=private-address',
        $session_entry_utm_content: 'private-address',
        $initial_gclid: 'fixture-secret',
        ph_keyword: 'private-address',
        $session_entry_ph_keyword: 'private-address',
        $session_entry_ttclid: 'fixture-secret',
        $session_entry_li_fat_id: 'fixture-secret',
        $session_entry_gad_source: 'fixture-secret',
        $session_entry__kx: 'fixture-secret',
        unexpected_sdk_property: 'fixture-secret',
        token: 'phc_test_fixture',
        distinct_id: 'anonymous-browser-id',
        $session_id: 'anonymous-session-id',
        $process_person_profile: false,
        $prev_pageview_max_scroll_percentage: 0.5,
        $pathname: '/alerts/manage',
        $browser: 'Chrome',
        $set: { email: 'private@example.com' },
        $set_once: { $initial_current_url: 'https://weather.example/?token=fixture-secret' },
      },
      $set: { email: 'private@example.com' },
      $set_once: { $initial_referrer: 'https://weather.example/?token=fixture-secret' },
    }

    const sanitized = sanitizePostHogEvent(event)
    expect(sanitized?.properties).toMatchObject({
      $current_url: 'https://weather.example/alerts/manage',
      $referrer: 'https://weather.example/auth/callback',
      $initial_current_url: 'https://weather.example/',
      $session_entry_url: 'https://weather.example/',
      $session_entry_referrer: 'https://search.example/search',
      $pathname: '/alerts/manage',
      $browser: 'Chrome',
      token: 'phc_test_fixture',
      distinct_id: 'anonymous-browser-id',
      $session_id: 'anonymous-session-id',
      $process_person_profile: false,
      $prev_pageview_max_scroll_percentage: 0.5,
    })
    expect(JSON.stringify(sanitized)).not.toMatch(/fixture-secret|private-address|private@example.com|39\.74|-104\.99/)
    expect(sanitized?.uuid).toBe('fixture-event-id')
  })

  it('preserves direct attribution and drops malformed URLs rather than leaking their contents', () => {
    const event: CaptureResult = {
      uuid: 'fixture-event-id',
      event: '$pageview',
      properties: {
        $referrer: '$direct',
        $initial_referrer: 'malformed-private-value',
        $current_url: 'https://private:password@weather.example/radar?lat=39#secret',
      },
    }
    const sanitized = sanitizePostHogEvent(event)
    expect(sanitized?.properties.$referrer).toBe('$direct')
    expect(sanitized?.properties.$current_url).toBe('https://weather.example/radar')
    expect(JSON.stringify(sanitized)).not.toMatch(/malformed-private-value|password|secret/)
  })

  it.each(['$autocapture', '$snapshot', '$identify', '$exception'])('drops unexpected collection event %s', event => {
    expect(sanitizePostHogEvent({ uuid: 'fixture', event, properties: { email: 'private@example.com' } })).toBeNull()
  })
})
