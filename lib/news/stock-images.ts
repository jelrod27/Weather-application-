/**
 * Fallback imagery when a story has no feed / OG / provenance-bound product.
 *
 * Image honesty (hazard spine):
 * - Earthquakes: never use place-specific historical stock. Prefer USGS
 *   ShakeMap; otherwise leave imageless for a data-forward card.
 * - Volcanoes: only named peaks with a photo of that peak; no hash pool of
 *   unrelated eruptions standing in for Aleutian alerts.
 * - Severe / tropical: live GOES / SPC / NHC products (provenance-bound).
 * - Science / climate / space: illustrative stock is allowed (credit later).
 */
import type { FeedCategory } from '@/lib/services/rss/feedSources';

export interface StockImage {
  url: string;
  credit: string;
}

/** Editorial / live-product stock only. Hazards omitted on purpose. */
export const CATEGORY_STOCK_IMAGES: Partial<Record<FeedCategory, StockImage>> = {
  severe: {
    url: 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS/GEOCOLOR/1250x750.jpg',
    credit: 'NOAA GOES-16 GeoColor',
  },
  hurricanes: {
    url: 'https://www.nhc.noaa.gov/xgtwo/resize/xgtwo_atl_2d0_w1024.png',
    credit: 'NHC / NOAA',
  },
  space: {
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0193.jpg',
    credit: 'NASA SDO',
  },
  climate: {
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Global_warming_map.jpg?width=1280',
    credit: 'NASA / Wikimedia Commons',
  },
  science: {
    url: 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS/09/1250x750.jpg',
    credit: 'NOAA GOES-16 Water Vapor',
  },
};

/**
 * Retained for tests / future curated use. Not used as a blind hash fallback —
 * that caused St. Helens / Pinatubo / Tambora to stand in for unrelated peaks.
 */
export const VOLCANO_STOCK_POOL: StockImage[] = [
  {
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/MSH80_eruption_mount_st_helens_05-18-80.jpg?width=1280',
    credit: 'Austin Post / USGS',
  },
  {
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pinatubo91eruption_clark_air_base.jpg?width=1280',
    credit: 'USGS',
  },
  {
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Eyjafjallajokull_volcano_plume_2010_04_18.JPG?width=1280',
    credit: 'NASA Earth Observatory',
  },
  {
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mount_Tambora_Volcano,_Sumbawa_Island,_Indonesia.jpg?width=1280',
    credit: 'NASA Earth Observatory',
  },
  {
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Lava_entering_sea_-_Hawaii.png?width=1280',
    credit: 'USGS / Wikimedia Commons',
  },
  {
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Shishaldin_Volcano_from_the_ISS.jpg?width=1280',
    credit: 'NASA ISS',
  },
  {
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mount_Etna_eruption_2002.jpg?width=1280',
    credit: 'Wikimedia Commons',
  },
  {
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Volcano_ignimbrite_welded_tuff.jpg?width=1280',
    credit: 'Wikimedia Commons',
  },
];

/** Only peaks whose photo is actually of that volcano. */
export const NAMED_VOLCANO_IMAGES: Record<string, StockImage> = {
  kilauea: {
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Puu_Oo_crater_bench_lava_lake.jpg?width=1280',
    credit: 'USGS / Wikimedia Commons',
  },
  'mauna loa': {
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mauna_Loa_1984_eruption.jpg?width=1280',
    credit: 'USGS / Wikimedia Commons',
  },
  shishaldin: {
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Shishaldin_Volcano_from_the_ISS.jpg?width=1280',
    credit: 'NASA ISS',
  },
  'mount st. helens': {
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/MSH80_eruption_mount_st_helens_05-18-80.jpg?width=1280',
    credit: 'Austin Post / USGS',
  },
  'st. helens': {
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/MSH80_eruption_mount_st_helens_05-18-80.jpg?width=1280',
    credit: 'Austin Post / USGS',
  },
  etna: {
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mount_Etna_eruption_2002.jpg?width=1280',
    credit: 'Wikimedia Commons',
  },
  eyjafjallajokull: {
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Eyjafjallajokull_volcano_plume_2010_04_18.JPG?width=1280',
    credit: 'NASA Earth Observatory',
  },
};

export function normalizeVolcanoKey(name: string): string {
  return name.toLowerCase().replace(/\s+volcano$/i, '').trim();
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash &= hash;
  }
  return Math.abs(hash);
}

/** Named-peak photo only; unknown peaks stay imageless (data-forward card). */
export function pickVolcanoStockImage(locationOrId: string): StockImage | undefined {
  const key = normalizeVolcanoKey(locationOrId);
  return NAMED_VOLCANO_IMAGES[key];
}

export function getCategoryStockImage(category: FeedCategory): StockImage | undefined {
  return CATEGORY_STOCK_IMAGES[category];
}

/**
 * Optional stock art. Returns undefined for earthquakes and unnamed volcanoes
 * so cards never show a wrong-place historical catastrophe photo.
 */
export function pickCategoryStockImage(
  category: FeedCategory,
  seed: string,
  sourceId?: string,
): StockImage | undefined {
  if (category === 'earthquakes') return undefined;
  if (category === 'volcanoes') return pickVolcanoStockImage(seed);
  if (category === 'hurricanes') return pickTropicalStockImage(seed, sourceId);
  if (category === 'severe') return pickSevereStockImage(seed, sourceId);
  return CATEGORY_STOCK_IMAGES[category];
}

const NHC_BASE = 'https://www.nhc.noaa.gov';

/** Live NHC outlook graphics + satellite views for the tropical category. */
export const TROPICAL_STOCK_POOL: StockImage[] = [
  {
    url: `${NHC_BASE}/xgtwo/resize/xgtwo_atl_2d0_w1024.png`,
    credit: 'NHC / NOAA',
  },
  {
    url: `${NHC_BASE}/xgtwo/resize/xgtwo_atl_7d0_w1024.png`,
    credit: 'NHC / NOAA',
  },
  {
    url: `${NHC_BASE}/xgtwo/resize/xgtwo_pac_2d0_w1024.png`,
    credit: 'NHC / NOAA',
  },
  {
    url: `${NHC_BASE}/xgtwo/resize/xgtwo_pac_7d0_w1024.png`,
    credit: 'NHC / NOAA',
  },
  {
    url: `${NHC_BASE}/xgtwo/resize/xgtwo_cpac_2d0_w1024.png`,
    credit: 'NHC / NOAA',
  },
  {
    url: 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/FD/GEOCOLOR/latest.jpg',
    credit: 'NOAA GOES-16 Full Disk',
  },
  {
    url: 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/FD/13/latest.jpg',
    credit: 'NOAA GOES-16 Infrared',
  },
  {
    url: 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS/09/1250x750.jpg',
    credit: 'NOAA GOES-16 Water Vapor',
  },
];

export function pickTropicalStockImage(titleOrSeed: string, sourceId?: string): StockImage {
  const title = titleOrSeed.toLowerCase();

  if (title.includes('atlantic') && title.includes('outlook')) {
    return TROPICAL_STOCK_POOL[0];
  }
  if (title.includes('eastern north pacific') || (title.includes('pacific') && title.includes('outlook'))) {
    return TROPICAL_STOCK_POOL[2];
  }
  if (title.includes('central pacific')) {
    return TROPICAL_STOCK_POOL[4];
  }
  if (title.includes('no tropical cyclones')) {
    return sourceId === 'nhc-pacific' ? TROPICAL_STOCK_POOL[3] : TROPICAL_STOCK_POOL[1];
  }

  const idx = hashSeed(`${sourceId ?? 'tropical'}:${titleOrSeed}`) % TROPICAL_STOCK_POOL.length;
  return TROPICAL_STOCK_POOL[idx];
}

/** Resolve an NHC outlook or basin graphic from RSS item title/link. */
export function resolveNhcOutlookImage(item: {
  title: string;
  url: string;
  sourceId: string;
}): string | undefined {
  const title = item.title.toLowerCase();
  const url = item.url.toLowerCase();

  if (url.includes('basin=atlc') || (title.includes('atlantic') && title.includes('outlook'))) {
    return `${NHC_BASE}/xgtwo/resize/xgtwo_atl_2d0_w1024.png`;
  }
  if (url.includes('basin=epac') || title.includes('eastern north pacific')) {
    return `${NHC_BASE}/xgtwo/resize/xgtwo_pac_2d0_w1024.png`;
  }
  if (url.includes('basin=cpac') || title.includes('central pacific')) {
    return `${NHC_BASE}/xgtwo/resize/xgtwo_cpac_2d0_w1024.png`;
  }
  if (title.includes('no tropical cyclones')) {
    return item.sourceId === 'nhc-pacific'
      ? `${NHC_BASE}/xgtwo/resize/xgtwo_pac_7d0_w1024.png`
      : `${NHC_BASE}/xgtwo/resize/xgtwo_atl_7d0_w1024.png`;
  }

  return undefined;
}

const GOES16 = 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI';
const SPC_OUTLOOK = 'https://www.spc.noaa.gov/products/outlook';

const GOES_CONUS_GEO = `${GOES16}/CONUS/GEOCOLOR/1250x750.jpg`;
const GOES_CONUS_WV = `${GOES16}/CONUS/09/1250x750.jpg`;
const GOES_CONUS_IR = `${GOES16}/CONUS/13/1250x750.jpg`;
const GOES_CONUS_IR14 = `${GOES16}/CONUS/14/1250x750.jpg`;
const GOES_FD_GEO = `${GOES16}/FD/GEOCOLOR/latest.jpg`;

/** Live satellite products and SPC graphics for the severe category. */
export const SEVERE_STOCK_POOL: StockImage[] = [
  { url: GOES_CONUS_GEO, credit: 'NOAA GOES-16 GeoColor' },
  { url: GOES_CONUS_WV, credit: 'NOAA GOES-16 Water Vapor' },
  { url: GOES_CONUS_IR, credit: 'NOAA GOES-16 Infrared' },
  { url: GOES_CONUS_IR14, credit: 'NOAA GOES-16 IR Longwave' },
  { url: GOES_FD_GEO, credit: 'NOAA GOES-16 Full Disk' },
  { url: `${SPC_OUTLOOK}/day1otlk.png`, credit: 'SPC / NOAA' },
  { url: `${SPC_OUTLOOK}/day2otlk.png`, credit: 'SPC / NOAA' },
  { url: `${SPC_OUTLOOK}/day3otlk.png`, credit: 'SPC / NOAA' },
];

/** Per-alert-type imagery rotated by title so concurrent warnings differ. */
const ALERT_TYPE_VARIANTS: Record<string, StockImage[]> = {
  tornado: [
    { url: GOES_CONUS_IR, credit: 'NOAA GOES-16 Infrared' },
    { url: `${SPC_OUTLOOK}/day1otlk.png`, credit: 'SPC / NOAA' },
    {
      url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Supercell_over_Wyoming_USA.jpg?width=1280',
      credit: 'Wikimedia Commons',
    },
  ],
  'severe thunderstorm': [
    { url: GOES_CONUS_IR, credit: 'NOAA GOES-16 Infrared' },
    { url: GOES_CONUS_IR14, credit: 'NOAA GOES-16 IR Longwave' },
    { url: GOES_CONUS_GEO, credit: 'NOAA GOES-16 GeoColor' },
  ],
  'flash flood': [
    { url: GOES_CONUS_WV, credit: 'NOAA GOES-16 Water Vapor' },
    { url: GOES_CONUS_GEO, credit: 'NOAA GOES-16 GeoColor' },
    { url: GOES_FD_GEO, credit: 'NOAA GOES-16 Full Disk' },
  ],
  flood: [
    { url: GOES_CONUS_WV, credit: 'NOAA GOES-16 Water Vapor' },
    { url: GOES_CONUS_GEO, credit: 'NOAA GOES-16 GeoColor' },
    { url: `${SPC_OUTLOOK}/day2otlk.png`, credit: 'SPC / NOAA' },
  ],
  'red flag': [
    { url: GOES_FD_GEO, credit: 'NOAA GOES-16 Full Disk' },
    { url: GOES_CONUS_GEO, credit: 'NOAA GOES-16 GeoColor' },
    { url: GOES_CONUS_WV, credit: 'NOAA GOES-16 Water Vapor' },
  ],
  marine: [
    { url: GOES_FD_GEO, credit: 'NOAA GOES-16 Full Disk' },
    { url: GOES_CONUS_GEO, credit: 'NOAA GOES-16 GeoColor' },
    { url: GOES_CONUS_WV, credit: 'NOAA GOES-16 Water Vapor' },
  ],
  winter: [
    { url: GOES_CONUS_IR14, credit: 'NOAA GOES-16 IR Longwave' },
    { url: GOES_CONUS_WV, credit: 'NOAA GOES-16 Water Vapor' },
    { url: GOES_CONUS_GEO, credit: 'NOAA GOES-16 GeoColor' },
  ],
};

function normalizeAlertEvent(title: string, event?: string): string {
  const text = (event ?? title).toLowerCase();
  if (text.includes('tornado')) return 'tornado';
  if (text.includes('severe thunderstorm')) return 'severe thunderstorm';
  if (text.includes('flash flood')) return 'flash flood';
  if (text.includes('flood')) return 'flood';
  if (text.includes('red flag') || text.includes('fire weather')) return 'red flag';
  if (text.includes('marine')) return 'marine';
  if (text.includes('blizzard') || text.includes('winter storm') || text.includes('ice storm')) {
    return 'winter';
  }
  return 'other';
}

export function pickSevereStockImage(title: string, sourceId?: string): StockImage {
  const lower = title.toLowerCase();

  if (sourceId === 'spc-outlooks' || lower.includes('convective outlook')) {
    if (lower.includes('day 1') || lower.includes('day1')) {
      return { url: `${SPC_OUTLOOK}/day1otlk.png`, credit: 'SPC / NOAA' };
    }
    if (lower.includes('day 2') || lower.includes('day2')) {
      return { url: `${SPC_OUTLOOK}/day2otlk.png`, credit: 'SPC / NOAA' };
    }
    if (lower.includes('day 3') || lower.includes('day3')) {
      return { url: `${SPC_OUTLOOK}/day3otlk.png`, credit: 'SPC / NOAA' };
    }
  }

  const alertType = normalizeAlertEvent(title);
  const variants = ALERT_TYPE_VARIANTS[alertType];
  if (variants) {
    return variants[hashSeed(title) % variants.length];
  }

  const idx = hashSeed(`${sourceId ?? 'severe'}:${title}`) % SEVERE_STOCK_POOL.length;
  return SEVERE_STOCK_POOL[idx];
}

/** Map NWS CAP alert titles to hazard-appropriate satellite or outlook imagery. */
export function resolveNwsAlertImage(item: { title: string; event?: string }): string {
  return pickSevereStockImage(item.title, 'nws-alerts').url;
}
