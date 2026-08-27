'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Palette, Siren, Settings } from 'lucide-react'
import Navigation from '@/components/navigation'
import AuthGateModal from '@/components/auth/auth-gate-modal'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { themeTokens } from '@/lib/theme-tokens'

const FEATURES = [
  {
    icon: MapPin,
    title: 'Saved Locations',
    description: 'Pin your cities and see current conditions for all of them at a glance.',
  },
  {
    icon: Siren,
    title: 'Severe Weather Alerts',
    description: 'Get notified when watches and warnings are issued for your saved locations.',
  },
  {
    icon: Palette,
    title: 'All Six Themes',
    description: 'Unlock every retro terminal theme and keep your pick across devices.',
  },
  {
    icon: Settings,
    title: 'Preferences',
    description: 'Units, forecast defaults, and dashboard layout — saved to your account.',
  },
] as const

/**
 * Logged-out view of /dashboard. Shows what the dashboard offers instead of
 * bouncing anonymous visitors to the auth page.
 */
export default function DashboardPreview() {
  const themeClasses = themeTokens.dashboard
  const [gateOpen, setGateOpen] = useState(false)

  return (
    <div className={`min-h-screen ${themeClasses.background}`}>
      <Navigation />

      <div className="container mx-auto px-4 py-8 space-y-8" data-testid="dashboard-preview">
        <header className="text-center">
          <h1
            className={`text-3xl font-bold uppercase tracking-wider font-mono mb-3 ${themeClasses.text} ${themeClasses.glow}`}
            style={{ fontFamily: 'monospace', fontSize: 'clamp(24px, 5vw, 40px)' }}
          >
            Weather Dashboard
          </h1>
          <p className={`text-base font-mono ${themeClasses.secondary || themeClasses.text} max-w-2xl mx-auto`}>
            Your cities, your themes, your alerts — sign in to set it up in under a minute.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <Card
              key={title}
              className={`${themeClasses.background} border-2 ${themeClasses.borderColor}`}
            >
              <CardHeader>
                <CardTitle
                  className={`font-mono font-bold text-base uppercase tracking-wider ${themeClasses.text}`}
                >
                  <Icon className="w-4 h-4 inline mr-2" aria-hidden="true" />
                  {title}
                </CardTitle>
                <CardDescription className={`font-mono ${themeClasses.mutedText}`}>
                  {description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3">
          <Button
            onClick={() => setGateOpen(true)}
            data-testid="dashboard-preview-signin"
            className="font-mono font-bold uppercase tracking-wider h-12 px-8"
          >
            Sign In to Get Started
          </Button>
          <Link
            href="/auth?next=%2Fdashboard"
            className={`text-xs font-mono hover:underline ${themeClasses.mutedText}`}
          >
            All sign-in options
          </Link>
        </div>
      </div>

      <AuthGateModal
        open={gateOpen}
        onOpenChange={setGateOpen}
        title="Set up your dashboard"
        description="One account for saved locations, themes, and severe weather alerts."
        next="/dashboard"
      />
    </div>
  )
}
