/**
 * Map Open-Meteo CAMS pollen grains/m³ into the app's tree/grass/weed categories.
 * CAMS pollen is Europe-focused; outside coverage values are null → Unavailable.
 */

export type PollenCategoryMap = {
  tree: Record<string, string>;
  grass: Record<string, string>;
  weed: Record<string, string>;
  source: 'open-meteo' | 'unavailable';
};

/** Approximate European pollen index bands (grains/m³). */
export function grainsToCategory(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return 'Unavailable';
  if (value <= 0) return 'None';
  if (value <= 20) return 'Low';
  if (value <= 50) return 'Moderate';
  if (value <= 100) return 'High';
  return 'Very High';
}

export type OpenMeteoPollenHourly = {
  time?: string[];
  alder_pollen?: (number | null)[];
  birch_pollen?: (number | null)[];
  grass_pollen?: (number | null)[];
  mugwort_pollen?: (number | null)[];
  olive_pollen?: (number | null)[];
  ragweed_pollen?: (number | null)[];
};

/**
 * Open-Meteo `timezone=auto` returns offset-free local civil timestamps.
 * Convert to epoch ms using the feed's utc_offset_seconds.
 */
export function openMeteoLocalTimeToEpoch(
  time: string,
  utcOffsetSeconds = 0,
): number {
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(time);
  const asUtc = Date.parse(hasZone ? time : `${time}Z`);
  if (Number.isNaN(asUtc)) return NaN;
  return asUtc - utcOffsetSeconds * 1000;
}

function currentHourIndex(
  times: string[] | undefined,
  utcOffsetSeconds = 0,
): number {
  if (!times?.length) return 0;
  const now = Date.now();
  let best = 0;
  let bestDelta = Infinity;
  for (let i = 0; i < times.length; i++) {
    const t = openMeteoLocalTimeToEpoch(times[i]!, utcOffsetSeconds);
    if (Number.isNaN(t)) continue;
    const delta = Math.abs(t - now);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = i;
    }
  }
  return best;
}

function pick(
  hourly: OpenMeteoPollenHourly,
  key: keyof OpenMeteoPollenHourly,
  idx: number,
): number | null {
  if (key === 'time') return null;
  const arr = hourly[key] as (number | null)[] | undefined;
  const v = arr?.[idx];
  return typeof v === 'number' ? v : null;
}

export function mapOpenMeteoPollenHourly(
  hourly: OpenMeteoPollenHourly | undefined | null,
  utcOffsetSeconds = 0,
): PollenCategoryMap {
  if (!hourly?.time?.length) {
    return {
      tree: { Tree: 'Unavailable' },
      grass: { Grass: 'Unavailable' },
      weed: { Weed: 'Unavailable' },
      source: 'unavailable',
    };
  }

  const idx = currentHourIndex(hourly.time, utcOffsetSeconds);
  const alder = pick(hourly, 'alder_pollen', idx);
  const birch = pick(hourly, 'birch_pollen', idx);
  const olive = pick(hourly, 'olive_pollen', idx);
  const grass = pick(hourly, 'grass_pollen', idx);
  const mugwort = pick(hourly, 'mugwort_pollen', idx);
  const ragweed = pick(hourly, 'ragweed_pollen', idx);

  const any =
    alder != null || birch != null || olive != null || grass != null || mugwort != null || ragweed != null;

  if (!any) {
    return {
      tree: { Tree: 'Unavailable' },
      grass: { Grass: 'Unavailable' },
      weed: { Weed: 'Unavailable' },
      source: 'unavailable',
    };
  }

  const tree: Record<string, string> = {};
  if (alder != null) tree.Alder = grainsToCategory(alder);
  if (birch != null) tree.Birch = grainsToCategory(birch);
  if (olive != null) tree.Olive = grainsToCategory(olive);
  if (Object.keys(tree).length === 0) tree.Tree = 'Unavailable';

  const grassMap: Record<string, string> = {
    Grass: grainsToCategory(grass),
  };

  const weed: Record<string, string> = {};
  if (mugwort != null) weed.Mugwort = grainsToCategory(mugwort);
  if (ragweed != null) weed.Ragweed = grainsToCategory(ragweed);
  if (Object.keys(weed).length === 0) weed.Weed = 'Unavailable';

  return {
    tree,
    grass: grassMap,
    weed,
    source: 'open-meteo',
  };
}
