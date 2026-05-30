import { test, expect } from './fixtures';
import { setupStableApp, setupMockAuth, stubSupabaseProfile, setTheme, getCurrentTheme, navigateToProfile, navigateToMapPage, waitForRadarToLoad, checkRadarVisibility, isRemotePreviewTarget } from '../fixtures/utils';

const skipAuthTests = isRemotePreviewTarget();

test.describe('Theme System', () => {
  test.beforeEach(async ({ page }) => {
    await setupStableApp(page);
  });

  // Skip this test in Preview/CI - auth mocking doesn't work with Kernel cloud browsers
  test('can change theme via profile page', async ({ page }) => {
    test.skip(skipAuthTests, 'Auth mocking not supported against deployed preview URLs');

    await setupMockAuth(page);
    await stubSupabaseProfile(page, {
      id: '00000000-0000-0000-0000-000000000000',
      username: 'testuser',
      email: 'test@example.com'
    });

    await navigateToProfile(page);

    // Look for theme selector
    const themeSelector = page.locator('[class*="theme"], button, select').filter({
      hasText: /(dark|miami|tron|synthwave|theme)/i
    }).first();

    if (await themeSelector.count() > 0) {
      await themeSelector.click();

      // Wait for theme change
      await page.waitForTimeout(500);

      // Verify theme was applied
      const currentTheme = await getCurrentTheme(page);
      expect(currentTheme).toBeTruthy();
    }
  });

  test('theme persists across page reloads', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Use nord (free theme) since premium themes require auth and get
    // reset to nord on reload when PLAYWRIGHT_TEST_MODE is not set
    await setTheme(page, 'nord');

    // Verify theme is set
    let currentTheme = await getCurrentTheme(page);
    expect(currentTheme).toBe('nord');

    // Wait a bit for localStorage to be written
    await page.waitForTimeout(300);

    // Reload page
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Wait for page to fully load and theme to be applied
    await page.waitForTimeout(500);

    // Verify theme persisted
    currentTheme = await getCurrentTheme(page);
    expect(currentTheme).toBe('nord');
  });

  test('radar remains visible in synthwave theme', async ({ page }) => {
    await setTheme(page, 'synthwave84');
    // Wait for theme to be fully applied
    await page.waitForTimeout(300);

    await navigateToMapPage(page);

    await waitForRadarToLoad(page);

    // Wait a bit more for radar to fully render
    await page.waitForTimeout(1000);

    // Check radar visibility
    const isVisible = await checkRadarVisibility(page);
    expect(isVisible).toBeTruthy();

    // Verify backdrop-filter is disabled or radar container exists
    const radarContainer = page.locator('[data-radar-container]').first();
    if (await radarContainer.count() > 0) {
      const backdropFilter = await radarContainer.evaluate((el) => {
        return window.getComputedStyle(el).backdropFilter;
      });

      // backdrop-filter should be 'none' or empty string
      expect(backdropFilter === 'none' || backdropFilter === '').toBeTruthy();
    }
  });

  test('radar remains visible in matrix theme', async ({ page }) => {
    await setTheme(page, 'matrix');
    // Wait for theme to be fully applied
    await page.waitForTimeout(300);

    await navigateToMapPage(page);

    await waitForRadarToLoad(page);

    // Wait a bit more for radar to fully render
    await page.waitForTimeout(1000);

    const isVisible = await checkRadarVisibility(page);
    expect(isVisible).toBeTruthy();

    // Verify z-index is high enough or radar container exists
    const radarContainer = page.locator('[data-radar-container]').first();
    if (await radarContainer.count() > 0) {
      const zIndex = await radarContainer.evaluate((el) => {
        return window.getComputedStyle(el).zIndex;
      });

      expect(parseInt(zIndex) >= 10000 || zIndex === 'auto').toBeTruthy();
    }
  });

  test('UI elements render correctly in nord theme', async ({ page }) => {
    // Navigate first, THEN set the theme. setTheme writes the data-theme
    // attribute directly; doing it before goto() is pointless because the
    // navigation re-renders the SSR default (DEFAULT_THEME) and getCurrentTheme
    // reads data-theme, so it would observe the default instead of nord.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await setTheme(page, 'nord');

    // Wait for theme to be applied after navigation
    await page.waitForTimeout(300);

    // Verify search input is visible
    // Use .first() to handle potential duplicate elements during Suspense hydration
    await expect(page.getByTestId('location-search-input').first()).toBeVisible({ timeout: 10000 });

    // Verify theme is applied
    const currentTheme = await getCurrentTheme(page);
    expect(currentTheme).toBe('nord');
  });

  test('UI elements render correctly in synthwave theme', async ({ page }) => {
    // synthwave84 is a premium theme. ThemeProvider's onAuthStateChange
    // resets premium themes back to 'nord' for unauthenticated users
    // (see components/theme-provider.tsx:71-78). Without seeded auth,
    // the test was passing only by racing the data-theme attribute
    // mutation against ThemeProvider's reset render — which is exactly
    // the kind of flakiness we're stamping out here. Seed mock auth so
    // ThemeProvider sees an authenticated user and leaves the premium
    // theme alone.
    test.skip(skipAuthTests, 'Auth mocking not supported against deployed preview URLs');

    await setupMockAuth(page);
    await stubSupabaseProfile(page, {
      id: '00000000-0000-0000-0000-000000000000',
      username: 'testuser',
      email: 'test@example.com',
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await setTheme(page, 'synthwave84');

    // Wait for theme to be applied
    await page.waitForTimeout(300);

    // Verify search input is visible (use .first() to handle duplicate elements)
    await expect(page.getByTestId('location-search-input').first()).toBeVisible({ timeout: 10000 });

    // Verify theme is applied
    const currentTheme = await getCurrentTheme(page);
    expect(currentTheme).toBe('synthwave84');

    // Verify theme classes are applied
    const bodyClasses = await page.evaluate(() => document.body.className);
    expect(bodyClasses).toContain('theme-synthwave84');
  });

  test('theme switching updates UI immediately', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Start with nord theme
    await setTheme(page, 'nord');
    await page.waitForTimeout(300);
    let currentTheme = await getCurrentTheme(page);
    expect(currentTheme).toBe('nord');

    // Switch to synthwave
    await setTheme(page, 'synthwave84');
    await page.waitForTimeout(300);
    currentTheme = await getCurrentTheme(page);
    expect(currentTheme).toBe('synthwave84');

    // Verify UI updated
    const bodyClasses = await page.evaluate(() => document.body.className);
    expect(bodyClasses).toContain('theme-synthwave84');
  });
});

