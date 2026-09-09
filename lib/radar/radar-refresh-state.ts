import type { RadarMetadata } from '@/lib/radar/providers/types'

export interface RadarRefreshState {
  metadata: RadarMetadata | null
  error: string | null
}

export type RadarRefreshAction =
  | { type: 'loaded'; metadata: RadarMetadata }
  | { type: 'failed'; message: string }
  | { type: 'reset' }

export const initialRadarRefreshState: RadarRefreshState = {
  metadata: null,
  error: null,
}

export function reduceRadarRefreshState(
  state: RadarRefreshState,
  action: RadarRefreshAction,
): RadarRefreshState {
  switch (action.type) {
    case 'loaded':
      return { metadata: action.metadata, error: null }
    case 'failed':
      return { metadata: state.metadata, error: action.message }
    case 'reset':
      return initialRadarRefreshState
  }
}
