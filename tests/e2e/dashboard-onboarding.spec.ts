import { test, expect } from './fixtures';
import { setupStableApp, setupMockAuth, stubSupabaseProfile, isRemotePreviewTarget } from '../fixtures/utils';

const skipAuthTests = isRemotePreviewTarget();
const USER_ID = '00000000-0000-0000-0000-000000000000';
const DISMISS_KEY = `dashboard-onboarding-dismissed:${USER_ID}`;

test.describe('Dashboard onboarding', () => {
  test.skip(skipAuthTests, 'Auth mocking not supported against deployed preview URLs');

  test.beforeEach(async ({ page }) => {
    await setupStableApp(page);
    await setupMockAuth(page, USER_ID);

    await stubSupabaseProfile(page, {
      id: USER_ID,
      username: 'testuser',
      full_name: 'Test User',
      default_location: null,
      email: 'test@example.com',
    });

    await page.addInitScript((key) => {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem('dashboard-welcome-modal-opened');
    }, DISMISS_KEY);
  });

  test('shows onboarding panel when user has no saved locations', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('dashboard-onboarding-panel')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('dashboard-onboarding-panel')).toContainText(/Step 1/i);
  });

  test('dismisses onboarding panel via Skip for now', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('dashboard-onboarding-panel')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /skip for now/i }).click();
    await expect(page.getByTestId('dashboard-onboarding-panel')).not.toBeVisible({ timeout: 5000 });
  });

  test('welcome query opens add location modal once for new users', async ({ page }) => {
    await page.goto('/dashboard?welcome=1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('dashboard-onboarding-panel')).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
  });
});
