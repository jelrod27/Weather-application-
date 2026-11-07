import type { init } from '@sentry/nextjs';

/** Preserve the v10 privacy defaults when upgrading to Sentry 11. */
export const SENTRY_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: {
    // Referer can embed a guest manage capability even when dedicated URL
    // query fields are redacted. This policy covers events and request spans.
    request: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user', 'referer'] },
    response: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
  },
  httpBodies: [],
  urlQueryParams: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  graphQL: { document: false, variables: false },
} satisfies NonNullable<Parameters<typeof init>[0]['dataCollection']>;
