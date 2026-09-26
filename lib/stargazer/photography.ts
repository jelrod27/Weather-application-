import { calculateStargazerScore, findBestWindow, findLimitingFactor, getScoreColor, getScoreLabel, getSubScoreLabel, scoreHour } from '@/lib/stargazer/score';
import type { DarkWindow, HourlyCondition, StargazerData, StargazerSubScores } from '@/lib/stargazer/types';

type PhotographyForecast = Pick<StargazerData, 'score' | 'hourlyConditions' | 'bestWindow' | 'nightAverage' | 'limitingFactor'>;
type ScoredHour = HourlyCondition & { hourlyScore: number; hourlySubScores: StargazerSubScores; cloudCover: number };

function hasScore(hour: HourlyCondition): hour is ScoredHour {
  return typeof hour.hourlyScore === 'number' && hour.hourlySubScores != null && hour.cloudCover !== null;
}

/** Preserve photography weights, but only score complete readings and contiguous periods. */
export function getPhotographyForecast(
  hours: HourlyCondition[], darkWindow: DarkWindow, moonIllumination: number, moonUpPercent: number,
): PhotographyForecast {
  const hourlyConditions = hours.map((hour): HourlyCondition => {
    const { cloudCover, cloudCoverHigh, seeing, transparency, windSpeed, humidity, temperature, dewpoint } = hour;
    if (darkWindow.status === 'none' || hour.time < darkWindow.astronomicalDusk || hour.time > darkWindow.astronomicalDawn ||
        cloudCover === null || cloudCoverHigh === null || seeing === null || transparency === null || windSpeed === null ||
        humidity === null || temperature === null || dewpoint === null) return hour;
    const result = scoreHour(cloudCover, moonIllumination, moonUpPercent, seeing, transparency, windSpeed * 0.621371,
      humidity, temperature * 1.8 + 32, dewpoint * 1.8 + 32, cloudCoverHigh, cloudCover);
    return { ...hour, hourlyScore: result.score, hourlySubScores: result.subScores, cirrusWarning: result.cirrusWarning };
  });
  const scored = hourlyConditions.filter(hasScore);
  if (!scored.length) return {
    hourlyConditions, bestWindow: null, nightAverage: null, limitingFactor: null,
    score: { overall: null, label: 'Unavailable', color: '#9ca3af', subScores: null,
      summary: darkWindow.status === 'none' ? 'No astronomical darkness at this location tonight.'
        : 'Photography score unavailable: complete weather, seeing and transparency readings are needed.' },
  };

  const groups: ScoredHour[][] = [];
  for (const hour of scored) {
    const current = groups.at(-1);
    if (current && hour.time.getTime() - current.at(-1)!.time.getTime() === 3600000) current.push(hour);
    else groups.push([hour]);
  }
  let selected: ScoredHour[] = [];
  let bestScore = -1;
  for (const group of groups) {
    if (group.length < 2) continue;
    const window = findBestWindow(group.map(hour => hour.hourlyScore), 3)!;
    if (window.score > bestScore) {
      selected = group.slice(window.startIndex, window.endIndex + 1);
      bestScore = window.score;
    }
  }
  // An individual complete reading can have a score, but cannot describe a time window.
  const headline = selected.length ? selected : [scored[0]];
  const average = (key: keyof StargazerSubScores): number => Math.round(headline.reduce((sum, hour) => sum + hour.hourlySubScores[key], 0) / headline.length);
  const subScores: StargazerSubScores = { cloud: average('cloud'), moon: average('moon'), seeing: average('seeing'), transparency: average('transparency'), ground: average('ground') };
  const overall = selected.length ? bestScore : headline[0].hourlyScore;
  const avgCloud = headline.reduce((sum, hour) => sum + hour.cloudCover, 0) / headline.length;
  const label = getScoreLabel(overall);
  const color = getScoreColor(label);
  const limit = findLimitingFactor(subScores);
  return {
    hourlyConditions,
    score: { ...calculateStargazerScore(subScores, moonIllumination, avgCloud), overall, label, color },
    bestWindow: selected.length ? { startTime: selected[0].time, endTime: selected.at(-1)!.time, score: overall, label, color } : null,
    // A whole-night average would conceal missing forecast coverage.
    nightAverage: scored.length === hourlyConditions.filter(hour => hour.time >= darkWindow.astronomicalDusk && hour.time <= darkWindow.astronomicalDawn).length && groups.length === 1
      ? Math.round(scored.reduce((sum, hour) => sum + hour.hourlyScore, 0) / scored.length) : null,
    limitingFactor: overall < 85 ? { category: limit.category, label: getSubScoreLabel(limit.category, limit.score),
      detail: limit.category === 'moon' ? `${Math.round(moonIllumination)}% illuminated; moonlight affects faint-target photography` : 'photography conditions during the scored period' } : null,
  };
}
