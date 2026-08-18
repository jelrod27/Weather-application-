'use client'

import Link from 'next/link'
import WarningPinSearch from '@/components/warnings/warning-pin-search'
import { GuestAlertSignup } from '@/components/alerts/guest-alert-signup'
import { useActivePinState } from '@/hooks/use-active-pin'

export default function AlertsLanding() {
  const { pin, label, isResolving } = useActivePinState()

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8" data-testid="bitwatch-landing">
      <header className="space-y-3 font-mono">
        <p className="text-xs uppercase tracking-[0.25em] text-primary">Bitwatch</p>
        <h1 className="text-3xl font-bold uppercase">Free NWS warning alerts</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Email and optional browser push when a National Weather Service Tornado, Severe Thunderstorm,
          or Flash Flood Warning covers your pin. No account. Supplemental only — this does not replace
          Wireless Emergency Alerts, NOAA Weather Radio, or local officials.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-mono text-sm uppercase tracking-wider">Protected Place</h2>
        <WarningPinSearch label={label} />
        <p className="text-xs font-mono text-muted-foreground">
          {isResolving
            ? 'Resolving pin…'
            : pin
              ? `Watching ${pin.label} (${pin.lat.toFixed(3)}, ${pin.lon.toFixed(3)})`
              : 'Search a city or tap Use my location. GPS here only places the pin — it is not unofficial storm detection.'}
        </p>
      </section>

      <GuestAlertSignup pin={pin} />

      <p className="text-xs font-mono text-muted-foreground">
        After you confirm the email, you can enable browser alerts from the manage link. Warning
        emails include manage and unsubscribe. Cancellation or expiry is not an all-clear.{' '}
        <Link href="/warnings" className="underline text-primary">
          Open the warning desk
        </Link>
        .
      </p>
    </div>
  )
}
