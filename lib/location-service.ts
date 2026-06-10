/**
 * 16-Bit Weather Platform - v1.0.0
 * 
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 * 
 * Use Limitation: 5 users
 * See LICENSE file for full terms
 * 
 * BETA SOFTWARE NOTICE:
 * This software is in active development. Features may change.
 * Report issues: https://github.com/deephouse23/Weather-application-/issues
 */

/**
 * Location Detection Service
 *
 * This service provides comprehensive location detection capabilities with:
 * - Browser geolocation API with high accuracy
 * - IP-based location fallback detection
 * - Comprehensive error handling
 * - Permission management
 * - Reverse geocoding to get human-readable location names
 */

import { toStateAbbr } from './us-states';

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
  postcode?: string;
  displayName: string;
  source: 'geolocation' | 'ip' | 'manual';
}

export interface LocationPermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
  supported: boolean;
}

export interface LocationError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED' | 'NETWORK_ERROR';
  message: string;
  suggestion?: string;
}

// IP geolocation service response types
interface IPApiCoResponse {
  latitude: string | number;
  longitude: string | number;
  city?: string;
  region?: string;
  country_name?: string;
  country?: string;
}

interface IPInfoResponse {
  loc?: string;
  city?: string;
  region?: string;
  country?: string;
}

type IPLocationResponse = IPApiCoResponse | IPInfoResponse;

export class LocationService {
  private static instance: LocationService;
  private currentPosition: LocationData | null = null;
  private lastRequestTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Check if geolocation is supported by the browser
   */
  isGeolocationSupported(): boolean {
    return !!navigator.geolocation;
  }

  /**
   * Get current permission status for geolocation
   */
  async getPermissionStatus(): Promise<LocationPermissionStatus> {
    if (!this.isGeolocationSupported()) {
      return {
        granted: false,
        denied: false,
        prompt: false,
        supported: false
      };
    }

    try {
      // Check if permissions API is available
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        return {
          granted: permission.state === 'granted',
          denied: permission.state === 'denied',
          prompt: permission.state === 'prompt',
          supported: true
        };
      }
    } catch (error) {
      console.warn('Permissions API not available:', error);
    }

    // Fallback for browsers without permissions API
    return {
      granted: false,
      denied: false,
      prompt: true,
      supported: true
    };
  }

  /**
   * Request user's current location using browser geolocation
   */
  async getCurrentLocation(options?: {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
    useCache?: boolean;
  }): Promise<LocationData> {
    const defaultOptions = {
      enableHighAccuracy: false, // Silent mode - don't prompt for precise location
      timeout: 5000, // Shorter timeout for silent operation
      maximumAge: 300000, // 5 minutes
      useCache: true,
      ...options
    };

    // Return cached position if available and not expired
    if (defaultOptions.useCache && this.currentPosition &&
      Date.now() - this.lastRequestTime < this.CACHE_DURATION) {
      return this.currentPosition;
    }

    if (!this.isGeolocationSupported()) {
      throw this.createLocationError('NOT_SUPPORTED', 'Geolocation is not supported by this browser');
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: defaultOptions.enableHighAccuracy,
            timeout: defaultOptions.timeout,
            maximumAge: defaultOptions.maximumAge
          }
        );
      });

      // Get human-readable location name
      const locationData = await this.reverseGeocode(
        position.coords.latitude,
        position.coords.longitude
      );

      this.currentPosition = {
        ...locationData,
        source: 'geolocation'
      };
      this.lastRequestTime = Date.now();

      return this.currentPosition;

    } catch (error: unknown) {
      console.error('Geolocation error:', error);
      if (error instanceof GeolocationPositionError) {
        throw this.handleGeolocationError(error);
      }
      throw this.createLocationError('POSITION_UNAVAILABLE', 'Failed to get location');
    }
  }

  /**
   * Get location using IP-based detection as fallback
   */
  async getLocationByIP(): Promise<LocationData> {
    try {
      // Try multiple IP geolocation services
      // (api.ipgeolocation.io was removed: it requires a real API key, so the
      // "apiKey=free" entry always returned 401 and only added latency.)
      const services = [
        'https://ipapi.co/json/',
        'https://ipinfo.io/json'
      ];

      for (const serviceUrl of services) {
        try {
          // Bound each attempt: this chain gates first-visit auto-location,
          // and a hung provider (ipapi.co rate-limits aggressively) would
          // otherwise stall the initial weather render indefinitely.
          const response = await fetch(serviceUrl, { signal: AbortSignal.timeout(3000) });

          if (!response.ok) {
            console.warn(`IP service failed: ${serviceUrl} - ${response.status}`);
            continue;
          }

          const data: IPLocationResponse = await response.json();

          // Parse response based on service format
          const locationData = this.parseIPLocationResponse(data, serviceUrl);

          if (locationData) {
            return {
              ...locationData,
              source: 'ip'
            };
          }
        } catch (error) {
          console.warn(`IP service error for ${serviceUrl}:`, error);
          continue;
        }
      }

      throw this.createLocationError('NETWORK_ERROR', 'All IP-based location services failed');

    } catch (error: unknown) {
      console.error('IP location detection failed:', error);
      throw error;
    }
  }

  /**
   * Reverse geocode coordinates to a human-readable location.
   *
   * IMPORTANT: this used to call Nominatim directly from the browser, but
   * the app's CSP `connect-src` whitelist (next.config.mjs:90) does not
   * include nominatim.openstreetmap.org, so the browser blocks the request
   * and the catch fallback fires every time. Instead we now route through
   * our same-origin proxy at `/api/weather/geocoding?lat=&lon=`, which
   * proxies Nominatim from the Node runtime where there's no CSP and where
   * we can set the User-Agent that Nominatim's policy requires.
   */
  private async reverseGeocode(latitude: number, longitude: number): Promise<LocationData> {
    try {
      const response = await fetch(
        `/api/weather/geocoding?lat=${latitude}&lon=${longitude}&limit=1`
      );

      if (!response.ok) {
        throw new Error(`Reverse geocoding failed: ${response.status}`);
      }

      // Proxy returns GeocodingResponse[]: [{ name, lat, lon, country, state?, postcode? }]
      const results = await response.json();
      const first = Array.isArray(results) ? results[0] : null;
      if (!first || !first.name) {
        throw new Error('Reverse geocoding returned no results');
      }

      const city: string = first.name;
      const stateAbbr: string | undefined = first.state;
      const country: string = first.country || '';
      const postcode: string | undefined = first.postcode;
      const isUS = country.toUpperCase() === 'US';

      // US format: "City, ST ZIP" (e.g. "San Ramon, CA 94583")
      // Non-US: "City, ST" or "City, Country" depending on what we got back.
      let displayName: string;
      if (isUS) {
        if (stateAbbr && postcode) {
          displayName = `${city}, ${stateAbbr} ${postcode}`;
        } else if (stateAbbr) {
          displayName = `${city}, ${stateAbbr}`;
        } else {
          displayName = postcode ? `${city} ${postcode}` : city;
        }
      } else {
        displayName = stateAbbr ? `${city}, ${stateAbbr}, ${country}` : `${city}, ${country}`;
      }

      return {
        latitude,
        longitude,
        city,
        region: stateAbbr,
        country,
        postcode,
        displayName,
        source: 'geolocation'
      };

    } catch (error) {
      console.warn('Reverse geocoding failed:', error);

      // IMPORTANT: do NOT use a coordinate-string as displayName here.
      // userCacheService.saveLastLocation() persists displayName but strips
      // lat/lon for privacy, so a "37.74, -121.95" string would be read back
      // next session and forwarded to forward-geocoding (which fails because
      // it's not a city). Use a benign placeholder instead — the live coords
      // on this LocationData object still drive weather fetching for the
      // current session via fetchWeatherByLocation.
      return {
        latitude,
        longitude,
        displayName: 'Current Location',
        source: 'geolocation'
      };
    }
  }

  /**
   * Parse IP location service responses
   */
  private parseIPLocationResponse(data: IPLocationResponse, serviceUrl: string): LocationData | null {
    try {
      let latitude: number, longitude: number, city: string, region: string, country: string;

      const hostname = (() => { try { return new URL(serviceUrl).hostname; } catch { return ''; } })();
      if (hostname === 'ipapi.co') {
        const ipapiData = data as IPApiCoResponse;
        latitude = parseFloat(ipapiData.latitude.toString());
        longitude = parseFloat(ipapiData.longitude.toString());
        city = ipapiData.city || 'Unknown City';
        region = ipapiData.region || '';
        country = ipapiData.country_name || ipapiData.country || 'Unknown Country';
      } else if (hostname === 'ipinfo.io') {
        const ipinfoData = data as IPInfoResponse;
        // ipinfo can answer 200 without "loc" (bogon IPs, anonymous tier).
        // Defaulting to "0,0" would pass the NaN guard below and return
        // Null Island as a valid location; treat missing loc as a failure.
        if (!ipinfoData.loc) {
          return null;
        }
        const [lat, lon] = ipinfoData.loc.split(',').map(parseFloat);
        latitude = lat;
        longitude = lon;
        city = ipinfoData.city || 'Unknown City';
        region = ipinfoData.region || '';
        country = ipinfoData.country || 'Unknown Country';
      } else {
        return null;
      }

      if (isNaN(latitude) || isNaN(longitude)) {
        console.warn('Invalid coordinates from IP service:', data);
        return null;
      }

      // Apply the same "City, ST" formatting used by reverse geocoding so
      // display is consistent across geolocation and IP-based fallbacks.
      // IP services do not normally return a postcode, so we stop at "City, ST".
      const isUS = (country || '').toLowerCase() === 'us' ||
        (country || '').toLowerCase() === 'united states';
      let displayName: string;
      if (isUS) {
        const stateAbbr = toStateAbbr(region) ?? region;
        displayName = stateAbbr ? `${city}, ${stateAbbr}` : city;
      } else {
        displayName = region ? `${city}, ${region}, ${country}` : `${city}, ${country}`;
      }

      return {
        latitude,
        longitude,
        city,
        region,
        country,
        displayName,
        source: 'geolocation'
      };

    } catch (error) {
      console.warn('Failed to parse IP location response:', error);
      return null;
    }
  }

  /**
   * Get location with automatic fallback (geolocation -> IP -> manual)
   */
  async getLocationWithFallback(options?: {
    skipGeolocation?: boolean;
    skipIPFallback?: boolean;
  }): Promise<LocationData> {
    const opts = {
      skipGeolocation: false,
      skipIPFallback: false,
      ...options
    };

    // Try geolocation first
    if (!opts.skipGeolocation) {
      try {
        return await this.getCurrentLocation();
      } catch (error: unknown) {
        // Type guard for LocationError
        const isLocationError = (err: unknown): err is LocationError => {
          return typeof err === 'object' && err !== null && 'code' in err;
        };

        // If user denied permission, don't try IP fallback
        if (isLocationError(error) && error.code === 'PERMISSION_DENIED') {
          throw error;
        }
      }
    }

    // Try IP-based detection as fallback
    if (!opts.skipIPFallback) {
      try {
        return await this.getLocationByIP();
      } catch {
        // IP detection failed, will throw final error below
      }
    }

    // If all methods fail
    throw this.createLocationError(
      'POSITION_UNAVAILABLE',
      'Unable to determine your location automatically',
      'Please enter your location manually or allow location access'
    );
  }

  /**
   * Clear cached location data
   */
  clearCache(): void {
    this.currentPosition = null;
    this.lastRequestTime = 0;
  }

  /**
   * Handle geolocation API errors
   */
  private handleGeolocationError(error: GeolocationPositionError): LocationError {
    // NOTE: messages are lowercased where substring matching matters —
    // components/weather-search.tsx checks `error?.includes('location')`
    // with case-sensitive .includes() to decide whether to show the
    // "enter a ZIP below" fallback hint and auto-focus the search input.
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return this.createLocationError(
          'PERMISSION_DENIED',
          'Your location access was denied — enter a ZIP or city below',
          'Please allow location access in your browser settings or enter your location manually'
        );

      case error.POSITION_UNAVAILABLE:
        return this.createLocationError(
          'POSITION_UNAVAILABLE',
          'Your location is unavailable — enter a ZIP or city below',
          'Please check your device location settings or enter your location manually'
        );

      case error.TIMEOUT:
        return this.createLocationError(
          'TIMEOUT',
          'Your location request timed out — enter a ZIP or city below',
          'Please try again or enter your location manually'
        );

      default:
        return this.createLocationError(
          'POSITION_UNAVAILABLE',
          'Failed to get your location — enter a ZIP or city below',
          'Please try again or enter your location manually'
        );
    }
  }

  /**
   * Create standardized location error
   */
  private createLocationError(
    code: LocationError['code'],
    message: string,
    suggestion?: string
  ): LocationError {
    return {
      code,
      message,
      suggestion
    };
  }

  /**
   * Format location for display
   */
  formatLocationDisplay(location: LocationData): string {
    if (location.city && location.region && location.country) {
      return `${location.city}, ${location.region}, ${location.country}`;
    } else if (location.city && location.country) {
      return `${location.city}, ${location.country}`;
    } else if (location.displayName) {
      return location.displayName;
    } else {
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    }
  }

  /**
   * Convert location to coordinate string for weather API
   */
  getCoordinateString(location: LocationData): string {
    return `${location.latitude},${location.longitude}`;
  }

  /**
   * Get cached location if available
   */
  getCachedLocation(): LocationData | null {
    if (this.currentPosition && Date.now() - this.lastRequestTime < this.CACHE_DURATION) {
      return this.currentPosition;
    }
    return null;
  }
}

// Export singleton instance
export const locationService = LocationService.getInstance();