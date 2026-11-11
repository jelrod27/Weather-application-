import { test, expect } from './fixtures'

// APIRequestContext exercises server-rendered HTML without client recovery.
// Set PLAYWRIGHT_TEST_BASE_URL to a running next start server to exercise the
// production build; the default Playwright configuration starts next dev.
for (const route of [
  '/space-weather',
  '/space-weather/kp-index',
  '/space-weather/aurora-forecast',
  '/space-weather/solar-flares',
  '/space-weather/solar-wind',
]) {
  test(`${route} serves server-rendered content`, async ({ request }) => {
    const response = await request.get(route)
    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(html).toContain('<h1')
    expect(html).not.toContain('Application error: a server-side exception')
    expect(html).not.toContain('Page changed from static to dynamic')
  })
}
