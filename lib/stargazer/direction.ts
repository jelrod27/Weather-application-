export interface SkyPosition { altitude: number; azimuth: number }

/** Text equivalent of the finding diagram; directions are clockwise from true north. */
export function describeSkyPosition({ altitude, azimuth }: SkyPosition): string {
  if (!Number.isFinite(altitude) || !Number.isFinite(azimuth)) return 'Position unavailable.';
  if (altitude <= 0) return 'Below the horizon at this time.';
  if (altitude >= 85) return 'Nearly overhead.';
  const direction = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][Math.round(((azimuth % 360) + 360) % 360 / 45) % 8];
  const height = altitude < 30 ? 'low in the sky' : altitude < 60 ? 'about halfway up the sky' : 'high in the sky';
  return `Face ${direction}; look ${height} (about ${Math.round(altitude)}° above the horizon).`;
}
