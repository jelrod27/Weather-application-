/**
 * Photorealistic fallback imagery per hazard category when a story has no
 * feed or OG image. All URLs are stable, keyless, and allow-listed for CSP.
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

export function getCategoryStockImage(category: FeedCategory): StockImage {
  return CATEGORY_STOCK_IMAGES[category];
}
