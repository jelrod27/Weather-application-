'use client'

import { useId } from 'react'
import styles from './sky-reading.module.css'
import type { ReactElement } from 'react'
import type { SkyFrame } from '@/lib/sky/estimate'

interface SkyIllustrationProps { frame: SkyFrame | null; title: string }

export default function SkyIllustration({ frame: current, title }: SkyIllustrationProps): ReactElement {
  const general = current === null
  const night = current?.isDay === false
  const frame = current ?? { total: null, layers: [65, 30, 45] }

  const id = useId().replaceAll(':', '')
  const showTotalCoverage = !general && frame.total !== null && frame.layers.some(layer => layer === null)
  const sky = night ? ['#14233e', '#354d6a'] : ['#d5e9f6', '#f4f8fb']
  const ink = night ? '#e6f0f7' : '#344e68'
  const drawLayers = general ? [65, 30, 45] : frame.layers
  return <figure className={styles.figure}>
    <svg viewBox="0 0 540 285" role="img" aria-labelledby={`${id}-title ${id}-description`}>
      <title id={`${id}-title`}>{general ? 'General cloud-layer illustration' : showTotalCoverage ? 'Overall cloud coverage diagram; layer details incomplete' : `${title}: schematic low, middle and high cloud layers`}</title>
      <desc id={`${id}-description`}>{general ? 'Examples at different heights, not current local conditions.' : `Total cloud cover ${frame.total ?? 'unknown'} percent. Low ${frame.layers[0] ?? 'unknown'}, middle ${frame.layers[1] ?? 'unknown'}, high ${frame.layers[2] ?? 'unknown'} percent. Layers overlap; their amounts are not added. Shapes and heights are illustrative, not measured.`}</desc>
      <defs><linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor={sky[0]} /><stop offset="1" stopColor={sky[1]} /></linearGradient></defs>
      <rect width="540" height="285" rx="14" fill={`url(#${id}-sky)`} />
      {night && <g fill="#f0f4fa" opacity=".5">{[[170, 31], [256, 22], [435, 29], [477, 103], [150, 119]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.4" />)}</g>}
      {showTotalCoverage ? <>
        <circle cx="270" cy="127" r="69" fill="none" stroke={night ? '#52667d' : '#b9cfe0'} strokeWidth="18" />
        <circle cx="270" cy="127" r="69" fill="none" stroke="#507593" strokeWidth="18" strokeDasharray={`${(frame.total ?? 0) / 100 * 433.54} 433.54`} transform="rotate(-90 270 127)" />
        <text x="270" y="130" textAnchor="middle" fill={ink} fontSize="29" fontWeight="600">{frame.total}%</text>
        <text x="270" y="153" textAnchor="middle" fill={ink} fontSize="12">cloud cover</text>
        <text x="270" y="222" textAnchor="middle" fill={ink} fontSize="13">Layer details incomplete</text>
      </> : <>
        {[{ label: 'High', index: 2, y: 68 }, { label: 'Middle', index: 1, y: 132 }, { label: 'Low', index: 0, y: 196 }].map(({ label, index, y }) => {
          const value = drawLayers[index]
          const width = value === null || value === 0 ? 0 : 320 * value / 100
          return <g key={label}>
            <text x="24" y={y + 5} fill={ink} fontSize="13" fontWeight="500">{label}</text>
            <path d={`M 98 ${y + 20} H 502`} stroke={ink} strokeDasharray="3 6" opacity=".16" />
            {width > 0 && width < 18 && <ellipse cx={122 + width / 2} cy={y + 6} rx={width / 2} ry={Math.min(3, width / 2)} fill={night ? '#b7c9dc' : '#fbfdff'} stroke={night ? '#91a9c3' : '#9ab4c9'} />}
            {width >= 18 && <>
              <path d={`M 122 ${y + 7} Q 122 ${y - 3} ${122 + width * .1} ${y - 4} Q ${122 + width * .22} ${y - 15} ${122 + width * .4} ${y - 7} Q ${122 + width * .55} ${y - 18} ${122 + width * .72} ${y - 7} Q ${122 + width * .9} ${y - 12} ${122 + width} ${y - 3} L ${122 + width} ${y + 13} L 122 ${y + 13} Z`} fill={night ? '#b7c9dc' : '#fbfdff'} stroke={night ? '#91a9c3' : '#9ab4c9'} strokeWidth="1.5" opacity={.65 + index * .1} />
              <path d={`M 130 ${y + 14} H ${115 + width}`} stroke={night ? '#839bb8' : '#c0d2de'} strokeWidth="3" strokeLinecap="round" />
            </>}
            {!general && <text x="505" y={y + 4} textAnchor="end" fill={ink} fontSize="12">{value === null ? '—' : `${value}%`}</text>}
          </g>
        })}
        <path d="M 0 261 Q 70 245 130 255 T 300 254 T 455 249 T 540 255 V 285 H 0 Z" fill={night ? '#213b50' : '#c5d9dd'} />
        <path d="M 0 270 Q 98 259 185 266 T 350 265 T 540 268 V 285 H 0 Z" fill={night ? '#183044' : '#a9c8c9'} />
        {!general && frame.total === 0 && <text x="300" y="120" textAnchor="middle" fill={ink} fontSize="15">No cloud in this estimate</text>}
      </>}
    </svg>
    <figcaption>{general ? 'General learning example · not your current sky' : 'Scientific illustration · shapes and heights are schematic'}</figcaption>
  </figure>
}
