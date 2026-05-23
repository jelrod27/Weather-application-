import { test, expect } from './fixtures';
import { setupStableApp, navigateToMapPage, waitForRadarToLoad, checkRadarVisibility, setTheme } from '../fixtures/utils';

function isIowaNexradRequest(url: string): boolean {
  try {
    return new URL(url).hostname === 'mesonet.agron.iastate.edu';
  } catch {
    return false;
  }
}

function isMrmsProxyRequest(url: string): boolean {
  try {
    return new URL(url).pathname.startsWith('/api/weather/noaa-wms');
  } catch {
    return false;
  }
}

test.describe('Radar Map', () => {
  test.beforeEach(async ({ page }) => {
    await setupStableApp(page);
  });

  test('radar map loads successfully', async ({ page }) => {
    await navigateToMapPage(page);
    await waitForRadarToLoad(page);

    const radarContainer = page.locator('[data-radar-container]').first();
    await expect(radarContainer).toBeVisible({ timeout: 15000 });
  });

  test('radar visible in synthwave theme', async ({ page }) => {
    await setTheme(page, 'synthwave84');
    await navigateToMapPage(page);
    await waitForRadarToLoad(page);

    const isVisible = await checkRadarVisibility(page);
    expect(isVisible).toBeTruthy();

    const radarContainer = page.locator('[data-radar-container]').first();
    if (await radarContainer.count() > 0) {
      const zIndex = await radarContainer.evaluate((el) => {
        return window.getComputedStyle(el).zIndex;
      });

      expect(parseInt(zIndex) >= 10000 || zIndex === 'auto').toBeTruthy();
    }
  });

  test('radar visible in matrix theme', async ({ page }) => {
    await setTheme(page, 'matrix');
    await navigateToMapPage(page);
    await waitForRadarToLoad(page);

    const isVisible = await checkRadarVisibility(page);
    expect(isVisible).toBeTruthy();

    const radarContainer = page.locator('[data-radar-container]').first();
    if (await radarContainer.count() > 0) {
      const zIndex = await radarContainer.evaluate((el) => {
        return window.getComputedStyle(el).zIndex;
      });

      expect(parseInt(zIndex) >= 10000 || zIndex === 'auto').toBeTruthy();
    }
  });

  test('radar visible in default dark theme', async ({ page }) => {
    await setTheme(page, 'dark');
    await navigateToMapPage(page);
    await waitForRadarToLoad(page);

    const radarContainer = page.locator('[data-radar-container]').first();
    await expect(radarContainer).toBeVisible({ timeout: 15000 });
  });

  test('radar map controls are visible', async ({ page }) => {
    await navigateToMapPage(page);
    await waitForRadarToLoad(page);

    const isVisible = await checkRadarVisibility(page);
    expect(isVisible).toBeTruthy();

    await expect(page.getByRole('button', { name: /layers/i })).toBeVisible({ timeout: 10000 });
  });

  test('radar map displays status badge', async ({ page }) => {
    await navigateToMapPage(page);
    await waitForRadarToLoad(page);

    await expect(page.getByText(/NEXRAD|RAINVIEWER|RADAR unavailable|Set a location/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('US radar uses Iowa NEXRAD WMS directly (not MRMS proxy)', async ({ page }) => {
    const iowaTileUrls: string[] = [];
    const mrmsProxyUrls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (isIowaNexradRequest(url)) {
        iowaTileUrls.push(url);
      }
      if (isMrmsProxyRequest(url)) {
        mrmsProxyUrls.push(url);
      }
    });

    await navigateToMapPage(page);
    await waitForRadarToLoad(page);

    const radarContainer = page.locator('[data-radar-container]').first();
    await expect(radarContainer).toHaveAttribute('data-radar-us-source', 'iowa-wms-t');
    await expect(page.getByText(/NEXRAD/i).first()).toBeVisible({ timeout: 10000 });

    await expect.poll(() => iowaTileUrls.length, { timeout: 15000 }).toBeGreaterThan(0);
    expect(mrmsProxyUrls.length).toBe(0);
  });

  test('radar canvas is not affected by synthwave theme filters', async ({ page }) => {
    await setTheme(page, 'synthwave84');
    await navigateToMapPage(page);
    await waitForRadarToLoad(page);

    const tileSurface = page.locator('[data-radar-container] canvas, [data-radar-container] .ol-layer img').first();
    await expect(tileSurface).toBeVisible({ timeout: 15000 });

    const surfaceFilter = await tileSurface.evaluate((el) => window.getComputedStyle(el).filter);
    expect(surfaceFilter).toBe('none');
  });
});
