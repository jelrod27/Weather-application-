/**
 * Redirect path validation utility
 *
 * Prevents open redirect vulnerabilities by validating redirect paths
 * against an allowlist of known internal routes.
 *
 * Security: CWE-601 (URL Redirection to Untrusted Site)
 */

// Static allowlist of valid internal redirect paths
const ALLOWED_REDIRECT_PATHS = [
  '/dashboard',
  '/profile',
  '/settings',
  '/saved-locations',
  '/weather',
  '/gfs-model',
  '/news',
  '/radar',
  '/education',
  '/',
] as const

// Patterns that match dynamic routes
const ALLOWED_REDIRECT_PATTERNS = [
  /^\/weather\/[^\/]+$/,           // /weather/[city]
  /^\/gfs-model\/[^\/]+\/[^\/]+$/, // /gfs-model/[region]/[run]
  /^\/education\/[^\/]+$/,                    // /education/glossary
  /^\/education\/[^\/]+\/[^\/]+$/,           // /education/weather-systems/[slug]
]

/**
 * Validates that a redirect path is safe and internal.
 *
 * @param path - The redirect path to validate (from URL parameter)
 * @param defaultPath - Fallback path if validation fails (default: '/dashboard')
 * @returns The validated path or the default fallback
 *
 * @example
 * validateRedirectPath('/dashboard')        // Returns '/dashboard'
 * validateRedirectPath('//evil.com')        // Returns '/dashboard' (blocked)
 * validateRedirectPath('javascript:alert')  // Returns '/dashboard' (blocked)
 * validateRedirectPath('/weather/london')   // Returns '/weather/london'
 */
export function validateRedirectPath(
  path: string | null,
  defaultPath: string = '/dashboard'
): string {
  // Null or empty - return default
  if (!path) return defaultPath

  // Must start with single forward slash (not // which would be protocol-relative)
  if (!path.startsWith('/') || path.startsWith('//')) {
    return defaultPath
  }

  // Block any protocol schemes (javascript:, data:, vbscript:, etc.)
  if (path.includes(':')) {
    return defaultPath
  }

  // Block backslash (can be used to bypass validation in some browsers)
  if (path.includes('\\')) {
    return defaultPath
  }

  // Normalize the path (remove query strings and fragments for matching)
  const normalizedPath = path.split('?')[0].split('#')[0]

  // Check against static allowlist
  if ((ALLOWED_REDIRECT_PATHS as readonly string[]).includes(normalizedPath)) {
    return path // Return original path (preserving query params if valid)
  }

  // Check against dynamic patterns
  for (const pattern of ALLOWED_REDIRECT_PATTERNS) {
    if (pattern.test(normalizedPath)) {
      return path
    }
  }

  // Not in allowlist - return default
  return defaultPath
}
