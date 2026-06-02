import type { SevenTimerResponse, SevenTimerDataPoint } from '@/lib/stargazer/types';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

// 7Timer supports HTTPS (verified) — use it so the upstream response cannot be
// tampered with in transit by a network MITM. Still called server-side only.
const SEVEN_TIMER_BASE = 'https://www.7timer.info/bin/astro.php';

/**
 * Fetch 7Timer ASTRO data for a location. Called server-side only.
 */
export async function fetchSevenTimerData(
  lat: number,
  lon: number
): Promise<SevenTimerResponse | null> {
  try {
    const url = `${SEVEN_TIMER_BASE}?lon=${lon}&lat=${lat}&ac=0&unit=metric&output=json&tzshift=0`;
    const res = await fetchWithTimeout(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      console.error('[7Timer] HTTP error:', res.status);
      return null;
    }

    const data = (await res.json()) as SevenTimerResponse;

    if (!data.dataseries || data.dataseries.length === 0) {
      console.error('[7Timer] Empty dataseries');
      return null;
    }

    return data;
  } catch (error) {
    console.error('[7Timer] Fetch failed:', error);
    return null;
  }
}

/**
 * Convert a 7Timer init string + timepoint offset to a Date.
 * @param init - Format "YYYYMMDDHH"
 * @param timepoint - Hours after init time
 */
export function sevenTimerTimeToDate(init: string, timepoint: number): Date {
  const year = parseInt(init.slice(0, 4), 10);
  const month = parseInt(init.slice(4, 6), 10) - 1; // 0-indexed
  const day = parseInt(init.slice(6, 8), 10);
  const hour = parseInt(init.slice(8, 10), 10);

  const date = new Date(Date.UTC(year, month, day, hour));
  date.setUTCHours(date.getUTCHours() + timepoint);
  return date;
}

/**
 * Get the nearest 7Timer data point for a specific time.
 */
export function getSevenTimerAtTime(
  data: SevenTimerResponse,
  targetTime: Date
): SevenTimerDataPoint | null {
  if (!data.dataseries || data.dataseries.length === 0) {
    return null;
  }

  let closest: SevenTimerDataPoint | null = null;
  let minDiff = Infinity;

  for (const dp of data.dataseries) {
    const dpTime = sevenTimerTimeToDate(data.init, dp.timepoint);
    const diff = Math.abs(dpTime.getTime() - targetTime.getTime());

    if (diff < minDiff) {
      minDiff = diff;
      closest = dp;
    }
  }

  return closest;
}
