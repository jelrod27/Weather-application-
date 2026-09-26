'use client'

import Link from 'next/link'
import 'ol/ol.css'
import { formatLocationTimeWithZone } from '@/lib/format-location-time'
import { cn } from '@/lib/utils'
import { RadarInspector } from '@/components/radar-v2/radar-inspector'
import { RadarLayerSheet } from '@/components/radar-v2/radar-layer-sheet'
import { RadarPlayerDock } from '@/components/radar-v2/radar-player-dock'
import { RadarPlaybackSpeed } from '@/components/radar-v2/radar-playback-speed'
import { RadarPrecipLegend } from '@/components/radar-v2/radar-precip-legend'
import { RadarPresetBar } from '@/components/radar-v2/radar-preset-bar'
import { RadarStatusChip } from '@/components/radar-v2/radar-status-chip'
import { RadarTopBar } from '@/components/radar-v2/radar-top-bar'
import { RadarWidgetBadge } from '@/components/radar-v2/radar-widget-badge'
import { useRadarController } from '@/hooks/useRadarController'
import { ShareButtons } from '@/components/share-buttons'

import type { ThemeType } from '@/lib/theme-config'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'

interface RadarShellProps {
  selectedWarning?: NWSAlertDetail | null
  returnHref?: string
  returnLabel?: string
  learnHref?: string
  latitude?: number
  longitude?: number
  locationName?: string
  /** IANA timezone so "updated" stamps use the viewed location's clock. */
  timeZone?: string
  theme?: ThemeType
  displayMode?: 'full-page' | 'widget'
  onLocationSearch?: (location: string) => void
  searchError?: string
  shareConfig?: {
    title: string
    text: string
    url: string
  }
}

function RadarShell(props: RadarShellProps): React.JSX.Element {
  const {
    mapRef,
    isFullPage,
    isWidget,
    tilePreferences,
    locationName,
    onLocationSearch,
    searchError,
    shareConfig,
    metadata,
    frames,
    metadataError,
    updatedLabel,
    activeLayers,
    layerSheetOpen,
    setLayerSheetOpen,
    opacity,
    setOpacity,
    setTilePreferences,
    alertsGeoJson,
    spcGeoJson,
    stormReports,
    inspector,
    setInspector,
    activePreset,
    frameIndex,
    isPlaying,
    isLiveFrame,
    relativeTime,
    speed,
    setSpeed,
    handleLayersChange,
    handlePresetChange,
    handlePlayPause,
    handleSkipToStart,
    handleSkipToEnd,
    handleFrameChange,
    handleLiveTap,
  } = useRadarController(props)
  const selectedFrame = frames[frameIndex]
  const frameTimeLabel = selectedFrame?.isoTime
    ? formatLocationTimeWithZone(selectedFrame.isoTime, props.timeZone ?? 'UTC')
    : undefined

  return (
    <div
      data-radar-container
      data-radar-v2
      data-radar-widget={isWidget ? 'true' : undefined}
      className={cn('relative flex h-full min-h-0 w-full flex-col', isFullPage && 'bg-black')}
    >
      <div className={cn('relative min-h-0 flex-1 h-full', !isFullPage && 'min-h-[280px]')}>
        <div ref={mapRef} className={cn('h-full w-full', isFullPage ? 'bg-black' : 'rounded-lg bg-[#e8e4dc]')} />

        {isFullPage && locationName && onLocationSearch && shareConfig ? (
          <RadarTopBar
            returnHref={props.returnHref}
            returnLabel={props.returnLabel}
            learnHref={props.learnHref}
            locationName={locationName}
            onSearch={onLocationSearch}
            searchError={searchError}
            shareConfig={shareConfig}
          />
        ) : null}

        {isWidget && metadata && frames.length > 0 ? (
          <RadarWidgetBadge updatedLabel={updatedLabel} />
        ) : null}

        {isFullPage && metadata && frames.length > 0 && activeLayers.precipitation ? (
          <RadarPrecipLegend snowColorsEnabled={tilePreferences.snow} />
        ) : null}

        {isFullPage && metadata && frames.length > 0 && metadataError ? (
          <RadarStatusChip
            updatedLabel={updatedLabel ?? ''}
          />
        ) : null}

        {metadataError && !metadata ? (
          <div className="absolute inset-0 z-[2100] flex items-center justify-center bg-black/70 p-6 text-center text-white">
            <div>
              <p className="text-lg font-semibold">Radar unavailable</p>
              <p className="mt-2 text-sm text-zinc-300">{metadataError}</p>
            </div>
          </div>
        ) : null}

        {isFullPage ? (
          <RadarLayerSheet
            open={layerSheetOpen}
            mobileControls={(
              <>
                <RadarPresetBar activePreset={activePreset} onPresetChange={handlePresetChange} />
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>Playback speed</span>
                  <RadarPlaybackSpeed speed={speed} onSpeedChange={setSpeed} />
                </div>
                {shareConfig ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>Share this radar</span>
                    <ShareButtons config={shareConfig} className="[&>a]:min-h-11 [&>a]:min-w-11 [&>button]:min-h-11 [&>button]:min-w-11" />
                  </div>
                ) : null}
                {props.learnHref ? <Link href={props.learnHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Read this radar</Link> : null}
              </>
            )}
            layers={activeLayers}
            tilePreferences={tilePreferences}
            opacity={opacity}
            alertCount={alertsGeoJson?.features?.length ?? 0}
            spcCount={spcGeoJson?.features?.length ?? 0}
            stormReportCount={stormReports.length}
            onClose={() => setLayerSheetOpen(false)}
            onLayersChange={handleLayersChange}
            onTilePreferencesChange={setTilePreferences}
            onOpacityChange={setOpacity}
          />
        ) : null}

        {isFullPage && (frames.length > 0 || inspector) ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2500] flex flex-col">
            {inspector ? (
              <RadarInspector
                title={inspector.title}
                body={inspector.body}
                link={inspector.link}
                onClose={() => setInspector(null)}
              />
            ) : null}
            {frames.length > 0 ? (
              <>
                <div className="hidden sm:block">
                  <RadarPresetBar
                    activePreset={activePreset}
                    onPresetChange={handlePresetChange}
                    onOpenLayers={() => setLayerSheetOpen(true)}
                  />
                </div>
                <RadarPlayerDock
                  frameIndex={frameIndex}
                  frameCount={frames.length}
                  isPlaying={isPlaying}
                  isLiveFrame={isLiveFrame}
                  relativeTime={relativeTime}
                  frameTimeLabel={frameTimeLabel}
                  frameIsoTime={selectedFrame?.isoTime}
                  speed={speed}
                  controlsOpen={layerSheetOpen}
                  onOpenControls={() => setLayerSheetOpen(true)}
                  onPlayPause={handlePlayPause}
                  onSkipToStart={handleSkipToStart}
                  onSkipToEnd={handleSkipToEnd}
                  onSpeedChange={setSpeed}
                  onFrameChange={handleFrameChange}
                  onLiveTap={handleLiveTap}
                />
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default RadarShell
