import * as satellite from 'satellite.js';
import type { ISSPass } from '@/lib/stargazer/types';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

const CELESTRAK_ISS_URL =
  'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE';

/**
 * Fetch ISS TLE (Two-Line Element set) from CelesTrak.
 */
export async function fetchISSTLE(): Promise<{
  line1: string;
  line2: string;
} | null> {
  try {
    const res = await fetchWithTimeout(CELESTRAK_ISS_URL, { next: { revalidate: 7200 } });

    if (!res.ok) {
      console.error('[ISS TLE] HTTP error:', res.status);
      return null;
    }

    const text = await res.text();
    const lines = text.trim().split('\n').map((l) => l.trim());

    if (lines.length < 3) {
      console.error('[ISS TLE] Unexpected format, got', lines.length, 'lines');
      return null;
    }

    // TLE format: line 0 = name, line 1 = TLE line 1, line 2 = TLE line 2
    return { line1: lines[1], line2: lines[2] };
  } catch (error) {
    console.error('[ISS TLE] Fetch failed:', error);
    return null;
  }
}

/**
 * Get compass direction string from azimuth in degrees.
 */
function getCompassDirection(azimuthDeg: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW',
  ];
  const index = Math.round(azimuthDeg / 22.5) % 16;
  return directions[index];
}

/**
 * Approximate whether the sun is below the horizon (nighttime) for a given
 * location and time. Uses a simplified solar position calculation.
 */
function isSunBelowHorizon(lat: number, lon: number, date: Date): boolean {
  const dayOfYear =
    Math.floor(
      (date.getTime() - new Date(date.getUTCFullYear(), 0, 0).getTime()) /
        86400000
    );

  const declination =
    -23.44 * Math.cos(((360 / 365) * (dayOfYear + 10) * Math.PI) / 180);

  const hourAngle =
    ((date.getUTCHours() + date.getUTCMinutes() / 60 + lon / 15) * 15 - 180);

  const latRad = (lat * Math.PI) / 180;
  const decRad = (declination * Math.PI) / 180;
  const haRad = (hourAngle * Math.PI) / 180;

  const sinAlt =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);

  const altitude = (Math.asin(sinAlt) * 180) / Math.PI;

  // Sun below -6 degrees = civil twilight has ended
  return altitude < -6;
}

/**
 * Estimate ISS visual magnitude based on range (km) and a simplified
 * phase angle assumption. The ISS at ~400km in favorable geometry is
 * about magnitude -3.5.
 */
function estimateMagnitude(rangeKm: number): number {
  // Base magnitude at 400km optimal: ~ -3.5
  // Brightness falls off with distance squared
  const baseMag = -3.5;
  const baseRange = 400;
  const mag = baseMag + 5 * Math.log10(rangeKm / baseRange);
  return Math.round(mag * 10) / 10;
}

/**
 * Calculate visible ISS passes for a location over the specified number of days.
 * Returns at most 5 passes sorted by date.
 */
export function calculateISSPasses(
  tle: { line1: string; line2: string },
  lat: number,
  lon: number,
  startDate: Date,
  days: number
): ISSPass[] {
  const satrec = satellite.twoline2satrec(tle.line1, tle.line2);

  const observerGd: satellite.GeodeticLocation = {
    latitude: satellite.degreesToRadians(lat),
    longitude: satellite.degreesToRadians(lon),
    height: 0, // km above ellipsoid
  };

  const endTime = new Date(startDate.getTime() + days * 86400000);
  const stepMs = 30 * 1000; // 30-second steps
  const minElevation = 10; // degrees

  const passes: ISSPass[] = [];
  let inPass = false;
  let passPoints: Array<{
    time: Date;
    elevation: number;
    azimuth: number;
    range: number;
  }> = [];

  for (
    let t = startDate.getTime();
    t <= endTime.getTime();
    t += stepMs
  ) {
    const now = new Date(t);
    const positionAndVelocity = satellite.propagate(satrec, now);

    if (
      typeof positionAndVelocity.position === 'boolean' ||
      !positionAndVelocity.position
    ) {
      continue;
    }

    const positionEci = positionAndVelocity.position;
    const gmst = satellite.gstime(now);
    const positionEcf = satellite.eciToEcf(positionEci, gmst);
    const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);

    const elevationDeg = satellite.radiansToDegrees(lookAngles.elevation);
    const azimuthDeg = satellite.radiansToDegrees(lookAngles.azimuth);
    const rangeSat = lookAngles.rangeSat; // km

    if (elevationDeg >= minElevation) {
      if (!inPass) {
        inPass = true;
        passPoints = [];
      }
      passPoints.push({
        time: now,
        elevation: elevationDeg,
        azimuth: azimuthDeg,
        range: rangeSat,
      });
    } else if (inPass) {
      // Pass ended - check if it occurred during darkness
      inPass = false;

      if (passPoints.length === 0) continue;

      const midTime = passPoints[Math.floor(passPoints.length / 2)].time;
      if (!isSunBelowHorizon(lat, lon, midTime)) continue;

      // Find max elevation point
      let maxEl = passPoints[0];
      for (const p of passPoints) {
        if (p.elevation > maxEl.elevation) maxEl = p;
      }

      const risePoint = passPoints[0];
      const setPoint = passPoints[passPoints.length - 1];

      passes.push({
        date: risePoint.time,
        riseTime: risePoint.time,
        riseDirection: getCompassDirection(risePoint.azimuth),
        maxElevation: Math.round(maxEl.elevation),
        maxTime: maxEl.time,
        setDirection: getCompassDirection(setPoint.azimuth),
        setTime: setPoint.time,
        brightness: estimateMagnitude(maxEl.range),
      });

      if (passes.length >= 5) break;
    }
  }

  // Sort by date and return max 5
  return passes.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 5);
}
