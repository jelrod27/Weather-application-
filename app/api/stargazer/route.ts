import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

import {
  calculateDarkWindow,
  calculateMoonInfo,
  calculatePlanetVisibility,
  catalogObjectAltAz,
  calculateUpcomingSkyEvents,
} from '@/lib/stargazer/astronomy';
import {
  scoreHour,
  findBestWindow,
  findLimitingFactor,
  calculateStargazerScore,
  getScoreLabel,
  getScoreColor,
  getSubScoreLabel,
} from '@/lib/stargazer/score';
import {
  fetchSevenTimerData,
  getSevenTimerAtTime,
} from '@/lib/stargazer/seven-timer';
import { fetchISSTLE, calculateISSPasses } from '@/lib/stargazer/satellites';
import { fetchUpcomingLaunches } from '@/lib/stargazer/launches';

import deepSkyCatalog from '@/data/deep-sky-catalog.json';
import meteorShowerData from '@/data/meteor-showers.json';

import type {
  StargazerData,
  StargazerSubScores,
  HourlyCondition,
  DeepSkyHighlight,
  DeepSkyObject,
  MeteorShowerEvent,
  MeteorShower,
  BestWindow,
  LimitingFactor,
} from '@/lib/stargazer/types';
import { estimateBortleClass } from '@/lib/stargazer/bortle';
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

export const revalidate = 900;

// ============================================================================
// Open-Meteo Types
// ============================================================================

interface OpenMeteoHourly {
  time: string[];
  cloud_cover: number[];
  cloud_cover_low: number[];
  cloud_cover_mid: number[];
  cloud_cover_high: number[];
  relative_humidity_2m: number[];
  dewpoint_2m: number[];
  temperature_2m: number[];
  wind_speed_10m: number[];
  visibility: number[];
  surface_pressure: number[];
}

interface OpenMeteoResponse {
  hourly: OpenMeteoHourly;
  utc_offset_seconds: number;
}

// ============================================================================
// Helpers
// ============================================================================

/** Convert Celsius to Fahrenheit */
function cToF(c: number): number {
  return c * 1.8 + 32;
}

/** Convert km/h to mph */
function kmhToMph(kmh: number): number {
  return kmh * 0.621371;
}

/** Compute dew risk from temperature and dewpoint (both in Celsius) */
function getDewRisk(tempC: number, dewpointC: number): 'low' | 'moderate' | 'high' {
  const delta = tempC - dewpointC;
  if (delta < 2) return 'high';
  if (delta < 5) return 'moderate';
  return 'low';
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
    const { searchParams } = request.nextUrl;
    const latStr = searchParams.get('lat');
    const lonStr = searchParams.get('lon');

    if (!latStr || !lonStr) {
      return NextResponse.json(
        { error: 'lat and lon query parameters are required' },
        { status: 400 },
      );
    }

    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json(
        { error: 'Invalid lat/lon values. lat must be -90..90, lon must be -180..180' },
        { status: 400 },
      );
    }

    try {
      // ---- Parallel fetches ----
      const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,relative_humidity_2m,dewpoint_2m,temperature_2m,wind_speed_10m,visibility,surface_pressure&forecast_days=2&timezone=auto`;

      const reverseGeoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&extratags=1`;

      const [openMeteoRes, sevenTimerData, issTle, launches, reverseGeoRes] = await Promise.all([
        fetchWithTimeout(openMeteoUrl, { next: { revalidate: 900 } }),
        fetchSevenTimerData(lat, lon),
        fetchISSTLE(),
        fetchUpcomingLaunches(10),
        fetchWithTimeout(reverseGeoUrl, { next: { revalidate: 86400 }, headers: { 'User-Agent': '16BitWeather/1.0 (https://16bitweather.co)' } }).catch(() => null),
      ]);

      // ---- Parse Open-Meteo ----
      if (!openMeteoRes.ok) {
        console.error('[Stargazer] Open-Meteo HTTP error:', openMeteoRes.status);
        return NextResponse.json(
          { error: 'Failed to fetch weather data from Open-Meteo' },
          { status: 502 },
        );
      }

      const openMeteo = (await openMeteoRes.json()) as OpenMeteoResponse;
      const hourly = openMeteo.hourly;

      // Open-Meteo returns times like "2026-04-05T20:00" without timezone.
      // Append the UTC offset so `new Date()` interprets them correctly.
      const utcOffsetSec = openMeteo.utc_offset_seconds ?? 0;
      const offsetSign = utcOffsetSec >= 0 ? '+' : '-';
      const absOffset = Math.abs(utcOffsetSec);
      const offsetHH = String(Math.floor(absOffset / 3600)).padStart(2, '0');
      const offsetMM = String(Math.floor((absOffset % 3600) / 60)).padStart(2, '0');
      const tzSuffix = `${offsetSign}${offsetHH}:${offsetMM}`;

      // ---- Astronomy calculations ----
      const now = new Date();
      const darkWindow = calculateDarkWindow(lat, lon, now);
      const moonInfo = calculateMoonInfo(lat, lon, darkWindow);
      const planets = calculatePlanetVisibility(lat, lon, darkWindow);
      const skyEvents = calculateUpcomingSkyEvents(lat, lon, now, 10);

      // ---- Deep sky highlights ----
      const catalog = deepSkyCatalog as DeepSkyObject[];
      const darkMidpoint = new Date(
        (darkWindow.astronomicalDusk.getTime() + darkWindow.astronomicalDawn.getTime()) / 2,
      );

      const highlights: DeepSkyHighlight[] = [];
      const sampleMs = 30 * 60 * 1000;
      for (const obj of catalog) {
        // Sample every 30 minutes across the full dark window to find maxAltitude
        let maxAlt = -90;
        let transitTime = darkMidpoint;
        for (
          let t = darkWindow.astronomicalDusk.getTime();
          t <= darkWindow.astronomicalDawn.getTime();
          t += sampleMs
        ) {
          const sampleDate = new Date(t);
          const pos = catalogObjectAltAz(obj.ra, obj.dec, lat, lon, sampleDate);
          if (pos.altitude > maxAlt) {
            maxAlt = pos.altitude;
            transitTime = sampleDate;
          }
        }

        if (maxAlt > 30) {
          const transitsDuringDarkWindow =
            transitTime.getTime() >= darkWindow.astronomicalDusk.getTime() &&
            transitTime.getTime() <= darkWindow.astronomicalDawn.getTime();

          highlights.push({
            ...obj,
            maxAltitude: Math.round(maxAlt * 10) / 10,
            transitTime,
            transitsDuringDarkWindow,
          });
        }
      }

      // Sort by max altitude descending, take top 8
      highlights.sort((a, b) => b.maxAltitude - a.maxAltitude);
      const deepSkyHighlights = highlights.slice(0, 8);

      // ---- ISS passes ----
      const issPasses = issTle
        ? calculateISSPasses(issTle, lat, lon, now, 7)
        : [];

      // ---- Hourly conditions (sunset to sunrise) ----
      const sunsetMs = darkWindow.sunset.getTime();
      const sunriseMs = darkWindow.sunrise.getTime();

      const hourlyConditions: HourlyCondition[] = [];

      for (let i = 0; i < hourly.time.length; i++) {
        const t = new Date(hourly.time[i] + tzSuffix);
        const tMs = t.getTime();

        if (tMs < sunsetMs || tMs > sunriseMs) continue;

        // Get 7Timer data for this hour (defaults if unavailable)
        const stPoint = sevenTimerData ? getSevenTimerAtTime(sevenTimerData, t) : null;
        const seeing = stPoint ? stPoint.seeing : 4; // default mid-range
        const transparency = stPoint ? stPoint.transparency : 4;

        const tempC = hourly.temperature_2m[i];
        const dewpointC = hourly.dewpoint_2m[i];

        hourlyConditions.push({
          time: t,
          cloudCover: hourly.cloud_cover[i],
          cloudCoverLow: hourly.cloud_cover_low[i],
          cloudCoverMid: hourly.cloud_cover_mid[i],
          cloudCoverHigh: hourly.cloud_cover_high[i],
          seeing,
          transparency,
          windSpeed: hourly.wind_speed_10m[i],
          humidity: hourly.relative_humidity_2m[i],
          temperature: tempC,
          dewpoint: dewpointC,
          dewRisk: getDewRisk(tempC, dewpointC),
        });
      }

      // ---- Per-Hour Scoring ----
      const darkDuskMs = darkWindow.astronomicalDusk.getTime();
      const darkDawnMs = darkWindow.astronomicalDawn.getTime();
      // moonInfo.illumination is already 0-100 (percentage)
      const moonIllumPct = moonInfo.illumination;
      const moonUpPct = moonInfo.moonUpDuringDarkWindowPercent;

      // Score each hour in the dark window individually
      const darkHourIndices: number[] = [];
      for (let i = 0; i < hourlyConditions.length; i++) {
        const h = hourlyConditions[i];
        const tMs = h.time.getTime();
        if (tMs >= darkDuskMs && tMs <= darkDawnMs) {
          darkHourIndices.push(i);
        }

        // Score every hour (dark window or not) for the timeline display
        const result = scoreHour(
          h.cloudCover,
          moonIllumPct,
          moonUpPct,
          h.seeing,
          h.transparency,
          kmhToMph(h.windSpeed),
          h.humidity,
          cToF(h.temperature),
          cToF(h.dewpoint),
          h.cloudCoverHigh,
          h.cloudCover,
        );
        hourlyConditions[i].hourlyScore = result.score;
        hourlyConditions[i].hourlySubScores = result.subScores;
        hourlyConditions[i].cirrusWarning = result.cirrusWarning;
      }

      // Extract dark-window hourly scores for best window calculation
      const darkHourScores = darkHourIndices.map((i) => hourlyConditions[i].hourlyScore!);

      // Find the best 3-hour contiguous block
      const bestWindowResult = findBestWindow(darkHourScores, 3);

      let bestWindow: BestWindow | null = null;
      let headlineSubScores: StargazerSubScores;
      let headlineScore: number;

      if (bestWindowResult && darkHourIndices.length > 0) {
        const bwStartIdx = darkHourIndices[bestWindowResult.startIndex];
        const bwEndIdx = darkHourIndices[bestWindowResult.endIndex];

        bestWindow = {
          startTime: hourlyConditions[bwStartIdx].time,
          endTime: hourlyConditions[bwEndIdx].time,
          score: bestWindowResult.score,
          label: getScoreLabel(bestWindowResult.score),
          color: getScoreColor(getScoreLabel(bestWindowResult.score)),
        };

        // Average sub-scores across the best window for the headline breakdown
        const bwHours = darkHourIndices
          .slice(bestWindowResult.startIndex, bestWindowResult.endIndex + 1)
          .map((i) => hourlyConditions[i].hourlySubScores!);
        headlineSubScores = {
          cloud: Math.round(bwHours.reduce((s, h) => s + h.cloud, 0) / bwHours.length),
          moon: Math.round(bwHours.reduce((s, h) => s + h.moon, 0) / bwHours.length),
          seeing: Math.round(bwHours.reduce((s, h) => s + h.seeing, 0) / bwHours.length),
          transparency: Math.round(bwHours.reduce((s, h) => s + h.transparency, 0) / bwHours.length),
          ground: Math.round(bwHours.reduce((s, h) => s + h.ground, 0) / bwHours.length),
        };
        headlineScore = bestWindowResult.score;
      } else {
        // Fallback: no dark hours, score from all available conditions
        const fallback = hourlyConditions.length > 0
          ? hourlyConditions.map((h) => h.hourlySubScores!)
          : null;
        if (fallback && fallback.length > 0) {
          headlineSubScores = {
            cloud: Math.round(fallback.reduce((s, h) => s + h.cloud, 0) / fallback.length),
            moon: Math.round(fallback.reduce((s, h) => s + h.moon, 0) / fallback.length),
            seeing: Math.round(fallback.reduce((s, h) => s + h.seeing, 0) / fallback.length),
            transparency: Math.round(fallback.reduce((s, h) => s + h.transparency, 0) / fallback.length),
            ground: Math.round(fallback.reduce((s, h) => s + h.ground, 0) / fallback.length),
          };
        } else {
          headlineSubScores = { cloud: 50, moon: 50, seeing: 50, transparency: 50, ground: 50 };
        }
        headlineScore = hourlyConditions.length > 0
          ? Math.round(hourlyConditions.reduce((s, h) => s + (h.hourlyScore ?? 0), 0) / hourlyConditions.length)
          : 50;
      }

      // Full-night average for secondary display
      const nightAverage = darkHourScores.length > 0
        ? Math.round(darkHourScores.reduce((s, v) => s + v, 0) / darkHourScores.length)
        : headlineScore;

      // Compute average cloud cover for summary generation
      const avgCloudCover = darkHourIndices.length > 0
        ? darkHourIndices.reduce((s, i) => s + hourlyConditions[i].cloudCover, 0) / darkHourIndices.length
        : hourlyConditions.length > 0
          ? hourlyConditions.reduce((s, h) => s + h.cloudCover, 0) / hourlyConditions.length
          : 50;

      const score = calculateStargazerScore(headlineSubScores, moonIllumPct, avgCloudCover);
      // Override the overall with the best-window score (calculateStargazerScore recomputes from sub-scores)
      score.overall = headlineScore;
      score.label = getScoreLabel(headlineScore);
      score.color = getScoreColor(score.label);

      // ---- Limiting Factor ----
      let limitingFactor: LimitingFactor | null = null;
      if (headlineScore < 85) {
        const { category, score: limitScore } = findLimitingFactor(headlineSubScores);
        const label = getSubScoreLabel(category, limitScore);

        // Generate contextual detail string
        let detail = '';
        if (category === 'moon' && moonInfo.rise) {
          const moonRiseStr = new Date(moonInfo.rise).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          detail = `rises at ${moonRiseStr} with ${Math.round(moonIllumPct)}% illumination`;
        } else if (category === 'cloud') {
          detail = `${Math.round(avgCloudCover)}% average cloud cover`;
        } else if (category === 'seeing') {
          detail = 'atmospheric turbulence limiting resolution';
        } else if (category === 'transparency') {
          const hasCirrus = hourlyConditions.some((h) => h.cirrusWarning);
          detail = hasCirrus ? 'high-altitude cirrus reducing clarity' : 'haze or moisture reducing clarity';
        } else if (category === 'ground') {
          detail = 'wind, humidity, or dew risk affecting conditions';
        }

        limitingFactor = { category, label, detail };
      }

      // ---- Meteor showers with moon interference ----
      const showers = meteorShowerData as MeteorShower[];
      const meteorShowers: MeteorShowerEvent[] = showers
        .filter((s) => {
          // Include showers peaking within the next 60 days
          const peakDate = new Date(now.getFullYear(), s.peakMonth - 1, s.peakDay);
          // If peak already passed this year, check next year
          if (peakDate.getTime() < now.getTime() - 30 * 86400000) {
            peakDate.setFullYear(peakDate.getFullYear() + 1);
          }
          const daysUntilPeak = (peakDate.getTime() - now.getTime()) / 86400000;
          return daysUntilPeak >= -7 && daysUntilPeak <= 60;
        })
        .map((s) => {
          // Compute moon illumination at each shower's actual peak date
          const peakDate = new Date(now.getFullYear(), s.peakMonth - 1, s.peakDay);
          if (peakDate.getTime() < now.getTime() - 30 * 86400000) {
            peakDate.setFullYear(peakDate.getFullYear() + 1);
          }
          const peakMoon = calculateMoonInfo(lat, lon, calculateDarkWindow(lat, lon, peakDate));
          // peakMoon.illumination is already 0-100 (see lib/stargazer/astronomy.ts)
          const moonIllumPct = peakMoon.illumination;

          let moonInterference: MeteorShowerEvent['moonInterference'];
          if (moonIllumPct < 15) {
            moonInterference = 'none';
          } else if (moonIllumPct < 40) {
            moonInterference = 'low';
          } else if (moonIllumPct < 70) {
            moonInterference = 'moderate';
          } else {
            moonInterference = 'high';
          }

          return {
            ...s,
            moonInterference,
            moonIlluminationAtPeak: Math.round(moonIllumPct),
          };
        });

      // ---- Location name & Bortle ----
      let locationName: string | undefined;
      let displayName: string | undefined;
      let population: number | undefined;
      if (reverseGeoRes && reverseGeoRes.ok) {
        try {
          const geoData = await reverseGeoRes.json();
          if (geoData && geoData.address) {
            const addr = geoData.address;
            locationName = addr.city || addr.town || addr.village || addr.hamlet;
            const state = addr.state;
            const country = addr.country_code?.toUpperCase();
            displayName = locationName && state
              ? `${locationName}, ${state}`
              : locationName && country
                ? `${locationName}, ${country}`
                : locationName;
            const popStr = geoData.extratags?.population;
            if (popStr) {
              const parsed = parseInt(popStr, 10);
              if (!Number.isNaN(parsed)) {
                population = parsed;
              }
            }
          }
        } catch {
          // Reverse geocoding is best-effort
        }
      }
      const bortleEstimate = estimateBortleClass(population);

      // ---- Build response ----
      const data: StargazerData = {
        score,
        bestWindow,
        nightAverage,
        limitingFactor,
        darkWindow,
        hourlyConditions,
        moon: moonInfo,
        planets,
        deepSkyHighlights,
        skyEvents,
        issPasses,
        launches,
        meteorShowers,
        location: {
          lat,
          lon,
          name: locationName,
          displayName,
          bortle: bortleEstimate.bortle,
          bortleLabel: bortleEstimate.label,
        },
        generatedAt: new Date().toISOString(),
      };

      return NextResponse.json(data);
    } catch (error) {
      logRouteError('Stargazer', error);
      return NextResponse.json(
        { error: 'Internal server error while computing stargazer forecast' },
        { status: 500 },
      );
    }
  }, { rateLimitBucket: 'content' })
}
