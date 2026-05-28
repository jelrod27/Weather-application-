import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

/**
 * Hybrid Playwright configuration:
 *
 * LOCAL (pre-commit): No PLAYWRIGHT_TEST_BASE_URL
 * - Uses local Chromium/Firefox browsers
 * - Tests against localhost:3000 (auto-starts dev server)
 * - Requires: npx playwright install
 *
 * CI (Vercel preview): PLAYWRIGHT_TEST_BASE_URL set to preview URL
 * - Uses local Chromium on the GitHub runner
 * - Tests against the deployed Vercel preview URL
 *
 * Optional Kernel mode: KERNEL_API_KEY set (legacy / opt-in)
 * - Uses OnKernel cloud browsers via CDP instead of local install
 */

const useKernelBrowsers = !!process.env.KERNEL_API_KEY;
const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:3000';
const vercelBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

// Validate configuration: Kernel browsers require a real test URL (not localhost)
if (useKernelBrowsers && !process.env.PLAYWRIGHT_TEST_BASE_URL) {
  throw new Error(
    'Configuration error: KERNEL_API_KEY is set but PLAYWRIGHT_TEST_BASE_URL is missing.\n' +
    'When using Kernel cloud browsers, you must provide a target URL.\n' +
    'Set PLAYWRIGHT_TEST_BASE_URL to the Vercel preview URL or production URL.'
  );
}

export default defineConfig({
  testDir: './tests/e2e',

  /* Global setup/teardown for Kernel browser lifecycle (CI only) */
  globalSetup: useKernelBrowsers ? require.resolve('./tests/e2e/kernel-global-setup.ts') : undefined,
  globalTeardown: useKernelBrowsers ? require.resolve('./tests/e2e/kernel-global-teardown.ts') : undefined,

  /* Parallel for local, sequential for cloud */
  fullyParallel: !useKernelBrowsers,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Workers: multiple for local, single for cloud */
  workers: useKernelBrowsers ? 1 : undefined,

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
  projects: useKernelBrowsers
    ? [
        // CI: Single Chromium via Kernel cloud
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
      ]
    : [
        // Local: Multiple browsers
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'] },
        },
      ],

  /* Dev server for local testing only */
  webServer:
    useKernelBrowsers || process.env.PLAYWRIGHT_TEST_BASE_URL
      ? undefined
      : {
          command: 'npx cross-env PLAYWRIGHT_TEST_MODE=true npm run dev',
          url: 'http://127.0.0.1:3000',
          reuseExistingServer: true,
          timeout: 120 * 1000,
        },
});
