/**
 * Security tests for CodeQL alert fixes
 * Covers: Log injection sanitization (Alerts #7-13)
 */

describe('Log injection sanitization (Alerts #7-13)', () => {
  it('should strip newlines from logged values to prevent log forging', () => {
    const { sanitizeLogValue } = require('@/lib/sanitize-log');
    const malicious = 'normal\n[ADMIN] Fake log entry\n[ERROR] spoofed';
    const sanitized = sanitizeLogValue(malicious);

    expect(sanitized).not.toContain('\n');
    expect(sanitized).not.toContain('\r');
    expect(sanitized).toBe('normal [ADMIN] Fake log entry [ERROR] spoofed');
  });

  it('returns empty string for null and undefined', () => {
    const { sanitizeLogValue } = require('@/lib/sanitize-log');
    expect(sanitizeLogValue(null)).toBe('');
    expect(sanitizeLogValue(undefined)).toBe('');
  });
});
