import { render, screen } from '@testing-library/react'
import { RadarPrecipLegend } from '@/components/radar-v2/radar-precip-legend'
import { RadarStatusChip } from '@/components/radar-v2/radar-status-chip'

describe('radar degraded and legend status UI', () => {
  it('announces that retained radar data could not refresh', () => {
    render(
      <RadarStatusChip
        updatedLabel="5:20 AM"
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'Updates delayed · showing last available frame',
    )
  })

  it('labels the reflectivity scale as rain-only when snow colors are enabled', () => {
    const { rerender } = render(<RadarPrecipLegend snowColorsEnabled />)

    expect(screen.getByText('Rain intensity')).toBeInTheDocument()
    expect(screen.getByText('Snow uses a separate RainViewer color scale.')).toBeInTheDocument()

    rerender(<RadarPrecipLegend snowColorsEnabled={false} />)
    expect(screen.queryByText('Snow uses a separate RainViewer color scale.')).not.toBeInTheDocument()
  })
})
