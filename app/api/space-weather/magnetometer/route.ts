/**
 * 16-Bit Weather Platform - Magnetometer API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Fetches GOES magnetometer data (Hp parallel component) from NOAA SWPC
 */

import {
  finiteRounded,
  swpcSeriesRoute,
  SWPC_GOES_SOURCE,
} from '@/lib/space-weather/series-route';

export interface MagnetometerEntry {
  time: string;
  hp: number;
}

interface RawMagnetometerRow {
  time_tag: string;
  satellite: string;
  He: number;
  Hp: number;
  Hn: number;
  total: number;
}

export const GET = swpcSeriesRoute<RawMagnetometerRow, MagnetometerEntry>({
  context: 'Magnetometer',
  url: 'https://services.swpc.noaa.gov/json/goes/primary/magnetometers-1-day.json',
  source: SWPC_GOES_SOURCE,
  errorMessage: 'Failed to fetch magnetometer data',
  toPoint: (row) => {
    const hp = finiteRounded(row.Hp);
    return hp === null ? null : { time: row.time_tag, hp };
  },
});
