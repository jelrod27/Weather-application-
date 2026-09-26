export type AlertCoverage = 'supported' | 'outside-nws' | 'unavailable' | 'loading'

export function warningCoverageCopy(coverage: AlertCoverage): string {
  switch (coverage) {
    case 'outside-nws': return 'NWS warnings do not cover this location. Check your local weather authority.'
    case 'unavailable': return 'Warning coverage is unavailable. Current local alert status is unknown.'
    case 'loading': return 'Checking warning coverage for this location…'
    case 'supported': return 'No current NWS warnings returned for this location.'
  }
}
