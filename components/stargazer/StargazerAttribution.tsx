'use client';

import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils';

export default function StargazerAttribution() {
  const { theme } = useTheme();
  const styles = getComponentStyles((theme || 'nord') as ThemeType, 'card');

  const attributions = [
    'Weather data by Open-Meteo.com (CC BY 4.0)',
    'Astronomical seeing and transparency data from 7Timer.info',
    'Space weather (Kp index) from NOAA SWPC',
    'Celestial calculations powered by Astronomy Engine',
    'Launch data from The Space Devs',
    'Satellite tracking data from CelesTrak',
  ];

  return (
    <div
      className={cn(
        'container-primary p-3 font-mono',
        styles
      )}
    >
      <h3 className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        Data Sources
      </h3>
      <ul className="space-y-1">
        {attributions.map((text, i) => (
          <li
            key={i}
            className="text-[10px] text-muted-foreground"
          >
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}
