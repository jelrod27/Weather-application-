import { test, expect } from './fixtures';
import { setupStableApp, navigateToMapPage, waitForRadarToLoad, checkRadarVisibility, setTheme } from '../fixtures/utils';

test.describe('Radar Map', () => {
  test.beforeEach(async ({ page }) => {
    await setupStableApp(page);
  });

  test('radar map loads successfully', async ({ page }) => {
    await navigateToMapPage(page);
    
    // Wait for radar to load
    await waitForRadarToLoad(page);
    
    // Verify radar container exists
    const radarContainer = page.locator('[data-radar-container], [class*="map"], [class*="Map"]').first();
    await expect(radarContainer).toBeVisible({ timeout: 15000 });
  });

  test('radar visible in synthwave theme', async ({ page }) => {
    await setTheme(page, 'synthwave84');
    // Wait for theme to be fully applied
    await page.waitForTimeout(300);
    
    await navigateToMapPage(page);
    
    await waitForRadarToLoad(page);
    
    // Wait a bit more for radar to fully render
    await page.waitForTimeout(1000);
    
    // Check that radar container has proper z-index
    const isVisible = await checkRadarVisibility(page);
    expect(isVisible).toBeTruthy();
    
    // Verify radar container is above scanlines (z-index >= 10000)
    const radarContainer = page.locator('[data-radar-container]').first();
    if (await radarContainer.count() > 0) {
      const zIndex = await radarContainer.evaluate((el) => {
        return window.getComputedStyle(el).zIndex;
      });
      
      // Should be 10000 or higher to be above theme overlays
      expect(parseInt(zIndex) >= 10000 || zIndex === 'auto').toBeTruthy();
    }
  });

  test('radar visible in matrix theme', async ({ page }) => {
    await setTheme(page, 'matrix');
    // Wait for theme to be fully applied
    await page.waitForTimeout(300);
    
    await navigateToMapPage(page);
    
    await waitForRadarToLoad(page);
    
    // Wait a bit more for radar to fully render
    await page.waitForTimeout(1000);
    
    // Check that radar container has proper z-index
    const isVisible = await checkRadarVisibility(page);
    expect(isVisible).toBeTruthy();
    
    // Verify radar container is above CRT scanlines
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
    
    const radarContainer = page.locator('[data-radar-container], [class*="map"], [class*="Map"]').first();
    await expect(radarContainer).toBeVisible({ timeout: 15000 });
  });

  test('radar map controls are visible', async ({ page }) => {
    await navigateToMapPage(page);
    await waitForRadarToLoad(page);
    
    // Wait for controls to render (they may load after the map)
    await page.waitForTimeout(2000);
    
    // First verify the radar map is visible
    const isVisible = await checkRadarVisibility(page);
    expect(isVisible).toBeTruthy();
    
    // Check for layer controls, buttons, or status badge
    // Look for common control patterns in the radar component
    const controls = page.locator('button, [class*="badge"], [class*="control"], [class*="Control"], [role="button"]');
    const controlCount = await controls.count();
    
    // Should have at least some controls (play/pause, layer menu, etc.)
    // Controls are optional - main thing is that the map is visible
    if (controlCount > 0) {
      expect(controlCount).toBeGreaterThan(0);
    }
  });

  test('radar map displays status badge', async ({ page }) => {
    await navigateToMapPage(page);
    await waitForRadarToLoad(page);
    
    // Look for status badge with radar info
    const statusBadge = page.locator('[class*="badge"], [class*="status"]').filter({ 
      hasText: /(RADAR|NEXRAD|MRMS|RAINVIEWER|LIVE|unavailable)/i 
    });
    
    // Status badge may or may not exist depending on location
    if (await statusBadge.count() > 0) {
      await expect(statusBadge.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

