/**
 * Separates "auth transition" loading (profileLoading UI) from refresh bumps
 * that invalidate in-flight profile/prefs fetches.
 *
 * Refresh must not prevent the auth-transition load from clearing profileLoading.
 */
export class AuthUserDataLoadGate {
  private gen = 0

  begin(): number {
    this.gen += 1
    return this.gen
  }

  /** Invalidate any in-flight auth-transition load (sign-out / user clear). */
  invalidate(): void {
    this.gen += 1
  }

  shouldClear(expected: number): boolean {
    return this.gen === expected
  }

  /** Test helper */
  get current(): number {
    return this.gen
  }
}
