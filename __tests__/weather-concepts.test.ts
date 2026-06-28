import { getAllConcepts, getConceptDefinition } from '@/lib/weather-concepts'

describe('weather concepts glossary', () => {
  it('includes blog-linked concept anchors', () => {
    expect(getConceptDefinition('supercell')?.name).toBe('Supercell')
    expect(getConceptDefinition('cape')?.name).toBe('CAPE')
    expect(getConceptDefinition('mesocyclone')).toBeDefined()
    expect(getConceptDefinition('wind-shear')).toBeDefined()
    expect(getConceptDefinition('updraft')).toBeDefined()
  })

  it('returns stable ids for glossary hash links', () => {
    for (const concept of getAllConcepts()) {
      expect(concept.id).toBeTruthy()
      expect(concept.detailed.length).toBeGreaterThan(20)
      expect(concept.ranges.length).toBeGreaterThan(0)
      expect(concept.practicalTips.length).toBeGreaterThan(0)
    }
  })
})
