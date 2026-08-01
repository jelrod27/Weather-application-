/**
 * 16-Bit Weather Platform - v1.0.0
 *
 * USGS Earthquake API Service
 * Fetches real-time earthquake data from USGS FDSN Web Services
 * API Docs: https://earthquake.usgs.gov/fdsnws/event/1/
 */

import { createTtlCache } from '@/lib/cache/ttl-cache';

export interface EarthquakeData {
    magnitude: number;
    location: string;
    time: Date;
    depth: number; // km
    distance?: number; // km from user (if coordinates provided)
    id: string;
    url: string;
    latitude: number;
    longitude: number;
    tsunami: boolean;
}

export interface EarthquakeResponse {
    recent: EarthquakeData[];
    significantNearby: boolean;
    lastSignificant?: EarthquakeData;
    error?: string;
}

const earthquakeCache = createTtlCache<EarthquakeResponse>({ ttlMs: 5 * 60 * 1000 });
const FETCH_TIMEOUT_MS = 10000; // 10 second timeout for API calls

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

/**
 * Parse USGS GeoJSON response into EarthquakeData array
 */
function parseUSGSResponse(
    data: {
        features: Array<{
            id: string;
            properties: {
                mag: number | null;
                place: string;
                time: number;
                url: string;
                tsunami?: number;
            };
            geometry: {
                coordinates: [number, number, number]; // [lon, lat, depth]
            };
        }>;
    },
    userLat?: number,
    userLon?: number
): EarthquakeData[] {
    return data.features
        // Filter out earthquakes with null magnitude (USGS returns null for unanalyzed quakes)
        .filter(feature => feature.properties.mag !== null && feature.properties.mag !== undefined)
        .map(feature => {
            const [lon, lat, depth] = feature.geometry.coordinates;
            const quake: EarthquakeData = {
                magnitude: feature.properties.mag as number,
                location: feature.properties.place || 'Unknown location',
                time: new Date(feature.properties.time),
                depth: Math.round(depth),
                id: feature.id,
                url: feature.properties.url,
                latitude: lat,
                longitude: lon,
                tsunami: feature.properties.tsunami === 1
            };

            if (userLat !== undefined && userLon !== undefined) {
                quake.distance = calculateDistance(userLat, userLon, lat, lon);
            }

            return quake;
        }).sort((a, b) => b.time.getTime() - a.time.getTime()); // Sort by most recent first
}

/**
 * Fetch global earthquakes with configurable minimum magnitude.
 * Used by the /earth-sciences page to populate its M2.5+/M4.5+/M6+ filter tabs.
 * @param minMagnitude Minimum magnitude (default 2.5)
 * @param days Lookback window in days (default 7)
 * @param limit Max results (default 50)
 */
export async function fetchGlobalEarthquakes(
    minMagnitude: number = 2.5,
    days: number = 7,
    limit: number = 50
): Promise<EarthquakeResponse> {
    // Normalize at the boundary — callers beyond the API route can pass NaN,
    // negatives, or huge values that would otherwise corrupt cache keys, date
    // math, or the upstream USGS request.
    const safeMinMag = Number.isFinite(minMagnitude) && minMagnitude >= 0 ? minMagnitude : 2.5;
    const safeDays = Number.isFinite(days) ? Math.min(Math.max(Math.trunc(days), 1), 30) : 7;
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 200) : 50;

    const cacheKey = `global_${safeMinMag}_${safeDays}_${safeLimit}`;

    const cached = earthquakeCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    try {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - safeDays * 24 * 60 * 60 * 1000);

        const url = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query');
        url.searchParams.set('format', 'geojson');
        url.searchParams.set('starttime', startTime.toISOString());
        url.searchParams.set('endtime', endTime.toISOString());
        url.searchParams.set('minmagnitude', safeMinMag.toString());
        url.searchParams.set('orderby', 'time');
        url.searchParams.set('limit', safeLimit.toString());

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        let response: Response;
        try {
            response = await fetch(url.toString(), {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': '16BitWeather/1.0'
                },
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeoutId);
        }

        if (!response.ok) {
            throw new Error(`USGS API error: ${response.status}`);
        }

        const data = await response.json();
        const earthquakes = parseUSGSResponse(data);
        const significantQuakes = earthquakes.filter(q => q.magnitude >= 4.5);

        const result: EarthquakeResponse = {
            recent: earthquakes,
            significantNearby: significantQuakes.length > 0,
            lastSignificant: significantQuakes.length > 0 ? significantQuakes[0] : undefined
        };

        earthquakeCache.set(cacheKey, result);
        return result;
    } catch (error) {
        const isTimeout = error instanceof Error && error.name === 'AbortError';
        console.error('[USGS API] Error fetching global earthquakes:', isTimeout ? 'Request timed out' : error);
        return {
            recent: [],
            significantNearby: false,
            error: isTimeout ? 'Earthquake API request timed out' : 'Failed to fetch earthquake data'
        };
    }
}

