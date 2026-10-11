import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from './fixtures';
import { parseAtomFeed, parseRSSFeed } from '../../lib/services/rss/parse-feed';
import { FEED_SOURCES } from '../../lib/services/rss/feedSources';

const readFixture = (name: string): string => fs.readFileSync(path.join(__dirname, '../../__tests__/fixtures/news', name), 'utf8');
const nws = FEED_SOURCES.find((source) => source.id === 'nws-alerts')!;
const spc = FEED_SOURCES.find((source) => source.id === 'spc-outlooks')!;
const warnings = parseAtomFeed(readFixture('nws-2026-10-11.xml'), nws);
const day2 = parseRSSFeed(readFixture('spc-2026-10-11.xml'), spc).find((item) => item.title.includes('Day 2'))!;

for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`${viewport.name}: distinct hazards, uncropped map, credits and broken-image fallback`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.route('**/api/news/rss**', (route) => route.fulfill({ json: {
      status: 'ok', items: [...warnings, day2], happeningNow: warnings,
      featured: day2, stats: { byCategory: { severe: 4 }, errors: [], enabledSources: ['NWS', 'SPC'] },
      lastUpdated: '2026-10-11T19:00:00Z',
    } }));
    // Synthetic map makes layout/error tests independent of NOAA availability.
    await page.route('**/day2otlk_20261011_1730_prt.png', (route) => route.fulfill({ contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="815" height="555"><rect width="815" height="555" fill="white" stroke="black" stroke-width="12"/><text x="30" y="50" fill="black" font-size="26">Synthetic Day 2 map fixture</text><rect x="90" y="140" width="600" height="250" fill="#eff6ff" stroke="#2563eb"/><text x="30" y="525" fill="black" font-size="22">Legend at map boundary</text></svg>',
    }));
    await page.goto('/news', { waitUntil: 'domcontentloaded' });
    for (const family of ['wind', 'freeze', 'flash-flood']) {
      await expect(page.locator(`svg[data-hazard="${family}"]`).first()).toBeVisible();
    }
    const map = page.getByRole('img', { name: /SPC Day 2/ }).first();
    await expect(map).toBeVisible();
    await expect(map).toHaveCSS('object-fit', 'contain');
    await expect(page.getByRole('link', { name: 'NOAA / Storm Prediction Center', exact: true }).first()).toBeVisible();
    await expect(page.getByText(/^Valid Oct 12/).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-news-imagery.png`), fullPage: true });

    // A real load error (rather than a mocked React callback) must restore an honest visual.
    await page.unroute('**/day2otlk_20261011_1730_prt.png');
    await page.route('**/day2otlk_20261011_1730_prt.png', (route) => route.abort());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('img', { name: /Weather report illustration/ }).first()).toBeVisible();
    await expect(page.getByRole('img', { name: /SPC Day 2/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'NOAA / Storm Prediction Center', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Product source: NOAA / Storm Prediction Center', exact: true }).first()).toBeVisible();
    await expect(page.getByText(/^Valid Oct 12/).first()).toBeVisible();
  });
}
