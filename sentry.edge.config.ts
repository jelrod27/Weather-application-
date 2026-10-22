import { isValidSentryDsn } from "@/lib/sentry-utils";
import { SENTRY_DATA_COLLECTION } from "@/lib/sentry-data-collection";
import * as Sentry from "@sentry/nextjs";

const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (sentryDsn && isValidSentryDsn(sentryDsn)) {
  Sentry.init({
    dsn: sentryDsn,

    // Sentry 11 enables logs by usage; keep request data collection restricted.
    dataCollection: SENTRY_DATA_COLLECTION,

    // Lower sample rate in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Only enable debug in development
    debug: process.env.NODE_ENV === 'development',
    
    environment: process.env.NODE_ENV || 'development',

    beforeSend(event, hint) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Sentry edge event captured:', event);
      }
      return event;
    },

    // Note: if you want to override the automatic release value, do not set a
    // `release` value here - use the environment variable `SENTRY_RELEASE`, so
    // that it will also get attached to your source maps
  });

  console.log('✅ Sentry edge initialized');
} else {
  console.warn('⚠️ Sentry edge: DSN not configured, skipping initialization');
}