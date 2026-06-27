import { test, expect } from './fixtures';
import { setupStableApp, setupMockAuth, stubSupabaseProfile, stubProfileUpdate, navigateToProfile, fillProfileForm, saveProfile, isRemotePreviewTarget } from '../fixtures/utils';

// Skip profile tests against deployed previews — server-side auth runs before client mocks apply
const skipAuthTests = isRemotePreviewTarget();

test.describe('Profile Settings', () => {
  test.skip(skipAuthTests, 'Auth mocking not supported against deployed preview URLs');

  test.beforeEach(async ({ page }) => {
    await setupStableApp(page);
    
    // CRITICAL: Set up auth mocking FIRST, before any navigation
    await setupMockAuth(page);
    
    // Wait for auth setup to complete
    await page.waitForTimeout(200);
    
    // Mock profile data
    await stubSupabaseProfile(page, {
      id: '00000000-0000-0000-0000-000000000000',
      username: 'testuser',
      full_name: 'Test User',
      default_location: 'New York, NY',
      email: 'test@example.com'
    });
    
    await stubProfileUpdate(page);
  });

  test('can navigate to profile page', async ({ page }) => {
    await navigateToProfile(page);
    // Wait a bit for auth check to complete
    await page.waitForTimeout(1000);
    // Profile page should load (not redirect to login)
    const url = page.url();
    expect(url).toMatch(/\/profile/);
  });

  test('displays current profile information', async ({ page }) => {
    await navigateToProfile(page);
    await page.waitForTimeout(1000);
    
    // Wait for page to load and check for profile content
    // The page might show loading state initially
    await expect(page.locator('body')).toContainText(/(profile|settings|testuser|Test User|New York)/i, { timeout: 15000 });
  });

  test('can edit profile fields', async ({ page }) => {
    await navigateToProfile(page);
    await page.waitForTimeout(2000); // Wait for auth and profile to load
    
    // Find and click Edit Profile button
    const editButton = page.getByTestId('profile-edit-button');
    await expect(editButton).toBeVisible({ timeout: 10000 });
    await editButton.click();
    
    // Wait for edit mode - look for Save Changes button
    await expect(page.locator('button').filter({ hasText: /save changes/i })).toBeVisible({ timeout: 5000 });
    
    // Fill form fields
    await fillProfileForm(page, {
      username: 'updateduser',
      fullName: 'Updated Name',
    });
    
    // Verify fields were filled
    const usernameInput = page.locator('input[placeholder*="username" i]').first();
    await expect(usernameInput).toBeVisible({ timeout: 5000 });
    await expect(usernameInput).toHaveValue(/updateduser/i);
  });

  test('can save profile changes', async ({ page }) => {
    await navigateToProfile(page);
    await page.waitForTimeout(2000);
    
    const editButton = page.getByTestId('profile-edit-button');
    await expect(editButton).toBeVisible({ timeout: 10000 });
    await editButton.click();
    
    await expect(page.locator('button').filter({ hasText: /save changes/i })).toBeVisible({ timeout: 5000 });
    
    await fillProfileForm(page, {
      username: 'saveduser'
    });
    
    await saveProfile(page);
    
    await expect(page.locator('body')).toContainText(/success|saved|updated/i, { timeout: 10000 });
  });

  test('stays on profile after saving', async ({ page }) => {
    await navigateToProfile(page);
    await page.waitForTimeout(2000);
    
    const editButton = page.getByTestId('profile-edit-button');
    await expect(editButton).toBeVisible({ timeout: 10000 });
    await editButton.click();
    
    await expect(page.locator('button').filter({ hasText: /save changes/i })).toBeVisible({ timeout: 5000 });
    
    await fillProfileForm(page, { username: 'stayonprofile' });
    await saveProfile(page);
    
    await expect(page.locator('body')).toContainText(/success|saved|updated/i, { timeout: 10000 });
    await expect(page).toHaveURL(/\/profile/, { timeout: 5000 });
  });

  // Skipped: untestable as written. The mock auth session uses NULL_UUID,
  // and `updateProfile` in lib/supabase/database.ts short-circuits NULL_UUID
  // by returning a mock profile *before* any HTTP request is made (added in
  // commit a502f7e to stabilize success-path tests). That bypass means the
  // page.route stub below is never hit, so the error path can never trigger
  // for the test user. Error-handler coverage lives in
  // __tests__/sentry-profile-nil-uuid.test.ts instead.
  test.skip('displays error message on save failure', async ({ page }) => {
    // Stub a failing Supabase update
    await page.route('**/rest/v1/profiles**', (route) => {
      if (route.request().method() === 'PATCH') {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Update failed' })
        });
      }
      route.continue();
    });

    await navigateToProfile(page);
    await page.waitForTimeout(2000);
    
    const editButton = page.getByTestId('profile-edit-button');
    await expect(editButton).toBeVisible({ timeout: 10000 });
    await editButton.click();
    
    await expect(page.locator('button').filter({ hasText: /save changes/i })).toBeVisible({ timeout: 5000 });
    
    await fillProfileForm(page, { username: 'failtest' });
    await saveProfile(page);
    
    // Verify error message appears
    await expect(page.locator('body')).toContainText(/error|failed|try again/i, { timeout: 10000 });
  });
});

