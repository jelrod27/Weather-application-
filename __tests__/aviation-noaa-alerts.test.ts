/**
 * Pins how fetchAviationAlertsFromNOAA classifies upstream failures.
 *
 * Regression guard for Sentry issue JAVASCRIPT-NEXTJS-10
 * ("NOAA AIRMET fetch failed: This operation was aborted"): our own
 * AbortController timeout firing against a slow NOAA endpoint is expected
 * transient noise and must NOT open a Sentry issue, while a genuine NOAA
 * failure (non-ok HTTP, network error) must still be captured.
 */
import { fetchAviationAlertsFromNOAA } from '@/lib/services/aviation-noaa-service';
import * as Sentry from '@sentry/nextjs';

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

const mockedSentry = Sentry as jest.Mocked<typeof Sentry>;

/** Mirrors the DOMException undici throws when AbortController.abort() fires. */
function abortError(): Error {
  const err = new Error('This operation was aborted');
  err.name = 'AbortError';
  return err;
}

describe('fetchAviationAlertsFromNOAA upstream failure classification', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    jest.clearAllMocks();
    global.fetch = realFetch;
  });

  it('does not open a Sentry issue when our own timeout aborts the request', async () => {
    global.fetch = jest.fn().mockRejectedValue(abortError());

    const alerts = await fetchAviationAlertsFromNOAA();

    expect(alerts).toEqual([]);
    expect(mockedSentry.captureException).not.toHaveBeenCalled();
    // The transient timeout is recorded as a breadcrumb for later context.
    expect(mockedSentry.addBreadcrumb).toHaveBeenCalled();
  });

  it('captures a Sentry error when NOAA returns a non-ok HTTP status', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });

    const alerts = await fetchAviationAlertsFromNOAA();

    expect(alerts).toEqual([]);
    expect(mockedSentry.captureException).toHaveBeenCalled();
  });

  it('captures a Sentry error on a genuine (non-abort) network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const alerts = await fetchAviationAlertsFromNOAA();

    expect(alerts).toEqual([]);
    expect(mockedSentry.captureException).toHaveBeenCalled();
  });
});
