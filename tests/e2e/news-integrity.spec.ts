import { test, expect } from './fixtures';

const epoch = Date.parse('2026-10-11T22:50:00Z');
const iso = (offset: number): string => new Date(epoch + offset).toISOString();
const warning = {
  id: 'nws:synthetic', title: 'Tornado Warning for Example County', description: 'Synthetic warning fixture.',
  url: 'https://www.weather.gov/alerts', source: 'NWS', sourceId: 'nws-alerts', category: 'severe', priority: 'high',
  timestamp: iso(-60_000), kind: 'hazard', lifecycle: 'active', sourceState: 'fresh', sourceCheckedAt: iso(0), freshUntil: iso(300_000),
  hazard: { event: 'Tornado Warning', effective: iso(-60_000), expires: iso(30_000) },
  warning: { office: 'KFWD', severity: 'Extreme', urgency: 'Immediate', certainty: 'Observed', messageType: 'Alert', action: 'NEW',
    sent: iso(-60_000), effective: iso(-60_000), expires: iso(30_000), ends: '', areas: ['TXC001'] },
};
const source = { id: 'nws-alerts', name: 'NWS', url: 'https://www.weather.gov/alerts', state: 'fresh', lastAttemptAt: iso(0), lastSuccessAt: iso(0),
  freshUntil: iso(300_000), retainedUntil: iso(3600_000), coverage: 'NWS national actual alerts', received: 1, accepted: 1, rejected: 0, truncated: false, pages: 1,
  oldestItemAt: iso(-60_000), newestItemAt: iso(-60_000), issues: [] };

test('open page retires expired warnings and moves stale evidence into delayed reports', async ({ page }) => {
  await page.clock.install({ time: epoch });
  await page.route('**/api/news/rss**', route => route.fulfill({ json: {
    status: 'ok', items: [warning], happeningNow: [warning], featured: warning, delayedItems: [], sources: [source],
    lastUpdated: iso(0), stats: { byCategory: { severe: 1 }, errors: [] },
  } }));
  await page.goto('/news', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'HAPPENING NOW', exact: true })).toBeVisible();
  await page.clock.fastForward(31_000);
  await expect(page.getByRole('heading', { name: 'HAPPENING NOW', exact: true })).toHaveCount(0);
  await expect(page.getByText('Verified active NWS warning', { exact: true })).toHaveCount(0);
  await page.clock.fastForward(300_000);
  await expect(page.getByRole('heading', { name: 'DELAYED REPORTS' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'TOP STORY', exact: true })).toHaveCount(0);
  await page.getByText('Source coverage', { exact: true }).click();
  await expect(page.getByText('NWS · delayed', { exact: true })).toBeVisible();
});

test('unavailable NWS coverage never becomes a quiet-weather empty state', async ({ page }) => {
  await page.route('**/api/news/rss**', route => route.fulfill({ json: {
    status: 'ok', items: [], happeningNow: [], featured: null, delayedItems: [],
    sources: [{ ...source, state: 'unavailable', lastSuccessAt: null, freshUntil: null, retainedUntil: null, received: 0, accepted: 0 }],
    lastUpdated: iso(0), stats: { byCategory: {}, errors: ['NWS: unavailable'] },
  } }));
  await page.goto('/news', { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: /SEVERE/i }).click();
  await expect(page.getByText(/Missing reports do not mean conditions are clear/i)).toBeVisible();
  await expect(page.getByText(/No Current NWS Warnings/i)).toHaveCount(0);
  await page.getByText('Source coverage', { exact: true }).click();
  await expect(page.getByText('No successful source check available', { exact: true })).toBeVisible();
});
