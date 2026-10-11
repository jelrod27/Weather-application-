/**
 * Fallback imagery when a story has no feed / OG / provenance-bound product.
 *
 * Image honesty (hazard spine):
 * - Earthquakes: never use place-specific historical stock. Prefer USGS
 *   ShakeMap; otherwise leave imageless for a data-forward card.
 * - Volcanoes: only named peaks with a photo of that peak; no hash pool of
 *   unrelated eruptions standing in for Aleutian alerts.
 * - Severe / tropical: no stock; use verified products or Hazard Illustrations.
 * - Science / climate / space: clearly labeled illustrative references.
 */
import type { FeedCategory } from '@/lib/services/rss/feedSources';

export interface StockImage {
  url: string;
  credit: string;
}

/** Editorial / live-product stock only. Hazards omitted on purpose. */
export const CATEGORY_STOCK_IMAGES: Partial<Record<FeedCategory, StockImage>> = {
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
): StockImage | undefined {
  if (category === 'earthquakes') return undefined;
  if (category === 'volcanoes') return pickVolcanoStockImage(seed);
  if (category === 'hurricanes' || category === 'severe') return undefined;
  return CATEGORY_STOCK_IMAGES[category];
}

