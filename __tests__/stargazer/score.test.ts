/**
 * Tests for Stargazer Score Algorithm
 */

import {
  cloudScore,
  moonScore,
  seeingScore,
  transparencyScore,
  groundScore,
  stargazerScore,
  getScoreLabel,
  getScoreColor,
  generateSummary,
  calculateStargazerScore,
  getSubScoreLabel,
} from '@/lib/stargazer/score';

describe('Stargazer Score Algorithm', () => {
  describe('cloudScore', () => {
    it('returns 100 for clear skies (0% clouds)', () => {
      expect(cloudScore(0)).toBe(100);
    });

    it('returns 100 for nearly clear skies (<=10%)', () => {
      expect(cloudScore(10)).toBe(100);
    });

    it('penalizes moderate cloud cover', () => {
      const score = cloudScore(50);
      expect(score).toBeGreaterThan(20);
      expect(score).toBeLessThan(40);
    });

    it('returns near-zero for overcast (100%)', () => {
      expect(cloudScore(100)).toBeLessThanOrEqual(5);
    });
  });

  describe('moonScore', () => {
    it('returns 100 when moon is below horizon', () => {
      expect(moonScore(100, 0)).toBe(100);
    });

    it('returns 0 for full moon always up', () => {
      expect(moonScore(100, 100)).toBe(0);
    });

    it('returns 100 for new moon even if up', () => {
      expect(moonScore(0, 100)).toBe(100);
    });

    it('penalizes partial moon presence', () => {
      const score = moonScore(50, 50);
      expect(score).toBe(75);
    });
  });

  describe('seeingScore', () => {
    it('returns 100 for best seeing (1)', () => {
      expect(seeingScore(1)).toBe(100);
    });

    it('returns 5 for worst seeing (8)', () => {
      expect(seeingScore(8)).toBe(5);
    });

    it('returns 50 for unknown values', () => {
      expect(seeingScore(99)).toBe(50);
    });
  });

  describe('transparencyScore', () => {
    it('returns 100 for best transparency (1)', () => {
      expect(transparencyScore(1)).toBe(100);
    });

    it('returns 5 for worst transparency (8)', () => {
      expect(transparencyScore(8)).toBe(5);
    });
  });

  describe('groundScore', () => {
    it('returns 100 for ideal conditions', () => {
      expect(groundScore(5, 50, 60, 40)).toBe(100);
    });

    it('penalizes high wind', () => {
      const score = groundScore(30, 50, 60, 40);
      expect(score).toBeLessThanOrEqual(60);
    });

    it('penalizes high humidity', () => {
      const score = groundScore(5, 95, 60, 40);
      expect(score).toBeLessThan(85);
    });

    it('penalizes dew risk (small temp-dewpoint delta)', () => {
      const score = groundScore(5, 50, 42, 40);
      expect(score).toBeLessThan(90);
    });

    it('penalizes extreme cold', () => {
      const score = groundScore(5, 50, 5, -10);
      expect(score).toBeLessThan(95);
    });

    it('never goes below 0', () => {
      const score = groundScore(50, 100, -10, -10);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('stargazerScore (composite)', () => {
    it('returns perfect score with all 100s', () => {
      expect(stargazerScore(100, 100, 100, 100, 100)).toBe(100);
    });

    it('returns 0 with all 0s', () => {
      expect(stargazerScore(0, 0, 0, 0, 0)).toBe(0);
    });

    it('weights cloud cover highest (40%)', () => {
      const withClouds = stargazerScore(0, 100, 100, 100, 100);
      const withoutClouds = stargazerScore(100, 100, 100, 100, 100);
      expect(withoutClouds - withClouds).toBe(40);
    });
  });

  describe('getScoreLabel', () => {
    it('returns Exceptional for 90-100', () => {
      expect(getScoreLabel(95)).toBe('Exceptional');
    });

    it('returns Bad for 0-19', () => {
      expect(getScoreLabel(10)).toBe('Bad');
    });

    it('returns Fair for 40-59', () => {
      expect(getScoreLabel(50)).toBe('Fair');
    });
  });

  describe('getScoreColor', () => {
    it('returns green hex for Exceptional', () => {
      expect(getScoreColor('Exceptional')).toMatch(/#[0-9a-f]{6}/i);
    });
  });

  describe('generateSummary', () => {
    it('generates summary for exceptional night', () => {
      const summary = generateSummary(
        { cloud: 95, moon: 95, seeing: 80, transparency: 80, ground: 90 },
        5, 5
      );
      expect(summary.length).toBeGreaterThan(10);
      expect(summary.toLowerCase()).toContain('photography');
      expect(summary.toLowerCase()).not.toContain('new moon');
    });

    it('generates summary for overcast night', () => {
      const summary = generateSummary(
        { cloud: 5, moon: 95, seeing: 80, transparency: 80, ground: 90 },
        5, 90
      );
      expect(summary.length).toBeGreaterThan(10);
      expect(summary.toLowerCase()).toContain('cloud');
      expect(summary.toLowerCase()).not.toContain('all night');
    });
  });

  describe('calculateStargazerScore', () => {
    it('returns complete StargazerScore object', () => {
      const result = calculateStargazerScore(
        { cloud: 80, moon: 90, seeing: 70, transparency: 75, ground: 85 },
        15, 15
      );
      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('label');
      expect(result).toHaveProperty('color');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('subScores');
      expect(result.overall).toBeGreaterThan(0);
      expect(result.overall).toBeLessThanOrEqual(100);
    });
  });

  describe('getSubScoreLabel', () => {
    it('returns "No interference" for moon score 90-100', () => {
      expect(getSubScoreLabel('moon', 95)).toBe('No interference');
    });

    it('returns "Severe interference" for moon score 0-24', () => {
      expect(getSubScoreLabel('moon', 10)).toBe('Severe interference');
    });

    it('returns "Clear skies" for cloud score 90-100', () => {
      expect(getSubScoreLabel('cloud', 95)).toBe('Clear skies');
    });

    it('returns "Overcast" for cloud score 0-24', () => {
      expect(getSubScoreLabel('cloud', 5)).toBe('Overcast');
    });

    it('returns labels for all sub-score keys', () => {
      expect(getSubScoreLabel('seeing', 92)).toBe('Excellent');
      expect(getSubScoreLabel('transparency', 95)).toBe('Crystal clear');
      expect(getSubScoreLabel('ground', 95)).toBe('Calm conditions');
    });

    it('returns empty string for unknown key', () => {
      expect(getSubScoreLabel('unknown', 50)).toBe('');
    });

    it('clamps values to 0-100 range', () => {
      expect(getSubScoreLabel('moon', 150)).toBe('No interference');
      expect(getSubScoreLabel('moon', -10)).toBe('Severe interference');
    });
  });

  // Integration scenarios
  describe('real-world scenarios', () => {
    it('perfect night: clear, new moon, excellent seeing', () => {
      const cloud = cloudScore(0);
      const moon = moonScore(0, 0);
      const seeing = seeingScore(2);
      const transparency = transparencyScore(2);
      const ground = groundScore(5, 40, 55, 35);
      const total = stargazerScore(cloud, moon, seeing, transparency, ground);
      expect(total).toBeGreaterThanOrEqual(90);
      expect(getScoreLabel(total)).toBe('Exceptional');
    });

    it('worst night: overcast with full moon', () => {
      const cloud = cloudScore(100);
      const moon = moonScore(100, 100);
      const seeing = seeingScore(8);
      const transparency = transparencyScore(8);
      const ground = groundScore(30, 95, 15, 14);
      const total = stargazerScore(cloud, moon, seeing, transparency, ground);
      expect(total).toBeLessThanOrEqual(10);
      expect(getScoreLabel(total)).toBe('Bad');
    });

    it('mixed conditions: clear but full moon up half the night', () => {
      const cloud = cloudScore(10);
      const moon = moonScore(95, 50);
      const seeing = seeingScore(4);
      const transparency = transparencyScore(3);
      const ground = groundScore(8, 60, 50, 38);
      const total = stargazerScore(cloud, moon, seeing, transparency, ground);
      expect(total).toBeGreaterThan(40);
      expect(total).toBeLessThanOrEqual(80);
    });
  });
});

it('does not invent a moonrise time for a bright Moon', () => {
  const summary = generateSummary({ cloud: 95, moon: 10, seeing: 80, transparency: 80, ground: 90 }, 95, 5);
  expect(summary).toMatch(/bright moonlight/i);
  expect(summary).not.toMatch(/11pm|rises at|new moon/i);
});
