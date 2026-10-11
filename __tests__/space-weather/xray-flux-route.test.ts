/** @jest-environment node */

jest.mock('@/lib/services/swpc-proxy', () => ({ fetchSwpc: jest.fn() }))

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/space-weather/xray-flux/route'
import { fetchSwpc } from '@/lib/services/swpc-proxy'

const fetchMock = jest.mocked(fetchSwpc)

describe('GOES X-ray flux route', () => {
  afterEach(() => jest.clearAllMocks())

  it('uses every 1–8 angstrom sample for the peak and current value', async () => {
    const payload = [
      { time_tag: '2026-10-10T15:00:00Z', flux: 1e-8, energy: '0.05-0.4nm' },
      { time_tag: '2026-10-10T15:00:00Z', flux: 2e-5, energy: '0.1-0.8nm' },
      { time_tag: '2026-10-10T15:01:00Z', flux: 8e-8, energy: '0.05-0.4nm' },
      { time_tag: '2026-10-10T15:01:00Z', flux: 6.5e-5, energy: '0.1-0.8nm' },
      { time_tag: '2026-10-10T15:02:00Z', flux: 9e-8, energy: '0.05-0.4nm' },
      { time_tag: '2026-10-10T15:02:00Z', flux: 2e-6, energy: '0.1-0.8nm' },
      { time_tag: '2026-10-10T15:02:00Z', flux: 9e-4, energy: '0.05-0.4nm' },
    ]
    fetchMock.mockResolvedValue(new Response(JSON.stringify(payload)))

    const response = await GET(new NextRequest('http://localhost/api/space-weather/xray-flux'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.peakLast24h).toEqual({
      flux: 6.5e-5,
      flareClass: 'M6.5',
      timeTag: '2026-10-10T15:01:00Z',
    })
    expect(body.data.current).toEqual({
      flux: 2e-6,
      flareClass: 'C',
      classNumber: 'C2.0',
    })
  })
})
