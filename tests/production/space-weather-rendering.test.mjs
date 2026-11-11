import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// Run after next build: mocked fetch tests cannot detect routes that Next
// prerenders successfully, then fails when recovery uses no-store at runtime.
const manifest = JSON.parse(readFileSync(new URL('../../.next/prerender-manifest.json', import.meta.url), 'utf8'))
const appPaths = JSON.parse(readFileSync(new URL('../../.next/server/app-paths-manifest.json', import.meta.url), 'utf8'))

for (const route of [
  '/space-weather',
  '/space-weather/kp-index',
  '/space-weather/aurora-forecast',
  '/space-weather/solar-flares',
  '/space-weather/solar-wind',
]) {
  test(`${route} renders at request time so uncached NOAA recovery is safe`, () => {
    assert.ok(Object.hasOwn(appPaths, `${route}/page`), `${route} must exist in the production build`)
    assert.equal(Object.hasOwn(manifest.routes, route), false, `${route} must not be prerendered`)
  })
}
