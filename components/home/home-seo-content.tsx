import Link from 'next/link'

/**
 * Server-rendered crawlable intro for the homepage. The hub, search box, and
 * live weather card above it are all client-only, so this section is what
 * explains the site to a crawler that never runs the JavaScript.
 *
 * Uses h2/h3 only — the document h1 lives on the home page itself.
 */
export default function HomeSeoContent() {
  return (
    <section
      aria-labelledby="home-about-heading"
      className="border-t border-border/40 bg-black/20 py-10"
      data-testid="home-seo-content"
    >
      <div className="mx-auto max-w-3xl px-4 font-mono text-sm leading-relaxed text-muted-foreground">
        <h2
          id="home-about-heading"
          className="mb-4 text-xl font-bold uppercase tracking-wide text-primary"
        >
          What is 16 Bit Weather?
        </h2>
        <p className="mb-4 text-foreground">
          16 Bit Weather is a retro terminal for real meteorology — a command center that puts live
          data and the science behind it on the same screen. Search any city for a free Open-Meteo
          forecast with current conditions, hourly detail, a seven-day outlook, air quality, pollen,
          and UV. No API key, no account, no paywall.
        </p>

        <h3 className="mb-2 text-base font-semibold text-primary">Live hazard tools</h3>
        <p className="mb-4 text-foreground">
          The{' '}
          <Link href="/radar" className="text-primary underline underline-offset-2">
            live radar map
          </Link>{' '}
          animates recent precipitation with severe overlays on top. The{' '}
          <Link href="/warnings" className="text-primary underline underline-offset-2">
            warning desk
          </Link>{' '}
          ranks active National Weather Service warnings against your pin, polygon match first, and{' '}
          <Link href="/alerts" className="text-primary underline underline-offset-2">
            Bitwatch alerts
          </Link>{' '}
          email or push Tornado, Severe Thunderstorm, and Flash Flood Warnings for a Protected Place
          without an account. From there the season decides:{' '}
          <Link href="/severe" className="text-primary underline underline-offset-2">
            SPC convective outlooks
          </Link>
          ,{' '}
          <Link href="/winter" className="text-primary underline underline-offset-2">
            winter storm and ice warnings
          </Link>
          ,{' '}
          <Link href="/aviation" className="text-primary underline underline-offset-2">
            aviation weather
          </Link>
          ,{' '}
          <Link href="/earth-sciences" className="text-primary underline underline-offset-2">
            live earthquakes
          </Link>
          , and{' '}
          <Link href="/stargazer" className="text-primary underline underline-offset-2">
            tonight&apos;s sky
          </Link>
          .
        </p>

        <h3 className="mb-2 text-base font-semibold text-primary">Space weather</h3>
        <p className="mb-4 text-foreground">
          The{' '}
          <Link href="/space-weather" className="text-primary underline underline-offset-2">
            space weather monitor
          </Link>{' '}
          follows the planetary Kp index, GOES X-ray flux for solar flares, solar wind, sunspots, and
          aurora chances straight from NOAA SWPC — the same feeds forecasters watch, laid out so you
          can read them at a glance.
        </p>

        <h3 className="mb-2 text-base font-semibold text-primary">
          Learn the weather, not just the forecast
        </h3>
        <p className="text-foreground">
          A forecast only means something if you know what it describes. The{' '}
          <Link href="/education" className="text-primary underline underline-offset-2">
            education hub
          </Link>{' '}
          holds a{' '}
          <Link href="/cloud-types" className="text-primary underline underline-offset-2">
            cloud atlas
          </Link>
          ,{' '}
          <Link href="/weather-systems" className="text-primary underline underline-offset-2">
            weather systems
          </Link>{' '}
          and phenomena guides, and a plain-English{' '}
          <Link href="/education/glossary" className="text-primary underline underline-offset-2">
            weather glossary
          </Link>
          . City climate guides such as{' '}
          <Link href="/weather/boston-ma" className="text-primary underline underline-offset-2">
            Boston
          </Link>{' '}
          and{' '}
          <Link href="/weather/atlanta-ga" className="text-primary underline underline-offset-2">
            Atlanta
          </Link>{' '}
          go further, explaining what a place&apos;s weather actually does month by month.
        </p>
      </div>
    </section>
  )
}
