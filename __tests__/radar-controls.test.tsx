import { useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RadarLayerSheet } from '@/components/radar-v2/radar-layer-sheet'
import { RadarPlaybackSpeed } from '@/components/radar-v2/radar-playback-speed'
import { RadarPlayerDock } from '@/components/radar-v2/radar-player-dock'
import { RadarPresetBar } from '@/components/radar-v2/radar-preset-bar'
import { RadarTopBar } from '@/components/radar-v2/radar-top-bar'
import type { ComponentProps } from 'react'

const layers = { precipitation: true, alerts: true, spc: false, stormReports: false, coverage: false }
const tilePreferences = { smooth: true, snow: true, coverage: false }

function layerProps(): ComponentProps<typeof RadarLayerSheet> {
  return {
    open: true,
    layers,
    tilePreferences,
    opacity: 0.9,
    alertCount: 3,
    spcCount: 2,
    stormReportCount: 1,
    onClose: jest.fn(),
    onLayersChange: jest.fn(),
    onTilePreferencesChange: jest.fn(),
    onOpacityChange: jest.fn(),
  }
}

describe('radar controls', () => {
  it('keeps selected-frame time, age, playback and history caveat with the timeline', () => {
    const onPlayPause = jest.fn()
    const onFrameChange = jest.fn()
    const onOpenControls = jest.fn()
    const onLiveTap = jest.fn()
    render(
      <RadarPlayerDock
        frameIndex={1} frameCount={13} isPlaying={false} isLiveFrame={false}
        relativeTime="30m ago" frameTimeLabel="7:10 AM PDT" frameIsoTime="2026-09-26T14:10:00Z"
        speed={1} onPlayPause={onPlayPause} onFrameChange={onFrameChange}
        onSkipToStart={jest.fn()} onSkipToEnd={jest.fn()} onSpeedChange={jest.fn()}
        onLiveTap={onLiveTap} onOpenControls={onOpenControls} controlsOpen={false}
      />,
    )

    expect(screen.getByText('7:10 AM PDT')).toHaveAttribute('datetime', '2026-09-26T14:10:00Z')
    expect(screen.getByRole('slider', { name: 'Radar timeline' })).toHaveAttribute('aria-valuetext', '7:10 AM PDT · 30m ago')
    expect(screen.getByText(/Past observations, not a forecast/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'RainViewer' })).toHaveAttribute('href', 'https://www.rainviewer.com/')
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(onPlayPause).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByRole('slider', { name: 'Radar timeline' }), { target: { value: '5' } })
    expect(onFrameChange).toHaveBeenCalledWith(5)
    fireEvent.click(screen.getByRole('button', { name: 'Latest' }))
    expect(onLiveTap).toHaveBeenCalledTimes(1)
    const controls = screen.getByRole('button', { name: 'Controls' })
    expect(controls).toHaveAttribute('aria-haspopup', 'dialog')
    expect(controls).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(controls)
    expect(onOpenControls).toHaveBeenCalledTimes(1)
  })

  it('announces selected presets and playback speed and passes the requested changes', () => {
    const onPresetChange = jest.fn()
    const onSpeedChange = jest.fn()
    render(<>
      <RadarPresetBar activePreset="severe" onPresetChange={onPresetChange} />
      <RadarPlaybackSpeed speed={0.5} onSpeedChange={onSpeedChange} />
    </>)

    expect(screen.getByRole('button', { name: 'Severe' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Radar' })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Outlook' }))
    expect(onPresetChange).toHaveBeenCalledWith('outlook')
    expect(screen.getByRole('button', { name: '0.5x speed' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: '2x speed' }))
    expect(onSpeedChange).toHaveBeenCalledWith(2)
  })

  it('traps drawer focus, dismisses with Escape and returns focus to its opener', async () => {
    function Harness(): React.JSX.Element {
      const [open, setOpen] = useState(false)
      return <>
        <button type="button" onClick={() => setOpen(true)}>Controls</button>
        <RadarLayerSheet {...layerProps()} open={open} onClose={() => setOpen(false)} />
      </>
    }
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Controls' })
    opener.focus()
    fireEvent.click(opener)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAccessibleName(/Radar controls/)
    expect(dialog).toHaveAccessibleDescription(/past observations/)
    const close = screen.getByRole('button', { name: 'Close' })
    expect(close).toHaveFocus()
    act(() => opener.focus())
    expect(dialog.contains(document.activeElement)).toBe(true)
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(opener).toHaveFocus())
  })

  it('retains severe overlays, display options, legend and historical-data caveats in the drawer', () => {
    const props = layerProps()
    render(<RadarLayerSheet {...props} mobileControls={<button type="button">Share this radar</button>} />)
    expect(screen.getByRole('button', { name: 'Share this radar' })).toBeInTheDocument()
    expect(screen.getByText(/not a forecast or a rain arrival estimate/)).toBeInTheDocument()
    expect(screen.getByText('Universal Blue rain legend')).toBeInTheDocument()
    expect(screen.getByText('Snow uses a separate RainViewer color scale.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'NWS Alerts at location (3)' }))
    expect(props.onLayersChange).toHaveBeenCalledWith({ ...layers, alerts: false })
    fireEvent.click(screen.getByRole('checkbox', { name: 'SPC Outlook (2)' }))
    expect(props.onLayersChange).toHaveBeenCalledWith({ ...layers, spc: true })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Storm Reports (1)' }))
    expect(props.onLayersChange).toHaveBeenCalledWith({ ...layers, stormReports: true })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Coverage mask' }))
    expect(props.onTilePreferencesChange).toHaveBeenCalledWith({ ...tilePreferences, coverage: true })
    fireEvent.change(screen.getByRole('slider', { name: 'Radar opacity' }), { target: { value: '0.5' } })
    expect(props.onOpacityChange).toHaveBeenCalledWith(0.5)
  })

  it('uses the viewed place and supplied return and lesson links', () => {
    render(<RadarTopBar
      locationName="Portland, OR" onSearch={jest.fn()}
      shareConfig={{ title: 'Radar', text: 'Portland radar', url: 'https://16bitweather.co/radar' }}
      returnHref="/?location=Portland" returnLabel="Back to forecast" learnHref="/guides/read-radar"
    />)
    expect(screen.getByText('Portland, OR')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to forecast' })).toHaveAttribute('href', '/?location=Portland')
    expect(screen.getByRole('link', { name: 'Read this radar' })).toHaveAttribute('href', '/guides/read-radar')
  })
})
