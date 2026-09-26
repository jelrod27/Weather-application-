import { describeSkyPosition } from '@/lib/stargazer/direction';
import type { SkyPosition } from '@/lib/stargazer/direction';

interface SkyFindingDiagramProps { position: SkyPosition }

/** A schematic with a complete text equivalent; it never requests device orientation. */
export default function SkyFindingDiagram({ position }: SkyFindingDiagramProps): React.JSX.Element {
  const valid = Number.isFinite(position.altitude) && Number.isFinite(position.azimuth) && position.altitude > 0;
  const overhead = position.altitude >= 85;
  const angle = position.azimuth * Math.PI / 180;
  const height = Math.min(90, Math.max(0, position.altitude)) * Math.PI / 180;
  return <figure className="space-y-2">
    {valid && <svg viewBox="0 0 300 140" aria-label="Finding diagram" aria-hidden="true" className="w-full max-w-sm text-primary" fill="none">
      <circle cx="65" cy="65" r="40" stroke="currentColor" />
      <path d="M65 25V105 M25 65H105" stroke="currentColor" opacity=".4" />
      <g fill="currentColor" fontSize="12" textAnchor="middle"><text x="65" y="17">N</text><text x="65" y="122">S</text><text x="116" y="69">E</text><text x="14" y="69">W</text></g>
      {!overhead && <><line x1="65" y1="65" x2={65 + 35 * Math.sin(angle)} y2={65 - 35 * Math.cos(angle)} stroke="currentColor" strokeWidth="3" /><circle cx={65 + 35 * Math.sin(angle)} cy={65 - 35 * Math.cos(angle)} r="4" fill="currentColor" /></>}
      <path d="M160 105H280 M170 105V25 M170 25A80 80 0 0 1 250 105" stroke="currentColor" opacity=".5" />
      <line x1="170" y1="105" x2={170 + 80 * Math.cos(height)} y2={105 - 80 * Math.sin(height)} stroke="currentColor" strokeWidth="3" />
      <circle cx={170 + 80 * Math.cos(height)} cy={105 - 80 * Math.sin(height)} r="4" fill="currentColor" />
      <g fill="currentColor" fontSize="10"><text x="168" y="17">Overhead · 90°</text><text x="168" y="122">Horizon · 0°</text></g>
    </svg>}
    <figcaption className="text-sm font-semibold">{describeSkyPosition(position)}</figcaption>
  </figure>;
}
