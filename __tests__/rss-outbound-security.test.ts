/** @jest-environment node */

import { request } from 'node:https'
import { resolveOgImage } from '@/lib/services/rss/resolve-og-image'

jest.mock('node:https', () => ({ ...jest.requireActual('node:https'), request: jest.fn() }))

beforeEach(() => { jest.clearAllMocks() })

describe('RSS article destination protection', () => {
  it.each(['https://127.0.0.1/internal', 'https://[::1]/internal', 'https://169.254.169.254/latest/', 'http://example.com/article']) (
    'does not fetch or extract an image from %s', async (url) => {
      await expect(resolveOgImage(url)).resolves.toBeNull()
      expect(request).not.toHaveBeenCalled()
    },
  )
})
