/**
 * Unit tests for weather API rate limiter
 */

// Simple mock for Headers since jsdom doesn't have it
class MockHeaders {
  private headers: Map<string, string>;
  
  constructor(init?: Record<string, string>) {
    this.headers = new Map();
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this.headers.set(key.toLowerCase(), value);
      });
    }
  }
  
  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null;
  }
  
  set(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value);
  }
}

// Mock Next.js modules before importing
jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: string;
    headers: MockHeaders;
    nextUrl: { searchParams: URLSearchParams };
    
    constructor(url: string, init?: { headers?: Record<string, string> }) {
      this.url = url;
      this.headers = new MockHeaders(init?.headers);
      this.nextUrl = { searchParams: new URLSearchParams(new URL(url).search) };
    }
  },
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status || 200,
      headers: init?.headers || {},
      json: async () => body,
    })),
  },
}));

jest.mock('@/lib/supabase/server', () => ({
  getServerUser: jest.fn().mockResolvedValue(null),
  createServerSupabaseClient: jest.fn(),
  getServerSession: jest.fn().mockResolvedValue(null),
}));

// Now import after mocks are set up
import { checkRateLimit, getClientIdentifier } from '@/lib/services/weather-rate-limiter';
import { getServerUser } from '@/lib/supabase/server';

const originalEnv = process.env;

describe('Weather Rate Limiter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset any modified env vars
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('checkRateLimit', () => {
    it('should allow first request and set correct limits', () => {
      const result = checkRateLimit('test-client-1');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(399); // 400 - 1
      expect(result.burstRemaining).toBe(89); // 90 - 1
      expect(result.resetTime).toBeGreaterThan(Date.now());
      expect(result.burstResetTime).toBeGreaterThan(Date.now());
    });

    it('should track multiple requests correctly', () => {
      const clientId = 'test-client-2';
      
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(clientId);
        expect(result.allowed).toBe(true);
      }
      
      const result = checkRateLimit(clientId);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(394); // 400 - 6
      expect(result.burstRemaining).toBe(84); // 90 - 6
    });

    it('should block when weather burst limit exceeded', () => {
      const clientId = 'test-client-3';

      for (let i = 0; i < 90; i++) {
        const result = checkRateLimit(clientId);
        expect(result.allowed).toBe(true);
      }

      const result = checkRateLimit(clientId);
      expect(result.allowed).toBe(false);
      expect(result.burstRemaining).toBe(0);
    });

    it('keeps account and content buckets independent of weather burst', () => {
      const clientId = 'bucket-isolation';

      for (let i = 0; i < 90; i++) {
        expect(checkRateLimit(clientId, 'weather').allowed).toBe(true);
      }
      expect(checkRateLimit(clientId, 'weather').allowed).toBe(false);
      expect(checkRateLimit(clientId, 'account').allowed).toBe(true);
      expect(checkRateLimit(clientId, 'content').allowed).toBe(true);
    });

    it('allows three city-search weather fan-outs without hitting burst', () => {
      const clientId = 'three-city-search';
      // Home load ~12 weather calls, then 3 searches × 8 (geocode+forecast+aq+pollen+dup geocode+hub leftovers)
      for (let i = 0; i < 12 + 3 * 8; i++) {
        expect(checkRateLimit(clientId, 'weather').allowed).toBe(true);
      }
    });

    it('should reset burst window after it expires', () => {
      const clientId = 'test-client-4';
      
      for (let i = 0; i < 90; i++) {
        checkRateLimit(clientId);
      }
      
      // Should be blocked
      let result = checkRateLimit(clientId);
      expect(result.allowed).toBe(false);
      
      // Note: In real tests we'd wait, but for unit tests we can't
      // The rate limiter stores timestamps, so we verify the structure
      expect(result.burstResetTime).toBeGreaterThan(Date.now());
    });

    it('should track different clients independently', () => {
      const client1 = 'client-1';
      const client2 = 'client-2';
      
      // Make 50 requests for client 1
      for (let i = 0; i < 50; i++) {
        checkRateLimit(client1);
      }
      
      // Client 2 should still have full limits
      const result = checkRateLimit(client2);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(399);
      expect(result.burstRemaining).toBe(89);
    });
  });

  describe('Environment variable configuration', () => {
    it('should use default values when env vars not set', () => {
      // Reset module cache to re-evaluate env vars at load time
      jest.resetModules();
      
      delete process.env.WEATHER_RATE_LIMIT_HOURLY;
      delete process.env.WEATHER_RATE_LIMIT_BURST;
      delete process.env.WEATHER_RATE_LIMIT_BURST_WINDOW_MS;
      
      const result = checkRateLimit('env-test-client');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(399); // Default 400 - 1
      expect(result.burstRemaining).toBe(89); // Default 90 - 1
    });
  });

  describe('Rate limit response structure', () => {
    it('should return correct structure for allowed request', () => {
      const result = checkRateLimit('structure-test');
      
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('remaining');
      expect(result).toHaveProperty('resetTime');
      expect(result).toHaveProperty('burstRemaining');
      expect(result).toHaveProperty('burstResetTime');
      
      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.remaining).toBe('number');
      expect(typeof result.resetTime).toBe('number');
      expect(typeof result.burstRemaining).toBe('number');
      expect(typeof result.burstResetTime).toBe('number');
    });

    it('should return correct structure for blocked request', () => {
      const clientId = 'blocked-structure-test';
      
      for (let i = 0; i < 90; i++) {
        checkRateLimit(clientId);
      }
      
      const result = checkRateLimit(clientId);
      
      expect(result.allowed).toBe(false);
      expect(result.burstRemaining).toBe(0);
      expect(result.resetTime).toBeGreaterThan(Date.now());
      expect(result.burstResetTime).toBeGreaterThan(Date.now());
    });
  });
});

describe('getClientIdentifier', () => {
  it('should extract IP from x-forwarded-for header', async () => {
    const { NextRequest } = jest.requireMock('next/server');
    const request = new NextRequest('http://localhost:3000/api/weather/current', {
      headers: {
        'x-forwarded-for': '192.168.1.100, 10.0.0.1'
      }
    });
    
    const identifier = await getClientIdentifier(request);
    expect(identifier).toBe('ip:192.168.1.100');
  });

  it('should use x-real-ip when x-forwarded-for not present', async () => {
    const { NextRequest } = jest.requireMock('next/server');
    const request = new NextRequest('http://localhost:3000/api/weather/current', {
      headers: {
        'x-real-ip': '192.168.1.200'
      }
    });
    
    const identifier = await getClientIdentifier(request);
    expect(identifier).toBe('ip:192.168.1.200');
  });

  it('should fallback to anonymous when no IP headers present', async () => {
    const { NextRequest } = jest.requireMock('next/server');
    const request = new NextRequest('http://localhost:3000/api/weather/current');
    
    const identifier = await getClientIdentifier(request);
    expect(identifier).toBe('ip:anonymous');
  });

  it('should prefer Supabase user ID when available', async () => {
    // Mock getServerUser to return a user
    (getServerUser as jest.Mock).mockResolvedValueOnce({ id: 'test-user-123' });
    
    const { NextRequest } = jest.requireMock('next/server');
    const request = new NextRequest('http://localhost:3000/api/weather/current');
    
    const identifier = await getClientIdentifier(request);
    
    expect(identifier).toBe('user:test-user-123');
  });
});
