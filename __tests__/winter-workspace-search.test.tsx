import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import WinterPlaceSearch from '@/components/winter/winter-place-search'

const response = (data: unknown) => ({ ok: true, json: async () => data }) as Response

describe('Winter location search', () => {
  afterEach(() => jest.restoreAllMocks())
  it('lets visitors choose a US city result explicitly', async () => {
    global.fetch = jest.fn().mockResolvedValue(response([{ name: 'Denver', state: 'CO', country: 'US', lat: 39.7, lon: -105 }]))
    const select = jest.fn()
    render(<WinterPlaceSearch onSelect={select} />)
    fireEvent.change(screen.getByLabelText('US city or ZIP code'), { target: { value: 'Denver' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    fireEvent.click(await screen.findByRole('button', { name: /Denver, CO, US/ }))
    expect(select).toHaveBeenCalledWith({ name: 'Denver, CO', lat: 39.7, lon: -105 })
  })
  it('rejects unsupported countries instead of selecting the first result', async () => {
    global.fetch = jest.fn().mockResolvedValue(response([{ name: 'London', country: 'GB', lat: 51.5, lon: 0 }]))
    const select = jest.fn()
    render(<WinterPlaceSearch onSelect={select} />)
    fireEvent.change(screen.getByLabelText('US city or ZIP code'), { target: { value: 'London' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(await screen.findByText(/No supported US locations found/)).toBeInTheDocument()
    expect(select).not.toHaveBeenCalled()
  })
  it('removes obsolete search results as soon as the query changes', async () => {
    global.fetch = jest.fn().mockResolvedValue(response([{ name: 'Denver', country: 'US', lat: 39.7, lon: -105 }]))
    render(<WinterPlaceSearch onSelect={jest.fn()} />)
    const input = screen.getByLabelText('US city or ZIP code')
    fireEvent.change(input, { target: { value: 'Denver' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByRole('button', { name: /Denver, US/ })
    fireEvent.change(input, { target: { value: 'Boston' } })
    expect(screen.queryByRole('button', { name: /Denver, US/ })).not.toBeInTheDocument()
  })
  it('reports failed search as unavailable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'))
    render(<WinterPlaceSearch onSelect={jest.fn()} />)
    fireEvent.change(screen.getByLabelText('US city or ZIP code'), { target: { value: '80202' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() => expect(screen.getByText(/Location search unavailable/)).toBeInTheDocument())
  })
})
