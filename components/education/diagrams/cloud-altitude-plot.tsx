/**
 * Where one cloud sits against the standard altitude bands.
 *
 * Parameterised by Entry, so this is drawn once and reused by every cloud
 * Guide. Substrate follows the theme; see planning/adr/0003.
 */

import type { DiagramContext } from '@/lib/education/diagram-types'
import { parseAltitudeRange } from '@/lib/education/altitude'

const BANDS = [
  { label: 'HIGH', baseFt: 20000, topFt: 40000 },
  { label: 'MID', baseFt: 6500, topFt: 20000 },
  { label: 'LOW', baseFt: 0, topFt: 6500 },
]

const PLOT_TOP = 34
const PLOT_BOTTOM = 372
const AXIS_X = 150
const PLOT_RIGHT = 660

const MONO = 'var(--theme-font, ui-monospace, monospace)'

function formatFt(ft: number): string {
  return `${ft.toLocaleString('en-US')} ft`
}

export default function CloudAltitudePlot({ context }: { context: DiagramContext }) {
  const cloud = context.cloud
  if (!cloud) return null

  const range = parseAltitudeRange(cloud.altitudeRange)
  if (!range) return null

  // The scale normally tops out at 40,000 ft so the standard bands stay legible.
  // Clouds that climb past it (cumulonimbus, and the stratospheric rarities)
  // push the ceiling up rather than being clipped.
  const ceilingFt = Math.max(40000, Math.ceil(range.topFt / 10000) * 10000)
  const yFor = (ft: number) =>
    PLOT_BOTTOM - (Math.min(ft, ceilingFt) / ceilingFt) * (PLOT_BOTTOM - PLOT_TOP)

  const columnTop = yFor(range.topFt)
  const columnBottom = yFor(range.baseFt)
  const columnHeight = Math.max(columnBottom - columnTop, 2)
  const titleId = `altitude-plot-${cloud.id}-title`
  const descId = `altitude-plot-${cloud.id}-desc`

  return (
    <svg
      viewBox="0 0 720 420"
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <title id={titleId}>{`Altitude range of ${cloud.name.toLowerCase()}`}</title>
      <desc id={descId}>
        {`${cloud.name.toLowerCase()} occupies ${cloud.altitudeRange}, shown against the standard low `}
        {'(surface to 6,500 ft), mid (6,500 to 20,000 ft) and high (20,000 to 40,000 ft) cloud bands.'}
        {range.openTop ? ' The top edge is dashed because this cloud can climb past the value shown.' : ''}
      </desc>

      {BANDS.map((band) => {
        const top = yFor(band.topFt)
        const bottom = yFor(band.baseFt)
        return (
          <g key={band.label}>
            <rect
              x={AXIS_X}
              y={top}
              width={PLOT_RIGHT - AXIS_X}
              height={bottom - top}
              fill="var(--notation-grid)"
              opacity={0.5}
            />
            <line
              x1={AXIS_X}
              y1={top}
              x2={PLOT_RIGHT}
              y2={top}
              stroke="var(--notation-ink)"
              strokeWidth={1}
              opacity={0.3}
            />
            <text
              x={AXIS_X - 12}
              y={(top + bottom) / 2 + 4}
              textAnchor="end"
              fill="var(--notation-ink)"
              fontSize={11}
              letterSpacing={1.6}
              opacity={0.75}
              fontFamily={MONO}
            >
              {band.label}
            </text>
            <text
              x={AXIS_X - 12}
              y={(top + bottom) / 2 + 19}
              textAnchor="end"
              fill="var(--notation-ink)"
              fontSize={9}
              opacity={0.45}
              fontFamily={MONO}
            >
              {`${formatFt(band.baseFt)}–${formatFt(band.topFt)}`}
            </text>
          </g>
        )
      })}

      {/* This cloud's extent. An open top ("60,000+ ft") is drawn as a dashed
          edge, because the source means a floor rather than a ceiling — a
          closed box would contradict prose that says the top can pass it. */}
      <rect x={430} y={columnTop} width={120} height={columnHeight} fill="var(--notation-warm)" opacity={0.22} />
      {range.openTop ? (
        <>
          <path
            d={`M 430 ${columnTop} L 430 ${columnTop + columnHeight} L 550 ${columnTop + columnHeight} L 550 ${columnTop}`}
            fill="none"
            stroke="var(--notation-warm)"
            strokeWidth={2}
          />
          <line
            x1={430}
            y1={columnTop}
            x2={550}
            y2={columnTop}
            stroke="var(--notation-warm)"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
        </>
      ) : (
        <rect
          x={430}
          y={columnTop}
          width={120}
          height={columnHeight}
          fill="none"
          stroke="var(--notation-warm)"
          strokeWidth={2}
        />
      )}
      <text
        x={566}
        y={columnTop + 14}
        fill="var(--notation-warm)"
        fontSize={11}
        letterSpacing={1.2}
        fontFamily={MONO}
      >
        {`${cloud.name} [${cloud.abbreviation}]`}
      </text>
      <text x={566} y={columnTop + 30} fill="var(--notation-ink)" fontSize={10} opacity={0.6} fontFamily={MONO}>
        {cloud.altitudeRange}
      </text>

      {/* Ground */}
      <line
        x1={AXIS_X}
        y1={PLOT_BOTTOM}
        x2={PLOT_RIGHT}
        y2={PLOT_BOTTOM}
        stroke="var(--notation-ink)"
        strokeWidth={2}
      />
      <text x={AXIS_X - 12} y={PLOT_BOTTOM + 4} textAnchor="end" fill="var(--notation-ink)" fontSize={9} opacity={0.55} fontFamily={MONO}>
        SURFACE
      </text>
    </svg>
  )
}
