import * as Sentry from '@sentry/nextjs'
import { captureError } from '@/lib/error-utils'

type RadarProviderId = string

export function trackRadarMetadataApi(
  responseTimeMs: number,
  success: boolean,
): void {
  Sentry.metrics.distribution('api.radar_metadata.response_time', responseTimeMs, {
    unit: 'millisecond',
  })
  Sentry.metrics.count('api.radar_metadata.requests')
  if (!success) {
    Sentry.metrics.count('api.radar_metadata.errors')
  }
}

export function captureRadarMetadataRouteError(error: unknown): void {
  captureError(error, 'radar:metadata-route')
}

export function recordRadarTileError(providerId: RadarProviderId, errorCount: number): void {
  Sentry.addBreadcrumb({
    category: 'radar.tile',
    level: 'warning',
    message: 'Radar tile load error',
    data: { providerId, errorCount },
  })
}

export function recordRadarProviderFallback(
  fromProviderId: RadarProviderId | undefined,
  toProviderId: RadarProviderId,
  tileErrorCount: number,
): void {
  Sentry.addBreadcrumb({
    category: 'radar.provider',
    level: 'warning',
    message: 'Radar provider fallback activated',
    data: { fromProviderId, toProviderId, tileErrorCount },
  })
  Sentry.captureMessage('[radar] provider fallback activated', {
    level: 'warning',
    tags: {
      context: 'radar',
      fromProvider: fromProviderId ?? 'unknown',
      toProvider: toProviderId,
    },
    extra: { tileErrorCount },
  })
  Sentry.metrics.count('radar.provider.fallback', 1, {
    attributes: {
      from: fromProviderId ?? 'unknown',
      to: toProviderId,
    },
  })
}

export function recordRadarMetadataClientLoad(
  responseTimeMs: number,
  success: boolean,
  latitude?: number,
  longitude?: number,
): void {
  Sentry.metrics.distribution('radar.metadata.client_latency', responseTimeMs, {
    unit: 'millisecond',
  })
  if (!success) {
    Sentry.addBreadcrumb({
      category: 'radar.metadata',
      level: 'warning',
      message: 'Client radar metadata load failed',
      data: { latitude, longitude, responseTimeMs },
    })
  }
}

export function captureRadarMetadataClientError(
  error: unknown,
  latitude?: number,
  longitude?: number,
): void {
  captureError(error, 'radar:metadata-load', { latitude, longitude })
}
