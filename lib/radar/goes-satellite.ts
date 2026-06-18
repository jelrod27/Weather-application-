export const GOES_IR_WMS_PROXY_PATH = '/api/weather/noaa-goes-wms'

export const GOES_IR_WMS_LAYER = '9'

export const GOES_IR_ATTRIBUTION = 'NOAA nowCOAST GOES IR'

export const GOES_IR_WMS_PARAMS: Record<string, string> = {
  LAYERS: GOES_IR_WMS_LAYER,
  FORMAT: 'image/png',
  TRANSPARENT: 'true',
  VERSION: '1.3.0',
  STYLES: '',
}

export const GOES_IR_TIME_PARAM = 'TIME'
