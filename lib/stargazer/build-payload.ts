/**
 * Stargazer forecast payload: weather, astronomy, scoring, and location.
 * Nominatim is reached only via reverseGeocodingForStargazer.
 */

import { buildBeginnerNight } from '@/lib/stargazer/beginner-plan';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { reverseGeocodingForStargazer } from '@/lib/geocoding/lookup';
import {
  calculateDarkWindow,
  calculateMoonInfo,
  calculatePlanetVisibility,
  catalogObjectAltAz,
  calculateUpcomingSkyEvents,
} from '@/lib/stargazer/astronomy';
import { getPhotographyForecast } from '@/lib/stargazer/photography';
import { readStargazerWeather, readWeatherRetrievedAt } from '@/lib/stargazer/forecast-inputs';
import {
  fetchSevenTimerData,
  getSevenTimerAtTime,
} from '@/lib/stargazer/seven-timer';
import { fetchISSTLE, calculateISSPasses } from '@/lib/stargazer/satellites';
import { fetchUpcomingLaunches } from '@/lib/stargazer/launches';
import { estimateBortleClass } from '@/lib/stargazer/bortle';

import deepSkyCatalog from '@/data/deep-sky-catalog.json';
import meteorShowerData from '@/data/meteor-showers.json';

import type {
  StargazerData,
  DeepSkyHighlight,
  DeepSkyObject,
  MeteorShowerEvent,
  MeteorShower,
} from '@/lib/stargazer/types';

export class StargazerWeatherUnavailableError extends Error {
  constructor() {
    super('Failed to fetch weather data from Open-Meteo');
    this.name = 'StargazerWeatherUnavailableError';
  }
}

export async function buildStargazerPayload(lat: number, lon: number): Promise<StargazerData> {
  const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,relative_humidity_2m,dewpoint_2m,temperature_2m,wind_speed_10m,precipitation_probability,weather_code&temperature_unit=celsius&wind_speed_unit=kmh&forecast_days=2&timezone=auto&timeformat=unixtime`;

  const [openMeteoRes, sevenTimerData, issTle, launches, place] = await Promise.all([
    fetchWithTimeout(openMeteoUrl, { next: { revalidate: 900 } }),
    fetchSevenTimerData(lat, lon),
    fetchISSTLE(),
    fetchUpcomingLaunches(10),
    reverseGeocodingForStargazer(lat, lon),
  ]);

  if (!openMeteoRes.ok) {
    throw new StargazerWeatherUnavailableError();
  }

  const now = new Date();
  const { hours, timeZone } = readStargazerWeather(await openMeteoRes.json());
  const weatherRetrievedAt = readWeatherRetrievedAt(openMeteoRes, now);
  const darkWindow = calculateDarkWindow(lat, lon, now);
  const moonInfo = calculateMoonInfo(lat, lon, darkWindow);
  const planets = calculatePlanetVisibility(lat, lon, darkWindow);
  const skyEvents = calculateUpcomingSkyEvents(lat, lon, now, 10);

  const catalog = deepSkyCatalog as DeepSkyObject[];
  const darkMidpoint = new Date(
    (darkWindow.astronomicalDusk.getTime() + darkWindow.astronomicalDawn.getTime()) / 2,
  );

  const highlights: DeepSkyHighlight[] = [];
  const sampleMs = 30 * 60 * 1000;
  for (const obj of darkWindow.status === 'none' ? [] : catalog) {
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

  highlights.sort((a, b) => b.maxAltitude - a.maxAltitude);
  const deepSkyHighlights = highlights.slice(0, 8);

  const issPasses = issTle
    ? calculateISSPasses(issTle, lat, lon, now, 7)
    : [];

  const sunsetMs = (darkWindow.sunset ?? darkWindow.astronomicalDusk).getTime();
  const sunriseMs = darkWindow.sunrise?.getTime() ?? (darkWindow.status === 'none' ? now.getTime() + 86400000 : darkWindow.astronomicalDawn.getTime());

  const weatherHours = hours.filter(hour => hour.time.getTime() >= sunsetMs && hour.time.getTime() <= sunriseMs).map(hour => {
    const point = sevenTimerData ? getSevenTimerAtTime(sevenTimerData, hour.time, now) : null;
    return { ...hour, seeing: point?.seeing ?? null, transparency: point?.transparency ?? null };
  });
  const photography = getPhotographyForecast(weatherHours, darkWindow, moonInfo.illumination, moonInfo.moonUpDuringDarkWindowPercent);

  const showers = meteorShowerData as MeteorShower[];
  const meteorShowers: MeteorShowerEvent[] = showers
    .filter((s) => {
      const peakDate = new Date(now.getFullYear(), s.peakMonth - 1, s.peakDay);
      if (peakDate.getTime() < now.getTime() - 30 * 86400000) {
        peakDate.setFullYear(peakDate.getFullYear() + 1);
      }
      const daysUntilPeak = (peakDate.getTime() - now.getTime()) / 86400000;
      return daysUntilPeak >= -7 && daysUntilPeak <= 60;
    })
    .map((s) => {
      const peakDate = new Date(now.getFullYear(), s.peakMonth - 1, s.peakDay);
      if (peakDate.getTime() < now.getTime() - 30 * 86400000) {
        peakDate.setFullYear(peakDate.getFullYear() + 1);
      }
      const peakMoon = calculateMoonInfo(lat, lon, calculateDarkWindow(lat, lon, peakDate));
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

  const locationName = place?.locationName;
  const displayName = place?.displayName;
  const population = place?.population;
  const bortleEstimate = typeof population === 'number' && Number.isFinite(population) && population >= 0 ? estimateBortleClass(population) : null;

  return {
    ...photography,
    beginnerNight: buildBeginnerNight(weatherHours, { lat, lon, timezone: timeZone }, darkWindow, now.getTime()),
    darkWindow,
    moon: moonInfo,
    planets,
    deepSkyHighlights,
    skyEvents,
    issPasses,
    launches: launches ?? [],
    optionalData: { iss: issTle !== null, launches: launches !== null },
    meteorShowers,
    location: {
      timezone: timeZone,
      lat,
      lon,
      name: locationName,
      displayName,
      bortle: bortleEstimate?.bortle,
      bortleLabel: bortleEstimate?.label,
    },
    weatherRetrievedAt,
    generatedAt: now.toISOString(),
  };
}
