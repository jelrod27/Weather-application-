/** @jest-environment node */

import { upsertGuestSubscriber } from '@/lib/services/guest-alert-subscribers'

describe('upsertGuestSubscriber', () => {
  it('does not move a verified pin from the public subscribe path', async () => {
    const updates: Record<string, unknown>[] = []
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: 'g1',
                email: 'a@example.com',
                latitude: 39.74,
                longitude: -104.99,
                location_label: 'Denver, CO',
                enabled: true,
                verified_at: '2026-01-01T00:00:00Z',
                manage_token_hash: 'old',
                notify_tornado: true,
                notify_severe_thunderstorm: true,
                notify_flash_flood: true,
                notify_upgrades: true,
              },
              error: null,
            }),
          }),
        }),
        update: (row: Record<string, unknown>) => {
          updates.push(row)
          return { eq: async () => ({ error: null }) }
        },
      }),
    }

    const result = await upsertGuestSubscriber(supabase as never, {
      email: 'a@example.com',
      latitude: 32.78,
      longitude: -96.8,
      locationLabel: 'Dallas, TX',
    })

    expect(result.alreadyVerified).toBe(true)
    expect(result.subscriber.latitude).toBe(39.74)
    expect(result.subscriber.locationLabel).toBe('Denver, CO')
    expect(updates[0]).not.toHaveProperty('latitude')
    expect(updates[0]).not.toHaveProperty('location_label')
    expect(updates[0]).toEqual(expect.objectContaining({ manage_token_hash: expect.any(String) }))
  })
})
