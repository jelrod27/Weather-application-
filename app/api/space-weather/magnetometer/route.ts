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
  /** NOAA sets this when the spacecraft's own thrusters contaminated the sample. */
  arcjet_flag?: boolean;
}

export const GET = swpcSeriesRoute<RawMagnetometerRow, MagnetometerEntry>({
  context: 'Magnetometer',
  url: 'https://services.swpc.noaa.gov/json/goes/primary/magnetometers-1-day.json',
  source: SWPC_GOES_SOURCE,
  errorMessage: 'Failed to fetch magnetometer data',
  toPoint: (row) => {
    // Drop arcjet-contaminated samples. A thruster firing deflects the
    // magnetometer by several nT — a live day carried 74 flagged rows out of
    // 1439, the worst sitting 10.3 nT off its nearest clean neighbour against a
    // 40.8-144.8 nT range — and NOAA sets the flag precisely so consumers drop
    // them. Plotted, they read as geomagnetic activity that never happened,
    // which only started mattering once the Hp chart rendered at all.
    if (row.arcjet_flag) return null;

    const hp = finiteRounded(row.Hp);
    return hp === null ? null : { time: row.time_tag, hp };
  },
});
