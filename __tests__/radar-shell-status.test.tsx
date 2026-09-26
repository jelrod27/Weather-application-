import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import RadarShell from '@/components/radar-v2/radar-shell'
import type { useRadarController } from '@/hooks/useRadarController'

const mockUseRadarController = jest.fn<ReturnType<typeof useRadarController>, []>()

jest.mock('@/hooks/useRadarController', () => ({
  useRadarController: () => mockUseRadarController(),
}))

const retainedRadar = {
  mapRef: createRef<HTMLDivElement>(),
  isFullPage: true,
  isWidget: false,
  tilePreferences: { smooth: true, snow: true, coverage: false },
  metadata: {
    generatedAt: '2026-09-08T12:00:00.000Z',
    selectedProvider: { shortName: 'RainViewer' },
  },
  frames: [{ isLive: true }],
  metadataError: null,
  updatedLabel: '5:00 AM',
  activeLayers: {
    precipitation: false,
    alerts: false,
    spc: false,
    stormReports: false,
    coverage: false,
  },
  layerSheetOpen: false,
  setLayerSheetOpen: jest.fn(),
  opacity: 0.92,
  setOpacity: jest.fn(),
  setTilePreferences: jest.fn(),
  alertsGeoJson: null,
  spcGeoJson: null,
  stormReports: [],
  inspector: null,
  setInspector: jest.fn(),
  activePreset: 'radar',
  frameIndex: 0,
  isPlaying: false,
  isLiveFrame: true,
  relativeTime: 'LATEST',
  speed: 1,
  handleLayersChange: jest.fn(),
  handlePresetChange: jest.fn(),
  handlePlayPause: jest.fn(),
  handleSkipToStart: jest.fn(),
  handleSkipToEnd: jest.fn(),
  handleFrameChange: jest.fn(),
  handleLiveTap: jest.fn(),
} as ReturnType<typeof useRadarController>

describe('RadarShell retained-data status UI', () => {
  it('keeps severe feature details available when radar frames are unavailable', () => {
    mockUseRadarController.mockReturnValue({
      ...retainedRadar,
      frames: [],
      inspector: { title: 'Severe Thunderstorm Warning', body: 'Follow local safety guidance.', link: 'https://www.weather.gov/' },
    })
    render(<RadarShell displayMode="full-page" />)
    expect(screen.getByText('Severe Thunderstorm Warning')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View on weather.gov' })).toBeInTheDocument()
    expect(screen.queryByTestId('radar-player-dock')).not.toBeInTheDocument()
  })

  it('shows the selected frame clock in the viewed location timezone', () => {
    mockUseRadarController.mockReturnValue({
      ...retainedRadar,
      frames: [{
        timestamp: Date.parse('2026-09-26T14:10:00Z'),
        isoTime: '2026-09-26T14:10:00Z',
        epochSeconds: Date.parse('2026-09-26T14:10:00Z') / 1000,
        offsetMinutes: 0,
        isLive: true,
      }],
    })
    render(<RadarShell displayMode="full-page" timeZone="America/Los_Angeles" />)
    expect(screen.getByText('7:10 AM PDT')).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Radar timeline' })).toHaveAttribute('aria-valuetext', '7:10 AM PDT · LATEST')
  })

  it('announces a failed refresh only after a successful radar load', () => {
    mockUseRadarController.mockReturnValue(retainedRadar)
    const { rerender } = render(<RadarShell displayMode="full-page" />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    mockUseRadarController.mockReturnValue({
      ...retainedRadar,
      metadataError: 'Radar is temporarily unavailable. Try again shortly.',
    })
    rerender(<RadarShell displayMode="full-page" />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Updates delayed · showing last available frame',
    )
  })
})
