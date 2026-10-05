import { parseGairmetJson, selectTurbulenceAdvisories } from '@/lib/aviation/turbulence';
import { fetchTurbulenceAdvisories } from '@/lib/services/aviation-turbulence-service';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

jest.mock('@/lib/fetch-with-timeout', () => ({ fetchWithTimeout: jest.fn() }));
const fetchMock = jest.mocked(fetchWithTimeout);
// Representative flat AWC JSON contract observed 2026-10-04; reduced geometry.
const advisory = {
  tag: '2W', forecastHour: 3, validTime: '2026-10-05T00:00:00Z',
  hazard: 'TURB-LO', severity: 'MOD', top: '080', base: 'SFC',
  issueTime: 1791156780, expireTime: 1791169200,
  coords: [{ lat: '45.08', lon: '-71.65' }, { lat: '43.43', lon: '-72.76' }, { lat: '42.78', lon: '-71.92' }],
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-04T23:30:00Z'));
});
afterEach(() => jest.restoreAllMocks());

describe('AWC JSON contract', () => {
  it('preserves snapshot/issuance/expiry and converts string coordinates and flight levels', () => {
    const { polygons } = parseGairmetJson([advisory]);
    expect(polygons).toHaveLength(1);
    expect(polygons[0]).toMatchObject({ forecastHour: 3, severity: 'moderate', baseFt: 0, topFt: 8000,
      issuedAt: '2026-10-04T23:33:00.000Z', validFrom: '2026-10-05T00:00:00.000Z', validTo: '2026-10-05T03:00:00.000Z' });
    expect(polygons[0].coordinates[0]).toEqual([[-71.65, 45.08], [-72.76, 43.43], [-71.92, 42.78], [-71.65, 45.08]]);
  });
  it('does not confuse package expiry with future snapshot validity', () => {
    expect(parseGairmetJson([{ ...advisory, forecastHour: 12, validTime: '2026-10-05T09:00:00Z' }]).polygons).toHaveLength(1);
  });
  it('keeps missing severity, altitude and issuance unknown', () => {
    expect(parseGairmetJson([{ ...advisory, severity: null, base: '', top: null, issueTime: undefined }]).polygons[0])
      .toMatchObject({ severity: 'unknown', baseFt: null, topFt: null, issuedAt: null });
  });
  it.each([
    { coords: [{ lat: 95, lon: -70 }, ...advisory.coords] },
    { coords: [advisory.coords[0], advisory.coords[0], advisory.coords[0]] },
    { validTime: null }, { expireTime: null }, { forecastHour: null }, { forecastHour: 2 },
    { validTime: '2026-10-05T00:00:00' },
  ])('rejects malformed advisories without fabricating an empty success: %j', patch => {
    expect(() => parseGairmetJson([{ ...advisory, ...patch }])).toThrow();
  });
  it('does not accept GeoJSON as the flat JSON contract', () => {
    expect(() => parseGairmetJson({ type: 'FeatureCollection', features: [] })).toThrow();
  });
  it('distinguishes healthy empty, other TANGO hazards, and malformed records', () => {
    expect(parseGairmetJson([])).toEqual({ polygons: [], rejectedRecords: 0 });
    expect(parseGairmetJson([{ ...advisory, hazard: 'LLWS' }])).toEqual({ polygons: [], rejectedRecords: 0 });
    expect(parseGairmetJson([advisory, { error: 'bad record' }])).toMatchObject({ rejectedRecords: 1 });
  });
  it('filters by snapshot and intersecting altitude; unknown layers require All', () => {
    const { polygons } = parseGairmetJson([advisory, { ...advisory, base: null }]);
    const time = polygons[0].validFrom;
    expect(selectTurbulenceAdvisories(polygons, time, 8000, Date.now())).toHaveLength(1);
    expect(selectTurbulenceAdvisories(polygons, time, 9000, Date.now())).toHaveLength(0);
    expect(selectTurbulenceAdvisories(polygons, time, null, Date.now())).toHaveLength(2);
    expect(selectTurbulenceAdvisories(polygons, time, null, Date.parse('2026-10-05T03:00:00Z'))).toEqual([]);
    expect(selectTurbulenceAdvisories(polygons, 'different snapshot', null, Date.now())).toEqual([]);
  });
});

describe('G-AIRMET acquisition', () => {
  function response(body: unknown, status = 200): Response {
    return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
  }
  it('requests all documented snapshots with bounded fetches', async () => {
    fetchMock.mockResolvedValue(response([advisory]));
    const result = await fetchTurbulenceAdvisories();
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock.mock.calls.map(call => String(call[0]).split('fore=')[1])).toEqual(['0', '3', '6', '9', '12']);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('product=tango'), expect.objectContaining({ timeoutMs: 8000, maxRetries: 0 }));
    expect(result).toMatchObject({ coverage: 'CONUS', status: 'available', fetchedAt: '2026-10-04T23:30:00.000Z' });
  });
  it('treats HTTP 204 as healthy empty without parsing its body', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204, json: () => { throw new Error('No body'); } } as unknown as Response);
    expect(await fetchTurbulenceAdvisories()).toMatchObject({ status: 'empty', polygons: [] });
  });
  it('preserves good snapshots when another snapshot fails', async () => {
    fetchMock.mockResolvedValue(response([advisory])).mockRejectedValueOnce(new Error('timeout'));
    expect(await fetchTurbulenceAdvisories()).toMatchObject({ status: 'partial', unavailableForecastHours: [0] });
  });
  it('does not call entirely malformed or failed feeds healthy empty', async () => {
    fetchMock.mockResolvedValue(response({ unexpected: [] }));
    await expect(fetchTurbulenceAdvisories()).rejects.toThrow();
    fetchMock.mockResolvedValue(response({}, 503));
    await expect(fetchTurbulenceAdvisories()).rejects.toThrow();
  });
  it('removes expired products and identifies stale data', async () => {
    fetchMock.mockResolvedValue(response([advisory]));
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-05T03:00:00Z'));
    expect(await fetchTurbulenceAdvisories()).toMatchObject({ status: 'stale', polygons: [] });
  });
});
