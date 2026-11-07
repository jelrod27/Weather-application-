import { act, render, screen } from '@testing-library/react'
import AuthResultPage from '@/app/auth/result/page'

const mockPush = jest.fn()
const mockRouter = { push: mockPush }
let mockSearchParams = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}))

describe('authentication result navigation', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockPush.mockReset()
  })

  afterEach(() => jest.useRealTimers())

  it.each([
    ['https://example.invalid/landing', '/dashboard'],
    ['//example.invalid/landing', '/dashboard'],
    ['/\\example.invalid/landing', '/dashboard'],
    ['javascript:alert(1)', '/dashboard'],
    [null, '/dashboard'],
    ['/dashboard', '/dashboard'],
    ['/weather/london', '/weather/london'],
    ['/weather/london?units=metric#forecast', '/weather/london?units=metric#forecast'],
  ])('navigates safely for next=%s', (next, expected) => {
    mockSearchParams = new URLSearchParams({ success: 'true' })
    if (next !== null) mockSearchParams.set('next', next)
    render(<AuthResultPage />)
    for (let i = 0; i < 3; i++) act(() => jest.advanceTimersByTime(1000))
    expect(mockPush).toHaveBeenCalledWith(expected)
    if (expected === '/dashboard') {
      expect(screen.getByText(/Heading to your dashboard/)).toBeInTheDocument()
    }
  })

  it('validates a destination after search parameters decode it', () => {
    mockSearchParams = new URLSearchParams('success=true&next=https%3A%2F%2Fexample.invalid')
    render(<AuthResultPage />)
    for (let i = 0; i < 3; i++) act(() => jest.advanceTimersByTime(1000))
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })
})
