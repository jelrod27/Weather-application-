import { formatWarningTimeLeft, parseNwsHazardParameters } from '@/lib/warnings/nws-parameters'

describe('parseNwsHazardParameters', () => {
  it('reads hail, wind, and source from NWS CAP parameters arrays', () => {
    expect(
      parseNwsHazardParameters({
        maxHailSize: ['1.25'],
        maxWindGust: ['70 MPH'],
        eventSource: ['RADAR INDICATED'],
        thunderstormDamageThreat: ['CONSIDERABLE'],
      }),
    ).toEqual({
      maxHail: '1.25',
      maxWind: '70 MPH',
      source: 'RADAR INDICATED',
      damageThreat: 'CONSIDERABLE',
    })
  })

  it('falls back to HAZARD / SOURCE tags in the statement', () => {
    const description = [
      'HAZARD...60 MPH WIND GUSTS AND 1.00 IN HAIL',
      'SOURCE...RADAR INDICATED.',
      'IMPACT...EXPECT DAMAGE TO ROOFS AND TREES.',
    ].join('\n')

    expect(parseNwsHazardParameters(null, description)).toMatchObject({
      maxHail: expect.stringMatching(/1\.00/i),
      maxWind: expect.stringMatching(/60/i),
      source: expect.stringMatching(/RADAR INDICATED/i),
    })
  })
})

describe('formatWarningTimeLeft', () => {
  it('formats remaining hours and minutes', () => {
    const now = Date.parse('2026-07-04T12:00:00Z')
    expect(formatWarningTimeLeft('2026-07-04T13:30:00Z', now)).toBe('1h 30m')
    expect(formatWarningTimeLeft('2026-07-04T12:20:00Z', now)).toBe('20m')
    expect(formatWarningTimeLeft('2026-07-04T11:00:00Z', now)).toBe('EXPIRED')
  })
})
