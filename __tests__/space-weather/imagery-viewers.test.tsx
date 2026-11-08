import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import SunImageViewer from '@/components/space-weather/SunImageViewer'
import CoronagraphAnimation from '@/components/space-weather/CoronagraphAnimation'
import EnlilModelViewer from '@/components/space-weather/EnlilModelViewer'

beforeEach(() => {
 global.fetch = jest.fn()
 URL.createObjectURL = jest.fn(() => 'blob:solar-image')
 URL.revokeObjectURL = jest.fn()
})
const jsonResponse = (payload: unknown): Response => ({ok:true,json:async () => payload}) as Response
const enlilUrl = 'https://services.swpc.noaa.gov/images/animations/enlil/enlil_com2_00001_20261108T120000.jpg'
const enlilPayload = { data: { frames: [enlilUrl], latest: enlilUrl, fallback: enlilUrl, frameCount: 1 }, source:'NOAA SWPC' }
it('updates the request time when selecting a new solar channel', async () => {
 jest.useFakeTimers().setSystemTime(new Date('2026-11-08T12:00:00Z'))
 jest.mocked(fetch).mockResolvedValue({ok:true,headers:new Headers(),blob:async () => new Blob(['jpeg'])} as Response)
 try {
  render(<SunImageViewer />)
  await act(async () => undefined)
  jest.setSystemTime(new Date('2026-11-08T12:01:00Z'))
  fireEvent.click(screen.getByTestId('wavelength-195'))
  await act(async () => undefined)
  expect(screen.getByText('Last requested: 12:01:00Z')).toBeInTheDocument()
 } finally { jest.useRealTimers() }
})
it('bounds failed solar image requests and recovers on manual retry', async () => {
 jest.useFakeTimers()
 jest.mocked(fetch).mockResolvedValue({ok:false} as Response)
 try {
  render(<SunImageViewer />)
  await act(async () => undefined)
  await act(async () => { jest.advanceTimersByTime(1500) })
  await act(async () => { jest.advanceTimersByTime(3000) })
  expect(screen.getByText('SIGNAL LOST')).toBeInTheDocument()
  expect(fetch).toHaveBeenCalledTimes(3)
  await act(async () => { jest.advanceTimersByTime(10000) })
  expect(fetch).toHaveBeenCalledTimes(3)
  jest.mocked(fetch).mockResolvedValue({ok:true,headers:new Headers({'X-Source':'NOAA GOES SUVI','X-Wavelength':'171'}),blob:async () => new Blob(['jpeg'])} as Response)
  fireEvent.click(screen.getByRole('button', {name:'RETRY'}))
  await act(async () => undefined)
  fireEvent.load(screen.getByAltText('Sun in 171 Å'))
  expect(screen.queryByText('SIGNAL LOST')).not.toBeInTheDocument()
 } finally { jest.useRealTimers() }
})
it('shows actual fallback solar wavelength/instrument and labels client time as requested', async () => {
 jest.mocked(fetch).mockResolvedValue(({ok:true,headers:new Headers({'Content-Type':'image/jpeg','X-Source':'NASA SDO AIA','X-Wavelength':'193'}),blob:async () => new Blob(['jpeg'])} as Response))
 render(<SunImageViewer />)
 fireEvent.click(screen.getByTestId('wavelength-195'))
 expect(await screen.findByText('NASA SDO AIA')).toBeInTheDocument()
 expect(screen.getByAltText('Sun in 193 Å')).toBeInTheDocument()
 expect(screen.getByText(/Last requested:/)).toBeInTheDocument()
 expect(screen.queryByText(/Last update:/)).not.toBeInTheDocument()
})
it('keeps the actual animation URL when opening the coronagraph modal', () => {
 render(<CoronagraphAnimation />)
 const imageUrl = screen.getByTestId('coronagraph-frame').getAttribute('src')
 fireEvent.click(screen.getByTitle('Full Screen'))
 expect(screen.getByAltText('LASCO C2 Coronagraph (full resolution)')).toHaveAttribute('src', imageUrl)
})
it('preserves manual playback frames when selecting the already active camera', async () => {
 const secondFrameUrl = 'https://services.swpc.noaa.gov/images/animations/lasco-c2/20261108_1212_c2_512.jpg'
 jest.mocked(fetch).mockResolvedValue(jsonResponse({success:true,data:{
  frames:[
   {url:'https://services.swpc.noaa.gov/images/animations/lasco-c2/20261108_1200_c2_512.jpg',timestamp:'2026-11-08T12:00:00Z',camera:'c2',available:true},
   {url:secondFrameUrl,timestamp:'2026-11-08T12:12:00Z',camera:'c2',available:true},
  ],
  fallbackGif:'https://soho.nascom.nasa.gov/data/LATEST/current_c2small.gif',
  animatedGif:'https://soho.nascom.nasa.gov/data/LATEST/current_c2small.gif',
  latestImage:'https://soho.nascom.nasa.gov/data/realtime/c2/512/latest.jpg',
  camera:'c2',frameCount:2,useAnimatedGif:false,
 },source:'SOHO LASCO (NASA/ESA)'}))
 render(<CoronagraphAnimation />)
 fireEvent.click(screen.getByRole('button', {name:/ANIMATED/}))
 await screen.findByText('Frame 1/2')
 fireEvent.load(screen.getByTestId('coronagraph-frame'))
 fireEvent.click(screen.getByTitle('Next Frame'))
 expect(screen.getByTestId('coronagraph-frame')).toHaveAttribute('src', secondFrameUrl)
 fireEvent.click(screen.getByRole('button', {name:/C2/}))
 expect(screen.getByTestId('coronagraph-frame')).toHaveAttribute('src', secondFrameUrl)
 expect(screen.getByText('Frame 2/2')).toBeInTheDocument()
 expect(screen.getByTitle('Next Frame')).toBeInTheDocument()
})
it('keeps a failed coronagraph animation visibly unavailable until refresh', () => {
 render(<CoronagraphAnimation />)
 fireEvent.error(screen.getByTestId('coronagraph-frame'))
 expect(screen.getByRole('alert')).toHaveTextContent(/image unavailable/i)
 expect(screen.queryByText('PLAYING')).not.toBeInTheDocument()
 fireEvent.click(screen.getByTitle('Refresh'))
 fireEvent.load(screen.getByTestId('coronagraph-frame'))
 expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
it('does not display a failed frame timestamp on the coronagraph fallback GIF', async () => {
 jest.mocked(fetch).mockResolvedValue(jsonResponse({success:true,data:{frames:[{url:'https://services.swpc.noaa.gov/images/animations/lasco-c2/20261108_1200_c2_512.jpg',timestamp:'2026-11-08T12:00:00Z',camera:'c2',available:true}],useAnimatedGif:false}}))
 render(<CoronagraphAnimation />)
 fireEvent.click(screen.getByRole('button', {name:/ANIMATED/}))
 await screen.findByText('Frame 1/1')
 fireEvent.error(screen.getByTestId('coronagraph-frame'))
 expect(screen.getByText('Fallback GIF')).toBeInTheDocument()
 expect(screen.queryByText(/^\d{1,2}:\d{2}:\d{2}/)).not.toBeInTheDocument()
})
it('does not retain previous camera imagery while loading the new camera frames', async () => {
 jest.mocked(fetch).mockResolvedValue(jsonResponse({success:true,data:{frames:[],fallbackGif:'https://soho.nascom.nasa.gov/data/LATEST/current_c2small.gif',latestImage:'https://soho.nascom.nasa.gov/data/realtime/c2/512/latest.jpg',useAnimatedGif:true}}))
 render(<CoronagraphAnimation />)
 fireEvent.click(screen.getByRole('button', {name:/ANIMATED/}))
 await waitFor(() => expect(fetch).toHaveBeenCalled())
 fireEvent.click(screen.getByRole('button', {name:/FRAME CONTROL/}))
 fireEvent.click(screen.getByRole('button', {name:/C3/}))
 expect(screen.getByTestId('coronagraph-frame').getAttribute('src')).toContain('/c3/')
})
it('shows unavailable after ENLIL image failure and retries the actual image on refresh', async () => {
 jest.mocked(fetch).mockImplementation(async () => jsonResponse(enlilPayload))
 render(<EnlilModelViewer />)
 const image = await screen.findByAltText('WSA-ENLIL Solar Wind Propagation Model')
 expect(screen.queryByText('Invalid Date')).not.toBeInTheDocument()
 expect(screen.queryByText(/^\d{1,2}:\d{2}:\d{2}/)).not.toBeInTheDocument()
 fireEvent.error(image)
 expect(screen.getByRole('alert')).toHaveTextContent(/image unavailable/i)
 expect(screen.queryByAltText('WSA-ENLIL Solar Wind Propagation Model')).not.toBeInTheDocument()
 fireEvent.click(screen.getByTitle('Refresh'))
 const retry = await screen.findByAltText('WSA-ENLIL Solar Wind Propagation Model')
 fireEvent.load(retry)
 expect(screen.queryByRole('alert')).not.toBeInTheDocument()
 expect(screen.queryByText('ACQUIRING ENLIL MODEL DATA...')).not.toBeInTheDocument()
})
it('clears late coronagraph frame responses when the camera changes', async () => {
 let finish: (response: Response) => void = () => undefined
 jest.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  .mockImplementation(async () => jsonResponse({success:false}))
 render(<CoronagraphAnimation />)
 fireEvent.click(screen.getByRole('button', {name:/ANIMATED/}))
 fireEvent.click(screen.getByRole('button', {name:/C3/}))
 finish(jsonResponse({success:true,data:{frames:[{url:'https://services.swpc.noaa.gov/images/animations/lasco-c2/20261108_1200_c2_512.jpg',timestamp:'2026-11-08T12:00:00Z',camera:'c2',available:true}],fallbackGif:'https://soho.nascom.nasa.gov/data/LATEST/current_c2small.gif'}}))
 await waitFor(() => expect(screen.getByText(/Frame data unavailable/)).toBeInTheDocument())
 expect(screen.getByTestId('coronagraph-frame').getAttribute('src')).toContain('current_c3small.gif')
})
it.each([null, {}, {frames:'invalid'}, {frames:[null]}, {frames:['https://evil.example/frame.jpg']}])('rejects malformed ENLIL image contracts: %j', async data => {
 jest.mocked(fetch).mockResolvedValue(jsonResponse({data}))
 render(<EnlilModelViewer />)
 expect(await screen.findByRole('alert')).toHaveTextContent(/unavailable|failed/i)
 expect(screen.queryByAltText('WSA-ENLIL Solar Wind Propagation Model')).not.toBeInTheDocument()
 expect(screen.queryByText('ACQUIRING ENLIL MODEL DATA...')).not.toBeInTheDocument()
})
