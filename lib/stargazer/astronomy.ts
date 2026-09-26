/**
 * Stargazer - Astronomy Engine Wrapper
 *
 * Wraps the astronomy-engine npm package for celestial calculations
 * used by the Stargazer astrophotography forecast.
 */

import {
  Body,
  Observer,
  Horizon,
  Equator,
  Illumination,
  SearchRiseSet,
  MoonPhase,
  SearchMoonPhase,
  SearchAltitude,
  MakeTime,
  Rotation_EQJ_EQD,
  VectorFromSphere,
  Spherical,
  RotateVector,
  EquatorFromVector,
  SearchLunarEclipse,
  SearchGlobalSolarEclipse,
} from 'astronomy-engine';

import type {
  DarkWindow,
  MoonInfo,
  PlanetVisibility,
  SkyEvent,
} from '@/lib/stargazer/types';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Approximate constellation from RA (hours) and Dec (degrees).
 * Uses a simplified mapping based on RA ranges along the ecliptic
 * and well-known constellations. This is a rough approximation.
 */
function getConstellationName(ra: number, dec: number): string {
  // Simplified constellation boundaries based on RA (hours)
  // These are approximate and cover the major constellations
  // visible along and near the ecliptic
  const constellations: { name: string; raMin: number; raMax: number; decMin: number; decMax: number }[] = [
    { name: 'Pisces', raMin: 0, raMax: 2, decMin: -20, decMax: 30 },
    { name: 'Aries', raMin: 2, raMax: 3.5, decMin: -10, decMax: 30 },
    { name: 'Taurus', raMin: 3.5, raMax: 6, decMin: -20, decMax: 30 },
    { name: 'Gemini', raMin: 6, raMax: 8, decMin: -10, decMax: 35 },
    { name: 'Cancer', raMin: 8, raMax: 9.5, decMin: -10, decMax: 30 },
    { name: 'Leo', raMin: 9.5, raMax: 12, decMin: -20, decMax: 30 },
    { name: 'Virgo', raMin: 12, raMax: 15, decMin: -25, decMax: 15 },
    { name: 'Libra', raMin: 15, raMax: 16, decMin: -30, decMax: 0 },
    { name: 'Scorpius', raMin: 16, raMax: 17.5, decMin: -45, decMax: -10 },
    { name: 'Ophiuchus', raMin: 16, raMax: 18, decMin: -10, decMax: 15 },
    { name: 'Sagittarius', raMin: 17.5, raMax: 20, decMin: -45, decMax: -15 },
    { name: 'Capricornus', raMin: 20, raMax: 21.5, decMin: -30, decMax: -10 },
    { name: 'Aquarius', raMin: 21.5, raMax: 24, decMin: -25, decMax: 5 },
    // High declination constellations
    { name: 'Ursa Major', raMin: 8, raMax: 14, decMin: 30, decMax: 90 },
    { name: 'Cassiopeia', raMin: 22, raMax: 3, decMin: 50, decMax: 90 },
    { name: 'Orion', raMin: 5, raMax: 6, decMin: -10, decMax: 20 },
    { name: 'Cygnus', raMin: 19, raMax: 22, decMin: 25, decMax: 60 },
    { name: 'Lyra', raMin: 18, raMax: 19.5, decMin: 25, decMax: 50 },
    { name: 'Aquila', raMin: 18.5, raMax: 20.5, decMin: -10, decMax: 20 },
    { name: 'Canis Major', raMin: 6, raMax: 7.5, decMin: -35, decMax: -10 },
  ];

  for (const c of constellations) {
    const raMatch = c.raMin < c.raMax
      ? (ra >= c.raMin && ra < c.raMax)
      : (ra >= c.raMin || ra < c.raMax); // wraps around 24h
    const decMatch = dec >= c.decMin && dec <= c.decMax;
    if (raMatch && decMatch) {
      return c.name;
    }
  }

  // Fallback based on RA alone (ecliptic)
  const eclipticFallback = [
    'Pisces', 'Pisces', 'Aries', 'Taurus', 'Taurus', 'Taurus',
    'Gemini', 'Gemini', 'Cancer', 'Leo', 'Leo', 'Leo',
    'Virgo', 'Virgo', 'Virgo', 'Libra', 'Scorpius', 'Ophiuchus',
    'Sagittarius', 'Sagittarius', 'Capricornus', 'Aquarius', 'Aquarius', 'Pisces',
  ];
  return eclipticFallback[Math.floor(ra) % 24];
}

/**
 * Get the phase name from a phase angle (0-360 degrees).
 */
function getPhaseName(phaseAngle: number): string {
  const a = ((phaseAngle % 360) + 360) % 360;
  if (a < 22.5 || a >= 337.5) return 'New Moon';
  if (a < 67.5) return 'Waxing Crescent';
  if (a < 112.5) return 'First Quarter';
  if (a < 157.5) return 'Waxing Gibbous';
  if (a < 202.5) return 'Full Moon';
  if (a < 247.5) return 'Waning Gibbous';
  if (a < 292.5) return 'Last Quarter';
  return 'Waning Crescent';
}

// ============================================================================
// Dark Window
// ============================================================================

/**
 * Calculate the dark window for a given location and date.
 * Returns sunset, sunrise, astronomical dusk (sun at -18 deg),
 * and astronomical dawn (sun at -18 deg).
 */
export function calculateDarkWindow(
  lat: number,
  lon: number,
  date: Date
): DarkWindow {
  const observer = new Observer(lat, lon, 0);
  const astroTime = MakeTime(date);

  // Strategy: find next sunrise first, then search backward from it
  // for the previous sunset/dusk. This handles the case where the
  // current time is already past sunset (e.g., 10pm).
  const sunriseResult = SearchRiseSet(Body.Sun, observer, +1, astroTime, 2);
  if (!sunriseResult) {
    // Polar night can still have daily astronomical twilight crossings.
    const dawn = SearchAltitude(Body.Sun, observer, +1, astroTime, 2, -18);
    const dusk = dawn && SearchAltitude(Body.Sun, observer, -1, MakeTime(dawn.date), -2, -18);
    if (dawn && dusk) {
      return { status: 'normal', sunset: null, sunrise: null,
        astronomicalDusk: dusk.date, astronomicalDawn: dawn.date };
    }
    // With no crossings, the current altitude distinguishes darkness from daylight.
    const sunEq = Equator(Body.Sun, astroTime, observer, true, true);
    const sunHor = Horizon(astroTime, observer, sunEq.ra, sunEq.dec);
    if (sunHor.altitude < -18) {
      // Polar night: it's dark all day — return full 24hr dark window
      const start = new Date(date);
      const end = new Date(start.getTime() + 86400000);
      return { status: 'continuous', sunset: null, sunrise: null, astronomicalDusk: start, astronomicalDawn: end };
    }
    // Polar day: sun never sets — no dark window
    const now = new Date(date);
    return { status: 'none', sunset: null, sunrise: null, astronomicalDusk: now, astronomicalDawn: now };
  }
  const sunriseDate = sunriseResult.date;

  // Search backward from sunrise for the previous sunset
  const sunriseAstro = MakeTime(sunriseDate);
  const sunsetResult = SearchRiseSet(Body.Sun, observer, -1, sunriseAstro, -1);

  // Astronomical dusk: sun crosses -18 degrees going down before sunrise
  const duskResult = SearchAltitude(
    Body.Sun,
    observer,
    -1, // setting direction
    sunriseAstro,
    -1, // search backward up to 1 day
    -18 // altitude threshold
  );

  // Astronomical dawn: sun crosses -18 degrees going up before sunrise
  const dawnResult = SearchAltitude(
    Body.Sun,
    observer,
    +1, // rising direction
    sunriseAstro,
    -1, // search backward up to 1 day
    -18
  );

  if (!duskResult || !dawnResult) {
    return {
      status: 'none', sunset: sunsetResult?.date ?? null, sunrise: sunriseDate,
      astronomicalDusk: sunriseDate, astronomicalDawn: sunriseDate,
    };
  }

  // Dawn should be AFTER dusk and BEFORE sunrise
  // If backward search found a dawn before dusk, search forward from dusk instead
  let finalDawn = dawnResult ? dawnResult.date : sunriseDate;
  const finalDusk = duskResult ? duskResult.date : (sunsetResult ? sunsetResult.date : date);

  if (finalDawn.getTime() < finalDusk.getTime()) {
    // Dawn found was before dusk -- search forward from dusk instead
    const dawnForward = SearchAltitude(
      Body.Sun,
      observer,
      +1,
      MakeTime(finalDusk),
      1,
      -18
    );
    finalDawn = dawnForward ? dawnForward.date : sunriseDate;
  }

  if (finalDawn.getTime() <= date.getTime()) {
    return calculateDarkWindow(lat, lon, new Date(sunriseDate.getTime() + 60000));
  }

  return {
    status: 'normal',
    sunset: sunsetResult?.date ?? null,
    sunrise: sunriseDate,
    astronomicalDusk: finalDusk,
    astronomicalDawn: finalDawn,
  };
}

// ============================================================================
// Moon Info
// ============================================================================

/**
 * Calculate moon information relative to the dark window.
 */
export function calculateMoonInfo(
  lat: number,
  lon: number,
  darkWindow: DarkWindow
): MoonInfo {
  const observer = new Observer(lat, lon, 0);
  const darkStart = darkWindow.astronomicalDusk;
  const darkEnd = darkWindow.astronomicalDawn;
  const darkStartTime = MakeTime(darkStart);
  const moonSearchStart = darkWindow.sunset ?? darkStart;

  // Moon phase angle (0-360)
  const phaseAngle = MoonPhase(darkStartTime);

  // Moon illumination
  const illumInfo = Illumination(Body.Moon, darkStartTime);
  const illumination = illumInfo.phase_fraction * 100;

  // Moon rise and set near dark window
  // Check if moon is already above horizon at sunset to choose correct search direction
  const moonEqAtSunset = Equator(Body.Moon, MakeTime(moonSearchStart), observer, true, true);
  const moonHorAtSunset = Horizon(MakeTime(moonSearchStart), observer, moonEqAtSunset.ra, moonEqAtSunset.dec, 'normal');
  const moonAlreadyUp = moonHorAtSunset.altitude > 0;

  // If moon is already up, search forward for set and backward for the preceding rise
  // If moon is down, search forward for rise and forward for next set
  const moonRise = moonAlreadyUp
    ? SearchRiseSet(Body.Moon, observer, +1, MakeTime(new Date(moonSearchStart.getTime() - 86400000)), 2)
    : SearchRiseSet(Body.Moon, observer, +1, MakeTime(moonSearchStart), 1);
  const moonSet = SearchRiseSet(Body.Moon, observer, -1, MakeTime(moonSearchStart), 1);

  // Calculate what percentage of the dark window the moon is above horizon
  const moonUpPercent = calculateMoonUpPercent(
    observer,
    darkStart,
    darkEnd,
    moonRise ? moonRise.date : null,
    moonSet ? moonSet.date : null
  );

  // Next new moon (phase angle = 0)
  const nextNew = SearchMoonPhase(0, darkStartTime, 40);
  // Next full moon (phase angle = 180)
  const nextFull = SearchMoonPhase(180, darkStartTime, 40);

  return {
    phaseName: getPhaseName(phaseAngle),
    phaseAngle,
    illumination,
    rise: moonRise ? moonRise.date : null,
    set: moonSet ? moonSet.date : null,
    moonUpDuringDarkWindowPercent: moonUpPercent,
    darkWindowStart: darkWindow.status === 'none' ? null : darkStart,
    darkWindowEnd: darkWindow.status === 'none' ? null : darkEnd,
    nextNewMoon: nextNew ? nextNew.date : new Date(darkStart.getTime() + 29.5 * 86400000),
    nextFullMoon: nextFull ? nextFull.date : new Date(darkStart.getTime() + 14.75 * 86400000),
  };
}

/**
 * Calculate the percentage of the dark window during which the moon is above the horizon.
 * Samples every 15 minutes within the dark window.
 */
function calculateMoonUpPercent(
  observer: Observer,
  darkStart: Date,
  darkEnd: Date,
  moonRise: Date | null,
  moonSet: Date | null
): number {
  const totalMs = darkEnd.getTime() - darkStart.getTime();
  if (totalMs <= 0) return 0;

  const sampleIntervalMs = 15 * 60 * 1000; // 15 minutes
  let samplesAbove = 0;
  let totalSamples = 0;

  for (
    let t = darkStart.getTime();
    t <= darkEnd.getTime();
    t += sampleIntervalMs
  ) {
    totalSamples++;
    const time = MakeTime(new Date(t));
    const eq = Equator(Body.Moon, time, observer, true, true);
    const hor = Horizon(time, observer, eq.ra, eq.dec, 'normal');
    if (hor.altitude > 0) {
      samplesAbove++;
    }
  }

  return totalSamples > 0 ? Math.round((samplesAbove / totalSamples) * 100) : 0;
}

// ============================================================================
// Planet Visibility
// ============================================================================

const PLANET_BODIES: { name: string; body: Body }[] = [
  { name: 'Mercury', body: Body.Mercury },
  { name: 'Venus', body: Body.Venus },
  { name: 'Mars', body: Body.Mars },
  { name: 'Jupiter', body: Body.Jupiter },
  { name: 'Saturn', body: Body.Saturn },
  { name: 'Uranus', body: Body.Uranus },
  { name: 'Neptune', body: Body.Neptune },
];

/**
 * Calculate visibility of planets during the dark window.
 * Only includes planets that reach > 10 degrees altitude.
 */
export function calculatePlanetVisibility(
  lat: number,
  lon: number,
  darkWindow: DarkWindow
): PlanetVisibility[] {
  if (darkWindow.status === 'none' || darkWindow.astronomicalDawn <= darkWindow.astronomicalDusk) return [];
  const observer = new Observer(lat, lon, 0);
  const darkStart = darkWindow.astronomicalDusk;
  const darkEnd = darkWindow.astronomicalDawn;
  const results: PlanetVisibility[] = [];

  for (const planet of PLANET_BODIES) {
    const startTime = MakeTime(darkWindow.sunset ?? darkStart);

    // Rise and set times
    const rise = SearchRiseSet(planet.body, observer, +1, startTime, 1);
    const set = SearchRiseSet(planet.body, observer, -1, startTime, 1);

    // Sample altitude every 30 minutes during dark window
    let peakAlt = -90;
    let peakDate = darkStart;
    const sampleMs = 30 * 60 * 1000;

    for (
      let t = darkStart.getTime();
      t <= darkEnd.getTime();
      t += sampleMs
    ) {
      const sampleDate = new Date(t);
      const sampleTime = MakeTime(sampleDate);
      const eq = Equator(planet.body, sampleTime, observer, true, true);
      const hor = Horizon(sampleTime, observer, eq.ra, eq.dec, 'normal');
      if (hor.altitude > peakAlt) {
        peakAlt = hor.altitude;
        peakDate = sampleDate;
      }
    }

    // Only include if peak altitude > 10 degrees during dark window
    if (peakAlt <= 10) continue;

    // Get magnitude from illumination
    const illum = Illumination(planet.body, MakeTime(peakDate));
    const magnitude = illum.mag;

    // Get equatorial coordinates for constellation lookup
    const eq = Equator(planet.body, MakeTime(peakDate), observer, true, true);
    const constellation = getConstellationName(eq.ra, eq.dec);

    // Generate descriptive notes
    let notes = `in ${constellation}`;
    if (magnitude < 0) {
      notes += ', very bright';
    } else if (magnitude < 2) {
      notes += ', easily visible';
    } else if (magnitude < 5) {
      notes += ', visible with binoculars';
    } else {
      notes += ', requires telescope';
    }

    results.push({
      name: planet.name,
      rise: rise ? rise.date : null,
      set: set ? set.date : null,
      peakAltitude: Math.round(peakAlt * 10) / 10,
      peakTime: peakDate,
      magnitude: Math.round(magnitude * 100) / 100,
      constellation,
      notes,
    });
  }

  // Sort by peak altitude descending (most prominent first)
  results.sort((a, b) => b.peakAltitude - a.peakAltitude);

  return results;
}

// ============================================================================
// Catalog Object Alt/Az
// ============================================================================

/**
 * Convert catalog RA/Dec (J2000) to horizontal coordinates (altitude/azimuth)
 * for a given observer location and time.
 */
export function catalogObjectAltAz(
  ra_hours: number,
  dec_degrees: number,
  lat: number,
  lon: number,
  time: Date
): { altitude: number; azimuth: number } {
  const vector = VectorFromSphere(new Spherical(dec_degrees, ra_hours * 15, 1), time);
  const equator = EquatorFromVector(RotateVector(Rotation_EQJ_EQD(time), vector));
  const position = Horizon(time, new Observer(lat, lon, 0), equator.ra, equator.dec, 'normal');
  return { altitude: position.altitude, azimuth: position.azimuth };
}

/** Topocentric equator-of-date coordinates, then true-north horizontal position. */
export function bodyAltAz(body: Body, lat: number, lon: number, time: Date, refraction: 'normal' | 'none' = 'normal'): { altitude: number; azimuth: number } {
  const observer = new Observer(lat, lon, 0);
  const equator = Equator(body, time, observer, true, true);
  const position = Horizon(time, observer, equator.ra, equator.dec, refraction === 'none' ? undefined : refraction);
  return { altitude: position.altitude, azimuth: position.azimuth };
}

// ============================================================================
// Upcoming Sky Events
// ============================================================================

/**
 * Equinox/solstice dates for a given year.
 * Returns approximate dates based on typical astronomical calendar.
 */
function getEquinoxSolsticeDates(year: number): SkyEvent[] {
  const events: SkyEvent[] = [];

  // Approximate dates - these shift slightly year to year
  const dates: { month: number; day: number; type: SkyEvent['type']; title: string; desc: string }[] = [
    { month: 2, day: 20, type: 'equinox', title: 'Vernal Equinox', desc: 'Sun crosses celestial equator northward. Day and night are nearly equal.' },
    { month: 5, day: 21, type: 'solstice', title: 'Summer Solstice', desc: 'Longest day of the year in the Northern Hemisphere. Shortest night for observing.' },
    { month: 8, day: 22, type: 'equinox', title: 'Autumnal Equinox', desc: 'Sun crosses celestial equator southward. Day and night are nearly equal.' },
    { month: 11, day: 21, type: 'solstice', title: 'Winter Solstice', desc: 'Shortest day of the year in the Northern Hemisphere. Longest night for observing.' },
  ];

  for (const d of dates) {
    events.push({
      date: new Date(Date.UTC(year, d.month, d.day)),
      calendarDate: new Date(Date.UTC(year, d.month, d.day)).toISOString().slice(0, 10),
      type: d.type,
      title: d.title,
      description: `Approximate date. ${d.desc}`,
    });
  }

  return events;
}

/**
 * Search for upcoming sky events including lunar eclipses,
 * solar eclipses, and equinoxes/solstices.
 */
export function calculateUpcomingSkyEvents(
  lat: number,
  lon: number,
  fromDate: Date,
  count: number
): SkyEvent[] {
  const events: SkyEvent[] = [];
  const astroTime = MakeTime(fromDate);

  // Search for next lunar eclipses
  let lunarSearch = astroTime;
  for (let i = 0; i < 4; i++) {
    try {
      const eclipse = SearchLunarEclipse(lunarSearch);
      if (eclipse && eclipse.peak) {
        events.push({
          date: eclipse.peak.date,
          type: 'lunar_eclipse',
          title: `Lunar Eclipse (${eclipse.kind})`,
          description: `A ${eclipse.kind} lunar eclipse. The Moon passes through Earth's shadow.`,
        });
        // Search from after this eclipse
        lunarSearch = MakeTime(
          new Date(eclipse.peak.date.getTime() + 30 * 86400000)
        );
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  // Search for next solar eclipses
  let solarSearch = astroTime;
  for (let i = 0; i < 4; i++) {
    try {
      const eclipse = SearchGlobalSolarEclipse(solarSearch);
      if (eclipse && eclipse.peak) {
        events.push({
          date: eclipse.peak.date,
          type: 'solar_eclipse',
          title: `Solar Eclipse (${eclipse.kind})`,
          description: `A ${eclipse.kind} solar eclipse. The Moon passes between Earth and the Sun.`,
        });
        solarSearch = MakeTime(
          new Date(eclipse.peak.date.getTime() + 30 * 86400000)
        );
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  // Add equinoxes and solstices for current and next year
  const currentYear = fromDate.getFullYear();
  const eqSolEvents = [
    ...getEquinoxSolsticeDates(currentYear),
    ...getEquinoxSolsticeDates(currentYear + 1),
  ].filter((e) => e.date.getTime() > fromDate.getTime());
  events.push(...eqSolEvents);

  // Sort by date and return the requested count
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  return events.slice(0, count);
}
