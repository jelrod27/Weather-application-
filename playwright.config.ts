import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

/**
 * Playwright configuration:
 *
 * LOCAL (pre-commit): No PLAYWRIGHT_TEST_BASE_URL
 * - Uses local Chromium/Firefox browsers
 * - Tests against localhost:3000 (auto-starts dev server)
 * - Requires: npx playwright install
 *
 * CI (Vercel preview): PLAYWRIGHT_TEST_BASE_URL set to preview URL
 * - Uses local Chromium on the GitHub runner
 * - Tests against the deployed Vercel preview URL
 */

const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:3000';
const vercelBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: './tests/e2e',

  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Reporter */
  reporter: [
    ['html'],
    ...(process.env.CI ? [['github', {}] as const] : []),
  ],

  /* Global timeout */
  timeout: 60000,

  /* Expect timeout */
  expect: {
    timeout: 10000,
  },

  /* Shared settings */
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    extraHTTPHeaders: {
      'x-playwright-test-mode': 'true',
      ...(vercelBypassSecret ? { 'x-vercel-protection-bypass': vercelBypassSecret } : {}),
    },
  },

  /* Browser projects */
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],

  /* Dev server for local testing only */
  webServer:
    process.env.PLAYWRIGHT_TEST_BASE_URL
      ? undefined
      : {
          command: 'npx cross-env PLAYWRIGHT_TEST_MODE=true npm run dev',
          url: 'http://127.0.0.1:3000',
          reuseExistingServer: true,
          timeout: 120 * 1000,
        },
});
