import { imageGateFor } from '../../scripts/newsletter/image-selection';
import { IMAGES } from '../../scripts/newsletter/images';
import { getNarrativeFitErrors } from '../../scripts/newsletter/narrative-fit';

/**
 * The gate is the selection predicate. Selection paths pick THROUGH it, and the
 * publish-time validator reports through it, so the two cannot disagree — the
 * fault line behind 7 of the ~10 substantive fixes in scripts/newsletter/.
 */
const SEVERE_QUAKE_DRAFT = `## Rearview

The week's defining number is 216 tornado and severe-wind reports across the
southern Plains. A long-track EF3 supercell tracked near Norman, Oklahoma, and
SPC storm reports stacked up along a sharp dryline.

On the geophysical side, a M7.5 earthquake struck offshore, and aftershocks
rattled the subduction zone for days.

## Roadmap

A deep trough swings into the Rockies midweek behind a sharp shortwave.`;

const byId = (id: string) => {
  const img = IMAGES.find((i) => i.id === id);
  if (!img) throw new Error(`fixture image not found: ${id}`);
  return img;
};

describe('imageGateFor', () => {
  it('agrees with the validator rule table for every catalog image', () => {
    const gate = imageGateFor(SEVERE_QUAKE_DRAFT);
    for (const image of IMAGES) {
      expect(gate.errorsFor(image)).toEqual(getNarrativeFitErrors(SEVERE_QUAKE_DRAFT, image));
    }
  });

  it('rejects solar imagery under a seismic lead and accepts on-topic imagery', () => {
    const gate = imageGateFor(SEVERE_QUAKE_DRAFT);
    expect(gate.accepts(byId('sdo-current-193'))).toBe(false);
    expect(gate.accepts(byId('mesocyclone-diagram'))).toBe(true);
  });

  it('filter returns only images the validator would accept, in order', () => {
    const gate = imageGateFor(SEVERE_QUAKE_DRAFT);
    const pool = [byId('sdo-current-193'), byId('mesocyclone-diagram'), byId('enso-sst-anomaly')];
    const kept = gate.filter(pool);
    expect(kept.map((i) => i.id)).toEqual(['mesocyclone-diagram']);
    for (const image of kept) {
      expect(getNarrativeFitErrors(SEVERE_QUAKE_DRAFT, image)).toEqual([]);
    }
  });

  it('filterPlacements drops rejected picks and preserves the anchors of the rest', () => {
    const gate = imageGateFor(SEVERE_QUAKE_DRAFT);
    const kept = gate.filterPlacements([
      { image: byId('sdo-current-193'), insertAfter: 'defining number is 216' },
      { image: byId('mesocyclone-diagram'), insertAfter: 'long-track EF3 supercell' },
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0].image.id).toBe('mesocyclone-diagram');
    expect(kept[0].insertAfter).toBe('long-track EF3 supercell');
  });

  it('firstFitting skips excluded ids and rejected images', () => {
    const gate = imageGateFor(SEVERE_QUAKE_DRAFT);
    const pool = [byId('sdo-current-193'), byId('mesocyclone-diagram'), byId('wall-cloud-lightning')];
    expect(gate.firstFitting(pool)?.id).toBe('mesocyclone-diagram');
    expect(gate.firstFitting(pool, new Set(['mesocyclone-diagram']))?.id).toBe(
      'wall-cloud-lightning',
    );
  });

  it('returns null from firstFitting when nothing fits', () => {
    const gate = imageGateFor(SEVERE_QUAKE_DRAFT);
    expect(gate.firstFitting([byId('sdo-current-193'), byId('enso-sst-anomaly')])).toBeNull();
  });

  it('judges against prose only, ignoring the credit lines of already-embedded images', () => {
    // proseOnly strips embedded image markdown and its italic credit line, so an
    // image already in the draft cannot talk the gate into accepting its siblings.
    const withEmbeddedSolar = `${SEVERE_QUAKE_DRAFT}\n\n![Solar corona](https://example.com/sdo.jpg)\n*NASA SDO*`;
    expect(imageGateFor(withEmbeddedSolar).accepts(byId('sdo-current-193'))).toBe(false);
  });

  it('strips an embedded image whose URL contains literal parens', () => {
    // A `[^)]+` destination class cannot cross a `)`, so a Wikimedia
    // Special:FilePath URL left the whole block in the body and its alt text
    // then leaked keywords into the verdict for other images.
    const draft = [
      SEVERE_QUAKE_DRAFT,
      '',
      '![Aurora over the pole](https://upload.wikimedia.org/Special:FilePath/Aurora (SDO 2019).jpg)',
      '*NASA*',
    ].join('\n');

    // The aurora/solar keywords live only inside the stripped image block, so
    // the seismic lead must still reject solar imagery.
    expect(imageGateFor(draft).accepts(byId('sdo-current-193'))).toBe(false);
    // And on-topic imagery is unaffected.
    expect(imageGateFor(draft).accepts(byId('mesocyclone-diagram'))).toBe(true);
  });
});
