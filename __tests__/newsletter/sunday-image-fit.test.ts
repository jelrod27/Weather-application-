import {
  buildLaneCandidatePool,
  buildSundayImagePlan,
  pickLaneImage,
  type SundayImagePlanOpts,
} from '../../scripts/newsletter/sunday';
import { IMAGES } from '../../scripts/newsletter/images';
import { passesNarrativeFit } from '../../scripts/newsletter/narrative-fit';
import type { ImagePlacement } from '../../scripts/newsletter/content-match';
import type { TopicSlug } from '../../scripts/newsletter/topics';

/**
 * Regression guard for the Sunday cron failure where a lane starved by the
 * 8-week image-reuse window fell back to off-topic neighbor imagery (drought,
 * tropical, or solar art) that validate-post.ts then rejected via
 * getNarrativeFitErrors — killing the run before it could open the PR.
 *
 * The invariant: pickLaneImage must never return an image that fails the same
 * narrative-fit gate the validator enforces.
 */

// Severe + seismic lead, with no tropical / drought / space-weather development.
const SEVERE_QUAKE_DRAFT = `## Rearview

The week's defining number is 216 tornado and severe-wind reports across the
southern Plains. A long-track EF3 supercell tracked near Norman, Oklahoma, and
SPC storm reports stacked up along a sharp dryline.

On the geophysical side, a M7.5 earthquake struck offshore, and aftershocks
rattled the subduction zone for days.

## Roadmap

A deep trough swings into the Rockies midweek behind a sharp shortwave.`;

const idsTagged = (topic: TopicSlug): string[] =>
  IMAGES.filter((img) => img.topic_tags.includes(topic)).map((img) => img.id);

describe('pickLaneImage narrative-fit gate', () => {
  it('never returns a narrative-fit failure for the severe lane when on-topic + neighbor pools are starved', () => {
    // Starve severe and its neighbors (tropical, aviation) — and marine for good measure.
    const recent = new Set([
      ...idsTagged('severe_storms'),
      ...idsTagged('tropical'),
      ...idsTagged('aviation'),
      ...idsTagged('marine'),
    ]);
    const picked = pickLaneImage('severe', SEVERE_QUAKE_DRAFT, recent, new Set());
    // A fitting fallback provably exists, so the slot must NOT be skipped — that
    // distinguishes "correctly fell back" from "wrongly returned null".
    expect(picked).not.toBeNull();
    expect(passesNarrativeFit(SEVERE_QUAKE_DRAFT, picked!)).toBe(true);
    expect(picked!.id).not.toBe('hurricane-katrina-2005');
  });

  it('never returns drought imagery for the earthquake lane when on-topic pool is starved', () => {
    const recent = new Set(idsTagged('earthquakes'));
    const picked = pickLaneImage('earthquake', SEVERE_QUAKE_DRAFT, recent, new Set());
    expect(picked).not.toBeNull();
    expect(passesNarrativeFit(SEVERE_QUAKE_DRAFT, picked!)).toBe(true);
    expect(['drought-cracked-soil', 'us-drought-monitor', 'dust-bowl-storm']).not.toContain(picked!.id);
  });

  it('does not return solar/space imagery for the forecast lane under a severe lead', () => {
    // The forecast lane's topic is atmosphere_layers, which swpc-ovation-aurora is
    // cross-tagged with — the exact trap that fired in production.
    const recent = new Set(['atmosphere-layers-diagram', 'jet-stream-pattern', 'goes16-water-vapor']);
    const picked = pickLaneImage('forecast', SEVERE_QUAKE_DRAFT, recent, new Set());
    expect(picked).not.toBeNull();
    expect(picked!.id).not.toBe('swpc-ovation-aurora');
    expect(passesNarrativeFit(SEVERE_QUAKE_DRAFT, picked!)).toBe(true);
  });

  it('honors the reuse window and used-ids, returning a different safe image each time', () => {
    // The lead lanes for a severe+seismic week. Each has enough narrative-fit-safe
    // depth to prove the recentImageIds and usedIds branches actually exclude.
    const lanes = ['severe', 'earthquake', 'forecast'] as const;
    for (const lane of lanes) {
      const firstPick = pickLaneImage(lane, SEVERE_QUAKE_DRAFT, new Set(), new Set());
      expect(firstPick).not.toBeNull();

      // Block the fresh-pool winner via the reuse window — must return a different image.
      const recent = new Set([firstPick!.id]);
      const secondPick = pickLaneImage(lane, SEVERE_QUAKE_DRAFT, recent, new Set());
      expect(secondPick).not.toBeNull();
      expect(secondPick!.id).not.toBe(firstPick!.id);

      // Block that one via used-ids too — must avoid BOTH, still narrative-fit-safe.
      const used = new Set([secondPick!.id]);
      const thirdPick = pickLaneImage(lane, SEVERE_QUAKE_DRAFT, recent, used);
      expect(thirdPick).not.toBeNull();
      expect([firstPick!.id, secondPick!.id]).not.toContain(thirdPick!.id);
      expect(passesNarrativeFit(SEVERE_QUAKE_DRAFT, thirdPick!)).toBe(true);
    }
  });

  it('skips the slot (returns null) when every catalog image is already used in this post', () => {
    // Exercises the new "leave the slot empty rather than embed a mismatch" branch:
    // with the whole catalog consumed by earlier slots, no candidate remains.
    const allUsed = new Set(IMAGES.map((img) => img.id));
    const picked = pickLaneImage('severe', SEVERE_QUAKE_DRAFT, new Set(), allUsed);
    expect(picked).toBeNull();
  });

  it('still prefers a curated on-topic image when the pool is fresh', () => {
    const picked = pickLaneImage('severe', SEVERE_QUAKE_DRAFT, new Set(), new Set());
    // First curated severe id is the mesocyclone diagram, which has no
    // narrative-fit triggers and should win on a fresh pool.
    expect(picked?.id).toBe('mesocyclone-diagram');
  });
});

// A severe-led week with a significant quake, so the lead lanes resolve to
// severe (primary) + forecast + earthquake (secondary).
function makeOpts(
  draft: string,
  judge: SundayImagePlanOpts['judge'],
  recentImageIds = new Set<string>(),
): SundayImagePlanOpts {
  return {
    draft,
    recentImageIds,
    judge,
    spcSummary: {
      total: 216,
      byCategory: { tornado: 10, hail: 40, wind: 166 },
      byState: {},
      reports: [],
      daysCovered: 7,
    },
    spaceSummary: { recentKp: [], maxKpPastWeek: 0, recentXrayClass: null, notableFlares: [] },
    quakeSummary: { significantCount: 1, m45PlusCount: 1, largest: { mag: 7.5 }, significant: [] },
    // The summaries above only need the fields the lane scorers read; cast past
    // the full fetcher return types, which carry extra fields irrelevant here.
  } as unknown as SundayImagePlanOpts;
}

const byId = (id: string) => {
  const img = IMAGES.find((i) => i.id === id);
  if (!img) throw new Error(`fixture image not found: ${id}`);
  return img;
};

// The fixture deterministically resolves three lead lanes: severe (primary, from
// the tornado count) + forecast (always) + earthquake (secondary, from the M7.5).
// On a fresh pool every lane has a narrative-fit-safe image, so the plan must
// place exactly one image per lead lane.
const LEAD_LANES = ['severe', 'forecast', 'earthquake'];
const EXPECTED_PLACEMENTS = LEAD_LANES.length;

describe('buildSundayImagePlan (hybrid lane + judge)', () => {
  it('keeps an on-topic judge pick (with its anchor) and fills the remaining lanes', async () => {
    const judge: SundayImagePlanOpts['judge'] = async () => [
      { image: byId('mesocyclone-diagram'), insertAfter: 'long-track EF3 supercell' },
    ];
    const plan = await buildSundayImagePlan(makeOpts(SEVERE_QUAKE_DRAFT, judge));
    expect(plan.placements).toHaveLength(EXPECTED_PLACEMENTS);
    expect(plan.audit).toHaveLength(EXPECTED_PLACEMENTS);
    const meso = plan.placements.find((p) => p.image.id === 'mesocyclone-diagram');
    expect(meso?.insertAfter).toBe('long-track EF3 supercell');
    // The judge covered 'severe'; the fallback fills the other two lead lanes.
    expect(new Set(plan.audit.map((a) => a.lane))).toEqual(new Set(LEAD_LANES));
  });

  it('drops a judge pick that fails narrative fit and still fills every lead lane', async () => {
    // The judge wrongly returns tropical art under a severe/seismic lead.
    const judge: SundayImagePlanOpts['judge'] = async () => [
      { image: byId('hurricane-katrina-2005'), insertAfter: 'defining number is 216' },
    ];
    const plan = await buildSundayImagePlan(makeOpts(SEVERE_QUAKE_DRAFT, judge));
    expect(plan.placements).toHaveLength(EXPECTED_PLACEMENTS);
    expect(plan.placements.map((p) => p.image.id)).not.toContain('hurricane-katrina-2005');
    for (const p of plan.placements) {
      expect(passesNarrativeFit(SEVERE_QUAKE_DRAFT, p.image)).toBe(true);
    }
  });

  it('fills one image per lead lane when the judge throws (no duplicate lane, no gaps)', async () => {
    const judge: SundayImagePlanOpts['judge'] = async () => {
      throw new Error('simulated API failure');
    };
    const plan = await buildSundayImagePlan(makeOpts(SEVERE_QUAKE_DRAFT, judge));
    expect(plan.placements).toHaveLength(EXPECTED_PLACEMENTS);
    expect(plan.audit).toHaveLength(EXPECTED_PLACEMENTS);
    // Every lead lane is covered exactly once — the fallback fills uncovered lanes
    // rather than duplicating an early lane and starving a later one.
    expect(new Set(plan.audit.map((a) => a.lane))).toEqual(new Set(LEAD_LANES));
    for (const p of plan.placements) {
      expect(passesNarrativeFit(SEVERE_QUAKE_DRAFT, p.image)).toBe(true);
    }
  });

  it('never embeds a narrative-fit failure or a synthetic anchor, and emits a complete audit', async () => {
    // Judge returns nothing usable; the lane fallback takes over.
    const judge: SundayImagePlanOpts['judge'] = async () => [] as ImagePlacement[];
    const plan = await buildSundayImagePlan(makeOpts(SEVERE_QUAKE_DRAFT, judge));
    expect(plan.placements).toHaveLength(EXPECTED_PLACEMENTS);
    const usedIds = new Set(plan.placements.map((p) => p.image.id));
    expect(usedIds.size).toBe(plan.placements.length); // no duplicate placements
    expect(plan.audit).toHaveLength(plan.placements.length);
    for (const entry of plan.audit) {
      expect(entry.anchor.length).toBeGreaterThan(0);
      expect(entry.anchor).not.toBe('##'); // no synthetic backfill anchor
      expect(usedIds.has(entry.id)).toBe(true);
    }
    for (const p of plan.placements) {
      expect(p.insertAfter).not.toBe('##');
      expect(passesNarrativeFit(SEVERE_QUAKE_DRAFT, p.image)).toBe(true);
    }
  });
});

describe('narrative-fit substring safety', () => {
  it('does not flag a tsunami earthquake image as solar under a seismic lead', () => {
    // "tsunami" contains the substring "sun"; the gate must use a word boundary
    // so a seismic image stays usable under exactly the seismic leads it serves.
    const tohoku = byId('tohoku-tsunami-otsuchi-2011');
    expect(passesNarrativeFit(SEVERE_QUAKE_DRAFT, tohoku)).toBe(true);
  });

  it('still flags genuine solar imagery under a seismic lead', () => {
    const sdo = byId('sdo-current-193');
    expect(passesNarrativeFit(SEVERE_QUAKE_DRAFT, sdo)).toBe(false);
  });

  it('does not flag a seismic "moment tensor" image as tropical via the "enso" substring', () => {
    // "tensor" contains "enso"; the tropical/ocean gate must use a word boundary.
    const sumatra = byId('sumatra-moment-tensor-2004');
    expect(passesNarrativeFit(SEVERE_QUAKE_DRAFT, sumatra)).toBe(true);
  });

  it('still flags genuine ENSO/ocean imagery under a non-tropical lead', () => {
    const enso = byId('enso-sst-anomaly');
    expect(passesNarrativeFit(SEVERE_QUAKE_DRAFT, enso)).toBe(false);
  });
});

describe('buildLaneCandidatePool', () => {
  it('scopes the pool to the lead lanes and excludes the reuse window', () => {
    const recent = new Set(['mesocyclone-diagram']);
    const pool = buildLaneCandidatePool(['severe', 'forecast'], recent);
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.map((i) => i.id)).not.toContain('mesocyclone-diagram');
    // The pool is scoped to the lead lanes' topics + their immediate neighbors,
    // so genuinely unrelated subjects (volcanoes, pollen, tree rings) never leak in
    // and outrank the lead story.
    const ids = pool.map((i) => i.id);
    expect(ids).not.toContain('st-helens-eruption-1980');
    expect(ids).not.toContain('pollen-grains-sem');
    expect(ids).not.toContain('tree-ring-cross-section');
  });

  it('relaxes the reuse window rather than returning an empty pool', () => {
    const allRecent = new Set(IMAGES.map((i) => i.id));
    const pool = buildLaneCandidatePool(['earthquake', 'forecast'], allRecent);
    expect(pool.length).toBeGreaterThan(0);
  });
});
