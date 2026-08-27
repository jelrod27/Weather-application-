'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import { catalogObjectAltAz } from '@/lib/stargazer/astronomy';

interface TonightVisibilityProps {
  ra: number;
  dec: number;
  objectName: string;
}

function azimuthToCompass(az: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(az / 22.5) % 16];
}

// Default to NYC if geolocation unavailable
const DEFAULT_LAT = 40.7128;
const DEFAULT_LON = -74.006;

export default function TonightVisibility({ ra, dec, objectName }: TonightVisibilityProps) {
  const styles = themeTokens.card;
  const [position, setPosition] = useState<{ altitude: number; azimuth: number } | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => setCoords({ lat: DEFAULT_LAT, lon: DEFAULT_LON }),
        { timeout: 5000 }
      );
    } else {
      setCoords({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
    }
  }, []);

  useEffect(() => {
    if (!coords) return;

    function update() {
      const pos = catalogObjectAltAz(ra, dec, coords!.lat, coords!.lon, new Date());
      setPosition(pos);
    }

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [coords, ra, dec]);

  if (!position) return null;

  const isAboveHorizon = position.altitude > 0;
  const altColor = isAboveHorizon ? 'text-green-500' : 'text-red-500';

  return (
    <div className={cn('container-primary p-4 font-mono', styles)}>
      <h2 className="border-b border-subtle pb-2 mb-3 text-xs uppercase tracking-wider text-muted-foreground">
        Tonight&apos;s Visibility (for your location)
      </h2>
      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <div>
          <p className="text-muted-foreground">Status</p>
          <p className={cn('font-bold', altColor)}>
            {isAboveHorizon ? 'Above horizon' : 'Below horizon'}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Altitude</p>
          <p className={cn('font-bold', altColor)}>
            {position.altitude.toFixed(1)}&deg;
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Azimuth</p>
          <p className="font-bold">
            {position.azimuth.toFixed(1)}&deg; {azimuthToCompass(position.azimuth)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Direction</p>
          <p className="font-bold">{azimuthToCompass(position.azimuth)}</p>
        </div>
      </div>
    </div>
  );
}
