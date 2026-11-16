import { gunzipSync } from 'node:zlib'
import { test, expect } from './fixtures'
import type { Page, Request } from '@playwright/test'

interface AnalyticsEvent {
  event: string
  properties: Record<string, unknown>
}

function decodeEvents(request: Request): AnalyticsEvent[] {
  const body = request.postDataBuffer()
  if (!body) return []

  let json: string
  if (body[0] === 0x1f && body[1] === 0x8b) {
    json = gunzipSync(body).toString()
  } else if (body.toString().startsWith('data=')) {
    const data = new URLSearchParams(body.toString()).get('data')!
    json = new URL(request.url()).searchParams.get('compression') === 'base64'
      ? Buffer.from(data, 'base64').toString()
      : data
  } else {
    json = body.toString()
  }

  const payload = JSON.parse(json)
  return Array.isArray(payload) ? payload : payload.batch ?? [payload]
}

async function interceptPostHog(page: Page, events: AnalyticsEvent[]): Promise<void> {
  // Intercept every PostHog host before navigation. No fixture reaches PostHog.
  await page.route('https://*.posthog.com/**', async route => {
    if (route.request().method() === 'POST') {
      events.push(...decodeEvents(route.request()))
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
      body: '{"status":1}',
    })
  })
}

test.describe('PostHog production SDK', () => {
  test.skip(process.env.POSTHOG_E2E_PRODUCTION !== 'true', 'Requires a production build with a fixture PostHog token; see README.')

  test.beforeEach(async ({ context }) => {
    // Model a human visit while leaving production bot filtering enabled.
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false, configurable: true })
      Object.defineProperty(navigator, 'userAgentData', { get: () => undefined, configurable: true })
    })
  })

  test('sends sanitized pageviews for initial, client-side, and repeat visits', async ({ page }, testInfo) => {
    const events: AnalyticsEvent[] = []
    const diagnostics: string[] = []
    page.on('console', message => diagnostics.push(message.text()))
    page.on('pageerror', error => diagnostics.push(error.message))
    page.on('requestfailed', request => diagnostics.push(`${request.url()}: ${request.failure()?.errorText}`))
    await interceptPostHog(page, events)
    await page.goto('/about?token=fixture-secret&ttclid=private-address&lat=39.74#access_token=fixture-secret', {
      referer: 'https://www.google.com/search?q=private-address',
    })
    try {
      await expect.poll(() => events.filter(event => event.event === '$pageview').length).toBe(1)
    } catch (error) {
      await testInfo.attach('analytics-diagnostics', {
        body: JSON.stringify({ diagnostics, browser: await page.evaluate(() => ({
          dnt: navigator.doNotTrack,
          userAgent: navigator.userAgent,
          resources: performance.getEntriesByType('resource').map(entry => entry.name),
        })) }, null, 2),
        contentType: 'application/json',
      })
      throw error
    }
    const initial = events.find(event => event.event === '$pageview')!
    expect(initial.properties.$pathname).toBe('/about')
    expect(typeof initial.properties.distinct_id).toBe('string')
    expect(initial.properties.token).toBeTruthy()

    await page.locator('a[href="/"]').filter({ visible: true }).first().click()
    await expect(page).toHaveURL(/\/$/)
    await expect.poll(() => events.filter(event => event.event === '$pageview').length).toBe(2)
    expect(events.filter(event => event.event === '$pageview')[1].properties.$pathname).toBe('/')

    await page.reload()
    await expect.poll(() => events.filter(event => event.event === '$pageview').length).toBe(3)
    const repeat = events.filter(event => event.event === '$pageview')[2]
    expect(repeat.properties.distinct_id).toBe(initial.properties.distinct_id)
    // Exercise pagehide while the document stays alive so Playwright can observe
    // the beacon; actual teardown can cancel intercepted beacon responses.
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
    await expect.poll(() => events.some(event => event.event === '$pageleave')).toBe(true)
    expect(events.every(event => ['$pageview', '$pageleave'].includes(event.event))).toBe(true)
    expect(JSON.stringify(events)).not.toMatch(/fixture-secret|private-address|39\.74/)
    expect(events.every(event => event.properties.$process_person_profile === false)).toBe(true)
  })

  test('does not send events or retain an identifier when Do Not Track is enabled', async ({ page, context }) => {
    const events: AnalyticsEvent[] = []
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'doNotTrack', { get: () => '1', configurable: true })
    })
    await interceptPostHog(page, events)
    await page.goto('/about')
    // PostHog installs this history hook during initialization, even with DNT.
    // Wait for it so a missing or delayed SDK cannot pass the negative assertions.
    await expect.poll(() => page.evaluate(() => '__posthog_wrapped__' in history.pushState), {
      message: 'PostHog must initialize navigation tracking before checking DNT',
    }).toBe(true)
    await page.locator('a[href="/"]').filter({ visible: true }).first().click()
    await expect(page).toHaveURL(/\/$/)
    expect(events).toEqual([])
    const identifiers = await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('ph_')))
    expect(identifiers).toEqual([])
    expect((await context.cookies()).filter(cookie => cookie.name.startsWith('ph_'))).toEqual([])
  })

  test('keeps navigation working when analytics requests are blocked', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('https://*.posthog.com/**', route => route.abort())
    await page.goto('/about')
    await page.locator('a[href="/"]').filter({ visible: true }).first().click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(errors).toEqual([])
  })
})
