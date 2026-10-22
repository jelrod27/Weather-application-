import type * as Sentry from '@sentry/nextjs';

jest.mock('@sentry/nextjs', () => ({ init: jest.fn() }));

const expectedDataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: {
    request: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
    response: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
  },
  httpBodies: [],
  urlQueryParams: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  graphQL: { document: false, variables: false },
};

describe('Sentry 11 privacy configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      SENTRY_DSN: 'https://public@example.ingest.sentry.io/1',
      NEXT_PUBLIC_SENTRY_DSN: 'https://public@example.ingest.sentry.io/1',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.useRealTimers();
  });

  it.each(['server', 'edge'])('preserves restricted collection in the %s runtime', (runtime) => {
    jest.isolateModules(() => {
      const sentry = require('@sentry/nextjs') as typeof Sentry;
      require(`../sentry.${runtime}.config`);
      expect(sentry.init).toHaveBeenCalledWith(expect.objectContaining({
        dataCollection: expectedDataCollection,
      }));
      expect(sentry.init).toHaveBeenCalledTimes(1);
    });
  });

  it('preserves restricted collection when the browser initializes lazily', async () => {
    jest.useFakeTimers();
    await jest.isolateModulesAsync(async () => {
      const sentry = await import('@sentry/nextjs');
      await import('../instrumentation-client');
      window.dispatchEvent(new Event('load'));
      await jest.runAllTimersAsync();
      expect(sentry.init).toHaveBeenCalledWith(expect.objectContaining({
        dataCollection: expectedDataCollection,
        tracesSampleRate: 0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
      }));
      expect(sentry.init).toHaveBeenCalledTimes(1);
    });
  });
});
