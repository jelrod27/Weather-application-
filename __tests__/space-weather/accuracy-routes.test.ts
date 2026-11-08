/** @jest-environment node */
jest.mock('@/lib/services/swpc-proxy', () => ({ fetchSwpcJson: jest.fn() }))
jest.mock('@/lib/error-utils', () => ({ logRouteError: jest.fn() }))
jest.mock('@/lib/services/weather-rate-limiter', () => ({ rateLimitRequest: jest.fn().mockResolvedValue({ allowed: true, headers: {} }) }))
import { NextRequest } from 'next/server'
import { GET as sunspots } from '@/app/api/space-weather/sunspots/route'
import { GET as alerts } from '@/app/api/space-weather/alerts/route'
import { GET as xray } from '@/app/api/space-weather/xray-flux/route'
import { GET as kp } from '@/app/api/space-weather/kp-index/route'
import { GET as scales } from '@/app/api/space-weather/scales/route'
import { fetchSwpcJson } from '@/lib/services/swpc-proxy'
const request = (path: string) => new NextRequest(`http://localhost/api/space-weather/${path}`)
const fetchMock = jest.mocked(fetchSwpcJson)
beforeEach(() => { jest.useFakeTimers().setSystemTime(new Date('2026-11-08T12:00:00Z')); fetchMock.mockReset() })
afterEach(() => jest.useRealTimers())
it('uses monthly provider sunspot flux and dated smoothing without a fabricated cycle phase', async () => {
 fetchMock.mockResolvedValue([
  {'time-tag':'2026-03',ssn:80,smoothed_ssn:93.2,'f10.7':110},
  {'time-tag':'2026-10',ssn:70.4,smoothed_ssn:-1,'f10.7':125.6},
  {'time-tag':'2026-11',ssn:-1,smoothed_ssn:-1,'f10.7':-1},
 ])
 const response = await sunspots(request('sunspots')); const body = await response.json()
 expect(response.status).toBe(200)
 expect(body.data.current).toMatchObject({sunspotNumber:70.4, observedF107:125.6,date:'2026-10',period:'monthly'})
 expect(body.data.monthlySmoothed).toBe(93.2)
 expect(body.data.smoothedDate).toBe('2026-03')
 expect(body.data.solarCycle?.phase).toBeUndefined()
})
it('does not manufacture sunspot zeroes on unavailable data', async () => {
 fetchMock.mockResolvedValue([{'time-tag':'2026-10',ssn:-1}])
 const response = await sunspots(request('sunspots'))
 expect(response.ok).toBe(false)
 expect((await response.json()).data).toBeNull()
})
it('classifies actual NOAA message codes and limits severity to explicit scale declarations', async () => {
 fetchMock.mockResolvedValue([
 {product_id:'K05A',issue_datetime:'2026-11-08 11:00:00',message:'Space Weather Message Code: ALTK05\nALERT: Geomagnetic K-index of 5\nNOAA Scale: G1 - Minor\nSee G5 impacts in the reference guide.'},
 {product_id:'K05W',message:'Space Weather Message Code: WARK05\nWARNING: Geomagnetic K-index of 5 expected'},
 {product_id:'A20F',message:'Space Weather Message Code: WATA20\nWATCH: Geomagnetic Storm'},
 {product_id:'unknown',message:'A warning guide discusses extreme storms and G5.'},
 ])
 const body = await (await alerts(request('alerts'))).json()
 expect(body.alerts.map((a: {type:string})=>a.type)).toEqual(['alert','warning','watch','message'])
 expect(body.alerts[0].severity).toBe('minor')
 expect(body.alerts[3].severity).toBe('info')
})
it('sorts X-rays by observation time and excludes future samples', async () => {
 fetchMock.mockResolvedValue([
 {time_tag:'2026-11-08T11:59:00Z',flux:2e-6,energy:'0.1-0.8nm'},
 {time_tag:'2026-11-08T11:58:00Z',flux:1e-6,energy:'0.1-0.8nm'},
 {time_tag:'2026-11-09T11:58:00Z',flux:1e-3,energy:'0.1-0.8nm'},
 ])
 const body = await (await xray(request('xray-flux'))).json()
 expect(body.data.current.flux).toBe(2e-6)
 expect(body.data.peakLast24h.flux).toBe(2e-6)
})
it.each(['2026-11-07T11:59:00Z','2026-11-09T11:59:00Z','invalid'])('rejects unusable current X-rays dated %s', async time_tag => {
 fetchMock.mockResolvedValue([{time_tag,flux:2e-6,energy:'0.1-0.8nm'}])
 const response = await xray(request('xray-flux'))
 expect(response.ok).toBe(false)
 expect((await response.json()).data).toBeNull()
})
it.each(['2026-11-07T00:00:00Z','2026-11-09T00:00:00Z','invalid'])('rejects unusable current Kp dated %s', async time_tag => {
 fetchMock.mockImplementation(async (url) => String(url).includes('forecast') ? [] : [{time_tag,Kp:2}])
 const response = await kp(request('kp-index'))
 expect(response.ok).toBe(false)
 expect((await response.json()).data.current).toBeNull()
})
it.each(['2026-11-07','2026-11-09','invalid'])('rejects stale, future or undated NOAA scales %s', async DateStamp => {
 fetchMock.mockResolvedValue({'0':{DateStamp,TimeStamp:'11:59:00',R:{Scale:'0'},S:{Scale:'0'},G:{Scale:'0'}}})
 const response = await scales(request('scales'))
 expect(response.ok).toBe(false)
 expect((await response.json()).scales).toBeNull()
})
it('keeps current wind but never joins another spacecraft magnetic sample or makes null density zero', async () => {
 fetchMock.mockImplementation(async url => String(url).includes('wind_1m') ? [
 {time_tag:'2026-11-08T11:59:00Z',source:'SOLAR1',active:true,proton_speed:700,proton_density:null},
 ] : [{time_tag:'2026-11-08T11:59:00Z',source:'ACE',active:true,bz_gsm:-9,bt:10}])
 const { GET } = await import('@/app/api/space-weather/solar-wind/route')
 const response = await GET(request('solar-wind')); const body = await response.json()
 expect(response.ok).toBe(true)
 expect(body.data.current).toMatchObject({speed:700,density:null,bz:null,bt:null})
 expect(body.data.recent[0]).toMatchObject({density:null,bz:null})
})
it.each(['2026-11-07T11:59:00Z','2026-11-09T11:59:00Z','invalid'])('rejects unusable current solar wind dated %s', async time_tag => {
 fetchMock.mockImplementation(async url => String(url).includes('wind_1m') ? [{time_tag,proton_speed:700}] : [])
 const { GET } = await import('@/app/api/space-weather/solar-wind/route')
 const response = await GET(request('solar-wind'))
 expect(response.ok).toBe(false)
 expect((await response.json()).data).toBeNull()
})
it('ignores a future Kp row while retaining the newest fresh observation', async () => {
 fetchMock.mockImplementation(async url => String(url).includes('forecast') ? [] : [
  {time_tag:'2026-11-08T09:00:00Z',Kp:2}, {time_tag:'2026-11-09T00:00:00Z',Kp:9},
 ])
 const response = await kp(request('kp-index'))
 expect(response.ok).toBe(true)
 expect((await response.json()).data.current.value).toBe(2)
})
it('accepts fresh dated zero NOAA scales as observed quiet conditions', async () => {
 fetchMock.mockResolvedValue({'0':{DateStamp:'2026-11-08',TimeStamp:'11:59:00',R:{Scale:'0'},S:{Scale:'0'},G:{Scale:'0'}}})
 const response=await scales(request('scales'))
 expect(response.ok).toBe(true)
 expect((await response.json()).scales.G.scale).toBe(0)
})
it('does not publish stale current conditions through server-rendered intent loaders', async () => {
 fetchMock.mockResolvedValue([{time_tag:'2026-11-07T00:00:00Z',Kp:2,energy:'0.1-0.8nm',flux:2e-6}])
 const {loadCurrentKp}=await import('@/lib/space-weather/kp')
 const {loadCurrentFlare}=await import('@/lib/space-weather/xray')
 expect([await loadCurrentKp('test'),await loadCurrentFlare()]).toEqual([null,null])
})
it('does not derive aurora viewing latitude from stale Kp', async () => {
 fetchMock.mockResolvedValue([{time_tag:'2026-11-07T00:00:00Z',Kp:8}])
 const {GET}=await import('@/app/api/space-weather/aurora/route')
 const response=await GET(request('aurora'))
 expect(response.ok).toBe(false)
 expect((await response.json()).data.viewline).toBeNull()
})

it.each(['current', 'recent'] as const)('keeps %s magnetic values null when the same spacecraft reports a different instant', async section => {
 fetchMock.mockImplementation(async url => String(url).includes('wind_1m') ? [
  {time_tag:'2026-11-08T11:59:00Z',source:'SOLAR1',active:true,proton_speed:700,proton_density:4},
 ] : [
  {time_tag:'2026-11-08T11:58:00Z',source:'SOLAR1',active:true,bz_gsm:-9,bt:10},
 ])
 const {GET}=await import('@/app/api/space-weather/solar-wind/route')
 const response=await GET(request('solar-wind'))
 const {data}=await response.json()
 expect(response.ok).toBe(true)
 if(section==='current') expect(data.current).toMatchObject({timeTag:'2026-11-08T11:59:00Z',speed:700,bz:null,bt:null})
 else expect(data.recent).toEqual([{timeTag:'2026-11-08T11:59:00Z',speed:700,density:4,bz:null}])
})

it.each(['2026-11-08T11:59:00', '2026-11-08 11:59:00.000', '2026-11-08T03:59:00-08:00'])('joins current and recent magnetic values at the same instant represented as %s', async magneticTag => {
 fetchMock.mockImplementation(async url => String(url).includes('wind_1m') ? [
  {time_tag:'2026-11-08T11:59:00Z',source:'SOLAR1',active:true,proton_speed:700,proton_density:4},
 ] : [
  {time_tag:magneticTag,source:'SOLAR1',active:true,bz_gsm:-3.2,bt:5.1},
 ])
 const {GET}=await import('@/app/api/space-weather/solar-wind/route')
 const response=await GET(request('solar-wind'))
 const {data}=await response.json()
 expect(response.ok).toBe(true)
 expect(data.current).toMatchObject({timeTag:'2026-11-08T11:59:00Z',speed:700,bz:-3.2,bt:5.1})
 expect(data.recent).toEqual([{timeTag:'2026-11-08T11:59:00Z',speed:700,density:4,bz:-3.2}])
})
