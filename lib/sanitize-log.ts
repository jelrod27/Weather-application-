/**
 * Sanitizes values before logging to prevent log injection attacks.
 * Strips newlines, carriage returns, tabs, and control characters.
 */
export function sanitizeLogValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = typeof value === 'string' ? value : String(value)
  const noLineBreaks = str.replace(/[\r\n\t]/g, ' ')
  const noControlChars = noLineBreaks.replace(/[\x00-\x1f\x7f]/g, '')
  const normalizedWhitespace = noControlChars.replace(/\s+/g, ' ').trim()
  return normalizedWhitespace.slice(0, 1000)
}
