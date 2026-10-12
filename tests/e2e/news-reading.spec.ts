import { test, expect } from './fixtures';
import { NEWS_EPOCH, newsBrowse, newsItem, newsTime, newsWarning } from '../fixtures/news-reading';
import type { NewsSectionId } from '../../lib/news/sections';
import type { Page } from '@playwright/test';

async function fixtureFeed(page: Page): Promise<void> {
  const items = [
    ...Array.from({ length: 90 }, (_, index) => newsWarning({ id: `warning-${index}` })),
    ...Array.from({ length: 75 }, (_, index) => newsItem({ id: `story-${String(index).padStart(3, '0')}`, title: `Cloud lesson ${index}` })),
    newsItem({ id: 'outlook', title: 'Tomorrow outlook', kind: 'outlook', category: 'severe' }),
  ];
  await page.clock.install({ time: NEWS_EPOCH });
  await page.route('**/api/news/rss**', route => {
    const query = new URL(route.request().url()).searchParams;
    const category = query.get('categories');
    const available = category ? items.filter(item => item.category === category) : items;
    return route.fulfill({ json: { status: 'ok', ...newsBrowse(available, {
      section: query.get('section') as NewsSectionId | undefined || undefined,
      query: query.get('q') ?? '', offset: Number(query.get('offset') ?? 0),
    }) } });
  });
}

test.describe('news reading experience', () => {
for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`${viewport.name}: bounded sections, view all, full search and category navigation`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await fixtureFeed(page);
    await page.goto('/news');
    await expect(page.locator('[data-news-section="active"] [data-news-key]')).toHaveCount(4);
    await expect(page.locator('[data-news-section="reading"] [data-news-key]')).toHaveCount(3);
    await expect(page.locator('[data-news-key="story-000"]')).toHaveCount(1);
    const refreshStatus = await page.getByRole('status').filter({ hasText: 'Checks every 2 minutes' }).boundingBox();
    expect(refreshStatus?.width).toBeGreaterThan(250);
    await expect(page.getByRole('link', { name: 'Open the local Warning Center' })).toHaveAttribute('href', '/warnings');
    await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-news-sections.png`), fullPage: true });

    await page.getByRole('button', { name: 'View all weather & science reading' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-news-section="reading"] [data-news-key]')).toHaveCount(24);
    await expect(page.getByRole('heading', { name: 'WEATHER & SCIENCE READING', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByText('Page 2 of 4', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'WEATHER & SCIENCE READING', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByRole('link', { name: /^Cloud lesson 69 from/ })).toBeVisible();
    await page.getByRole('button', { name: 'Previous page' }).click();
    await expect(page.getByText('Page 2 of 4', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'WEATHER & SCIENCE READING', exact: true })).toBeFocused();

    await page.getByRole('textbox', { name: 'Search news' }).fill('Cloud lesson 74');
    await page.clock.runFor(350);
    await expect(page.getByRole('heading', { name: 'Cloud lesson 74', exact: true })).toBeVisible();
    await expect(page.locator('[data-news-key]')).toHaveCount(1);
    await page.getByRole('tab', { name: 'SEVERE', exact: true }).click();
    await expect(page.getByText(/No matching reports in the available feeds/)).toBeVisible();
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(page.locator('[data-news-section="reading"] [data-news-key]')).toHaveCount(3);
    await expect(page.getByRole('textbox', { name: 'Search news' })).toHaveValue('');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('background checks preserve reading position, focus, and official bulletin access until applied', async ({ page }) => {
  await page.clock.install({ time: NEWS_EPOCH });
  const reading = [newsItem(), newsItem({ id: 'reading-2', title: 'Reading anchor' })];
  const warning = newsWarning({ updates: [
    { id: 'u2', title: 'Latest official warning', url: 'https://www.weather.gov/alerts?update=2', issuedAt: newsTime(0) },
    { id: 'u1', title: 'Original official warning', url: 'https://www.weather.gov/alerts?update=1', issuedAt: newsTime(-60_000) },
  ] });
  let requests = 0;
  let updated = false;
  await page.route('**/api/news/rss**', route => {
    requests++;
    return route.fulfill({ json: { status: 'ok', ...newsBrowse(!updated ? [warning, ...reading] : [
      warning, newsItem({ id: 'new-story', title: 'New weather research', timestamp: new Date(NEWS_EPOCH) }), ...reading,
    ]) } });
  });
  await page.goto('/news');
  await page.getByText('Official updates (2)', { exact: true }).click();
  const original = page.getByRole('link', { name: /Original official warning/ });
  await expect(original).toHaveAttribute('href', 'https://www.weather.gov/alerts?update=1');
  await expect(original).toHaveAttribute('target', '_blank');
  await expect(original).toHaveAttribute('rel', /noopener/);

  const anchor = page.locator('[data-news-key="reading-1"]');
  const focused = anchor.getByRole('button', { name: /Read/i }).first();
  await anchor.scrollIntoViewIfNeeded();
  await focused.focus();
  const top = await anchor.evaluate(element => element.getBoundingClientRect().top);
  const initialRequests = requests;
  updated = true;
  await page.clock.runFor(120_000);
  await expect(page.getByRole('button', { name: 'Apply latest feed' })).toBeEnabled();
  await expect(page.getByText('New weather research', { exact: true })).toHaveCount(0);
  await expect(focused).toBeFocused();
  expect(Math.abs(await anchor.evaluate(element => element.getBoundingClientRect().top) - top)).toBeLessThan(3);
  expect(requests).toBe(initialRequests + 1);

  // Dispatch activation without Playwright auto-scrolling to the toolbar; preserve the reader's anchor.
  await page.getByRole('button', { name: 'Apply latest feed' }).dispatchEvent('click');
  await expect(page.getByRole('heading', { name: 'New weather research', exact: true })).toBeVisible();
  expect(Math.abs(await anchor.evaluate(element => element.getBoundingClientRect().top) - top)).toBeLessThan(3);
  await expect(anchor.getByRole('link').first()).toBeFocused();
});

test('hidden page pauses refresh; return and failed refresh retain delayed reading', async ({ page }) => {
  await page.clock.install({ time: NEWS_EPOCH });
  let requests = 0;
  let offline = false;
  await page.route('**/api/news/rss**', route => {
    requests++;
    return !offline ? route.fulfill({ json: { status: 'ok', ...newsBrowse() } }) : route.fulfill({ status: 503, body: 'Synthetic outage' });
  });
  await page.goto('/news');
  await expect(page.getByRole('heading', { name: 'How clouds form', exact: true })).toBeVisible();
  const initialRequests = requests;
  offline = true;
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(600_000);
  expect(requests).toBe(initialRequests);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('alert').filter({ hasText: 'Refresh failed' })).toBeVisible();
  expect(requests).toBe(initialRequests + 1);
  await expect(page.getByText('Verified active NWS warning', { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-news-section="delayed"] [data-news-key]')).toHaveCount(2);
});

test('expiry keeps the focused original bulletin visible when its card moves sections', async ({ page }) => {
  await page.clock.install({ time: NEWS_EPOCH });
  const warning = newsWarning({ updates: [
    { id: 'u1', title: 'Original CAP bulletin', url: 'https://api.weather.gov/alerts/urn:oid:synthetic', issuedAt: newsTime(-60_000) },
  ] });
  warning.warning!.expires = newsTime(37_000);
  await page.route('**/api/news/rss**', route => route.fulfill({ json: { status: 'ok', ...newsBrowse([warning, newsItem()]) } }));
  await page.goto('/news');
  await page.getByText('Official updates (1)', { exact: true }).click();
  const bulletin = page.getByRole('link', { name: /Original CAP bulletin/ });
  await bulletin.focus();
  await page.clock.runFor(37_000);
  await expect(page.locator('[data-news-section="active"]')).toHaveCount(0);
  await expect(bulletin).toBeVisible();
  await expect(bulletin).toBeFocused();
  await expect(page.locator('[data-news-section="reports"] details')).toHaveAttribute('open', '');
});
});
