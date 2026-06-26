/**
 * Photorealistic fallback imagery per hazard category when a story has no
 * feed or OG image. Volcano items rotate through a pool keyed by volcano name
 * so concurrent alerts do not all show the same St. Helens photo.
 */
import type { FeedCategory } from '@/lib/services/rss/feedSources';

export interface StockImage {
  url: string;
  credit: string;
}

export const CATEGORY_STOCK_IMAGES: Record<FeedCategory, StockImage> = {
  severe: {
    url: 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS/GEOCOLOR/1250x750.jpg',
    credit: 'NOAA GOES-16 GeoColor',
  },
  hurricanes: {
    url: 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS/GEOCOLOR/1250x750.jpg',
    credit: 'NOAA GOES-16 GeoColor',
  },
  earthquakes: {
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/1906_San_Francisco_earthquake.jpg?width=1280',
    credit: 'USGS / Wikimedia Commons',
  },
  volcanoes: {
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/MSH80_eruption_mount_st_helens_05-18-80.jpg?width=1280',
    credit: 'USGS / Wikimedia Commons',
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

/** Diverse PD volcano photography — index chosen by volcano name hash. */
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

/** Well-known volcanoes get a distinctive photo instead of a hash collision. */
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
  'great sitkin': {
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pinatubo91eruption_clark_air_base.jpg?width=1280',
    credit: 'USGS',
  },
  kupreanof: {
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mount_Tambora_Volcano,_Sumbawa_Island,_Indonesia.jpg?width=1280',
    credit: 'NASA Earth Observatory',
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

export function pickVolcanoStockImage(locationOrId: string): StockImage {
  const key = normalizeVolcanoKey(locationOrId);
  const named = NAMED_VOLCANO_IMAGES[key];
  if (named) return named;

  const idx = hashSeed(key) % VOLCANO_STOCK_POOL.length;
  return VOLCANO_STOCK_POOL[idx];
}

export function getCategoryStockImage(category: FeedCategory): StockImage {
  return CATEGORY_STOCK_IMAGES[category];
}

/** Pick stock art; volcano category uses name-based variety. */
export function pickCategoryStockImage(category: FeedCategory, seed: string): StockImage {
  if (category === 'volcanoes') return pickVolcanoStockImage(seed);
  return CATEGORY_STOCK_IMAGES[category];
}
