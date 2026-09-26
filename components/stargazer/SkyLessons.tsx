import SkyFindingDiagram from '@/components/stargazer/SkyFindingDiagram';

export default function SkyLessons(): React.JSX.Element {
  return <section aria-labelledby="sky-lessons-heading" className="space-y-3">
    <h2 id="sky-lessons-heading" className="text-lg font-bold">Learn to look</h2>
    <div className="grid gap-4 md:grid-cols-3 text-sm">
      <article className="container-primary p-4 space-y-3">
        <h3 className="font-semibold">Direction and height</h3>
        <SkyFindingDiagram position={{ azimuth: 135, altitude: 45 }} />
        <p>This example faces southeast, halfway from horizon to overhead. Our diagrams use true north; they do not track your phone. Find an open view away from trees and buildings.</p>
        <a className="text-primary underline" href="https://science.nasa.gov/skywatching/faq/">NASA: getting started</a>
      </article>
      <article className="container-primary p-4 space-y-3">
        <h3 className="font-semibold">Sunset is not darkness</h3>
        <svg viewBox="0 0 280 100" aria-hidden="true" className="w-full text-primary" fill="none">
          <path d="M10 20H270 M30 20L250 80" stroke="currentColor" /><circle cx="175" cy="60" r="7" stroke="currentColor" />
          <g fill="currentColor" fontSize="11"><text x="10" y="14">Horizon</text><text x="20" y="47">Sunset</text><text x="88" y="67">−6°</text><text x="197" y="96">−18°</text></g>
        </svg>
        <p>After sunset, the Sun keeps moving below the horizon. Civil twilight ends at 6° below it; astronomical twilight ends at 18°. Faint galaxies need much darker skies than the bright Moon or planets. Some places never reach full darkness in summer.</p>
        <a className="text-primary underline" href="https://aa.usno.navy.mil/faq/RST_defs">US Naval Observatory: twilight</a>
      </article>
      <article className="container-primary p-4 space-y-3">
        <h3 className="font-semibold">Clouds, Moon and city lights</h3>
        <svg viewBox="0 0 280 100" aria-hidden="true" className="w-full text-primary" fill="none">
          <circle cx="42" cy="40" r="20" stroke="currentColor" strokeWidth="2" /><path d="M104 50H166Q180 35 164 29Q154 11 140 26Q121 16 116 34Q98 32 104 50Z M210 77V42H226V77 M234 77V27H251V77" stroke="currentColor" strokeWidth="2" /><g fill="currentColor" fontSize="11"><text x="20" y="96">Moon</text><text x="111" y="96">Clouds</text><text x="207" y="96">Lights</text></g>
        </svg>
        <p>Clouds can block any target. Moonlight and city lights wash out faint patches more than bright planets. A bright Moon is also a target itself: use its surface patterns to begin. A forecast cannot confirm a clear view at your exact spot.</p>
        <p><a className="text-primary underline" href="https://science.nasa.gov/moon/viewing-tips/">NASA: viewing the Moon</a>{' · '}<a className="text-primary underline" href="https://science.nasa.gov/skywatching/faq/">Skywatching and light pollution</a></p>
      </article>
    </div>
  </section>;
}
