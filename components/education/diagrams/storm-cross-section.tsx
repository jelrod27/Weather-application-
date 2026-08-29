/**
 * Cumulonimbus cross-section, drawn in Surface Analysis notation.
 *
 * Notation colours (updraft warm, downdraft and gust front cold) come from the
 * invariant --notation-* tokens; the substrate reads the theme. See
 * planning/adr/0003. Server component — no interactivity, no theme hook.
 */

import type { DiagramContext } from '@/lib/education/diagram-types'

const TITLE_ID = 'storm-cross-section-title'
const DESC_ID = 'storm-cross-section-desc'

/** Cold-front pips along the outflow boundary, pointing the way the gust front travels. */
function GustFrontPips() {
  const pips = [432, 466, 500, 534]
  return (
    <g>
      <line x1={410} y1={372} x2={566} y2={372} stroke="var(--notation-cold)" strokeWidth={2.5} />
      {pips.map((x) => (
        <path
          key={x}
          d={`M ${x} 372 L ${x + 11} 372 L ${x + 5.5} 361 Z`}
          fill="var(--notation-cold)"
        />
      ))}
    </g>
  )
}

/** `context` is unused here — the signature is uniform so the registry needs no dispatch. */
export default function StormCrossSection(_: { context: DiagramContext }) {
  return (
    <svg
      viewBox="0 0 720 420"
      role="img"
      aria-labelledby={`${TITLE_ID} ${DESC_ID}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <title id={TITLE_ID}>Cross-section of a cumulonimbus cloud</title>
      <desc id={DESC_ID}>
        A cumulonimbus tower rising from a dark cloud base to an anvil that flattens and spreads
        along the tropopause, with an overshooting top above it. A warm updraft runs up through the
        tower; a cold downdraft descends on the forward flank into a precipitation shaft. Where the
        downdraft reaches the ground it spreads outward as a gust front, drawn with cold-front pips.
      </desc>

      {/* Altitude grid */}
      {[
        { ft: '60,000 ft', y: 76 },
        { ft: '40,000 ft', y: 150 },
        { ft: '20,000 ft', y: 250 },
        { ft: 'Surface', y: 372 },
      ].map(({ ft, y }) => (
        <g key={ft}>
          <line x1={96} y1={y} x2={648} y2={y} stroke="var(--notation-grid)" strokeWidth={1} />
          <text
            x={88}
            y={y + 3.5}
            textAnchor="end"
            fill="var(--notation-ink)"
            fontSize={10}
            opacity={0.55}
            fontFamily="var(--theme-font, ui-monospace, monospace)"
          >
            {ft}
          </text>
        </g>
      ))}

      {/* Tropopause — the lid the anvil spreads against */}
      <line
        x1={96}
        y1={76}
        x2={648}
        y2={76}
        stroke="var(--notation-ink)"
        strokeWidth={1.5}
        strokeDasharray="7 5"
        opacity={0.7}
      />
      <text
        x={648}
        y={68}
        textAnchor="end"
        fill="var(--notation-ink)"
        fontSize={10}
        opacity={0.75}
        letterSpacing={1.4}
        fontFamily="var(--theme-font, ui-monospace, monospace)"
      >
        TROPOPAUSE
      </text>

      {/* Storm silhouette: tower, anvil, overshooting top */}
      <ellipse cx={322} cy={62} rx={34} ry={15} fill="var(--notation-grid)" opacity={0.9} />
      <path
        d="M 238 372 L 248 250 C 242 210, 238 170, 252 132 L 252 120
           L 170 114 C 152 106, 166 86, 202 80 L 300 74 L 396 76
           C 470 78, 562 94, 576 108 C 562 120, 470 124, 397 122
           L 397 132 C 411 170, 407 210, 401 250 L 412 372 Z"
        fill="var(--notation-grid)"
        stroke="var(--notation-ink)"
        strokeWidth={1.5}
        strokeOpacity={0.5}
        strokeLinejoin="round"
      />
      {/* Dark base */}
      <path
        d="M 244 330 L 405 330 L 412 372 L 238 372 Z"
        fill="var(--notation-ink)"
        opacity={0.16}
      />

      {/* Precipitation shaft */}
      <g stroke="var(--notation-precip)" strokeWidth={1.5} opacity={0.75}>
        {[352, 366, 380, 394].map((x) => (
          <line key={x} x1={x} y1={334} x2={x - 12} y2={370} />
        ))}
      </g>

      {/* Updraft — warm, rising through the core */}
      <path
        d="M 310 352 C 300 300, 306 230, 316 150"
        stroke="var(--notation-warm)"
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />
      <path d="M 316 138 L 310 154 L 323 153 Z" fill="var(--notation-warm)" />

      {/* Downdraft — cold, descending the forward flank */}
      <path
        d="M 402 168 C 410 220, 404 290, 396 342"
        stroke="var(--notation-cold)"
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />
      <path d="M 395 356 L 389 340 L 402 341 Z" fill="var(--notation-cold)" />

      {/* Ground */}
      <line x1={96} y1={372} x2={648} y2={372} stroke="var(--notation-ink)" strokeWidth={2} />
      <GustFrontPips />

      {/* Labels */}
      {[
        { t: 'OVERSHOOTING TOP', x: 322, y: 40, anchor: 'middle' as const, fill: 'var(--notation-ink)' },
        { t: 'ANVIL', x: 512, y: 104, anchor: 'middle' as const, fill: 'var(--notation-ink)' },
        { t: 'UPDRAFT', x: 268, y: 244, anchor: 'end' as const, fill: 'var(--notation-warm)' },
        { t: 'DOWNDRAFT', x: 434, y: 214, anchor: 'start' as const, fill: 'var(--notation-cold)' },
        { t: 'PRECIPITATION', x: 344, y: 392, anchor: 'middle' as const, fill: 'var(--notation-precip)' },
        { t: 'GUST FRONT', x: 496, y: 392, anchor: 'middle' as const, fill: 'var(--notation-cold)' },
      ].map(({ t, x, y, anchor, fill }) => (
        <text
          key={t}
          x={x}
          y={y}
          textAnchor={anchor}
          fill={fill}
          fontSize={10}
          letterSpacing={1.2}
          fontFamily="var(--theme-font, ui-monospace, monospace)"
        >
          {t}
        </text>
      ))}
    </svg>
  )
}
