import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// Run after next build. Unit mocks cannot check what the production route ships.
const html = readFileSync(new URL('../../.next/server/app/stargazer/objects/M31.html', import.meta.url), 'utf8')
const scripts = [...html.matchAll(/<script[^>]+src="(\/_next\/[^\"]+)"/g)].map(match => match[1])

test('object guides include their reference content before JavaScript runs', () => {
  assert.match(html, /<h1\b[^>]*>M31(?:<!-- -->)? - (?:<!-- -->)?ANDROMEDA GALAXY<\/h1>/)
  assert.match(html, /<h2\b[^>]*>Quick Facts<\/h2>/)
  assert.match(html, /<p\b[^>]*>The Andromeda Galaxy \(M31\) is the nearest major galaxy/)
})

test('a direct object-guide visit does not eagerly download the astronomy engine', () => {
  assert.ok(scripts.length > 0, 'Inspect the actual production script references')
  for (const src of scripts) {
    const code = readFileSync(new URL(`../../.next/${src.slice('/_next/'.length)}`, import.meta.url), 'utf8')
    // Astronomy Engine retains this public AstroTime method in its compiled code.
    assert.ok(!code.includes('FromTerrestrialTime'), `${src} eagerly includes astronomy calculations before a location is selected`)
  }
})
