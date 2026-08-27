/**
 * Tests for generic ShareButtons component
 */
import { render, screen } from '@testing-library/react'

jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn()
}))

import { ShareButtons } from '@/components/share-buttons'

describe('ShareButtons', () => {
  const defaultConfig = {
    title: 'Test Page',
    text: 'Check out this test page',
    url: 'https://www.16bitweather.co/test',
  }

  it('should render X, Facebook, LinkedIn, and Copy buttons', () => {
    render(<ShareButtons config={defaultConfig} />)

    expect(screen.getByLabelText(/share on x/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/share on facebook/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/share on linkedin/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/copy link/i)).toBeInTheDocument()
  })
})
