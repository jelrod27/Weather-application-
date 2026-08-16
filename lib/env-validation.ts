/**
 * Environment Variable Validation
 * Validates required environment variables at startup
 */

interface EnvConfig {
  required: {
    [key: string]: {
      name: string;
      description: string;
    };
  };
  optional: {
    [key: string]: {
      name: string;
      description: string;
    };
  };
}

const envConfig: EnvConfig = {
  required: {},
  optional: {
    NEXT_PUBLIC_SUPABASE_URL: {
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      description: 'Supabase project URL (optional - for authentication)',
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      description: 'Supabase anonymous key (optional - for authentication)',
    },
    SENTRY_DSN: {
      name: 'SENTRY_DSN',
      description: 'Sentry DSN (optional - for error monitoring)',
    },
    NEXT_PUBLIC_SENTRY_DSN: {
      name: 'NEXT_PUBLIC_SENTRY_DSN',
      description: 'Sentry client DSN (optional - for error monitoring)',
    },
    SENTRY_ORG: {
      name: 'SENTRY_ORG',
      description: 'Sentry organization (optional - defaults to "16bitweather")',
    },
    SENTRY_PROJECT: {
      name: 'SENTRY_PROJECT',
      description: 'Sentry project (optional - defaults to "javascript-nextjs")',
    },
    AEROAPI_KEY: {
      name: 'AEROAPI_KEY',
      description: 'FlightAware AeroAPI key (optional - enables real flight schedule data on /aviation; without it, the service returns labeled mock routes). Free tier: $5/month credit ~ 1000 lookups. HTTPS-only, x-apikey header.',
    },
    AEROAPI_MONTHLY_CAP: {
      name: 'AEROAPI_MONTHLY_CAP',
      // Math: $5 free credit per month / ~$0.005 per /flights/{ident} query ≈ 1000
      // queries. Cap at 800 leaves a 20% buffer for surges and any per-query
      // cost variance. Override to a smaller value when stress-testing the
      // mock fallback in production. AeroAPI does NOT enforce a vendor-side
      // spending cap on the personal tier; this env var IS the spending cap.
      description: 'AeroAPI app-side monthly call cap, integer (optional - default 800). Once reached, the provider falls through to mock data for the rest of the UTC month.',
    },
    OPENSKY_USERNAME: {
      name: 'OPENSKY_USERNAME',
      description: 'OpenSky Network username (optional - raises rate limits for live position lookups on /aviation; anonymous works for low-traffic dev).',
    },
    OPENSKY_PASSWORD: {
      name: 'OPENSKY_PASSWORD',
      description: 'OpenSky Network password (optional - paired with OPENSKY_USERNAME).',
    },
    SUPABASE_WEBHOOK_SECRET: {
      name: 'SUPABASE_WEBHOOK_SECRET',
      description: 'Shared secret for Supabase Database Webhook on profiles INSERT (optional - registration admin alerts).',
    },
    ADMIN_NOTIFICATION_EMAIL: {
      name: 'ADMIN_NOTIFICATION_EMAIL',
      description: 'Inbox for new-user registration admin emails (optional).',
    },
    RESEND_API_KEY: {
      name: 'RESEND_API_KEY',
      description: 'Resend API key for welcome and admin registration emails (optional).',
    },
    RESEND_FROM_EMAIL: {
      name: 'RESEND_FROM_EMAIL',
      description: 'Verified Resend sender address for welcome and admin emails (optional).',
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      description: 'Supabase service role key for server tasks such as welcome email idempotency (optional).',
    },
    SLACK_WEBHOOK_URL: {
      name: 'SLACK_WEBHOOK_URL',
      description: 'Slack incoming webhook for new signup alerts (optional).',
    },
    DISCORD_WEBHOOK_URL: {
      name: 'DISCORD_WEBHOOK_URL',
      description: 'Discord webhook for new signup alerts (optional).',
    },
    VAPID_PUBLIC_KEY: {
      name: 'VAPID_PUBLIC_KEY',
      description: 'Web Push VAPID public key (optional - browser alerts stay disabled until set).',
    },
    VAPID_PRIVATE_KEY: {
      name: 'VAPID_PRIVATE_KEY',
      description: 'Web Push VAPID private key (optional - server-only).',
    },
    VAPID_SUBJECT: {
      name: 'VAPID_SUBJECT',
      description: 'Web Push VAPID subject, mailto: or https: URL (optional).',
    },
  },
};

/**
 * Validate environment variables
 * Logs warnings for missing optional vars and errors for missing required vars
 */
export function validateEnv(): void {
  if (typeof window !== 'undefined') {
    // Client-side: only validate NEXT_PUBLIC_* vars
    return;
  }

  const isPlaywright = process.env.PLAYWRIGHT_TEST_MODE === 'true';

  const missingRequired: string[] = [];
  const missingOptional: string[] = [];

  // Check required variables
  for (const [key, config] of Object.entries(envConfig.required)) {
    if (!process.env[key]) {
      missingRequired.push(key);
      console.error(`❌ Missing required environment variable: ${config.name}`);
      console.error(`   Description: ${config.description}`);
    }
  }

  // Check optional variables (log warnings)
  for (const [key, config] of Object.entries(envConfig.optional)) {
    if (!process.env[key]) {
      missingOptional.push(key);
      console.warn(`⚠️  Missing optional environment variable: ${config.name}`);
      console.warn(`   Description: ${config.description}`);
    }
  }

  // Throw error if required vars are missing (but not in test / Playwright environment)
  if (missingRequired.length > 0 && process.env.NODE_ENV !== 'test' && !isPlaywright) {
    throw new Error(
      `Missing required environment variables: ${missingRequired.join(', ')}\n` +
      'Please check your .env.local file or environment configuration.'
    );
  }

  // Log summary
  if (missingOptional.length > 0) {
    console.info(
      `ℹ️  ${missingOptional.length} optional environment variable(s) not set. ` +
      'The application will run with reduced functionality.'
    );
  } else {
    console.info('✅ All environment variables validated successfully');
  }
}

/**
 * Get environment variable with fallback
 */
function getEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  if (!value && fallback) {
    return fallback;
  }
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get optional environment variable
 */
function getOptionalEnv(key: string, fallback?: string): string | undefined {
  return process.env[key] || fallback;
}

