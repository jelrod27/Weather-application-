'use client';

import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import type { ISSPass } from '@/lib/stargazer/types';
import { formatTime, formatDate } from '@/lib/stargazer/format';

interface ISSPassesProps {
  passes: ISSPass[];
}

export default function ISSPasses({ passes }: ISSPassesProps) {
  const styles = themeTokens.card;

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

      {!passes || passes.length === 0 ? (
        <p className="text-xs font-mono">
          No visible ISS passes in the next few days.
        </p>
      ) : (
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
                    {formatDate(pass.date)}
                  </td>
                  <td className="px-2 py-1 font-mono">
                    {formatTime(pass.riseTime)}
                  </td>
                  <td className="px-2 py-1 text-muted-foreground">
                    {pass.riseDirection}
                  </td>
                  <td className="px-2 py-1 font-bold text-cyan-400">
                    {Math.round(pass.maxElevation)}&deg;
                  </td>
                  <td className="px-2 py-1 font-mono">
                    {formatTime(pass.maxTime)}
                  </td>
                  <td className="px-2 py-1 text-muted-foreground">
                    {pass.setDirection}
                  </td>
                  <td className="px-2 py-1 font-mono">
                    {formatTime(pass.setTime)}
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
