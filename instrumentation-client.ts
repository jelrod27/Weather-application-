// Instrumentation client configuration
// This file replaces sentry.client.config.ts (deprecated in Next.js with Turbopack)

// PERFORMANCE: Defer Sentry initialization to after page load to improve LCP and TBT
// Sentry adds ~200KB to the bundle and blocks the main thread during initialization

// Type-only import: erased at compile time, so the runtime module still
// loads lazily via the dynamic import() in initSentryLazy below.
import type * as SentryNextjs from '@sentry/nextjs';

let sentryInitialized = false;
let sentryModule: typeof SentryNextjs | null = null;

/**
 * Lazy initialize Sentry after the page has loaded
 * This significantly improves initial page load performance
 */
async function initSentryLazy() {
  if (sentryInitialized || typeof window === 'undefined') return;

  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  if (!sentryDsn) return;

  // Validate DSN is a valid URL (supports both sentry.io and self-hosted instances)
  try {
    new URL(sentryDsn);
  } catch {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Sentry client: Invalid DSN format:', sentryDsn);
    }
    return;
  }

  try {
    // Dynamic import - only loads Sentry when called
    const Sentry = await import('@sentry/nextjs');

    Sentry.init({
      dsn: sentryDsn,
      enableLogs: true,
      tracesSampleRate: 0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      debug: false,
      environment: process.env.NODE_ENV || 'development',
      integrations: [],
    });

    // Only expose module reference after successful initialization
    sentryModule = Sentry;
    sentryInitialized = true;
  } catch (error) {
    // Silent fail
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Sentry client: Failed to initialize:', error);
    }
  }
}

// Schedule Sentry initialization after page load with idle callback
if (typeof window !== 'undefined') {
  // Wait for page to fully load, then wait for idle time
  const scheduleInit = () => {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => initSentryLazy(), { timeout: 5000 });
    } else {
      setTimeout(initSentryLazy, 3000);
    }
  };

  if (document.readyState === 'complete') {
    scheduleInit();
  } else {
    window.addEventListener('load', scheduleInit, { once: true });
  }
}

// Export router transition tracking - will be a no-op until Sentry is loaded
export const onRouterTransitionStart = (href: string, navigationType: string) => {
  if (sentryModule) {
    sentryModule.captureRouterTransitionStart(href, navigationType);
  }
};