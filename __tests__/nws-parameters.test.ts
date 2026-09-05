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

  it('reads MAX HAIL SIZE / MAX WIND GUST lines without leaking the leading dots', () => {
    const description = [
      'HAIL THREAT...RADAR INDICATED',
      'MAX HAIL SIZE...1.75 IN',
      'WIND THREAT...RADAR INDICATED',
      'MAX WIND GUST...70 MPH',
    ].join('\n')

    expect(parseNwsHazardParameters(null, description)).toMatchObject({
      maxHail: '1.75 IN',
      maxWind: '70 MPH',
    })
  })

  // NWS writes a sub-severe tag value as a "less than" bound with no leading
  // zero — "<.75 IN", "<50 MPH" — when the product is issued on the other
  // criterion (a Special Weather Statement, or a warning met on wind alone).
  // The comparator has to survive parsing: ".75 IN" would report a hail size
  // the office explicitly declined to assert.
  it('reads sub-severe threshold values that carry a < comparator', () => {
    const description = [
      'HAZARD...60 MPH WIND GUSTS AND PENNY SIZE HAIL',
      'MAX HAIL SIZE...<.75 IN',
      'MAX WIND GUST...<50 MPH',
    ].join('\n')

    expect(parseNwsHazardParameters(null, description)).toMatchObject({
      maxHail: '<.75 IN',
      maxWind: '<50 MPH',
    })
  })

  it('still reads whole-number and no-hail tag values', () => {
    expect(
      parseNwsHazardParameters(null, 'MAX HAIL SIZE...0.00 IN\nMAX WIND GUST...100 MPH'),
    ).toMatchObject({
      maxHail: '0.00 IN',
      maxWind: '100 MPH',
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
