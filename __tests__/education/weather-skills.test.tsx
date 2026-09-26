import { fireEvent, render, screen, within } from '@testing-library/react'
import WeatherSkills from '@/components/education/weather-skills'
import WeatherSkillsPage from '@/app/education/weather-skills/page'
import type { ReactNode } from 'react'

jest.mock('@/components/page-wrapper', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

describe('Weather skills lessons', () => {
  it('validates lesson and return parameters at the page boundary', async () => {
    render(await WeatherSkillsPage({ searchParams: Promise.resolve({
      lesson: ['radar', 'storms'], returnTo: 'https://example.com/untrusted',
    }) }))

    expect(screen.getByRole('heading', { name: 'Read the clouds' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Open local forecast' })).toHaveAttribute('href', '/')
    for (const link of within(screen.getByRole('navigation', { name: 'Weather lessons' })).getAllByRole('link')) {
      expect(link.getAttribute('href')).not.toContain('returnTo')
    }
  })

  it('moves through all three cloud illustrations and allows revisiting a step', () => {
    render(<WeatherSkills />)

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('img', { name: 'STRATUS shown within the cloud layers' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByRole('heading', { name: 'Cirrus: delicate streaks high above' })).toBeVisible()
    expect(screen.getByRole('button', { name: '2. Wisps' })).toHaveAttribute('aria-current', 'step')
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByRole('img', { name: 'CUMULONIMBUS shown within the cloud layers' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Next step' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '1. Layers' }))
    expect(screen.getByRole('heading', { name: 'Stratus: a low, even layer' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
  })

  it('moves focus to the completion link when Next step finishes the lesson', () => {
    render(<WeatherSkills returnHref="/radar" />)

    const next = screen.getByRole('button', { name: 'Next step' })
    next.focus()
    fireEvent.click(next)
    expect(next).toHaveFocus()
    fireEvent.click(next)

    const completionLink = within(screen.getByRole('region', { name: 'Read the clouds' }))
      .getByRole('link', { name: 'Back to your weather' })
    expect(completionLink).toHaveFocus()

    const firstStep = screen.getByRole('button', { name: '1. Layers' })
    firstStep.focus()
    fireEvent.click(firstStep)
    expect(firstStep).toHaveFocus()

    const finalStep = screen.getByRole('button', { name: '3. Towers' })
    finalStep.focus()
    fireEvent.click(finalStep)
    expect(finalStep).toHaveFocus()
  })

  it('preserves the originating weather view in every lesson link and completion link', () => {
    const returnHref = '/radar?lat=47.6&lon=-122.33&location=Seattle'
    render(<WeatherSkills initialLesson="storms" returnHref={returnHref} />)

    const lessonLinks = within(screen.getByRole('navigation', { name: 'Weather lessons' })).getAllByRole('link')
    for (const link of lessonLinks) {
      const url = new URL(link.getAttribute('href')!, 'https://www.16bitweather.co')
      expect(url.pathname).toBe('/education/weather-skills')
      expect(url.searchParams.get('returnTo')).toBe(returnHref)
    }
    fireEvent.click(screen.getByRole('button', { name: '3. Outflow' }))
    expect(screen.getAllByRole('link', { name: 'Back to your weather' })).toHaveLength(2)
    for (const link of screen.getAllByRole('link', { name: 'Back to your weather' })) {
      expect(link).toHaveAttribute('href', returnHref)
    }
  })

  it('keeps radar history distinct from forecast probability and cites each step', () => {
    render(<WeatherSkills initialLesson="radar" />)

    expect(screen.getByText(/Reflectivity colors describe echo strength; they are not a probability/)).toBeVisible()
    expect(screen.getByRole('link', { name: /NWS: Using and understanding Doppler radar/ })).toHaveAttribute('href', 'https://www.weather.gov/mkx/using-radar')
    expect(screen.getByText('Concept diagram · no live or sample weather data.')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '2. History' }))
    expect(screen.getByText(/Our RainViewer animation shows past frames/)).toBeVisible()
    expect(screen.getByRole('link', { name: /RainViewer: Weather Maps API/ })).toHaveAttribute('rel', 'noopener noreferrer')
    fireEvent.click(screen.getByRole('button', { name: '3. Forecast' }))
    expect(screen.getByText(/hour ending at the listed time/)).toBeVisible()
    expect(screen.getByRole('link', { name: /Open-Meteo: Hourly weather variables/ })).toHaveAttribute('href', 'https://open-meteo.com/en/docs')
  })
})
