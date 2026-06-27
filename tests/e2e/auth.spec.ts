import { test, expect } from './fixtures';
import { setupStableApp, setupMockAuth, isRemotePreviewTarget } from '../fixtures/utils';

const skipAuthTests = isRemotePreviewTarget();

test.describe('Auth flow', () => {
  test.skip(skipAuthTests, 'Auth mocking not supported against deployed preview URLs');

  test.beforeEach(async ({ page }) => {
    await setupStableApp(page);
  });

  test('login page loads and shows sign-in form', async ({ page }) => {
    await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /sign in/i }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/continue with google/i)).toBeVisible();
  });

  test('signup page loads', async ({ page }) => {
    await page.goto('/auth/signup', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /sign up/i }).first()).toBeVisible({ timeout: 15000 });
  });

  test('login page displays OAuth callback errors from query string', async ({ page }) => {
    await page.goto('/auth/login?error=access_denied', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('auth-error-alert')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('auth-error-alert')).toContainText(/access_denied/i);
  });

  test('logged-in user visiting login redirects to dashboard', async ({ page }) => {
    // Middleware auth redirect requires a real Supabase session cookie; Playwright test mode
    // bypasses middleware auth checks, so this behavior is covered by manual QA + unit tests.
    test.skip(true, 'Requires real Supabase session; middleware bypassed in Playwright test mode');
    await setupMockAuth(page);
    await page.waitForTimeout(200);
    await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test('legacy /settings redirects to dashboard', async ({ page }) => {
    await setupMockAuth(page);
    await page.waitForTimeout(200);
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });
});
