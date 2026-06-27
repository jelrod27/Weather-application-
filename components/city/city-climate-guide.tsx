import Link from 'next/link';
import type { CitySeoEnrichment } from '@/lib/city-metadata';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface CityClimateGuideProps {
  fullLocation: string;
  cityName: string;
  content: {
    intro: string;
    climate: string;
    patterns: string;
  };
  enrichment: CitySeoEnrichment | null;
  nearbyCities: Array<{ slug: string; name: string; state: string }>;
}

/**
 * Optional climate / SEO reading for curated city pages.
 * Collapsed by default — live forecast stays primary for every visitor.
 */
export default function CityClimateGuide({
  fullLocation,
  cityName,
  content,
  enrichment,
  nearbyCities,
}: CityClimateGuideProps) {
  return (
    <details
      id="city-climate-guide"
      className="mx-auto max-w-4xl border-t border-weather-border/40 pt-6 font-mono text-weather-text group"
    >
      <summary className="cursor-pointer list-none px-2 py-3 rounded-md border border-weather-border/60 bg-weather-bg-elev/50 hover:border-weather-primary/50 transition-colors [&::-webkit-details-marker]:hidden">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-bold uppercase tracking-wider text-weather-primary">
            Climate guide &amp; monthly averages — {fullLocation}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-weather-muted">
            Optional reading · tap to expand
          </span>
        </div>
      </summary>

      <article className="px-2 pt-8 pb-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs uppercase tracking-wider text-weather-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-weather-primary">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-weather-primary" aria-current="page">
              {fullLocation}
            </li>
          </ol>
        </nav>

        <header className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight text-weather-primary mb-3">
            {`${fullLocation} Climate Guide`}
          </h2>
          <p className="text-sm md:text-base text-weather-muted leading-relaxed max-w-3xl">
            {content.intro}
          </p>
          {enrichment?.climateType ? (
            <p className="mt-3 text-xs uppercase tracking-widest text-weather-muted">
              Climate type: <span className="text-weather-primary">{enrichment.climateType}</span>
            </p>
          ) : null}
        </header>

        <section className="mb-10">
          <h3 className="text-xl font-bold uppercase tracking-wider text-weather-primary mb-3">
            {cityName} Climate Overview
          </h3>
          <p className="text-sm leading-relaxed mb-3">{content.climate}</p>
          <p className="text-sm leading-relaxed">{content.patterns}</p>
        </section>

        {enrichment?.seasons ? (
          <section className="mb-10">
            <h3 className="text-xl font-bold uppercase tracking-wider text-weather-primary mb-4">
              {cityName} Weather by Season
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {(['spring', 'summer', 'fall', 'winter'] as const).map((season) => (
                <div
                  key={season}
                  className="rounded-lg border-2 border-weather-border bg-weather-bg-elev p-4"
                >
                  <h4 className="text-sm font-bold uppercase tracking-wider text-weather-primary mb-2">
                    {season}
                  </h4>
                  <p className="text-xs leading-relaxed">{enrichment.seasons[season]}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {enrichment?.monthlyHighs?.length === MONTH_LABELS.length &&
        enrichment?.monthlyLows?.length === MONTH_LABELS.length ? (
          <section className="mb-10">
            <h3 className="text-xl font-bold uppercase tracking-wider text-weather-primary mb-4">
              {cityName} Average Monthly Temperatures
            </h3>
            <div className="overflow-x-auto rounded-lg border-2 border-weather-border">
              <table className="w-full text-xs">
                <caption className="sr-only">
                  Average monthly high and low temperatures for {fullLocation} in °F
                </caption>
                <thead className="bg-weather-bg-elev">
                  <tr>
                    <th scope="col" className="px-2 py-2 text-left uppercase tracking-wider">
                      Month
                    </th>
                    {MONTH_LABELS.map((month) => (
                      <th key={month} scope="col" className="px-2 py-2 text-center uppercase tracking-wider">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t-2 border-weather-border">
                    <th scope="row" className="px-2 py-2 text-left font-bold uppercase text-weather-primary">
                      High °F
                    </th>
                    {enrichment.monthlyHighs.map((temp, i) => (
                      <td key={i} className="px-2 py-2 text-center">
                        {temp}°
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t border-weather-border">
                    <th scope="row" className="px-2 py-2 text-left font-bold uppercase text-weather-muted">
                      Low °F
                    </th>
                    {enrichment.monthlyLows.map((temp, i) => (
                      <td key={i} className="px-2 py-2 text-center">
                        {temp}°
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {enrichment?.bestTimeToVisit ? (
          <section className="mb-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border-2 border-weather-border bg-weather-bg-elev p-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-weather-primary mb-2">
                Best Time to Visit {cityName}
              </h3>
              <p className="text-xs leading-relaxed">{enrichment.bestTimeToVisit}</p>
            </div>
            {enrichment.severeRisks?.length ? (
              <div className="rounded-lg border-2 border-weather-border bg-weather-bg-elev p-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-weather-primary mb-2">
                  Severe Weather Risks
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {enrichment.severeRisks.map((risk) => (
                    <li
                      key={risk}
                      className="text-[10px] uppercase tracking-wider border border-weather-border rounded px-2 py-1"
                    >
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        {enrichment?.uniqueFacts && enrichment.uniqueFacts.length > 0 ? (
          <section className="mb-10">
            <h3 className="text-xl font-bold uppercase tracking-wider text-weather-primary mb-3">
              Weather Facts About {cityName}
            </h3>
            <ul className="space-y-2 text-sm leading-relaxed">
              {enrichment.uniqueFacts.map((fact, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-weather-primary">&gt;</span>
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {enrichment?.faqs && enrichment.faqs.length > 0 ? (
          <section className="mb-10">
            <h3 className="text-xl font-bold uppercase tracking-wider text-weather-primary mb-4">
              {cityName} Weather FAQ
            </h3>
            <div className="space-y-4">
              {enrichment.faqs.map((faq, i) => (
                <div
                  key={i}
                  className="rounded-lg border-2 border-weather-border bg-weather-bg-elev p-4"
                >
                  <h4 className="text-sm font-bold text-weather-primary mb-2">{faq.question}</h4>
                  <p className="text-xs leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {nearbyCities.length > 0 ? (
          <section className="mb-4">
            <h3 className="text-xl font-bold uppercase tracking-wider text-weather-primary mb-4">
              Explore Nearby City Weather
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {nearbyCities.map((neighbor) => (
                <Link
                  key={neighbor.slug}
                  href={`/weather/${neighbor.slug}`}
                  className="block rounded-lg border-2 border-weather-border bg-weather-bg-elev p-3 text-xs uppercase tracking-wider transition-colors hover:border-weather-primary hover:text-weather-primary"
                >
                  {neighbor.name}, {neighbor.state}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </details>
  );
}
