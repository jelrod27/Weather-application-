'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ParsedUserAlert } from '@/lib/services/user-alerts-utils'

const POLL_INTERVAL_MS = 60_000

function tierClass(tier?: ParsedUserAlert['tier']): string {
  switch (tier) {
    case 'critical':
      return 'text-red-400'
    case 'high':
      return 'text-orange-300'
    default:
      return 'text-foreground'
  }
}

export default function AlertBell() {
  const { user, isInitialized } = useAuth()
  const [open, setOpen] = useState(false)
  const [alerts, setAlerts] = useState<ParsedUserAlert[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchAlerts = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetch('/api/user/alerts?limit=12')
      if (!res.ok) return
      const data = (await res.json()) as { alerts: ParsedUserAlert[]; unreadCount: number }
      setAlerts(data.alerts ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch (error) {
      console.error('[alert-bell] fetch failed', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setAlerts([])
      setUnreadCount(0)
      return
    }
    fetchAlerts()
    const interval = setInterval(fetchAlerts, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [user, fetchAlerts])

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.alert-bell-container')) setOpen(false)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [open])

  async function markRead(ids: string[]) {
    await fetch('/api/user/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    await fetchAlerts()
  }

  if (!isInitialized || !user) return null

  return (
    <div className="relative alert-bell-container">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="relative"
        aria-label={unreadCount > 0 ? `${unreadCount} unread weather alerts` : 'Weather alerts'}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((prev) => !prev)
        }}
      >
        <Bell className="w-4 h-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] rounded-lg border border-border bg-background/95 backdrop-blur-lg shadow-xl z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <p className="text-xs font-mono font-bold uppercase tracking-widest">Weather alerts</p>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-xs font-mono text-primary underline"
                onClick={() => markRead(alerts.filter((a) => !a.readAt).map((a) => a.id))}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && alerts.length === 0 ? (
              <p className="px-3 py-4 text-xs font-mono text-muted-foreground animate-pulse">
                Loading alerts…
              </p>
            ) : alerts.length === 0 ? (
              <p className="px-3 py-4 text-xs font-mono text-muted-foreground">
                No alerts yet. Enable notifications in Dashboard preferences for saved locations.
              </p>
            ) : (
              alerts.map((alert) => (
                <Link
                  key={alert.id}
                  href={alert.href}
                  className={cn(
                    'block px-3 py-2.5 border-b border-border/60 hover:bg-muted/60 transition-colors',
                    !alert.readAt && 'bg-muted/30',
                  )}
                  onClick={() => {
                    if (!alert.readAt) void markRead([alert.id])
                    setOpen(false)
                  }}
                >
                  <p className={cn('text-sm font-semibold font-mono truncate', tierClass(alert.tier))}>
                    {alert.title}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground line-clamp-2">{alert.summary}</p>
                </Link>
              ))
            )}
          </div>

          <div className="px-3 py-2 border-t border-border">
            <Link
              href="/warnings"
              className="text-xs font-mono text-primary underline"
              onClick={() => setOpen(false)}
            >
              Open warnings command center
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
