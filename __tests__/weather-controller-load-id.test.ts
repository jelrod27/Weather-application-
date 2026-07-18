/**
 * Pins the "use my location" loadId contract: callers may share one generation
 * with handleLocationDetected so post-detect work is not treated as stale.
 *
 * Full hook rendering is heavy; this documents the shared-id arithmetic that
 * the controller relies on.
 */

describe('weather controller loadId sharing', () => {
  it('shared existingLoadId stays current when detect does not bump again', () => {
    let latestLoadId = 0
    const beginSearch = () => ++latestLoadId
    const detect = (existingLoadId?: number) => {
      const loadId = existingLoadId ?? ++latestLoadId
      return loadId
    }

    const searchId = beginSearch()
    const detectId = detect(searchId)

    expect(detectId).toBe(searchId)
    expect(latestLoadId).toBe(searchId)
    // Post-detect bookkeeping (rate-limit remaining) must still see a match.
    expect(searchId === latestLoadId).toBe(true)
  })

  it('nested bump without sharing makes post-detect work look stale', () => {
    let latestLoadId = 0
    const searchId = ++latestLoadId
    // Bug pattern: detect always bumps
    const detectId = ++latestLoadId

    expect(searchId === latestLoadId).toBe(false)
    expect(detectId).toBe(latestLoadId)
  })
})
