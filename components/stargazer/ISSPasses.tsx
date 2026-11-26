'use client';

import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import { formatTime, formatDate } from '@/lib/stargazer/format';
import { useStargazerSupplement } from '@/hooks/useStargazerSupplement';
import type { ISSPass } from '@/lib/stargazer/types';
import type { StargazerCoordinates } from '@/lib/stargazer/context';

interface ISSPassesProps {
  timeZone?: string;
  coordinates: StargazerCoordinates;
}

export default function ISSPasses({ timeZone = 'UTC', coordinates }: ISSPassesProps) {
  const styles = themeTokens.card;
  const params = new URLSearchParams({ lat: String(coordinates.lat), lon: String(coordinates.lon) });
  const { result, retry } = useStargazerSupplement<ISSPass>(`/api/stargazer/iss?${params}`);
  const passes = result.status === 'ready' ? result.items : [];

  return (
    <div
      className={cn(
        'container-primary p-4 font-mono',
        styles
      )}
    >
      <h2 className="border-b border-subtle py-3 mb-3 text-xs font-mono uppercase text-muted-foreground">
        ISS Passes
      </h2>

      {result.status === 'loading' && <p role="status" className="text-xs">Loading ISS passes…</p>}
      {result.status === 'unavailable' && <div className="space-y-2 text-xs">
        <p role="status">ISS pass data unavailable.</p>
        <button type="button" className="text-primary underline" onClick={retry}>Retry ISS passes</button>
      </div>}
      {result.status === 'ready' && passes.length === 0 && <p className="text-xs">No visible ISS passes calculated in the next few days.</p>}
      {passes.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-subtle">
                <th className="px-2 py-1 text-left uppercase tracking-wider text-muted-foreground">
                  Date
                </th>
                <th className="px-2 py-1 text-left uppercase tracking-wider text-muted-foreground">
                  Rise
                </th>
                <th className="px-2 py-1 text-left uppercase tracking-wider text-muted-foreground">
                  Dir
                </th>
                <th className="px-2 py-1 text-left uppercase tracking-wider text-muted-foreground">
                  Max Elev
                </th>
                <th className="px-2 py-1 text-left uppercase tracking-wider text-muted-foreground">
                  Max Time
                </th>
                <th className="px-2 py-1 text-left uppercase tracking-wider text-muted-foreground">
                  Set Dir
                </th>
                <th className="px-2 py-1 text-left uppercase tracking-wider text-muted-foreground">
                  Set
                </th>
                <th className="px-2 py-1 text-left uppercase tracking-wider text-muted-foreground">
                  Bright
                </th>
              </tr>
            </thead>
            <tbody>
              {passes.map((pass, i) => (
                <tr
                  key={i}
                  className="border-b border-subtle"
                >
                  <td className="px-2 py-1 font-mono">
                    {formatDate(pass.date, timeZone)}
                  </td>
                  <td className="px-2 py-1 font-mono">
                    {formatTime(pass.riseTime, timeZone)}
                  </td>
                  <td className="px-2 py-1 text-muted-foreground">
                    {pass.riseDirection}
                  </td>
                  <td className="px-2 py-1 font-bold text-cyan-400">
                    {Math.round(pass.maxElevation)}&deg;
                  </td>
                  <td className="px-2 py-1 font-mono">
                    {formatTime(pass.maxTime, timeZone)}
                  </td>
                  <td className="px-2 py-1 text-muted-foreground">
                    {pass.setDirection}
                  </td>
                  <td className="px-2 py-1 font-mono">
                    {formatTime(pass.setTime, timeZone)}
                  </td>
                  <td className="px-2 py-1 font-mono">
                    {pass.brightness.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
