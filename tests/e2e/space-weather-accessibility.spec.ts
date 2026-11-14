import axe from 'axe-core'
import type { AxeResults } from 'axe-core'
import { test, expect } from './fixtures'

function providerFixtures(): Record<string, unknown> {
  const time = new Date(Date.now() - 60_000).toISOString()
  const frame = 'https://services.swpc.noaa.gov/images/animations/enlil/latest.jpg'
  return {
    scales: { scales: {
      R: { scale: 0, text: 'None', description: 'No radio blackout' },
      S: { scale: 1, text: 'Minor', description: 'Minor radiation storm' },
      G: { scale: 3, text: 'Strong', description: 'Strong geomagnetic storm' },
    } },
    alerts: { alerts: [1, 2].map(id => ({ id: String(id), type: 'watch', severity: 'moderate', title: `Bulletin ${id}`, issuedAt: time, summary: 'Example NOAA bulletin' })) },
    'kp-index': { data: { current: { value: 8, timeTag: time }, forecast: { expected: 5, maxExpected: 6, blocks: 8 } } },
    'solar-wind': { data: { current: { speed: 550, density: null, temperature: null, bz: -3, bt: 7 }, trend: 'stable' } },
    sunspots: { data: { current: { sunspotNumber: 45.7, observedF107: 108.4, date: '2026-10', period: 'monthly' }, monthlySmoothed: 88.6, smoothedDate: '2026-03' } },
    'xray-flux': { data: { current: { flareClass: 'C', classNumber: 'C1.2', flux: 0.0000012 }, peak24h: { classification: 'M', subClass: 1.7, timestamp: time } } },
    aurora: { kpIndex: 5, data: { currentKp: 5, hemisphere: 'north', viewline: null, updatedAt: time } },
    plasma: { data: [2, 1].map(minutes => ({ time: new Date(Date.now() - minutes * 60_000).toISOString(), speed: 550, density: 5, bz: -3, bt: 7, bx: 1, by: 1, temperature: 100000 })) },
    magnetometer: { data: [{ time, hp: 80 }] },
    'proton-flux': { data: [{ time, flux: 0.2 }] },
    enlil: { data: { frames: [frame], latest: frame, fallback: frame, frameCount: 1 } },
    flares: { events: [{ id: 'flare', beginTime: time, peakTime: time, endTime: time, classification: 'M1.7', classLetter: 'M', classNumber: 1.7, sourceLocation: 'N10E10', activeRegion: null, instruments: [], linkedCME: false }], summary: { total: 1, byClass: { X: 0, M: 1, C: 0, B: 0 }, strongestFlare: 'M1.7', withCME: 0 }, updatedAt: time },
  }
}

for (const width of [390, 1350]) for (const failed of [false, true]) {
  test(`keeps the dashboard stable when feeds ${failed ? 'fail' : 'load'} at ${width}px`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height: 940 })
    const fixtures = providerFixtures()
    await page.addInitScript(() => {
      const shifts: number[] = []
      Object.assign(window, { spaceWeatherShifts: shifts })
      if (!PerformanceObserver.supportedEntryTypes.includes('layout-shift')) return
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }
          if (!shift.hadRecentInput) shifts.push(shift.value)
        }
      }).observe({ type: 'layout-shift', buffered: true })
    })
    await page.route('**/api/space-weather/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const name = new URL(route.request().url()).pathname.split('/').pop() ?? ''
      await route.fulfill({ status: failed ? 503 : 200, json: failed ? { error: 'Unavailable' } : fixtures[name] ?? {} })
    })
    await page.goto('/space-weather')
    await expect(page.getByRole('status', { name: 'Space weather status' })).toHaveText(failed ? 'UNAVAILABLE' : 'STORM CONDITIONS')
    await expect(page.getByText('Last requested:')).toBeVisible()
    const cls = await page.evaluate(() =>
      (window as Window & { spaceWeatherShifts?: number[] }).spaceWeatherShifts?.reduce((sum, value) => sum + value, 0) ?? 0
    )
    if (browserName === 'chromium') expect(cls).toBeLessThan(0.1)
    // Every wavelength remains inside the card rather than its clipped ancestor.
    const channel = page.getByTestId('wavelength-LASCOC3')
    await channel.scrollIntoViewIfNeeded()
    await expect(channel).toBeVisible()
    await channel.click()
    await expect(channel).toHaveAttribute('aria-pressed', 'true')
  })
}

test('serves the default dashboard without JavaScript and keeps explanatory content inside main', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  try {
    await page.goto('/space-weather')
    await expect(page.getByRole('tab', { name: /Command Center/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Expand solar image' })).toBeVisible()
    await expect(page.getByRole('main').getByTestId('space-weather-seo-content')).toHaveCount(1)
  } finally { await context.close() }
})

test('traps solar dialog focus, closes with Escape and returns focus to expand', async ({ page }) => {
  await page.route('**/api/space-weather/**', route => route.fulfill({ json: { alerts: [] } }))
  await page.goto('/space-weather')
  const expand = page.getByRole('button', { name: 'Expand solar image' })
  await expand.click()
  const dialog = page.getByRole('dialog', { name: 'Solar image' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(expand).toBeFocused()
})

// Real rendered widgets with controlled provider responses keep this audit
// independent of NOAA availability and exercise populated and missing readings.
for (const theme of ['clear-sky', 'daybreak', 'nord']) {
  test(`has no automated accessibility violations across all tabs in ${theme}`, async ({ page }) => {
    const fixtures = providerFixtures()
    await page.addInitScript(theme => localStorage.setItem('weather-edu-theme', theme), theme)
    await page.route('https://services.swpc.noaa.gov/images/animations/enlil/**', route =>
      route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="black"/></svg>' })
    )
    await page.route('**/api/space-weather/**', route => {
      const name = new URL(route.request().url()).pathname.split('/').pop() ?? ''
      if (name === 'sdo-image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="30" fill="gold"/></svg>' })
      return route.fulfill({ json: fixtures[name] ?? {} })
    })
    await page.goto('/space-weather')
    await expect(page.getByRole('status', { name: 'Space weather status' })).toHaveText('STORM CONDITIONS')
    await page.addScriptTag({ content: axe.source })
    for (const id of ['command', 'solar', 'geomagnetic', 'wind', 'alerts']) {
      await page.locator(`#tab-${id}`).click()
      await expect(page.getByRole('tabpanel')).toHaveAttribute('id', `panel-${id}`)
      // Wait for the selected module, not for optional provider image downloads.
      await expect(page.getByText('LOADING MODULE...', { exact: true })).toHaveCount(0)
      await expect(page.getByRole('tabpanel').getByText('Loading...', { exact: true })).toHaveCount(0)
      if (id === 'solar') await expect(page.getByTestId('flare-timeline').getByText('M1.7', { exact: true })).toBeVisible()
      if (id === 'geomagnetic' || id === 'alerts') {
        await expect(page.getByText('G4 SEVERE STORM', { exact: true }).first()).toBeVisible()
        await expect(page.getByTestId('kp-current-value')).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
      }
      if (id === 'geomagnetic' || id === 'wind') await expect(page.getByText('550 km/s', { exact: true })).toBeVisible()
      if (id === 'wind') await expect(page.getByRole('slider', { name: 'Solar wind model frame' })).toBeVisible()
      if (id === 'alerts') await expect(page.getByText('Strong geomagnetic storm', { exact: true })).toBeVisible()
      const results = await page.evaluate<AxeResults>('axe.run()')
      expect(results.violations.map(({ id, nodes }) => ({ id, elements: nodes.map(node => ({ html: node.html, reason: node.failureSummary })) })), `${theme}: ${id}`).toEqual([])
    }
  })
}
