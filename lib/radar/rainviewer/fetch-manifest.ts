import { RAINVIEWER_MANIFEST_URL } from '@/lib/radar/rainviewer/constants'
import { normalizeRainViewerManifest } from '@/lib/radar/rainviewer/normalize-manifest'
import type { RainViewerManifest } from '@/lib/radar/rainviewer/types'

const MANIFEST_TIMEOUT_MS = 8000

export async function fetchRainViewerManifest(
  fetchImpl: typeof fetch = fetch,
): Promise<RainViewerManifest> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), MANIFEST_TIMEOUT_MS)

  try {
    const response = await fetchImpl(RAINVIEWER_MANIFEST_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: 120 },
    })

    if (!response.ok) {
      throw new Error(`RainViewer manifest request failed: ${response.status}`)
    }

    const payload = await response.json()
    return normalizeRainViewerManifest(payload)
  } finally {
    clearTimeout(timeout)
  }
}
