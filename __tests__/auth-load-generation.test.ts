import { AuthUserDataLoadGate } from '@/lib/auth/auth-load-generation'

describe('AuthUserDataLoadGate', () => {
  it('clears loading for the matching auth-transition generation', () => {
    const gate = new AuthUserDataLoadGate()
    const gen = gate.begin()
    expect(gate.shouldClear(gen)).toBe(true)
  })

  it('does not let a newer auth transition clear an older load', () => {
    const gate = new AuthUserDataLoadGate()
    const first = gate.begin()
    gate.begin()
    expect(gate.shouldClear(first)).toBe(false)
  })

  it('keeps auth-transition clearable after invalidate is not called (refresh-safe)', () => {
    // Refresh bumps profile/prefs gens separately; this gate must stay put.
    const gate = new AuthUserDataLoadGate()
    const authLoad = gate.begin()
    expect(gate.current).toBe(authLoad)
    expect(gate.shouldClear(authLoad)).toBe(true)
  })

  it('invalidate prevents stale auth loads from clearing loading', () => {
    const gate = new AuthUserDataLoadGate()
    const authLoad = gate.begin()
    gate.invalidate()
    expect(gate.shouldClear(authLoad)).toBe(false)
  })
})
