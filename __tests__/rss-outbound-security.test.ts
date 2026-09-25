/** @jest-environment node */

import { resolveOgImage } from '@/lib/services/rss/resolve-og-image'

describe('RSS article destination protection', () => {
  it.each(['https://127.0.0.1/internal', 'https://[::1]/internal', 'https://169.254.169.254/latest/', 'http://example.com/article']) (
    'does not fetch or extract an image from %s', async (url) => {
      const request = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('<meta property="og:image" content="https://example.com/private.jpg">'))
      try {
        await expect(resolveOgImage(url)).resolves.toBeNull()
        expect(request).not.toHaveBeenCalled()
      } finally { request.mockRestore() }
    },
  )
})
