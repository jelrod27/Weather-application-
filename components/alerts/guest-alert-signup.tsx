'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ActivePin } from '@/hooks/use-active-pin'

export function GuestAlertSignup({ pin }: { pin: ActivePin | null }) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!pin) return
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch('/api/alerts/guest-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          lat: pin.lat,
          lon: pin.lon,
          locationLabel: pin.label,
        }),
      })
      const data = (await res.json()) as { error?: string; message?: string }
      if (!res.ok) throw new Error(data.error ?? 'Subscribe failed')
      setMessage(data.message ?? 'Check your email.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Subscribe failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-border bg-card/50 p-4 space-y-3 font-mono text-sm"
    >
      <h3 className="font-bold uppercase tracking-wider text-base">Email alerts, no account</h3>
      <p className="text-xs text-muted-foreground">
        Tornado, flash flood, and severe thunderstorm warnings that cover this pin. Issuance only.
        Confirm the address with a magic link.
      </p>
      {!pin ? (
        <p className="text-xs text-muted-foreground">Set a location first so we know which pin to watch.</p>
      ) : (
        <p className="text-xs text-muted-foreground">Pin: {pin.label}</p>
      )}
      <label className="text-xs uppercase text-muted-foreground block">
        Email
        <Input
          type="email"
          required
          className="mt-1 font-mono"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={!pin || busy}
        />
      </label>
      <Button type="submit" disabled={!pin || busy} className="font-mono">
        {busy ? 'Sending…' : 'Send confirmation'}
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </form>
  )
}
