/**
 * 16-Bit Weather Platform - Proton Flux API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Fetches GOES integral proton flux (>= 10 MeV) from NOAA SWPC
 */

import { swpcSeriesRoute, SWPC_GOES_SOURCE } from '@/lib/space-weather/series-route';

export interface ProtonFluxEntry {
  time: string;
  flux: number;
}

interface RawProtonFluxRow {
  time_tag: string;
  satellite: string;
  flux: number;
  energy: string;
}

export const GET = swpcSeriesRoute<RawProtonFluxRow, ProtonFluxEntry>({
  context: 'Proton Flux',
  url: 'https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json',
  source: SWPC_GOES_SOURCE,
  errorMessage: 'Failed to fetch proton flux data',
  toPoint: (row) => {
    // Exactly the >=10 MeV channel. SWPC's integral channels are cumulative and
    // share time_tags, so accepting every channel at or above 10 (>=50, >=100…)
    // interleaves several series into one array with duplicate timestamps.
    const energy = parseEnergyMev(row.energy);
    if (energy !== 10) return null;

    const flux = row.flux;
    if (flux == null || Number.isNaN(flux)) return null;

    return { time: row.time_tag, flux };
  },
});

/**
 * SWPC labels these channels with a comparator, e.g. ">=10 MeV". A bare
 * parseFloat on that string returns NaN, which dropped every row — so the
 * comparator is stripped before parsing. Plain numeric strings parse exactly
 * as they did before; this only stops discarding rows that were meant to be
 * kept.
 */
function parseEnergyMev(energy: string): number | null {
  const value = parseFloat(String(energy).replace(/^[^\d.+-]*/, ''));
  return Number.isNaN(value) ? null : value;
}
