'use client'

import { cn } from '@/lib/utils'
import { useSPCDay1Summary } from '@/hooks/use-spc-day1-summary'

export default function SPCDay1RiskStrip() {
  const { label, fill, issue, loading } = useSPCDay1Summary()

  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4',
        'bg-card/60 border-border font-mono text-sm'
      )}
    >
      <div className="flex items-center gap-2 shrink-0">
        <span
          className="inline-block w-3 h-3 rounded-sm border border-border shrink-0"
          style={{ backgroundColor: fill }}
          aria-hidden
        />
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          SPC Day 1 convective
        </span>
      </div>
      <div className="flex-1 min-w-0">
        {loading ? (
          <p className="text-muted-foreground animate-pulse">Loading outlook…</p>
        ) : (
          <p className="font-bold truncate">{label}</p>
        )}
        {issue && !loading && (
          <p className="text-xs text-muted-foreground truncate">Issued / valid: {issue}</p>
        )}
      </div>
      <a
        href="/severe"
        className="text-xs font-semibold underline text-primary shrink-0 self-start sm:self-center"
      >
        Open SPC maps
      </a>
    </div>
  )
}
