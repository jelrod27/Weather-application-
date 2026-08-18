'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import TurnstileWidget, { isTurnstileEnabled } from '@/components/auth/turnstile-widget'
import type { ActivePin } from '@/hooks/use-active-pin'

export function GuestAlertSignup({ pin }: { pin: ActivePin | null }) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [notifyTornado, setNotifyTornado] = useState(true)
  const [notifySevereThunderstorm, setNotifySevereThunderstorm] = useState(true)
  const [notifyFlashFlood, setNotifyFlashFlood] = useState(true)
  const [notifyUpgrades, setNotifyUpgrades] = useState(true)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!pin) return
    if (isTurnstileEnabled() && !captchaToken) {
      setMessage('Complete the security check first.')
      return
    }
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
          turnstileToken: captchaToken ?? undefined,
          notifyTornado,
          notifySevereThunderstorm,
          notifyFlashFlood,
          notifyUpgrades,
        }),
      })
      const data = (await res.json()) as { error?: string; message?: string }
      if (!res.ok) throw new Error(data.error ?? 'Subscribe failed')
      setMessage(data.message ?? 'Check your email.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Subscribe failed')
    } finally {
      setCaptchaToken(null)
      setCaptchaResetKey((key) => key + 1)
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      data-testid="bitwatch-signup"
      className="rounded-lg border border-border bg-card/50 p-4 space-y-3 font-mono text-sm"
    >
      <h3 className="font-bold uppercase tracking-wider text-base">Bitwatch email, no account</h3>
      <p className="text-xs text-muted-foreground">
        US NWS Tornado, Severe Thunderstorm, and Flash Flood warnings whose polygon covers this pin.
        We also send upgrades (observed / PDS / IBW) and an ended notice that is not an all-clear.
      </p>
      {!pin ? (
        <p className="text-xs text-muted-foreground">Set a pin so we know which location to watch.</p>
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
      <fieldset className="space-y-1 text-xs">
        <legend className="uppercase text-muted-foreground mb-1">Hazards</legend>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={notifyTornado}
            onChange={(e) => setNotifyTornado(e.target.checked)}
          />
          Tornado Warning
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={notifySevereThunderstorm}
            onChange={(e) => setNotifySevereThunderstorm(e.target.checked)}
          />
          Severe Thunderstorm Warning
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={notifyFlashFlood}
            onChange={(e) => setNotifyFlashFlood(e.target.checked)}
          />
          Flash Flood Warning
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={notifyUpgrades}
            onChange={(e) => setNotifyUpgrades(e.target.checked)}
          />
          Upgrade follow-ups (observed, PDS, considerable/destructive)
        </label>
      </fieldset>
      <TurnstileWidget onToken={setCaptchaToken} resetKey={captchaResetKey} />
      <Button
        type="submit"
        disabled={!pin || busy || (isTurnstileEnabled() && !captchaToken)}
        className="font-mono"
      >
        {busy ? 'Sending…' : 'Send confirmation'}
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </form>
  )
}
