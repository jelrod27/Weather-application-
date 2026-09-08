export function shouldAutoplayRadar(
  isFullPage: boolean,
  prefersReducedMotion: boolean,
): boolean {
  return isFullPage && !prefersReducedMotion
}
