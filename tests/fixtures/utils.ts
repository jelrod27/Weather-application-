import type { Page} from '@playwright/test';
import { expect } from '@playwright/test';
import { stargazerE2eFixture } from './stargazer-e2e-fixture';

/** True when E2E targets a deployed preview/prod URL (not localhost). */
export function isRemotePreviewTarget(): boolean {
  const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL;
  if (!baseUrl) return false;

  try {
    const { hostname } = new URL(baseUrl);
    return hostname !== '127.0.0.1' && hostname !== 'localhost';
  } catch {
    return false;
  }
}

type StubOptions = {
  cityName?: string;
  country?: string;
  lat?: number;
  lon?: number;
  tempF?: number;
  humidity?: number;
  pressure?: number;
  conditionMain?: string;
  conditionDescription?: string;
};

const defaultOptions: Required<StubOptions> = {
  cityName: 'New York',
  country: 'US',
  lat: 40.7128,
  lon: -74.006,
  tempF: 72,
  humidity: 45,
  pressure: 1015,
  conditionMain: 'Clear',
  conditionDescription: 'clear sky',
};

export async function stubWeatherApis(page: Page, opts: StubOptions = {}): Promise<void> {
  const o = { ...defaultOptions, ...opts };

  // Geocoding: ZIP returns object, direct returns array
  await page.route('**/api/weather/geocoding**', async (route) => {
    const url = route.request().url();
    const isZip = url.includes('zip=');
    const params = new URL(url).searchParams;
    const q = params.get('q') || '';

    // Negative case: Invalidopolis -> []
    if (/Invalidopolis/i.test(q)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }

    if (isZip) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ name: o.cityName, lat: o.lat, lon: o.lon, country: o.country })
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { name: o.cityName, lat: o.lat, lon: o.lon, country: o.country, state: 'NY' }
      ])
    });
  });

  // Current weather
  await page.route('**/api/weather/current**', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        name: o.cityName,
        sys: { country: o.country, sunrise: 1710000000, sunset: 1710040000 },
        timezone: -14400,
        main: { temp: o.tempF, humidity: o.humidity, pressure: o.pressure },
        weather: [{ main: o.conditionMain, description: o.conditionDescription }],
        wind: { speed: 5, deg: 45 },
      })
    });
  });

  // Forecast: Provide several 3h slices so processDailyForecast can build days
  await page.route('**/api/weather/forecast**', async (route) => {
    const now = Math.floor(Date.now() / 1000);
    const list = Array.from({ length: 8 }, (_, i) => ({
      dt: now + i * 3 * 3600,
      main: {
        temp: o.tempF,
        temp_min: o.tempF - 5,
        temp_max: o.tempF + 5,
        humidity: o.humidity,
        pressure: o.pressure,
      },
      weather: [{ main: o.conditionMain, description: o.conditionDescription }],
      wind: { speed: 5, deg: 45 },
      clouds: { all: 10 },
      pop: 0,
    }));

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ list })
    });
  });

  // UV
  await page.route('**/api/weather/uv**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ uvi: 5 })
  }));

  // Pollen
  await page.route('**/api/weather/pollen**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ tree: {}, grass: {}, weed: {} })
  }));

  // Air quality
  await page.route('**/api/weather/air-quality**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ aqi: 30, category: 'Good' })
  }));

  const precipLocation = `${o.cityName}, ${o.country}`;
  const nowIso = new Date().toISOString();
  const forecastDay = nowIso.split('T')[0];

  await page.route('**/api/open-meteo/forecast**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      latitude: o.lat,
      longitude: o.lon,
      timezone: 'America/New_York',
      utc_offset_seconds: -14400,
      current: {
        temperature_2m: o.tempF,
        relative_humidity_2m: o.humidity,
        weather_code: 0,
        wind_speed_10m: 5,
        wind_direction_10m: 45,
        wind_gusts_10m: 12,
        surface_pressure: o.pressure,
        uv_index: 5,
      },
      daily: {
        time: [forecastDay],
        temperature_2m_max: [o.tempF + 3],
        temperature_2m_min: [o.tempF - 3],
        weather_code: [0],
        precipitation_probability_max: [20],
        sunrise: [`${forecastDay}T06:00`],
        sunset: [`${forecastDay}T20:00`],
      },
      hourly: {
        time: Array.from({ length: 48 }, (_, i) => {
          const d = new Date(Date.now() + i * 60 * 60 * 1000);
          return d.toISOString().slice(0, 16);
        }),
        temperature_2m: Array.from({ length: 48 }, () => o.tempF),
        weather_code: Array.from({ length: 48 }, () => 0),
        precipitation_probability: Array.from({ length: 48 }, () => 20),
        wind_speed_10m: Array.from({ length: 48 }, () => 5),
        wind_direction_10m: Array.from({ length: 48 }, () => 45),
        relative_humidity_2m: Array.from({ length: 48 }, () => o.humidity),
        visibility: Array.from({ length: 48 }, () => 16000),
      },
    })
  }));

  await page.route('**/api/open-meteo/air-quality**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ current: { us_aqi: 30 } })
  }));

  // Regex (not globs): `**/precipitation**` matches `.../precipitation-history` because ** spans `-history`;
  // Playwright checks routes last-registered-first, so the wrong stub could win without exact paths.
  await page.route(/.*\/api\/weather\/precipitation-history(?:\?.*)?$/, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      currentRain: 0,
      currentSnow: 0,
      rain24h: 0.12,
      snow24h: 0,
      todayRain: 0.08,
      yesterdayRain: 0.04,
      todaySnow: 0,
      yesterdaySnow: 0,
      lastUpdated: nowIso,
      dataSource: 'day_summary',
      dataAvailable: true,
      dataQuality: 'full',
    }),
  }));

  await page.route(/.*\/api\/weather\/precipitation(?:\?.*)?$/, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      location: precipLocation,
      coordinates: { lat: o.lat, lon: o.lon },
      current: {
        snowDepth: 0,
        snowfall24h: 0,
        snowfall48h: 0,
        snowfall7d: 0,
        rainfall24h: 0.12,
        rainfall48h: 0.2,
        rainfall7d: 0.45,
      },
      forecast: [
        {
          date: forecastDay,
          expectedSnow: 0,
          expectedRain: 0.05,
          probability: 20,
        },
      ],
      source: 'e2e-stub',
      timestamp: nowIso,
    }),
  }));
}

export async function seedFreshWeatherCache(page: Page, opts: StubOptions = {}): Promise<void> {
  const o = { ...defaultOptions, ...opts };
  const sampleWeather = {
    location: `${o.cityName}, ${o.country}`,
    country: o.country,
    temperature: o.tempF,
    unit: '°F',
    condition: o.conditionMain,
    description: o.conditionDescription,
    humidity: o.humidity,
    wind: { speed: 5, direction: 'NE', gust: 12 },
    pressure: `${o.pressure} hPa`,
    sunrise: '6:00 am',
    sunset: '8:00 pm',
    forecast: [
      {
        day: 'Monday',
        highTemp: o.tempF + 3,
        lowTemp: o.tempF - 3,
        condition: 'Sunny',
        description: 'Clear sky',
        details: {
          humidity: o.humidity,
          windSpeed: 5,
          windDirection: 'NE',
          pressure: `${o.pressure} hPa`,
          precipitationChance: 0,
          visibility: 10,
          uvIndex: 5,
        },
        hourlyForecast: [{ time: '10 AM', temp: o.tempF, condition: 'Sunny', precipChance: 0 }],
      },
    ],
    moonPhase: { phase: 'Waxing Crescent', illumination: 20, emoji: 'Moon', phaseAngle: 45 },
    uvIndex: 5,
    aqi: 30,
    aqiCategory: 'Good',
    pollen: { tree: {}, grass: {}, weed: {} },
    coordinates: { lat: o.lat, lon: o.lon },
  };

  await page.addInitScript((data) => {
    const now = Date.now();
    window.localStorage.setItem('bitweather_city', data.sampleWeather.location);
    window.localStorage.setItem('bitweather_weather_data', JSON.stringify(data.sampleWeather));
    window.localStorage.setItem('bitweather_cache_timestamp', String(now));
    // Ensure no rate limit is active
    window.localStorage.removeItem('weather-app-rate-limit');
    // Disable auto-location to prevent test interference
    window.localStorage.setItem('bitweather_user_preferences', JSON.stringify({
      settings: {
        units: 'imperial',
        theme: 'dark',
        cacheEnabled: true,
        auto_location: false
      },
      updatedAt: now
    }));
  }, { sampleWeather });
}

export async function setupStableApp(page: Page, opts: StubOptions = {}): Promise<void> {
  // Set test mode cookie to bypass middleware auth checks
  // Use the actual test URL origin (from env or default to localhost)
  // IMPORTANT: Use origin only to avoid path-scoped cookies that won't be sent to /
  const rawTestUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:3000';
  const parsedUrl = new URL(rawTestUrl);
  const testUrlOrigin = parsedUrl.origin;
  const isHttps = parsedUrl.protocol === 'https:';
  
  await page.context().addCookies([{
    name: 'playwright-test-mode',
    value: 'true',
    url: testUrlOrigin,
    httpOnly: false,
    secure: isHttps,
    sameSite: 'Lax',
  }]);

  await seedFreshWeatherCache(page, opts);
  await stubWeatherApis(page, opts);
  
  // Stub IP geolocation services (they fail in cloud browsers)
  await page.route('**/ipapi.co/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ city: 'New York', region: 'NY', country: 'US', latitude: 40.7128, longitude: -74.006 })
  }));
  
  await page.route('**/ipinfo.io/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ city: 'New York', region: 'NY', country: 'US', loc: '40.7128,-74.006' })
  }));
  
  await page.route('**/api.ipgeolocation.io/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ city: 'New York', state_prov: 'NY', country_name: 'US', latitude: 40.7128, longitude: -74.006 })
  }));
}

export async function expectHomeLoaded(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page).toHaveTitle(/Weather|16/i);
  await expect(page.getByTestId('location-search-input')).toBeVisible({ timeout: 15000 });
}

// ═══════════════════════════════════════════════════════════
//   AUTHENTICATION HELPERS
//   ═══════════════════════════════════════════════════════════

export async function setupMockAuth(page: Page, userId: string = '00000000-0000-0000-0000-000000000000'): Promise<void> {
  // Create mock session data
  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: userId,
      email: 'test@example.com',
      aud: 'authenticated',
      role: 'authenticated',
      email_confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  };

  // Mock Supabase auth endpoints - these are called by middleware server-side
  // The middleware makes requests to Supabase's auth API, so we need to intercept those
  await page.route('**/auth/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    const method = route.request().method();

    // Handle getSession() - this is what middleware calls
    // Supabase SSR getSession() makes a request to /auth/v1/token?grant_type=refresh_token
    // or checks cookies and validates them
    if (pathname.includes('/token') || url.searchParams.has('grant_type')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        },
        body: JSON.stringify(mockSession),
      });
    }

    // Handle getUser() - get current user
    if (pathname.includes('/user') && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          user: mockSession.user,
        }),
      });
    }

    // Handle session validation
    if (pathname.includes('/session') || pathname.includes('/verify')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(mockSession),
      });
    }

    // Default: return session for any auth endpoint
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(mockSession),
    });
  });

  // Mock Supabase REST API endpoints (for profile data)
  await page.route('**/rest/v1/**', async (route) => {
    const request = route.request();
    const method = request.method();

    // Allow profile routes to continue (they're handled by stubSupabaseProfile)
    if (request.url().includes('/profiles')) {
      route.continue();
      return;
    }

    // Mock other REST endpoints
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Use origin only to avoid path-scoped cookies that won't be sent to /
  const rawTestUrl2 = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:3000';
  const parsedUrl2 = new URL(rawTestUrl2);
  const testUrlOrigin2 = parsedUrl2.origin;
  const isHttps2 = parsedUrl2.protocol === 'https:';

  // Seed the supabase-ssr auth cookie so the browser-side `getSession()`
  // returns the mock session WITHOUT relying on the phantom-session bypass
  // that used to live in lib/auth/auth-context.tsx (removed in Phase 4
  // because it was gated on a NEXT_PUBLIC_ env var inlined into the prod
  // bundle).
  //
  // Format the storage adapter expects (per @supabase/ssr): cookie name
  // `sb-${projectRef}-auth-token` where projectRef is the first DNS label
  // of NEXT_PUBLIC_SUPABASE_URL, value `base64-${base64url(JSON.stringify(session))}`.
  // The mock session is short enough to avoid cookie chunking.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const storageKey = `sb-${projectRef}-auth-token`;
  const sessionJson = JSON.stringify(mockSession);
  const base64url = Buffer.from(sessionJson, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const supabaseAuthCookieValue = `base64-${base64url}`;

  await page.context().addCookies([
    {
      name: 'playwright-test-mode',
      value: 'true',
      url: testUrlOrigin2,
      httpOnly: false,
      secure: isHttps2,
      sameSite: 'Lax' as const,
    },
    {
      // The supabase-ssr auth cookie itself. With this present, the browser
      // client's `auth.getSession()` resolves to the mock session at startup
      // and ProtectedRoute renders the page instead of redirecting to /auth/login.
      name: storageKey,
      value: supabaseAuthCookieValue,
      url: testUrlOrigin2,
      httpOnly: false,
      secure: isHttps2,
      sameSite: 'Lax' as const,
    },
  ]);

  // Wait a bit to ensure init scripts and cookies are ready
  await page.waitForTimeout(200);
}

export async function stubSupabaseProfile(page: Page, profile: any): Promise<void> {
  // Mock Supabase profiles table queries
  await page.route('**/rest/v1/profiles**', async (route) => {
    const request = route.request();
    const method = request.method();

    if (method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([profile])
      });
    }

    if (method === 'PATCH') {
      const url = new URL(request.url());
      const params = url.searchParams;
      const select = params.get('select');

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ ...profile, ...request.postDataJSON() }])
      });
    }

    route.continue();
  });

  // Mock preferences API
  await page.route('**/api/user/preferences**', (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          preferences: {
            user_id: profile.id || '00000000-0000-0000-0000-000000000000',
            auto_location: true,
            temperature_unit: 'fahrenheit',
            theme: 'dark'
          }
        })
      });
    }

    if (method === 'PUT') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          preferences: {
            user_id: profile.id || '00000000-0000-0000-0000-000000000000',
            auto_location: true,
            temperature_unit: 'fahrenheit',
            theme: 'dark'
          }
        })
      });
    }

    route.continue();
  });
}

export async function stubProfileUpdate(page: Page): Promise<void> {
  // Mock Supabase profiles update
  await page.route('**/rest/v1/profiles**', async (route) => {
    const request = route.request();
    if (request.method() === 'PATCH') {
      const body = request.postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: '00000000-0000-0000-0000-000000000000',
          ...body,
          updated_at: new Date().toISOString()
        }])
      });
    }
    route.continue();
  });

  // Mock preferences update API
  await page.route('**/api/user/preferences**', async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          preferences: {
            user_id: '00000000-0000-0000-0000-000000000000',
            ...body,
            updated_at: new Date().toISOString()
          }
        })
      });
    }
    route.continue();
  });
}

// ═══════════════════════════════════════════════════════════
//   THEME HELPERS
//   ═══════════════════════════════════════════════════════════

export async function setTheme(page: Page, theme: string): Promise<void> {
  // Set theme in localStorage first (for persistence)
  await page.addInitScript((data) => {
    localStorage.setItem('weather-edu-theme', data.theme);
    localStorage.setItem('weather-theme', data.theme);
  }, { theme });

  // Apply theme directly to the document (works after page load)
  await page.evaluate((themeName) => {
    const root = document.documentElement;
    const body = document.body;

    // All possible theme classes
    const allThemes = [
      'dark', 'miami', 'tron', 'atari2600', 'monochromeGreen',
      '8bitClassic', '16bitSnes', 'synthwave84', 'tokyoNight',
      'dracula', 'cyberpunk', 'matrix'
    ];

    // Remove all theme classes
    allThemes.forEach(t => {
      root.classList.remove(t);
      body.classList.remove(`theme-${t}`);
      root.classList.remove(`theme-${t}`);
    });

    // Apply new theme
    root.setAttribute('data-theme', themeName);
    root.classList.add(themeName);
    body.classList.add(`theme-${themeName}`);

    // Save to localStorage
    try {
      localStorage.setItem('weather-edu-theme', themeName);
      localStorage.setItem('weather-theme', themeName);
    } catch (e) {
      // Ignore localStorage errors
    }

    // Force style recalculation
    const display = root.style.display;
    root.style.display = 'none';
    root.offsetHeight; // Trigger reflow
    root.style.display = display;

    // Also dispatch a storage event to notify theme provider if it's listening
    try {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'weather-edu-theme',
        newValue: themeName,
        storageArea: localStorage
      }));
    } catch (e) {
      // Ignore if StorageEvent not supported
    }
  }, theme);

  // Wait for theme to be applied and any theme provider effects to complete
  await page.waitForTimeout(300);

  // Verify theme was applied (retry if needed)
  let attempts = 0;
  while (attempts < 3) {
    const currentTheme = await getCurrentTheme(page);
    if (currentTheme === theme) {
      break;
    }
    // Re-apply if theme wasn't set correctly
    await page.evaluate((themeName) => {
      document.documentElement.setAttribute('data-theme', themeName);
      document.documentElement.classList.add(themeName);
      document.body.classList.add(`theme-${themeName}`);
    }, theme);
    await page.waitForTimeout(100);
    attempts++;
  }
}

export async function getCurrentTheme(page: Page): Promise<string> {
  return await page.evaluate(() => {
    // Check data-theme attribute first (most reliable)
    const dataTheme = document.documentElement.getAttribute('data-theme');
    if (dataTheme) return dataTheme;

    // Check localStorage
    const storedTheme = localStorage.getItem('weather-edu-theme') ||
      localStorage.getItem('weather-theme');
    if (storedTheme) return storedTheme;

    // Check body classes
    const bodyClasses = document.body.className;
    const themeMatch = bodyClasses.match(/theme-(\w+)/);
    if (themeMatch) return themeMatch[1];

    // Default fallback
    return 'dark';
  });
}

// ═══════════════════════════════════════════════════════════
//   RADAR MAP HELPERS
//   ═══════════════════════════════════════════════════════════

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

/** Deterministic stubs for the home hub discovery row (alerts, SPC, news, stargazer). */
export async function stubHomeHubApis(page: Page): Promise<void> {
  await page.route('**/api/weather/alerts**', (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('detail') === '1') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          alerts: [{
            id: 'alert-1',
            event: 'Severe Thunderstorm Warning',
            severity: 'Severe',
            headline: 'Severe Thunderstorm Warning for test area',
            areaDesc: 'Test County',
            urgency: 'Immediate',
            expires: new Date(Date.now() + 3600000).toISOString(),
            sent: new Date().toISOString(),
            effective: new Date().toISOString(),
            ends: new Date(Date.now() + 3600000).toISOString(),
            description: 'Take shelter.',
            instruction: 'Move indoors.',
            certainty: 'Likely',
            response: 'Shelter',
            sender: 'NWS',
            geometry: null,
          }],
          wis: {
            score: 45,
            level: 'orange',
            label: 'Elevated',
            activeWarnings: 1,
            activeWatches: 0,
            activeAdvisories: 0,
            totalAlerts: 1,
            nwsWarnings: 1,
            nwsWatches: 0,
            nwsAdvisories: 0,
          },
          total: 1,
        }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[-74.2, 40.6], [-73.8, 40.6], [-73.8, 40.9], [-74.2, 40.9], [-74.2, 40.6]]],
          },
          properties: {
            id: 'alert-1',
            event: 'Severe Thunderstorm Warning',
            severity: 'Severe',
            headline: 'Severe Thunderstorm Warning for test area',
            areaDesc: 'Test County',
            instruction: 'Move indoors.',
          },
        }],
      }),
    });
  });

  await page.route('**/api/weather/spc-outlook**', (route) => {
    const url = new URL(route.request().url());
    const hasPoint = url.searchParams.has('point');
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[-75, 40], [-73, 40], [-73, 42], [-75, 42], [-75, 40]]],
          },
          properties: {
            LABEL: 'SLGT',
            LABEL2: 'Slight Risk',
            fill: '#FFE066',
            stroke: '#facc15',
          },
        }],
        pointRisk: hasPoint
          ? { riskCode: 'SLGT', label: 'Slight', fill: '#FFE066' }
          : null,
      }),
    });
  });

  await page.route(/\/api\/news\/rss/, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      status: 'ok',
      items: [],
      happeningNow: [{
        id: 'hub-headline-1',
        title: 'M6.2 earthquake strikes test region',
        description: 'Test headline for home hub',
        url: 'https://earthquake.usgs.gov/',
        source: 'USGS',
        category: 'earthquakes',
        priority: 'high',
        magnitude: 6.2,
        timestamp: new Date().toISOString(),
      }],
      featured: null,
      stats: { byCategory: {}, errors: [], enabledSources: [] },
      lastUpdated: new Date().toISOString(),
      categories: {},
    }),
  }));

  await page.route(/\/api\/stargazer/, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(stargazerE2eFixture()),
  }));
}

export async function stubRadarApis(page: Page): Promise<void> {
  const metadataFrames = Array.from({ length: 13 }, (_, index) => {
    const epochSeconds = 1718841600 - (12 - index) * 600
    return {
      timestamp: epochSeconds * 1000,
      isoTime: new Date(epochSeconds * 1000).toISOString(),
      epochSeconds,
      offsetMinutes: index === 12 ? 0 : -((12 - index) * 10),
      isLive: index === 12,
      tilePath: `/v2/radar/${epochSeconds}`,
    }
  })

  await page.route('**/api/radar/metadata**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      location: { lat: 40.7128, lon: -74.006 },
      generatedAt: new Date(1718841600 * 1000).toISOString(),
      selectedProvider: {
        id: 'rainviewer',
        displayName: 'RainViewer Radar',
        shortName: 'RainViewer',
        coverage: 'global',
        protocol: 'xyz',
        attribution: 'RainViewer',
        refreshIntervalSeconds: 300,
        frameStepMinutes: 10,
        pastMinutes: 120,
        supportsAnimation: true,
        qualityTier: 'community',
        notes: [],
      },
      frames: metadataFrames,
      refreshIntervalSeconds: 300,
      legend: [],
      selectionReason: 'RainViewer global composite selected for test coverage region.',
      coverageRegion: 'us',
      rainviewer: {
        host: 'https://tilecache.rainviewer.com',
        generated: 1718841600,
        version: '2.0',
        colorScheme: 6,
        smooth: true,
        snow: true,
        tileSize: 512,
      },
    }),
  }))

  await page.route('**/api/radar/tile/**', (route) => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng,
  }));

  await page.route('**/api/weather/noaa-wms**', (route) => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng,
  }));

  await page.route('**/mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/**', (route) => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng,
  }));

  await page.route('**/geo.weather.gc.ca/geomet/**', (route) => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng,
  }));

  await page.route('**/tilecache.rainviewer.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng,
  }));

  await page.route('**/basemaps.cartocdn.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng,
  }));

  await stubHomeHubApis(page);

  await page.route('**/api/weather/storm-reports**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      reports: [{
        category: 'hail',
        time: '2100',
        size: '1.00',
        location: 'Test City',
        county: 'Test',
        state: 'NY',
        lat: 40.75,
        lon: -74,
        comments: 'Test hail report',
        date: '2026-06-18',
      }],
      total: 1,
      days: 2,
    }),
  }));
}

export async function navigateToRadarPage(page: Page, location = 'New York, US'): Promise<void> {
  await page.goto(`/radar?location=${encodeURIComponent(location)}`, { waitUntil: 'domcontentloaded' });
}

export async function navigateToMapPage(page: Page): Promise<void> {
  await navigateToRadarPage(page);
}

export async function waitForRadarToLoad(page: Page): Promise<void> {
  const radarContainer = page.locator('[data-radar-container]').first();
  await expect(radarContainer).toBeVisible({ timeout: 20000 });
  await expect(radarContainer.locator('.ol-viewport')).toBeVisible({ timeout: 20000 });
}

export async function checkRadarVisibility(page: Page): Promise<boolean> {
  // Try to find radar container with multiple selectors
  const selectors = [
    '[data-radar-container]',
    '[class*="map"]',
    '[class*="Map"]',
    '[class*="radar"]',
    '[class*="Radar"]',
  ];

  let radarContainer = null;
  for (const selector of selectors) {
    const element = page.locator(selector).first();
    const count = await element.count();
    if (count > 0) {
      radarContainer = element;
      break;
    }
  }

  if (!radarContainer) {
    // No radar container found at all
    return false;
  }

  // Check if element is visible
  const isVisible = await radarContainer.isVisible().catch(() => false);
  if (!isVisible) {
    return false;
  }

  // Check if radar container has proper styling and is not obscured
  const visibility = await radarContainer.evaluate((el) => {
    const style = window.getComputedStyle(el);
    const zIndex = style.zIndex;
    const backdropFilter = style.backdropFilter;
    const opacity = style.opacity;
    const display = style.display;
    const visibility = style.visibility;
    const height = style.height;
    const width = style.width;

    // Element is visible if:
    // 1. z-index is high enough OR auto (which means it's in normal flow)
    // 2. backdrop-filter is none (not obscured by theme overlays)
    // 3. opacity > 0
    // 4. display !== 'none'
    // 5. visibility !== 'hidden'
    // 6. Has dimensions (height and width > 0)
    const hasGoodZIndex = zIndex === 'auto' || parseInt(zIndex) >= 10000 || zIndex === '';
    const hasNoBackdropFilter = backdropFilter === 'none' || backdropFilter === '';
    const isOpaque = parseFloat(opacity) > 0;
    const isDisplayed = display !== 'none';
    const isVisible = visibility !== 'hidden';
    const hasDimensions = parseFloat(height) > 0 && parseFloat(width) > 0;

    return hasGoodZIndex && hasNoBackdropFilter && isOpaque && isDisplayed && isVisible && hasDimensions;
  });

  return visibility;
}

// ═══════════════════════════════════════════════════════════
//   PROFILE HELPERS
//   ═══════════════════════════════════════════════════════════

export async function navigateToProfile(page: Page): Promise<void> {
  // Note: setupMockAuth() MUST be called BEFORE calling this function
  // It should be called in beforeEach or before navigation

  // Avoid networkidle — dev server / analytics keep connections open in CI and starve the test
  await page.goto('/profile', { waitUntil: 'domcontentloaded' });

  // Wait for any redirects or auth checks to complete
  await page.waitForTimeout(500);

  // Check if redirected to login
  const url = page.url();
  if (url.includes('/auth/login')) {
    // Wait a bit more for auth context to initialize
    await page.waitForTimeout(1000);
    const finalUrl = page.url();

    if (finalUrl.includes('/auth/login')) {
      // Still on login page - this indicates auth mocking failed
      throw new Error(
        'Profile page redirected to login - authentication not properly mocked.\n' +
        `Final URL: ${finalUrl}\n` +
        'Make sure setupMockAuth() is called in beforeEach BEFORE calling navigateToProfile().'
      );
    }
  }

  // Wait for profile UI (mounted + not stuck on middleware login)
  await expect(page.getByTestId('profile-edit-button')).toBeVisible({ timeout: 20000 });
}

export async function fillProfileForm(page: Page, fields: { username?: string; fullName?: string; defaultLocation?: string }): Promise<void> {
  if (fields.username) {
    const usernameInput = page.locator('input[name="username"], input[placeholder*="username" i]').first();
    if (await usernameInput.count() > 0) {
      await usernameInput.fill(fields.username);
    }
  }

  if (fields.fullName) {
    const fullNameInput = page.locator('input[name="fullName"], input[name="full_name"], input[placeholder*="full name" i]').first();
    if (await fullNameInput.count() > 0) {
      await fullNameInput.fill(fields.fullName);
    }
  }

  if (fields.defaultLocation) {
    const locationInput = page.locator('input[name="defaultLocation"], input[name="default_location"], input[placeholder*="location" i]').first();
    if (await locationInput.count() > 0) {
      await locationInput.fill(fields.defaultLocation);
    }
  }
}

export async function saveProfile(page: Page): Promise<void> {
  const saveButton = page.locator('button').filter({ hasText: /save/i }).first();
  await saveButton.click();
  // Wait for save to complete
  await page.waitForTimeout(500);
}

// ═══════════════════════════════════════════════════════════
//   NEWS API HELPERS
//   ═══════════════════════════════════════════════════════════

/**
 * Mock news API responses for testing
 * Returns realistic news data to avoid depending on external RSS feeds
 */
export async function stubNewsApi(page: Page): Promise<void> {
  // Create realistic mock news items matching NewsItem interface
  const mockNewsItems = [
    {
      id: 'test-news-1',
      title: 'Severe Weather Alert: Major Storm System Approaching',
      url: 'https://example.com/news/1',
      source: 'NOAA',
      category: 'breaking',
      priority: 'high',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      description: 'A significant storm system is expected to bring heavy rain and strong winds across the region.',
      imageUrl: 'https://example.com/image1.jpg',
      author: 'Weather Service',
    },
    {
      id: 'test-news-2',
      title: 'NASA Satellite Images Show Unusual Weather Patterns',
      url: 'https://example.com/news/2',
      source: 'NASA',
      category: 'weather',
      priority: 'medium',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      description: 'Latest satellite imagery reveals interesting weather formations over the Pacific.',
      imageUrl: 'https://example.com/image2.jpg',
      author: 'NASA Earth Observatory',
    },
    {
      id: 'test-news-3',
      title: 'Local Forecast: Mild Conditions Expected This Week',
      url: 'https://example.com/news/3',
      source: 'Local Weather',
      category: 'local',
      priority: 'low',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      description: 'Residents can expect pleasant weather conditions throughout the week.',
      author: 'Local Meteorologist',
    },
    {
      id: 'test-news-4',
      title: 'Hurricane Tracking Update: Storm Strengthening',
      url: 'https://example.com/news/4',
      source: 'NOAA',
      category: 'weather',
      priority: 'high',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      description: 'Meteorologists are monitoring a developing hurricane system.',
      imageUrl: 'https://example.com/image4.jpg',
    },
    {
      id: 'test-news-5',
      title: 'Climate Research: New Insights into Weather Patterns',
      url: 'https://example.com/news/5',
      source: 'NASA',
      category: 'climate',
      priority: 'medium',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
      description: 'Scientists publish findings on long-term climate trends.',
    },
  ];

  // Mock the aggregate news API endpoint
  await page.route('**/api/news/aggregate**', async (route) => {
    const url = new URL(route.request().url());
    const featuredParam = url.searchParams.get('featured');

    // Handle featured story request
    if (featuredParam === 'true') {
      const featuredStory = mockNewsItems.find(item => item.priority === 'high') || mockNewsItems[0];
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          featured: featuredStory,
        }),
      });
    }

    // Handle regular news aggregation request
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        items: mockNewsItems,
        stats: [
          { source: 'NOAA', fetched: 2, included: 2, errors: 0 },
          { source: 'NASA', fetched: 2, included: 2, errors: 0 },
          { source: 'Local Weather', fetched: 1, included: 1, errors: 0 },
        ],
        totalFetched: mockNewsItems.length,
        totalIncluded: mockNewsItems.length,
        cacheHit: false,
      }),
    });
  });

  // Also mock individual news source endpoints if needed
  await page.route('**/api/news/fox**', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        items: [],
        count: 0,
      }),
    });
  });

  await page.route('**/api/news/nasa**', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        items: mockNewsItems.filter(item => item.source === 'NASA'),
        count: 2,
      }),
    });
  });

  await page.route('**/api/news/reddit**', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        items: [],
        count: 0,
      }),
    });
  });
}



