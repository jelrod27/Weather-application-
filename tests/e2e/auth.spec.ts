import { test, expect } from './fixtures';
import { setupStableApp, isRemotePreviewTarget } from '../fixtures/utils';

const skipAuthTests = isRemotePreviewTarget();

test.describe('Auth flow', () => {
  test.skip(skipAuthTests, 'Auth mocking not supported against deployed preview URLs');

  test.beforeEach(async ({ page }) => {
    await setupStableApp(page);
  });

  test('legacy login route redirects to unified auth page with Google and magic link', async ({ page }) => {
    await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/auth(\?|$)/, { timeout: 15000 });
    await expect(page.getByText(/continue with google/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('magic-link-submit')).toBeVisible();
  });

  test('legacy signup route redirects and password form is reachable via more options', async ({ page }) => {
    await page.goto('/auth/signup', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/auth\?mode=signup/, { timeout: 15000 });
    // ?mode=signup opens the password form so Sign Up is immediately available
    await expect(page.getByTestId('password-form')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /^sign up$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with github/i })).toBeVisible();
  });

  test('auth page displays OAuth callback errors from query string', async ({ page }) => {
    await page.goto('/auth/login?error=access_denied', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('auth-error-alert')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('auth-error-alert')).toContainText(/access_denied/i);
  });

  test('logged-in user visiting login redirects to dashboard', async ({ page }) => {
    // Middleware auth redirect requires a real Supabase session cookie; Playwright test mode
    // bypasses middleware auth checks, so this behavior is covered by manual QA + unit tests.
    test.skip(true, 'Requires real Supabase session; middleware bypassed in Playwright test mode');
    await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test('legacy /settings redirects to dashboard', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });
});
