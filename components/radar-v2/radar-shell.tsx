'use client'

import type { CSSProperties } from 'react'
import type { ThemeType } from '@/lib/theme-config'
import { getRainViewerDisplayFilter } from '@/lib/radar/rainviewer'
import { RadarInspector } from '@/components/radar-v2/radar-inspector'
import { RadarLayerSheet } from '@/components/radar-v2/radar-layer-sheet'
import { RadarPlayerDock } from '@/components/radar-v2/radar-player-dock'
import { RadarPrecipLegend } from '@/components/radar-v2/radar-precip-legend'
import { RadarPresetBar } from '@/components/radar-v2/radar-preset-bar'
import { RadarStatusChip } from '@/components/radar-v2/radar-status-chip'
import { RadarTopBar } from '@/components/radar-v2/radar-top-bar'
import { RadarWidgetBadge } from '@/components/radar-v2/radar-widget-badge'
import { useRadarController } from '@/hooks/useRadarController'

import 'ol/ol.css'

interface RadarShellProps {
  latitude?: number
  longitude?: number
  locationName?: string
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

function RadarShell(props: RadarShellProps) {
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
    statusClass,
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

  return (
    <div
      data-radar-container
      data-radar-v2
      data-radar-widget={isWidget ? 'true' : undefined}
      data-radar-color-scheme={tilePreferences.colorScheme}
      style={{
        '--radar-scheme-filter': getRainViewerDisplayFilter(tilePreferences.colorScheme),
      } as CSSProperties}
      className={`relative flex w-full flex-col ${isFullPage ? 'h-full min-h-0 bg-black' : 'h-full min-h-0'}`}
    >
      <div className={`relative min-h-0 flex-1 ${isFullPage ? 'h-full' : 'h-full min-h-[280px]'}`}>
        <div ref={mapRef} className={`h-full w-full ${isFullPage ? 'bg-black' : 'bg-[#e8e4dc]'} ${isFullPage ? '' : 'rounded-lg'}`} />

        {isFullPage && locationName && onLocationSearch && shareConfig ? (
          <RadarTopBar
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
          <RadarPrecipLegend />
        ) : null}

        {isFullPage && metadata && frames.length > 0 ? (
          <RadarStatusChip
            providerLabel={`${metadata.selectedProvider.shortName.toUpperCase()} RADAR`}
            updatedLabel={updatedLabel ?? ''}
            freshnessClassName={statusClass}
            isPlaying={isPlaying}
            isLiveFrame={isLiveFrame}
          />
        ) : null}

        {metadataError ? (
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

        {isFullPage && inspector ? (
          <RadarInspector
            title={inspector.title}
            body={inspector.body}
            link={inspector.link}
            onClose={() => setInspector(null)}
          />
        ) : null}

        {isFullPage && frames.length > 0 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2500] flex flex-col">
            <div className="pointer-events-none h-16 bg-gradient-to-t from-black/80 to-transparent" aria-hidden="true" />
            <RadarPresetBar
              activePreset={activePreset}
              onPresetChange={handlePresetChange}
              onOpenLayers={() => setLayerSheetOpen(true)}
            />
            <RadarPlayerDock
              frameIndex={frameIndex}
              frameCount={frames.length}
              isPlaying={isPlaying}
              isLiveFrame={isLiveFrame}
              relativeTime={relativeTime}
              speed={speed}
              onPlayPause={handlePlayPause}
              onSkipToStart={handleSkipToStart}
              onSkipToEnd={handleSkipToEnd}
              onSpeedChange={setSpeed}
              onFrameChange={handleFrameChange}
              onLiveTap={handleLiveTap}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default RadarShell
