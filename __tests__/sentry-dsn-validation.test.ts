/**
 * Tests for Sentry DSN validation - CodeQL fix for incomplete URL substring sanitization
 */
import { isValidSentryDsn } from '@/lib/sentry-utils';

describe('Sentry DSN validation', () => {
  it('should reject DSN with sentry.io as query param (substring attack)', () => {
    expect(isValidSentryDsn('https://evil.com?sentry.io')).toBe(false);
  });

  it('should accept valid Sentry DSN', () => {
    expect(isValidSentryDsn('https://abc123@o123.ingest.sentry.io/456')).toBe(true);
  });

  it('should accept the US ingest hostname used in production DSNs', () => {
    expect(isValidSentryDsn('https://abc123@o123.ingest.us.sentry.io/456')).toBe(true);
  });

  it('should reject DSN where sentry.io is a subdomain of another host', () => {
    expect(isValidSentryDsn('https://sentry.io.evil.com/123')).toBe(false);
  });
});
