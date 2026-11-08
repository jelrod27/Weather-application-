/** @jest-environment node */
jest.mock('@/lib/services/swpc-proxy', () => ({ fetchSwpc: jest.fn(), fetchSwpcJson: jest.fn() }))
jest.mock('@/lib/error-utils', () => ({ logRouteError: jest.fn() }))
jest.mock('@/lib/services/weather-rate-limiter', () => ({ rateLimitRequest: jest.fn().mockResolvedValue({ allowed: true, headers: {} }) }))
import { NextRequest } from 'next/server'
import { GET as solarImage } from '@/app/api/space-weather/sdo-image/route'
import { GET as coronagraph } from '@/app/api/space-weather/coronagraph/route'
import { GET as enlil } from '@/app/api/space-weather/enlil/route'
import { fetchSwpc, fetchSwpcJson } from '@/lib/services/swpc-proxy'

const request = (path: string) => new NextRequest(`http://localhost/api/space-weather/${path}`)
const image = () => new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]), { headers: { 'Content-Type': 'image/jpeg' } })
beforeEach(() => {
 jest.resetAllMocks()
 jest.spyOn(console, 'warn').mockImplementation(() => undefined)
 jest.spyOn(console, 'error').mockImplementation(() => undefined)
 jest.mocked(fetchSwpc).mockResolvedValue(image())
})
afterEach(() => jest.restoreAllMocks())
// Keep the real rate-limit wrapper while mocking its external request accounting.
beforeEach(async () => {
 const { rateLimitRequest } = await import('@/lib/services/weather-rate-limiter')
 jest.mocked(rateLimitRequest).mockResolvedValue({ allowed: true, headers: {}, result: {
   allowed: true, remaining: 99, resetTime: Date.now() + 60_000,
   burstRemaining: 39, burstResetTime: Date.now() + 60_000, limit: 180, burstLimit: 40,
 } })
})
it('rejects HTTP 200 HTML and exposes the actual fallback instrument and wavelength', async () => {
 jest.mocked(fetchSwpc).mockResolvedValueOnce(new Response('<html>Unavailable</html>', { headers: { 'Content-Type': 'text/html' } })).mockResolvedValueOnce(image())
 const response = await solarImage(request('sdo-image?wavelength=0193'))
 expect(response.status).toBe(200)
 expect(response.headers.get('X-Source')).toBe('NASA SDO AIA')
 expect(response.headers.get('X-Wavelength')).toBe('193')
 expect(response.headers.get('Content-Type')).toBe('image/jpeg')
})
it.each(['text/html', 'image/jpeg'])('does not label an invalid body as an image even with %s MIME', async mime => {
 jest.mocked(fetchSwpc).mockImplementation(async () => new Response('<html>Unavailable</html>', { headers: { 'Content-Type': mime } }))
 expect((await solarImage(request('sdo-image?wavelength=0304'))).status).toBe(502)
})
it.each([['HMIIF','NASA SDO HMI','visible'],['LASCOC2','NASA/ESA SOHO LASCO C2','white-light'],['LASCOC3','NASA/ESA SOHO LASCO C3','white-light'],['0193','NOAA GOES SUVI','195']])('attributes %s to its instrument rather than its hosting domain', async (band, source, wavelength) => {
 const response = await solarImage(request(`sdo-image?wavelength=${band}`))
 expect(response.headers.get('X-Source')).toBe(source)
 expect(response.headers.get('X-Wavelength')).toBe(wavelength)
})
it('does not try the nonexistent SDO AIA 284 fallback', async () => {
 jest.mocked(fetchSwpc).mockResolvedValue(new Response(null, { status: 404 }))
 expect((await solarImage(request('sdo-image?wavelength=0284'))).status).toBe(502)
 expect(jest.mocked(fetchSwpc).mock.calls.map(([url])=>url)).toEqual(['https://services.swpc.noaa.gov/images/animations/suvi/primary/284/latest.png'])
})
it('returns only real manifest frames and acquisition times in sorted order', async () => {
 jest.mocked(fetchSwpcJson).mockResolvedValue([
  {url:'/images/animations/lasco-c2/20261108_1212_c2_512.jpg'},
  {url:'/images/animations/lasco-c2/20261108_1200_c2_512.jpg'},
  {url:'/images/animations/lasco-c2/20261108_1200_c2_512.jpg'},
  {url:'/images/animations/lasco-c2/20260230_1200_c2_512.jpg'},
  {url:'/images/animations/lasco-c3/20261108_1200_c3_512.jpg'},
  {url:'https://evil.example/frame.jpg'}, null,
 ])
 const body = await (await coronagraph(request('coronagraph?camera=c2'))).json()
 expect(body.success).toBe(true)
 expect(body.data.frameCount).toBe(2)
 expect(body.data.frames).toEqual([
  {url:'https://services.swpc.noaa.gov/images/animations/lasco-c2/20261108_1200_c2_512.jpg',timestamp:'2026-11-08T12:00:00.000Z',camera:'c2',available:true},
  {url:'https://services.swpc.noaa.gov/images/animations/lasco-c2/20261108_1212_c2_512.jpg',timestamp:'2026-11-08T12:12:00.000Z',camera:'c2',available:true},
 ])
 expect(body.data.animatedGif).toBe('https://soho.nascom.nasa.gov/data/LATEST/current_c2small.gif')
})
it.each([{}, [], [{url:'/wrong.jpg'}]])('keeps unavailable manifests unavailable without synthetic frames: %j', async manifest => {
 jest.mocked(fetchSwpcJson).mockResolvedValue(manifest)
 const response = await coronagraph(request('coronagraph?camera=c3'))
 const body = await response.json()
 expect(response.status).toBe(502)
 expect(body.success).toBe(false)
 expect(body.data.frames).toEqual([])
 expect(body.data.frameCount).toBe(0)
})
it('retains actual ENLIL directory frames and removes duplicate links', async () => {
 jest.mocked(fetchSwpc).mockResolvedValue(new Response('<a href="enlil_com2_00001_20261108T120000.jpg">enlil_com2_00001_20261108T120000.jpg</a>'))
 const body = await (await enlil(request('enlil'))).json()
 expect(body.data.frames).toEqual(['https://services.swpc.noaa.gov/images/animations/enlil/enlil_com2_00001_20261108T120000.jpg'])
 expect(body.data.frameCount).toBe(1)
})
