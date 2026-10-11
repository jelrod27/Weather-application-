import type { ReactElement } from 'react';
import type { HazardFamily } from '@/lib/news/visuals';

interface HazardDrawing {
  label: string;
  path: string;
}

/** Small, fixed drawings: the shape identifies a type, never a particular event. */
const DRAWINGS: Record<HazardFamily, HazardDrawing> = {
  tornado: { label: 'Tornado', path: 'M22 16H74V22H68V28H60V34H54V42H48V50H42V56H36 M28 26H60 M34 36H50 M36 46H44' },
  thunderstorm: { label: 'Severe thunderstorm', path: 'M20 30V20H30V14H52V20H64V30H20 M46 30L34 46H46L38 60L60 40H48L56 30' },
  wind: { label: 'High wind', path: 'M28 60V14 M28 18H40V14H52V20H72V32H52V38H40V34H28 M40 18V34 M52 20V32 M58 46H82 M48 54H72' },
  freeze: { label: 'Freeze / frost', path: 'M26 44V18H36V44L42 50V58H20V50Z M31 27V48 M52 16L76 40 M76 16L52 40 M64 10V46 M48 28H80 M56 52H76' },
  'flash-flood': { label: 'Flash flood', path: 'M48 10L34 30H46L38 46L64 24H52L60 10Z M12 46H22V42H34V46H44 M56 46H66V42H78V46H86 M12 58H28V54H44V58H60V54H78V58H86' },
  flood: { label: 'Flooding', path: 'M18 32L44 12L70 32 M26 28V48 M62 28V48 M40 48V34H50V48 M12 50H28V46H44V50H60V46H78V50H86 M12 60H28V56H44V60H60V56H78V60H86' },
  fire: { label: 'Fire weather', path: 'M46 10V26L58 18V34L68 28V48L60 58H30L22 48V34L34 22V38Z M38 56V44L46 34L52 46V56' },
  marine: { label: 'Marine', path: 'M20 42H76L66 54H30Z M46 14V42 M42 20L26 36H42Z M50 18L68 36H50Z M14 62H30V58H46V62H62V58H80' },
  winter: { label: 'Winter weather', path: 'M12 56L34 24L44 40L60 16L84 56Z M26 36H34L38 30 M52 28H60L66 26 M14 14H26 M20 8V20 M68 6H80 M74 2V12' },
  tropical: { label: 'Tropical weather', path: 'M26 58H50L66 48L74 32V20 M70 14H46L30 24L22 40V52 M42 28H54V40H42Z M30 24L38 18 M58 48L50 54' },
  other: { label: 'Weather report', path: 'M48 10L82 58H14Z M48 26V40 M48 48V52' },
};

interface HazardIllustrationProps {
  family: HazardFamily;
}

export default function HazardIllustration({ family }: HazardIllustrationProps): ReactElement {
  const drawing = DRAWINGS[family];
  return (
    <svg viewBox="0 0 96 72" width="192" height="144" className="max-w-full max-h-full text-primary"
      role="img" aria-label={`${drawing.label} illustration; not an image of this event`} data-hazard={family}>
      <path d="M4 4H18M4 4V18M78 4H92V18M4 54V68H18M78 68H92V54"
        fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path d={drawing.path} fill="none" stroke="currentColor" strokeWidth="4"
        strokeLinejoin="miter" strokeLinecap="square" />
    </svg>
  );
}
