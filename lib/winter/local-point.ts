import { record } from './local-normalize'

const CONUS_STATES = new Set('AL AZ AR CA CO CT DE DC FL GA ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '))

/** Validate location metadata before caching discovery, independently of forecast endpoint availability. */
export function pointMetadata(input: unknown): { name: string; timeZone: string } | null {
  const properties = record(input)
  const location = record(record(properties.relativeLocation).properties)
  if (typeof location.city !== 'string' || !location.city.trim() || typeof location.state !== 'string' || !CONUS_STATES.has(location.state) || typeof properties.timeZone !== 'string') return null
  try { new Intl.DateTimeFormat('en-US', { timeZone: properties.timeZone }).format() } catch { return null }
  return { name: `${location.city}, ${location.state}`, timeZone: properties.timeZone }
}
