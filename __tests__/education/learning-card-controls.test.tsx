import { fireEvent, render, screen, within } from '@testing-library/react'
import CloudTypesPage from '@/app/cloud-types/page'
import WeatherSystemsPage from '@/app/weather-systems/page'
import FunFactsPage from '@/app/fun-facts/page'
import { weatherPhenomena } from '@/data/fun-facts'
import type { ReactNode } from 'react'

jest.mock('@/components/page-wrapper', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))
jest.mock('@/components/education/guide-index', () => ({
  __esModule: true,
  default: () => null,
}))

describe('Learning card controls', () => {
  it('opens cloud details through a native button and restores focus after closing the analysis', () => {
    render(<CloudTypesPage />)

    const trigger = screen.getByRole('button', { name: 'CIRRUS details' })
    expect(trigger.tagName).toBe('BUTTON')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger.className).toContain('focus-visible:outline-2')
    trigger.focus()
    fireEvent.click(trigger)

    const region = screen.getByRole('region', { name: 'CIRRUS details' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-controls', region.id)
    const close = within(region).getByRole('button', { name: 'CLOSE TECHNICAL ANALYSIS' })
    close.focus()
    fireEvent.click(close)
    expect(screen.queryByRole('region', { name: 'CIRRUS details' })).not.toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
  })

  it('keeps the weather system guide separate from its disclosure button', () => {
    render(<WeatherSystemsPage />)

    const trigger = screen.getByRole('button', { name: 'CYCLONES details' })
    expect(trigger.tagName).toBe('BUTTON')
    fireEvent.click(trigger)
    const region = screen.getByRole('region', { name: 'CYCLONES details' })
    const guide = within(region).getByRole('link', { name: /Open shareable guide/ })
    expect(guide.closest('button')).toBeNull()
    expect(guide).toHaveAttribute('href', '/education/weather-systems/cyclones')
    fireEvent.click(guide)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(within(region).getByRole('button', { name: 'CLOSE TECHNICAL ANALYSIS' }))
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('lets phenomena expand independently and source links do not toggle details', () => {
    render(<FunFactsPage />)

    const first = screen.getByRole('button', { name: `${weatherPhenomena[0].name} details` })
    const second = screen.getByRole('button', { name: `${weatherPhenomena[1].name} details` })
    expect(first.tagName).toBe('BUTTON')
    expect(first).toHaveAttribute('aria-expanded', 'false')
    const source = screen.getAllByRole('link', { name: weatherPhenomena[0].sources[0].label })[0]
    expect(source.closest('button')).toBeNull()
    fireEvent.click(source)
    expect(first).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(first)
    fireEvent.click(second)
    expect(first).toHaveAttribute('aria-expanded', 'true')
    expect(second).toHaveAttribute('aria-expanded', 'true')
    const region = screen.getByRole('region', { name: `${weatherPhenomena[0].name} details` })
    expect(first).toHaveAttribute('aria-controls', region.id)
    fireEvent.click(first)
    expect(first).toHaveAttribute('aria-expanded', 'false')
    expect(second).toHaveAttribute('aria-expanded', 'true')
  })
})
