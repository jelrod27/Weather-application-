/** @jest-environment node */
jest.mock('@/lib/services/swpc-proxy', () => ({ fetchSwpcJson: jest.fn() }))
jest.mock('@/lib/error-utils', () => ({ logRouteError: jest.fn() }))
jest.mock('@/lib/services/weather-rate-limiter', () => ({
  rateLimitRequest: jest.fn().mockResolvedValue({ allowed: true, headers: {} }),
}))

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/space-weather/plasma/route'
import { fetchSwpcJson } from '@/lib/services/swpc-proxy'

const fetchMock = jest.mocked(fetchSwpcJson)
const wind = (time_tag: string, source = 'SOLAR1', proton_speed = 700, active = true) => ({
  time_tag, source, proton_speed, active, proton_density: 4, proton_temperature: 400000,
})
const mag = (time_tag: string, source = 'SOLAR1', bz_gsm = -3, active = true) => ({
  time_tag, source, bz_gsm, active, bx_gsm: 1, by_gsm: 2, bt: 4,
})
async function read(winds: unknown, mags: unknown, range = '2h') {
  fetchMock.mockImplementation(async (url) => String(url).includes('wind_1m') ? winds : mags)
  const response = await GET(new NextRequest(`http://localhost/api/space-weather/plasma?range=${range}`))
  return { response, body: await response.json() }
}

describe('solar wind plasma series', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date('2026-11-08T01:05:00Z')) })
  afterEach(() => { jest.useRealTimers(); jest.clearAllMocks() })

  it('emits chronological points from newest-first NOAA input', async () => {
    const { response, body } = await read([
      wind('2026-11-08T01:01:00', 'SOLAR1', 706),
      wind('2026-11-08T00:59:00', 'SOLAR1', 680),
    ], [])
    expect(response.status).toBe(200)
    expect(body.data.map((row: { speed: number }) => row.speed)).toEqual([680, 706])
  })

  it('selects the active wind source and joins only its own magnetic samples', async () => {
    const time = '2026-11-08T01:01:00'
    const { body } = await read([
      wind(time, 'SOLAR1', 706), wind(time, 'ACE', 694, false),
    ], [mag(time), mag(time, 'ACE', -9, false)])
    expect(body.data).toHaveLength(1)
    expect(body.data[0]).toMatchObject({ speed: 706, bz: -3 })
    expect(body.spacecraft).toBe('SOLAR1')
  })

  it('normalizes equivalent UTC tags and removes duplicate observations', async () => {
    const { body } = await read([
      wind('2026-11-08T01:01:00'), wind('2026-11-08T01:01:00Z'),
    ], [mag('2026-11-08 01:01:00')])
    expect(body.data).toHaveLength(1)
    expect(body.data[0].bz).toBe(-3)
  })

  it('keeps wind data when only another spacecraft has magnetic readings', async () => {
    const { body } = await read([wind('2026-11-08T01:01:00')], [mag('2026-11-08T01:01:00', 'ACE', -9, false)])
    expect(body.data[0]).toMatchObject({ speed: 700, bz: null, bx: null, by: null, bt: null })
    expect(body.magneticAvailable).toBe(false)
  })

  it('falls back to one newest wind source when no source is active', async () => {
    const { body } = await read([
      wind('2026-11-08T00:59:00', 'ACE', 690, false),
      wind('2026-11-08T01:01:00', 'IMAP', 705, false),
    ], [])
    expect(body.data).toHaveLength(1)
    expect(body.data[0].speed).toBe(705)
    expect(body.spacecraft).toBe('IMAP')
  })

  it('does not let a future timestamp select a different instrument', async () => {
    const { body } = await read([
      wind('2026-11-08T01:01:00', 'SOLAR1', 706),
      wind('2026-11-08T02:00:00', 'ACE', 900),
    ], [])
    expect(body.data).toHaveLength(1)
    expect(body.data[0].speed).toBe(706)
  })

  it('rejects nonfinite values and observations outside the requested UTC window', async () => {
    const { body } = await read([
      wind('2026-11-08T01:01:00'), wind('2026-11-07T20:00:00'),
      wind('2026-11-08T01:02:00', 'SOLAR1', Infinity), wind('not-a-time'),
      wind('2026-11-08T02:00:00'),
    ], [])
    expect(body.data).toHaveLength(1)
    expect(body.data[0].speed).toBe(700)
  })
})
