import { test, expect } from './fixtures'

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`Weather skills at ${viewport.width}px`, () => {
    test.use({ viewport })

    test('steps and lesson navigation keep the originating weather view', async ({ page }) => {
      const returnTo = '/radar?lat=47.6&lon=-122.33&label=Seattle'
      const params = new URLSearchParams({ lesson: 'clouds', returnTo })
      await page.goto(`/education/weather-skills?${params}`)
      await expect(page.getByRole('img', { name: 'STRATUS shown within the cloud layers' })).toBeVisible()
      const next = page.getByRole('button', { name: 'Next step' })
      await next.focus()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('heading', { name: 'Cirrus: delicate streaks high above' })).toBeVisible()
      await expect(next).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('region', { name: 'Read the clouds' }).getByRole('link', { name: 'Back to your weather' })).toBeFocused()
      await page.getByRole('navigation', { name: 'Weather lessons' }).getByRole('link', { name: 'Read radar with your forecast' }).click()
      await expect(page.getByRole('heading', { name: 'Read the legend before the color' })).toBeVisible()
      await page.getByRole('button', { name: '3. Forecast' }).click()
      await expect(page.getByText(/hour ending at the listed time/)).toBeVisible()
      for (const link of await page.getByRole('link', { name: 'Back to your weather' }).all()) {
        await expect(link).toHaveAttribute('href', returnTo)
      }
      const size = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }))
      expect(size.content).toBeLessThanOrEqual(size.viewport)
    })

    test('external return destinations fall back to the local forecast', async ({ page }) => {
      await page.goto('/education/weather-skills?lesson=radar&returnTo=https%3A%2F%2Fexample.com')
      await expect(page.getByRole('link', { name: 'Open local forecast' })).toHaveAttribute('href', '/')
    })
  })
}
