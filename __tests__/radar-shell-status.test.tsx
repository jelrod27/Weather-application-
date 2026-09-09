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
