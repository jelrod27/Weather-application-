import { test, expect } from './fixtures'
import { setupStableApp, stubRadarApis, waitForRadarToLoad } from '../fixtures/utils'
import type { Page } from '@playwright/test'

async function precipitationPng(page: Page, dry = false): Promise<Buffer> {
  const data = await page.evaluate((transparent) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 512
    const context = canvas.getContext('2d')!
    if (!transparent) {
      context.fillStyle = '#0077aa'
      context.fillRect(64, 64, 384, 384)
    }
    return canvas.toDataURL('image/png').split(',')[1]
  }, dry)
  return Buffer.from(data, 'base64')
}

async function precipitationPixels(page: Page): Promise<number> {
  return page.locator('.radar-precip-layer canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
    let count = 0
    for (let index = 0; index < data.length; index += 4) {
      // Canvas alpha premultiplication can round the fixture's RGB by a pixel value.
      if (data[index] < 10 && Math.abs(data[index + 1] - 119) < 4 && Math.abs(data[index + 2] - 170) < 4 && data[index + 3] > 100) count++
    }
    return count
  })
}

test.describe('Radar precipitation rendering and recovery', () => {
  test.beforeEach(async ({ page }) => {
    await setupStableApp(page)
    await stubRadarApis(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
  })

  for (const mobile of [false, true]) {
    test(`draws precipitation pixels on ${mobile ? 'phone' : 'desktop'}`, async ({ page }) => {
      if (mobile) await page.setViewportSize({ width: 390, height: 844 })
      const body = await precipitationPng(page)
      await page.route('**/api/radar/tile/**', (route) => route.fulfill({ contentType: 'image/png', body }))
      await page.goto('/radar?lat=40.7&lon=-74&layers=precip')
      await waitForRadarToLoad(page)

      await expect.poll(() => precipitationPixels(page)).toBeGreaterThan(1000)
      await expect(page.locator('.radar-precip-layer')).toBeVisible()
      await expect(page.getByTestId('radar-tile-status')).toHaveCount(0)
    })
  }

  test('recovers failed images while paused and clears the error after rendering', async ({ page }) => {
    const body = await precipitationPng(page)
    const attempts = new Map<string, number>()
    await page.route('**/api/radar/tile/**', async (route) => {
      const url = route.request().url().split('?')[0]
      const attempt = (attempts.get(url) ?? 0) + 1
      attempts.set(url, attempt)
      // A 200 response with an invalid image must fail just like a proxy error.
      await route.fulfill(attempt === 1
        ? { contentType: 'image/png', body: 'invalid image' }
        : attempt === 2
          ? { status: 502, contentType: 'application/json', body: '{"error":"Failed to fetch radar tile"}' }
          : { contentType: 'image/png', body })
    })
    await page.goto('/radar?lat=40.7&lon=-74&layers=precip')
    await waitForRadarToLoad(page)

    await expect(page.getByTestId('radar-tile-status')).toContainText(/retrying/i)
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
    await expect.poll(() => precipitationPixels(page)).toBeGreaterThan(1000)
    await expect(page.getByTestId('radar-tile-status')).toHaveCount(0)
    expect([...attempts.values()]).toEqual(expect.arrayContaining([3]))
    expect(Math.max(...attempts.values())).toBe(3)
  })

  test('stops after two retries and keeps partial failures visible despite other successful tiles', async ({ page }) => {
    const body = await precipitationPng(page)
    const attempts = new Map<string, number>()
    let failedUrl: string | undefined
    await page.route('**/api/radar/tile/**', async (route) => {
      const url = route.request().url().split('?')[0]
      failedUrl ??= url
      attempts.set(url, (attempts.get(url) ?? 0) + 1)
      await route.fulfill(url === failedUrl
        ? { status: 502, contentType: 'application/json', body: '{"error":"Failed to fetch radar tile"}' }
        : { contentType: 'image/png', body })
    })
    await page.goto('/radar?lat=40.7&lon=-74&layers=precip')
    await waitForRadarToLoad(page)

    await expect(page.getByTestId('radar-tile-status')).toContainText(/reload to try again/i)
    await expect.poll(() => precipitationPixels(page)).toBeGreaterThan(1000)
    expect(attempts.get(failedUrl!)).toBe(3)
    await page.waitForTimeout(2500)
    expect(attempts.get(failedUrl!)).toBe(3)
    await expect(page.getByTestId('radar-tile-status')).toBeVisible()
  })

  test('treats successfully loaded transparent imagery as dry weather', async ({ page }) => {
    const body = await precipitationPng(page, true)
    let requests = 0
    await page.route('**/api/radar/tile/**', async (route) => {
      requests++
      await route.fulfill({ contentType: 'image/png', body })
    })
    await page.goto('/radar?lat=40.7&lon=-74&layers=precip')
    await waitForRadarToLoad(page)
    await expect.poll(() => requests).toBeGreaterThan(0)
    await expect(page.locator('.radar-precip-layer canvas')).toBeVisible()
    await expect.poll(() => precipitationPixels(page)).toBe(0)
    await expect(page.getByTestId('radar-tile-status')).toHaveCount(0)
  })

  test('hiding precipitation cancels retries and returning to an exhausted frame does not restart them', async ({ page }) => {
    const body = await precipitationPng(page)
    const attempts = new Map<string, number>()
    await page.route('**/api/radar/tile/**', async (route) => {
      const url = route.request().url().split('?')[0]
      if (url.includes('/1718841600/')) {
        attempts.set(url, (attempts.get(url) ?? 0) + 1)
        await route.fulfill({ status: 502, body: 'unavailable' })
      } else await route.fulfill({ contentType: 'image/png', body })
    })
    await page.goto('/radar?lat=40.7&lon=-74&layers=precip')
    await waitForRadarToLoad(page)
    await expect(page.getByTestId('radar-tile-status')).toContainText(/retrying/i)
    await page.getByRole('button', { name: 'Layers', exact: true }).click()
    await page.getByRole('checkbox', { name: /Precipitation/ }).uncheck()
    await expect(page.getByTestId('radar-tile-status')).toHaveCount(0)
    const hiddenAttempts = [...attempts.values()]
    await page.waitForTimeout(2500)
    expect([...attempts.values()]).toEqual(hiddenAttempts)
    await page.getByRole('checkbox', { name: /Precipitation/ }).check()
    await page.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(page.getByTestId('radar-tile-status')).toContainText(/reload to try again/i)
    expect(Math.max(...attempts.values())).toBe(3)
    const exhaustedAttempts = [...attempts.values()]
    await page.getByRole('slider', { name: 'Radar timeline' }).fill('11')
    await expect.poll(() => precipitationPixels(page)).toBeGreaterThan(1000)
    await expect(page.getByTestId('radar-tile-status')).toHaveCount(0)
    await page.getByRole('slider', { name: 'Radar timeline' }).fill('12')
    await expect(page.getByTestId('radar-tile-status')).toContainText(/reload to try again/i)
    await page.waitForTimeout(2500)
    expect([...attempts.values()]).toEqual(exhaustedAttempts)
  })

  test('leaving the radar cancels pending retries', async ({ page }) => {
    let requests = 0
    await page.route('**/api/radar/tile/**', async (route) => {
      requests++
      await route.fulfill({ status: 502, body: 'unavailable' })
    })
    await page.goto('/radar?lat=40.7&lon=-74&layers=precip')
    await waitForRadarToLoad(page)
    await expect(page.getByTestId('radar-tile-status')).toContainText(/retrying/i)
    const timeOrigin = await page.evaluate(() => performance.timeOrigin)
    await page.getByRole('link', { name: 'Read this radar', exact: true }).click()
    await expect(page).toHaveURL(/\/education\/weather-skills/)
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin)
    const requestsAfterLeaving = requests
    await page.waitForTimeout(2500)
    expect(requests).toBe(requestsAfterLeaving)
  })

  test('a successful zoom clears failures from the previous resolution', async ({ page }) => {
    const body = await precipitationPng(page)
    await page.route('**/api/radar/tile/**', (route) => route.fulfill(
      route.request().url().includes('/512/4/')
        ? { status: 502, body: 'unavailable' }
        : { contentType: 'image/png', body },
    ))
    await page.goto('/radar?lat=40.7&lon=-74&layers=precip&zoom=5')
    await waitForRadarToLoad(page)
    await expect(page.getByTestId('radar-tile-status')).toContainText(/retrying/i)
    await page.getByRole('button', { name: '+', exact: true }).click()
    await expect.poll(() => precipitationPixels(page)).toBeGreaterThan(1000)
    await expect(page.getByTestId('radar-tile-status')).toHaveCount(0)
  })

  test('retries failed imagery during continuous autoplay', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const body = await precipitationPng(page)
    const attempts = new Map<string, number>()
    await page.route('**/api/radar/tile/**', async (route) => {
      const url = route.request().url().split('?')[0]
      const attempt = (attempts.get(url) ?? 0) + 1
      attempts.set(url, attempt)
      await route.fulfill(attempt === 1
        ? { status: 502, body: 'unavailable' }
        : { contentType: 'image/png', body })
    })
    await page.goto('/radar?lat=40.7&lon=-74&layers=precip')
    await waitForRadarToLoad(page)
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
    await expect.poll(() => precipitationPixels(page), { timeout: 20_000 }).toBeGreaterThan(1000)
    expect(Math.max(...attempts.values())).toBe(2)
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
  })
})
