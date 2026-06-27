import Link from 'next/link'
import { getFeaturedCities } from '@/lib/featured-city-links'

type FeaturedCityLinksProps = {
  variant?: 'section' | 'footer'
  title?: string
  limit?: number
}

export default function FeaturedCityLinks({
  variant = 'section',
  title = 'Popular city forecasts',
  limit,
}: FeaturedCityLinksProps) {
  const items = limit ? getFeaturedCities().slice(0, limit) : getFeaturedCities()

  if (variant === 'footer') {
    return (
      <nav aria-label="Popular city weather forecasts" className="flex flex-col gap-1.5">
        {items.map((city) => (
          <Link
            key={city.slug}
            href={`/weather/${city.slug}`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {city.label}
          </Link>
        ))}
      </nav>
    )
  }

  return (
    <section
      aria-labelledby="featured-city-forecasts"
      className="border-t border-border/40 bg-black/20 py-10"
    >
      <div className="max-w-6xl mx-auto px-4">
        <h2
          id="featured-city-forecasts"
          className="text-center text-sm font-bold uppercase tracking-widest font-mono text-primary mb-2"
        >
          {title}
        </h2>
        <p className="text-center text-xs font-mono text-muted-foreground mb-6 max-w-2xl mx-auto">
          Live forecasts, climate guides, and monthly averages for major US cities.
        </p>
        <nav
          aria-label="Featured city weather pages"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-w-5xl mx-auto"
        >
          {items.map((city) => (
            <Link
              key={city.slug}
              href={`/weather/${city.slug}`}
              className="block px-3 py-2 text-xs sm:text-sm font-mono text-center rounded border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              {city.name}
              {city.state ? (
                <span className="block text-[10px] opacity-70">{city.state}</span>
              ) : null}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  )
}
