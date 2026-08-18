'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PushOptIn } from '@/components/alerts/push-opt-in'

type Prefs = {
  locationLabel: string
  enabled: boolean
  notifyTornado: boolean
  notifySevereThunderstorm: boolean
  notifyFlashFlood: boolean
  notifyUpgrades: boolean
}

export default function AlertManageClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const verified = searchParams.get('verified') === '1'
  const [status, setStatus] = useState<string | null>(
    verified ? 'Email confirmed. Enable browser alerts below if you want push on this device.' : null,
  )
  const [busy, setBusy] = useState(false)
  const [prefs, setPrefs] = useState<Prefs | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetch(`/api/alerts/guest-manage?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = (await res.json()) as { error?: string; subscriber?: Prefs }
        if (!res.ok) throw new Error(data.error ?? 'Could not load pin')
        if (!cancelled && data.subscriber) setPrefs(data.subscriber)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : 'Could not load pin')
        }
      })
    return () => {
      cancelled = true
    }
  }, [token])

  async function act(
    action: 'pause' | 'resume' | 'delete' | 'prefs',
    nextPrefs?: Omit<Prefs, 'locationLabel' | 'enabled'>,
  ) {
    if (!token) return
    setBusy(true)
    try {
      const res = await fetch('/api/alerts/guest-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action, ...nextPrefs }),
      })
      const data = (await res.json()) as { error?: string; status?: string }
      if (!res.ok) throw new Error(data.error ?? 'Update failed')
      setStatus(data.status ?? 'updated')
      if (action === 'prefs' && nextPrefs) {
        setPrefs((current) => (current ? { ...current, ...nextPrefs } : current))
      }
      if (action === 'pause') setPrefs((current) => (current ? { ...current, enabled: false } : current))
      if (action === 'resume') setPrefs((current) => (current ? { ...current, enabled: true } : current))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-muted-foreground">
        Missing manage token.{' '}
        <Link href="/alerts" className="underline text-primary">
          Bitwatch signup
        </Link>
      </p>
    )
  }

  return (
    <div className="space-y-4 font-mono text-sm">
      <p className="text-muted-foreground">
        Bitwatch covers Tornado, Flash Flood, and Severe Thunderstorm warnings on your pin, plus
        optional upgrades. When a warning ends or no longer covers the pin, that is not an all-clear.
      </p>
      {prefs ? (
        <p className="text-xs text-muted-foreground">
          Pin: {prefs.locationLabel} · {prefs.enabled ? 'active' : 'paused'}
        </p>
      ) : null}
      <fieldset className="space-y-1 text-xs">
        <legend className="uppercase text-muted-foreground mb-1">Hazards</legend>
        {(
          [
            ['notifyTornado', 'Tornado Warning'],
            ['notifySevereThunderstorm', 'Severe Thunderstorm Warning'],
            ['notifyFlashFlood', 'Flash Flood Warning'],
            ['notifyUpgrades', 'Upgrade follow-ups'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2">
            <input
              type="checkbox"
              disabled={!prefs || busy}
              checked={prefs?.[key] ?? true}
              onChange={(event) => {
                if (!prefs) return
                const next = { ...prefs, [key]: event.target.checked }
                void act('prefs', {
                  notifyTornado: next.notifyTornado,
                  notifySevereThunderstorm: next.notifySevereThunderstorm,
                  notifyFlashFlood: next.notifyFlashFlood,
                  notifyUpgrades: next.notifyUpgrades,
                })
              }}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={busy} onClick={() => void act('pause')}>
          Pause
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void act('resume')}>
          Resume
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void act('delete')}>
          Delete pin
        </Button>
      </div>
      {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
      <PushOptIn guestToken={token} />
      <Link href="/alerts" className="underline text-primary text-xs">
        Back to Bitwatch
      </Link>
    </div>
  )
}
