/**
 * Unit tests for /api/locations POST validation.
 *
 * Pins the Batch 3 security fix: the POST body is validated by a Zod schema
 * that caps free-text fields and range-checks coordinates BEFORE auth, so
 * oversized/invalid payloads are rejected with a 400 and never reach the DB.
 * (Validation runs before auth, so these paths need no Supabase mock.)
 */

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      status: init?.status || 200,
      json: async () => body,
    })),
  },
}));

jest.mock('@/lib/services/weather-rate-limiter', () => ({
  rateLimitRequest: jest.fn().mockResolvedValue({ allowed: true, headers: {} }),
}));

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/error-utils', () => ({ captureError: jest.fn(), captureDbError: jest.fn() }));

import { POST } from '@/app/api/locations/route';

type PostReq = Parameters<typeof POST>[0];

function makeReq(body: unknown, throwOnJson = false): PostReq {
  return {
    headers: { get: () => 'Bearer test-token' },
    json: throwOnJson
      ? async () => {
          throw new Error('bad json');
        }
      : async () => body,
  } as unknown as PostReq;
}

const validBody = {
  location_name: 'San Francisco, CA',
  city: 'San Francisco',
  state: 'CA',
  country: 'US',
  latitude: 37.77,
  longitude: -122.42,
  is_favorite: false,
  custom_name: null,
  notes: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/locations validation', () => {
  it('rejects oversized free-text fields with 400 before touching the DB', async () => {
    const res = await POST(makeReq({ ...validBody, notes: 'x'.repeat(2001) }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid location data');
  });

  it('rejects a missing required field (city)', async () => {
    const res = await POST(makeReq({ ...validBody, city: '' }));
    expect(res.status).toBe(400);
  });

  it('rejects out-of-range coordinates', async () => {
    const res = await POST(makeReq({ ...validBody, latitude: 200 }));
    expect(res.status).toBe(400);
  });

  it('rejects a malformed JSON body with a clear 400', async () => {
    const res = await POST(makeReq(undefined, true));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid JSON body');
  });
});
