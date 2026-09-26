import { z } from 'zod'
import { test, expect } from './fixtures'

const articleGraphSchema = z.object({
  '@graph': z.array(z.object({
    '@type': z.string(), citation: z.array(z.string()).optional(),
  })).optional(),
})
const faqSchema = z.object({
  '@type': z.literal('FAQPage'),
  mainEntity: z.array(z.object({ acceptedAnswer: z.object({ text: z.string() }) })),
})

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`Education corrections at ${viewport.width}px`, () => {
    test.use({ viewport })

    test('cloud filters reflect the taxonomy and the lenticular guide remains reachable', async ({ page }) => {
      await page.goto('/cloud-types')
      await page.getByRole('tab', { name: /^genus/i }).click()
      // Card titles are divs; the permanent GuideIndex also links "LENTICULAR".
      const lenticularCard = page.getByText('LENTICULAR', { exact: true }).and(page.locator('div'))
      await expect(lenticularCard).toHaveCount(0)
      await expect(page.getByText('MAMMATUS', { exact: true })).toHaveCount(0)
      await page.getByRole('tab', { name: /^species/i }).click()
      await expect(lenticularCard).toBeVisible()
      await page.getByRole('tab', { name: /^feature/i }).click()
      await expect(page.getByText('MAMMATUS', { exact: true })).toBeVisible()
      await expect(page.getByText('ASPERITAS', { exact: true })).toBeVisible()
      await page.goto('/education/cloud-types/lenticular')
      await expect(page.getByRole('heading', { name: 'Lenticular', exact: true })).toBeVisible()
      await expect(page.getByRole('link', { name: 'WMO International Cloud Atlas — Lenticularis' })).toBeVisible()
    })

    test('phenomenon sources survive expansion and appear in detail-page metadata', async ({ page }) => {
      await page.goto('/fun-facts')
      const source = page.getByRole('link', { name: 'Cen, Yuan & Xue (2014) — Recorded optical spectrum' })
      await expect(source).toBeVisible()
      await page.getByText('Ball Lightning', { exact: true }).first().click()
      await expect(page.getByText('Informal Hazard Rating:', { exact: true })).toBeVisible()
      await expect(source).toBeVisible()
      await page.goto('/education/phenomena/ball-lightning')
      await expect(source).toBeVisible()
      const graphs = await page.locator('script[type="application/ld+json"]').allTextContents()
      const article = graphs.flatMap((text) => articleGraphSchema.parse(JSON.parse(text))['@graph'] ?? []).find((entry) => entry['@type'] === 'Article')
      expect(article?.citation).toContain(await source.getAttribute('href'))
      await expect(page.getByText(/not measured occurrence rates/)).toBeVisible()
    })

    test('flare FAQ matches its structured data and links to NOAA', async ({ page }) => {
      await page.goto('/space-weather/solar-flares')
      await expect(page.getByRole('link', { name: 'NOAA GOES X-ray flux' })).toBeVisible()
      const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
      const faq = schemas.map((text) => faqSchema.safeParse(JSON.parse(text))).find((entry) => entry.success)?.data
      expect(faq?.mainEntity.length).toBeGreaterThan(0)
      for (const item of faq?.mainEntity ?? []) {
        await expect(page.getByText(item.acceptedAnswer.text, { exact: true })).toBeVisible()
      }
      expect(faq?.mainEntity[0].acceptedAnswer.text).toContain('100 times')
    })
  })
}
