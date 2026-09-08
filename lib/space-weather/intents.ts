/**
 * The `/space-weather/*` intent pages.
 *
 * `/space-weather` carried the most impressions of any page on the site and
 * earned no clicks, because it answers a dozen separate questions at once:
 * flare class, Kp, solar wind speed and aurora visibility are distinct
 * searches, and a single page competing for all of them ranks for none. Each
 * entry below is one of those searches, with the hub kept as the live
 * dashboard they all link back to.
 *
 * One registry so the sitemap, the hub's cross-links, each page's sibling
 * navigation and the breadcrumbs cannot drift apart.
 */

export const SPACE_WEATHER_BASE = '/space-weather'

export interface SpaceWeatherIntent {
  slug: string
  /** Short label for cross-links and breadcrumbs. */
  label: string
  /** Page title; the root layout's template appends the brand. */
  title: string
  description: string
  /** One line describing the page, used on the hub's cross-link cards. */
  blurb: string
  keywords: string
}

export const SPACE_WEATHER_INTENTS: readonly SpaceWeatherIntent[] = [
  {
    slug: 'solar-flares',
    label: 'Solar flares',
    title: 'Solar Flare Monitor: Live Solar Activity',
    description:
      'Live solar flare monitor with the current GOES X-ray class, what A, B, C, M and X mean, and what each one does to radio and satellites.',
    blurb: "Current GOES X-ray class, and what today's solar activity actually affects.",
    keywords:
      'solar flare monitor, solar activity today, solar flare tracker, current solar activity, solar storm monitor, x-ray flux, goes xrs, flare class',
  },
  {
    slug: 'kp-index',
    label: 'Kp index',
    title: 'Live Kp Index & Geomagnetic Storm Scale',
    description:
      'The live planetary Kp index from NOAA SWPC, the G-scale it maps to, and how far south a given Kp pushes the aurora.',
    blurb: 'The live planetary Kp, its G-scale storm level, and what it means for aurora.',
    keywords:
      'live kp index, current kp index, kp index live, planetary k index, geomagnetic storm tracker, g scale, geomagnetic activity',
  },
  {
    slug: 'solar-wind',
    label: 'Solar wind',
    title: 'Real-Time Solar Wind Speed & Density',
    description:
      'Real-time solar wind speed, density and the Bz component from NOAA DSCOVR, with what each reading means for storm risk.',
    blurb: 'Live speed, density and Bz from the DSCOVR spacecraft, roughly an hour upstream.',
    keywords:
      'real time solar wind, solar wind speed today, solar wind data, solar wind forecast, bz component, dscovr, interplanetary magnetic field',
  },
  {
    slug: 'aurora-forecast',
    label: 'Aurora forecast',
    title: 'Aurora Forecast Tonight: Where To Look',
    description:
      'Tonight aurora forecast from the live Kp index: how far south the viewline sits right now, and the conditions that decide whether you see it.',
    blurb: 'How far south the aurora reaches tonight, from the live Kp reading.',
    keywords:
      'aurora forecast, aurora tonight, northern lights forecast, aurora viewline, where to see the aurora, kp aurora, ovation model',
  },
] as const

export function getSpaceWeatherIntent(slug: string): SpaceWeatherIntent | undefined {
  return SPACE_WEATHER_INTENTS.find((intent) => intent.slug === slug)
}

/** The other intents, for the sibling links every intent page carries. */
export function siblingIntents(slug: string): SpaceWeatherIntent[] {
  return SPACE_WEATHER_INTENTS.filter((intent) => intent.slug !== slug)
}

export function intentHref(slug: string): string {
  return `${SPACE_WEATHER_BASE}/${slug}`
}
