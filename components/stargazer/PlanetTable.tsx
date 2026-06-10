'use client';

import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils';
import type { PlanetVisibility } from '@/lib/stargazer/types';
import { formatTime } from '@/lib/stargazer/format';

interface PlanetTableProps {
  planets: PlanetVisibility[];
}

export default function PlanetTable({ planets }: PlanetTableProps) {
  const { theme } = useTheme();
  const styles = getComponentStyles((theme || 'nord') as ThemeType, 'card');

  if (!planets || planets.length === 0) return null;

  return (
    <div
      className={cn(
        'container-primary p-4 font-mono',
        styles
      )}
    >
      <h2 className="border-b border-subtle py-3 mb-3 text-xs font-mono uppercase text-muted-foreground">
        Planet Visibility
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-subtle">
              <th className="px-2 py-1 text-left uppercase tracking-wider text-muted-foreground">
                Planet
              </th>
              <th className="px-2 py-1 text-left uppercase tracking-wider text-muted-foreground">
                Rise
              </th>
              <th className="px-2 py-1 text-left uppercase tracking-wider text-muted-foreground">
                Set
              </th>
              <th className="px-2 py-1 text-left uppercase tracking-wider text-muted-foreground">
                Peak Alt
              </th>
              <th className="px-2 py-1 text-left uppercase tracking-wider text-muted-foreground">
                Peak Time
              </th>
              <th className="px-2 py-1 text-left uppercase tracking-wider text-muted-foreground">
                Mag
              </th>
              <th className="px-2 py-1 text-left uppercase tracking-wider text-muted-foreground">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {planets.map((planet) => (
              <tr
                key={planet.name}
                className="border-b border-subtle"
              >
                <td className="px-2 py-1 font-bold text-cyan-400">
                  {planet.name}
                </td>
                <td className="px-2 py-1 font-mono">
                  {formatTime(planet.rise)}
                </td>
                <td className="px-2 py-1 font-mono">
                  {formatTime(planet.set)}
                </td>
                <td className="px-2 py-1 font-mono">
                  {Math.round(planet.peakAltitude)}&deg;
                </td>
                <td className="px-2 py-1 font-mono">
                  {formatTime(planet.peakTime)}
                </td>
                <td className="px-2 py-1 font-mono">
                  {planet.magnitude.toFixed(1)}
                </td>
                <td className="px-2 py-1 text-muted-foreground">
                  {planet.notes || '--'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
