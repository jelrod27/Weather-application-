export type BriefLevel = 'low' | 'watch' | 'elevated';

export type FlightCategory = 'VFR' | 'MVFR' | 'IFR' | 'LIFR' | 'UNKNOWN';

export type BriefScoreInput = {
  originCategory: FlightCategory;
  destCategory: FlightCategory;
  intersectingHazardCount: number;
  hasSevereHazard: boolean;
};

export type BriefScore = {
  level: BriefLevel;
  summary: string;
  score: number;
};

function categoryWeight(cat: FlightCategory): number {
  switch (cat) {
    case 'LIFR':
      return 40;
    case 'IFR':
      return 28;
    case 'MVFR':
      return 14;
    case 'VFR':
      return 0;
    default:
      return 6;
  }
}

export function scoreFlightBrief(input: BriefScoreInput): BriefScore {
  let score =
    categoryWeight(input.originCategory)
    + categoryWeight(input.destCategory)
    + Math.min(30, input.intersectingHazardCount * 10);

  if (input.hasSevereHazard) score += 25;

  let level: BriefLevel = 'low';
  if (score >= 45) level = 'elevated';
  else if (score >= 20) level = 'watch';

  const summary =
    level === 'elevated'
      ? 'Elevated weather risk along this route — check advisories before you fly.'
      : level === 'watch'
        ? 'Watch conditions — weather may affect comfort or delays.'
        : 'Low weather concern for this route based on current METAR and advisories.';

  return { level, summary, score };
}
