/** Browser push services only. Check again at delivery for older stored rows. */
export function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint)
    if (url.protocol !== 'https:' || url.port || url.username || url.password || url.hash) return false
    const host = url.hostname.toLowerCase()
    return host === 'fcm.googleapis.com' ||
      host === 'updates.push.services.mozilla.com' ||
      host.endsWith('.push.apple.com') ||
      host.endsWith('.notify.windows.com')
  } catch {
    return false
  }
}
