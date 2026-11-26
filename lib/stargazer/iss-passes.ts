import { calculateISSPasses, fetchISSTLE } from '@/lib/stargazer/satellites';
import type { ISSPass } from '@/lib/stargazer/types';

export async function fetchUpcomingISSPasses(lat: number, lon: number): Promise<ISSPass[] | null> {
  const tle = await fetchISSTLE();
  return tle ? calculateISSPasses(tle, lat, lon, new Date(), 7) : null;
}
