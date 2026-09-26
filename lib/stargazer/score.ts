/**
 * Stargazer Score Algorithm
 * Calculates an astrophotography forecast score from weather and astronomical data.
 */

import type { StargazerScore, StargazerSubScores, ScoreLabel } from '@/lib/stargazer/types';

// ============================================================================
// Sub-Score Functions
// ============================================================================

/** Non-linear cloud penalty: 0% clouds = 100, heavy penalty for moderate cover */
export function cloudScore(avgCloudCoverPercent: number): number {
  const c = Math.max(0, Math.min(100, avgCloudCoverPercent));
  if (c <= 10) return 100;
  if (c <= 25) return 100 - ((c - 10) / 15) * 20; // 100 → 80
  if (c <= 50) return 80 - ((c - 25) / 25) * 50;  // 80 → 30
  if (c <= 75) return 30 - ((c - 50) / 25) * 25;  // 30 → 5
  return 5 - ((c - 75) / 25) * 5;                  // 5 → 0
}

/** Moon interference score: 100 if moon below horizon, otherwise penalised by illumination * time up */
export function moonScore(illuminationPercent: number, moonUpDuringDarkWindowPercent: number): number {
  if (moonUpDuringDarkWindowPercent <= 0) return 100;
  return 100 * (1 - (illuminationPercent / 100) * (moonUpDuringDarkWindowPercent / 100));
}

const SEEING_MAP: Record<number, number> = {
  1: 100, 2: 90, 3: 80, 4: 65, 5: 50, 6: 35, 7: 20, 8: 5,
};

/** Map 7Timer seeing scale (1-8) to 0-100 score */
export function seeingScore(seeing7timer: number): number {
  return SEEING_MAP[seeing7timer] ?? 50;
}

/** Map 7Timer transparency scale (1-8) to 0-100 score */
export function transparencyScore(transparency7timer: number): number {
  return SEEING_MAP[transparency7timer] ?? 50;
}

/** Ground-level conditions penalty: wind, humidity, dew risk, cold */
export function groundScore(
  windSpeedMph: number,
  humidityPercent: number,
  tempF: number,
  dewpointF: number,
): number {
  let score = 100;

  // Wind penalty
  if (windSpeedMph > 10) {
    score -= Math.min(40, (windSpeedMph - 10) * 2.5);
  }

  // Humidity penalty
  if (humidityPercent > 80) {
    score -= Math.min(25, (humidityPercent - 80) * 1.25);
  }

  // Dew risk penalty (temp - dewpoint < 5°F)
  const dewDelta = tempF - dewpointF;
  if (dewDelta < 5) {
    score -= Math.min(25, (5 - dewDelta) * 5);
  }

  // Cold penalty
  if (tempF < 20) {
    score -= Math.min(10, (20 - tempF) * 0.5);
  }

  return Math.max(0, score);
}

// ============================================================================
// Composite Score
// ============================================================================

/** Weighted composite: cloud 40%, moon 25%, seeing 15%, transparency 15%, ground 5% */
export function stargazerScore(
  cloud: number,
  moon: number,
  seeing: number,
  transparency: number,
  ground: number,
): number {
  return Math.round(
    cloud * 0.40 +
    moon * 0.25 +
    seeing * 0.15 +
    transparency * 0.15 +
    ground * 0.05,
  );
}

// ============================================================================
// Cirrus Penalty
// ============================================================================

/**
 * Apply cirrus (high cloud) penalty to a transparency sub-score.
 * Thin cirrus reads as low total cloud cover but wrecks transparency.
 */
export function applyCirrusPenalty(
  transparencySub: number,
  cloudCoverHighPercent: number,
  totalCloudCoverPercent: number,
): { adjusted: number; cirrusWarning: boolean } {
  if (cloudCoverHighPercent > 50) {
    return { adjusted: Math.max(0, transparencySub - 25), cirrusWarning: true };
  }
  if (cloudCoverHighPercent > 30 && totalCloudCoverPercent < 25) {
    return { adjusted: Math.max(0, transparencySub - 15), cirrusWarning: true };
  }
  return { adjusted: transparencySub, cirrusWarning: false };
}

// ============================================================================
// Per-Hour Scoring
// ============================================================================

/** Compute composite score and sub-scores for a single hour. */
export function scoreHour(
  cloudCoverPercent: number,
  moonIlluminationPercent: number,
  moonUpDuringDarkWindowPercent: number,
  seeing7timer: number,
  transparency7timer: number,
  windSpeedMph: number,
  humidityPercent: number,
  tempF: number,
  dewpointF: number,
  cloudCoverHighPercent: number,
  totalCloudCoverPercent: number,
): { score: number; subScores: StargazerSubScores; cirrusWarning: boolean } {
  const cloud = cloudScore(cloudCoverPercent);
  const moon = moonScore(moonIlluminationPercent, moonUpDuringDarkWindowPercent);
  const seeing = seeingScore(seeing7timer);
  const rawTransparency = transparencyScore(transparency7timer);
  const { adjusted: transparency, cirrusWarning } = applyCirrusPenalty(
    rawTransparency, cloudCoverHighPercent, totalCloudCoverPercent,
  );
  const ground = groundScore(windSpeedMph, humidityPercent, tempF, dewpointF);

  const subScores: StargazerSubScores = { cloud, moon, seeing, transparency, ground };
  const score = stargazerScore(cloud, moon, seeing, transparency, ground);

  return { score, subScores, cirrusWarning };
}

// ============================================================================
// Best Window (sliding 3-hour block)
// ============================================================================

export interface BestWindowResult {
  startIndex: number;
  endIndex: number;
  score: number;
}

/** Find the highest-scoring contiguous block of `windowSize` hours. */
export function findBestWindow(hourlyScores: number[], windowSize: number = 3): BestWindowResult | null {
  if (hourlyScores.length === 0) return null;

  const effectiveSize = Math.min(windowSize, hourlyScores.length);
  let bestStart = 0;
  let bestAvg = -1;

  for (let i = 0; i <= hourlyScores.length - effectiveSize; i++) {
    let sum = 0;
    for (let j = i; j < i + effectiveSize; j++) {
      sum += hourlyScores[j];
    }
    const avg = sum / effectiveSize;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestStart = i;
    }
  }

  return {
    startIndex: bestStart,
    endIndex: bestStart + effectiveSize - 1,
    score: Math.round(bestAvg),
  };
}

// ============================================================================
// Limiting Factor
// ============================================================================

/** Identify the weakest sub-score category from a set of sub-scores. */
export function findLimitingFactor(
  subScores: StargazerSubScores,
): { category: keyof StargazerSubScores; score: number } {
  let lowest = Infinity;
  let category: keyof StargazerSubScores = 'cloud';

  for (const [key, val] of Object.entries(subScores) as [keyof StargazerSubScores, number][]) {
    if (val < lowest) {
      lowest = val;
      category = key;
    }
  }

  return { category, score: lowest };
}

// ============================================================================
// Labels & Colors
// ============================================================================

export function getScoreLabel(score: number): ScoreLabel {
  if (score >= 90) return 'Exceptional';
  if (score >= 75) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 20) return 'Poor';
  return 'Bad';
}

const SCORE_COLORS: Record<ScoreLabel, string> = {
  Exceptional: '#22c55e',
  Excellent: '#4ade80',
  Good: '#a3e635',
  Fair: '#facc15',
  Poor: '#f97316',
  Bad: '#ef4444',
};

export function getScoreColor(label: ScoreLabel): string {
  return SCORE_COLORS[label];
}

const SUB_SCORE_LABELS: Record<string, [string, string, string, string, string]> = {
  cloud:        ['Overcast',            'Mostly cloudy',      'Partly cloudy',        'Mostly clear',         'Clear skies'],
  moon:         ['Severe interference', 'Heavy interference', 'Moderate interference', 'Minimal interference', 'No interference'],
  seeing:       ['Bad',                'Poor',                'Fair',                  'Good',                 'Excellent'],
  transparency: ['Opaque',             'Poor',                'Hazy',                  'Good',                 'Crystal clear'],
  ground:       ['Difficult imaging',          'Windy/dew risk',      'Breezy/humid',          'Good',                 'Calm conditions'],
};

/** Descriptive text label for a sub-score value (0-100). */
export function getSubScoreLabel(key: string, value: number): string {
  const labels = SUB_SCORE_LABELS[key];
  if (!labels) return '';
  const clamped = Math.max(0, Math.min(100, value));
  if (clamped >= 90) return labels[4];
  if (clamped >= 75) return labels[3];
  if (clamped >= 50) return labels[2];
  if (clamped >= 25) return labels[1];
  return labels[0];
}


// ============================================================================
// Summary Generation
// ============================================================================

export function generateSummary(
  subScores: StargazerSubScores,
  moonIllumination: number,
  _avgCloudCover: number,
): string {
  const { cloud, moon, seeing, transparency, ground } = subScores;

  // Overcast — dominant factor
  if (cloud < 30) {
    return 'Cloud cover may limit photography during the scored period';
  }

  // Clear skies path
  if (cloud >= 80) {
    if (moon >= 85) {
      return 'Low cloud and little moonlight interference favor deep sky photography';
    }
    if (moon >= 60) {
      return 'Clear skies with moderate moonlight - consider narrowband or lunar targets';
    }
    // Bright moon
    if (moonIllumination > 60) {
      return 'Low cloud with bright moonlight - consider lunar photography';
    }
  }

  // Moderate cloud
  if (cloud >= 50 && cloud < 80) {
    if (seeing >= 70 && transparency >= 70) {
      return 'Intermittent clouds expected with moderate seeing';
    }
    return 'Partial cloud cover may disrupt longer exposures';
  }

  // Ground conditions dominant
  if (ground < 40) {
    return 'Poor ground conditions - high wind or dew risk will impact imaging';
  }

  // Seeing/transparency dominant
  if (seeing < 40 || transparency < 40) {
    return 'Atmospheric turbulence or haze will limit resolution tonight';
  }

  // Decent all-around
  if (cloud >= 60 && moon >= 50 && seeing >= 50 && transparency >= 50) {
    return 'Mostly clear with acceptable conditions - good night to image';
  }

  return 'Mixed conditions tonight - monitor sky and adapt plans accordingly';
}

// ============================================================================
// Full Calculation
// ============================================================================

export function calculateStargazerScore(
  subScores: StargazerSubScores,
  moonIllumination: number,
  avgCloudCover: number,
): StargazerScore {
  const overall = stargazerScore(
    subScores.cloud,
    subScores.moon,
    subScores.seeing,
    subScores.transparency,
    subScores.ground,
  );
  const label = getScoreLabel(overall);
  const color = getScoreColor(label);
  const summary = generateSummary(subScores, moonIllumination, avgCloudCover);

  return {
    overall,
    label,
    color,
    summary,
    subScores,
  };
}
