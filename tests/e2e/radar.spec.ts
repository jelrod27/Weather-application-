import { test, expect } from './fixtures';
import {
  setupStableApp,
  navigateToRadarPage,
  waitForRadarToLoad,
  checkRadarVisibility,
  setTheme,
  stubRadarApis,
} from '../fixtures/utils';

test.describe('Radar Map', () => {
  test.beforeEach(async ({ page }) => {
    await setupStableApp(page);
    await stubRadarApis(page);
  });

  test('radar map loads successfully', async ({ page }) => {
    await navigateToRadarPage(page);
    
    await waitForRadarToLoad(page);
    
    const radarContainer = page.locator('[data-radar-container]').first();
    await expect(radarContainer).toBeVisible();
    await expect(page.getByText(/RAINVIEWER RADAR/i)).toBeVisible({ timeout: 15000 });
  });

  test('radar visible in synthwave theme', async ({ page }) => {
    await setTheme(page, 'synthwave84');
    await navigateToRadarPage(page);
    
    await waitForRadarToLoad(page);

    const isVisible = await checkRadarVisibility(page);
    expect(isVisible).toBeTruthy();
  });

  test('radar visible in matrix theme', async ({ page }) => {
    await setTheme(page, 'matrix');
    await navigateToRadarPage(page);
    
    await waitForRadarToLoad(page);

    const isVisible = await checkRadarVisibility(page);
    expect(isVisible).toBeTruthy();
  });

  test('radar visible in default dark theme', async ({ page }) => {
    await setTheme(page, 'dark');
    await navigateToRadarPage(page);
    
    await waitForRadarToLoad(page);
    
    await expect(page.locator('[data-radar-container] .ol-viewport')).toBeVisible();
  });

  test('radar map controls and overlay toggles are visible', async ({ page }) => {
    await navigateToRadarPage(page);
    await waitForRadarToLoad(page);
    
    await expect(page.getByRole('button', { name: /^(Play|Pause)$/i })).toBeVisible();
    await page.getByRole('button', { name: /LAYERS/i }).click();
    await expect(page.getByText(/NWS Alerts/i)).toBeVisible();
    await expect(page.getByText(/SPC Outlook/i)).toBeVisible();
    await expect(page.getByText(/Storm Reports/i)).toBeVisible();
  });

  test('radar map displays provider status badge and source attribution', async ({ page }) => {
    await navigateToRadarPage(page);
    await waitForRadarToLoad(page);
    
    await expect(page.getByText(/RAINVIEWER RADAR/i)).toBeVisible();
    await expect(page.getByText(/Source:\s*RainViewer/i)).toBeVisible();
  });

  test('international location uses RainViewer provider', async ({ page }) => {
    await setupStableApp(page, {
      cityName: 'Edmonton',
      country: 'CA',
      lat: 53.5461,
      lon: -113.4938,
    });
    await stubRadarApis(page);
    await navigateToRadarPage(page, 'Edmonton, CA');
    await waitForRadarToLoad(page);

    await expect(page.getByText(/RAINVIEWER RADAR/i)).toBeVisible({ timeout: 15000 });
  });

  test('radar map fills the viewport below the page header', async ({ page }) => {
    await navigateToRadarPage(page);
    await waitForRadarToLoad(page);

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const containerHeight = await page.locator('[data-radar-container]').evaluate(
      (element) => element.getBoundingClientRect().height
    );
    const mapHeight = await page.locator('[data-radar-container] .ol-viewport').evaluate(
      (element) => element.getBoundingClientRect().height
    );

    // Radar chrome (preset bar + player dock) shares the flex column; container should still fill the viewport.
    expect(containerHeight).toBeGreaterThan(viewportHeight * 0.45);
    // Map canvas should not collapse to the 350px widget minimum.
    expect(mapHeight).toBeGreaterThan(250);
  });

  test('radar honors shareable URL layer and frame params', async ({ page }) => {
    await page.goto('/radar?location=Chicago&layers=precip,spc&frame=5&zoom=8');
    await waitForRadarToLoad(page);

    await page.getByRole('button', { name: /LAYERS/i }).click();
    await expect(page.getByRole('checkbox', { name: /SPC Outlook/i })).toBeChecked();
    await expect(page.getByRole('slider', { name: /Radar timeline/i })).toHaveValue('5');
    await expect(page).toHaveURL(/layers=precip(?:%2C|,)?spc/);
    await expect(page).toHaveURL(/(?:^|[?&])frame=5(?:&|$)/);
    await expect(page).toHaveURL(/(?:^|[?&])zoom=8(?:&|$)/);
  });
});
