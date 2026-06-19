export interface RainViewerPastFrame {
  time: number
  path: string
}

export interface RainViewerManifestResponse {
  version: string
  generated: number
  host: string
  radar: {
    past: RainViewerPastFrame[]
  }
}

export interface RainViewerManifest {
  version: string
  generated: number
  host: string
  past: RainViewerPastFrame[]
}

export interface RainViewerTileOptions {
  size: 256 | 512
  colorScheme: number
  smooth: boolean
  snow: boolean
}
