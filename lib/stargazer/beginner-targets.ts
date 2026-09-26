import type { StargazerEquipment } from '@/lib/stargazer/context';

export interface BeginnerTarget {
  id: string;
  name: string;
  kind: 'moon' | 'planet' | 'deep-sky';
  minimumEquipment: StargazerEquipment;
  appearance: string;
  guidance: string;
  source: { title: string; url: string };
}
const skywatching = { title: 'NASA skywatching FAQ', url: 'https://science.nasa.gov/skywatching/faq/' };
const binoculars = { title: 'NASA binocular skywatching', url: 'https://science.nasa.gov/solar-system/skywatching/night-sky-network/binoculars-a-great-first-telescope/' };

/** Reviewed beginner subset, September 2026. Equipment cutoffs are conservative product choices. */
export const BEGINNER_TARGETS: readonly BeginnerTarget[] = [
  { id: 'Moon', name: 'Moon', kind: 'moon', minimumEquipment: 'eyes', appearance: 'A bright disk with light and dark surface patterns.', guidance: 'Binoculars reveal more; crater shadows change with phase. A bright Moon makes faint objects harder to see.', source: { title: 'NASA Moon viewing tips', url: 'https://science.nasa.gov/moon/viewing-tips/' } },
  ...['Venus', 'Mars', 'Jupiter', 'Saturn'].map((name): BeginnerTarget => ({ id: name, name, kind: 'planet', minimumEquipment: 'eyes', appearance: 'A bright point of light to the unaided eye.', guidance: name === 'Saturn' ? 'Saturn’s rings need a telescope; do not expect them to be visible with your eyes.' : 'A telescope is needed for fine detail. Start by identifying its point of light.', source: skywatching })),
  { id: 'M31', name: 'Andromeda Galaxy', kind: 'deep-sky', minimumEquipment: 'binoculars', appearance: 'A faint oval glow, rather than the colorful spiral in photographs.', guidance: 'A dark site helps. Try looking slightly beside the faint patch.', source: binoculars },
  { id: 'M42', name: 'Orion Nebula', kind: 'deep-sky', minimumEquipment: 'binoculars', appearance: 'A small hazy patch around stars in Orion’s sword.', guidance: 'Look for a pale glow; long-exposure photographs show much more color and detail.', source: binoculars },
  { id: 'M45', name: 'Pleiades', kind: 'deep-sky', minimumEquipment: 'eyes', appearance: 'A compact grouping of stars, with more stars visible through binoculars.', guidance: 'Binoculars give a wider view than many telescopes. The blue haze in photographs is difficult to see.', source: binoculars },
  { id: 'M44', name: 'Beehive Cluster', kind: 'deep-sky', minimumEquipment: 'binoculars', appearance: 'A broad grouping of faint stars.', guidance: 'Binoculars help separate the stars; bright city skies hide the faintest members.', source: { title: 'NASA: Dim delights in Cancer', url: 'https://science.nasa.gov/solar-system/skywatching/night-sky-network/dim-delights-in-cancer/' } },
  { id: 'M7', name: 'Ptolemy Cluster', kind: 'deep-sky', minimumEquipment: 'binoculars', appearance: 'A loose grouping of bright stars in a rich star field.', guidance: 'A clear southern horizon helps at northern latitudes. Binoculars show the group together.', source: { title: 'NASA: Messier 7', url: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-7/' } },
  { id: 'M13', name: 'Hercules Globular Cluster', kind: 'deep-sky', minimumEquipment: 'telescope', appearance: 'A faint rounded patch, brighter toward its center.', guidance: 'A small telescope helps find it; resolving individual stars depends on sky conditions and aperture.', source: { title: 'NASA: June 2022 skywatching', url: 'https://science.nasa.gov/resource/whats-up-june-2022/' } },
  { id: 'NGC5139', name: 'Omega Centauri', kind: 'deep-sky', minimumEquipment: 'binoculars', appearance: 'A rounded glow from a densely packed cluster of stars.', guidance: 'Best placed for southern observers. Binoculars show a patch; more detail needs a telescope.', source: { title: 'NASA: Omega Centauri', url: 'https://science.nasa.gov/photojournal/pj-omega-centauri/' } },
  { id: 'NGC104', name: '47 Tucanae', kind: 'deep-sky', minimumEquipment: 'binoculars', appearance: 'A bright, rounded star-cluster glow.', guidance: 'A southern-sky target. A telescope can reveal more stars around the bright center.', source: { title: 'NASA: Caldwell 106', url: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-caldwell-catalog/caldwell-106/' } },
];

export function getBeginnerTarget(id: string): BeginnerTarget | undefined {
  return BEGINNER_TARGETS.find(target => target.id === id);
}
