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

    if (!Array.isArray(data?.dataseries) || data.dataseries.length === 0) {
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
  if (typeof init !== 'string' || !/^\d{10}$/.test(init) || !Number.isInteger(timepoint) || timepoint < 0 || timepoint > 72) return new Date(NaN);
  const iso = `${init.slice(0, 4)}-${init.slice(4, 6)}-${init.slice(6, 8)}T${init.slice(8, 10)}:00:00.000Z`;
  const base = new Date(iso);
  if (!Number.isFinite(base.getTime()) || base.toISOString() !== iso) return new Date(NaN);
  return new Date(base.getTime() + timepoint * 3600000);
}

/**
 * Get the nearest 7Timer data point for a specific time.
 */
export function getSevenTimerAtTime(
  data: SevenTimerResponse,
  targetTime: Date,
  now: Date = new Date(),
): SevenTimerDataPoint | null {
  const init = sevenTimerTimeToDate(data.init, 0).getTime();
  const age = now.getTime() - init;
  // Product policy: an initialization up to 24 hours old, on ASTRO's three-hour grid.
  if (!Number.isFinite(age) || age < 0 || age > 24 * 3600000 ||
      !Array.isArray(data.dataseries) || data.dataseries.length === 0 ||
      data.dataseries.some((point, index, points) => !point || !Number.isInteger(point.timepoint) ||
        point.timepoint < 3 || point.timepoint > 72 || point.timepoint % 3 !== 0 ||
        (index > 0 && point.timepoint <= points[index - 1].timepoint))) {
    return null;
  }

  const target = targetTime.getTime();
  const first = sevenTimerTimeToDate(data.init, data.dataseries[0].timepoint).getTime();
  const last = sevenTimerTimeToDate(data.init, data.dataseries[data.dataseries.length - 1].timepoint).getTime();
  if (!Number.isFinite(target) || target < first || target > last) return null;

  let closest: SevenTimerDataPoint | null = null;
  let minDiff = Infinity;

  for (const dp of data.dataseries) {
    const dpTime = sevenTimerTimeToDate(data.init, dp.timepoint);
    const diff = Math.abs(dpTime.getTime() - targetTime.getTime());

    if (!Number.isInteger(dp.seeing) || dp.seeing < 1 || dp.seeing > 8 ||
        !Number.isInteger(dp.transparency) || dp.transparency < 1 || dp.transparency > 8) continue;
    if (diff <= 90 * 60000 && diff < minDiff) {
      minDiff = diff;
      closest = dp;
    }
  }

  return closest;
}
