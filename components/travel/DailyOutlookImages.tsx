'use client';

import React from 'react';
import { TRIP_DAY_LABELS } from './trip-types';
import type { TripDay } from './trip-types';

const WPC_BASE = 'https://www.wpc.ncep.noaa.gov/noaa';

interface DailyOutlookImagesProps {
  day: TripDay;
}

export default function DailyOutlookImages({ day }: DailyOutlookImagesProps): React.JSX.Element {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-bold">National forecast chart · {TRIP_DAY_LABELS[day]}</h3>
        <span className="text-xs text-muted-foreground">NOAA Weather Prediction Center</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={day}
          src={`${WPC_BASE}/noaad${day + 1}.gif`}
          alt={`WPC Day ${day + 1} Forecast Chart`}
          className="h-auto w-full"
          loading="lazy"
        />
      </div>
    </div>
  );
}
