/**
 * 16-Bit Weather Platform
 * Weather phenomena fun-facts content for app/fun-facts
 */

export type WeatherPhenomena = {
  id: string;
  name: string;
  category: string;
  rarity: string;
  description: string;
  facts: string[];
  emoji: string;
  bitFact: string;
  scientificMechanism?: string;
  historicalOccurrence?: string;
  howToSpot: string;
  dangerLevel: number;
  whereToSee: string;
  bestSeason: string;
};

// Weather phenomena database
export const weatherPhenomena: WeatherPhenomena[] = [
  {
    id: 'ball-lightning',
    name: 'Ball Lightning',
    category: 'Electrical',
    rarity: 'Ultra Rare',
    description: 'Mysterious spherical lightning that floats through the air',
    facts: [
      'Appears as glowing orbs 1-100cm in diameter',
      'Can pass through solid objects like windows',
      'Lasts 1-5 seconds with crackling sounds',
      'Only 5% of people ever witness this phenomenon'
    ],
    emoji: '⚡',
    bitFact: 'Like a floating power-up that defies physics!',
    scientificMechanism: "Likely caused by vaporized soil silicates undergoing oxidation, or microwave cavity resonance of trapped plasma.",
    historicalOccurrence: "Tsar Nicholas II reported witnessing a fiery ball during a church service in the 19th century.",
    howToSpot: "Look for glowing, hovering spheres during or just after intense thunderstorms. They typically appear near windows or doorways and move slowly with an eerie hum.",
    dangerLevel: 4,
    whereToSee: "Reported worldwide during intense thunderstorms, with higher frequency in continental interiors like Central Europe and the American Midwest.",
    bestSeason: "Summer thunderstorm season (June-August in Northern Hemisphere)."
  },
  {
    id: 'st-elmos-fire',
    name: "St. Elmo's Fire",
    category: 'Electrical',
    rarity: 'Rare',
    description: 'Blue or violet glow appearing on pointed objects during storms',
    facts: [
      'Creates corona discharge on ship masts and aircraft',
      'Temperature can reach 1000°C but produces no heat',
      'Named after patron saint of sailors',
      'Appears as dancing flames but is pure electricity'
    ],
    emoji: '🔥',
    bitFact: 'Nature\'s neon signs lighting up the storm!',
    scientificMechanism: "Point discharge of atmospheric electricity that creates a luminous plasma around sharp objects when the electric field exceeds 30 kV/cm.",
    historicalOccurrence: "Recorded by Julius Caesar and Christopher Columbus during their voyages.",
    howToSpot: "Watch for blue or violet glowing tips on masts, lightning rods, steeples, or aircraft wings during active thunderstorms. Often accompanied by a buzzing or hissing sound.",
    dangerLevel: 2,
    whereToSee: "Common on ships at sea, mountain summits, and aircraft flying near thunderstorms. Frequently reported in the Alps and Andes.",
    bestSeason: "Peak thunderstorm months; summer in temperate regions, year-round in tropical maritime areas."
  },
  {
    id: 'rogue-waves',
    name: 'Rogue Waves',
    category: 'Ocean',
    rarity: 'Rare',
    description: 'Massive waves that appear from nowhere in calm seas',
    facts: [
      'Can reach heights of 100+ feet (30+ meters)',
      'Strike without warning in otherwise normal conditions',
      'Responsible for sinking large ships instantly',
      'Occur due to wave interference patterns'
    ],
    emoji: '🌊',
    bitFact: 'Ocean boss battles that spawn randomly!',
    scientificMechanism: "Constructive interference (waves adding up) or non-linear effects (waves stealing energy from neighbors) focused by currents.",
    historicalOccurrence: "The Draupner wave (1995) was the first scientifically measured rogue wave, hitting an oil platform with 25.6m height.",
    howToSpot: "Nearly impossible to predict visually. Sailors should watch for unusually deep troughs followed by towering crests. Satellite and buoy data are the most reliable detection methods.",
    dangerLevel: 5,
    whereToSee: "Most common where strong currents oppose prevailing swells: the Agulhas Current off South Africa, the Gulf Stream, and the North Sea.",
    bestSeason: "Winter months when storm systems generate larger swells (November-March in the Northern Hemisphere)."
  },
  {
    id: 'fire-whirls',
    name: 'Fire Whirls',
    category: 'Fire Weather',
    rarity: 'Uncommon',
    description: 'Tornadoes made of fire that can reach 2000°F',
    facts: [
      'Can reach heights of 100+ feet with 100+ mph winds',
      'Temperature cores exceed 2000°F (1093°C)',
      'Can last for hours and move across landscapes',
      'Create their own weather patterns'
    ],
    emoji: '🌪',
    bitFact: 'Fire-type tornado attacks with critical damage!',
    scientificMechanism: "Intense heat generates strong updrafts, while surface winds provide rotation, stretching the vortex vertically and intensifying spin.",
    historicalOccurrence: "Great Kanto Earthquake (1923) spawned a 300ft fire whirl that killed 38,000 people in minutes.",
    howToSpot: "Look for rotating columns of flame during large wildfires or industrial fires. They often form along fire lines where wind shear is strongest and may produce a roaring sound.",
    dangerLevel: 5,
    whereToSee: "Wildfire-prone regions: California, Australia, Mediterranean Europe, and Siberia. Also near large prescribed burns.",
    bestSeason: "Late summer and autumn during peak wildfire season (August-November in the Northern Hemisphere)."
  },
  {
    id: 'ice-storms',
    name: 'Ice Storms',
    category: 'Winter Weather',
    rarity: 'Uncommon',
    description: 'Freezing rain that encases everything in crystal ice',
    facts: [
      'Can add 500+ pounds of ice per power line span',
      'Trees become crystal sculptures weighing tons',
      'Creates the sound of breaking glass everywhere',
      'Can shut down entire cities for weeks'
    ],
    emoji: '❄️',
    bitFact: 'Nature\'s freeze spell that transforms the world!',
    scientificMechanism: "Supercooled water droplets (liquid below 0°C) fall through a shallow freezing layer near the ground, freezing instantly upon contact.",
    historicalOccurrence: "Great Ice Storm of 1998 in Canada/US caused over $5 billion in damage and left millions without power.",
    howToSpot: "Watch for rain falling when surface temperatures hover near or just below freezing. A glaze forms on all exposed surfaces; listen for cracking branches and the tinkle of falling ice.",
    dangerLevel: 4,
    whereToSee: "The US ice belt from Texas to New England, southeastern Canada, and parts of northern China and Korea.",
    bestSeason: "Late autumn through early spring (November-March), especially during warm-front overrunning events."
  },
  {
    id: 'microbursts',
    name: 'Microbursts',
    category: 'Wind',
    rarity: 'Uncommon',
    description: 'Invisible downdrafts that can destroy aircraft',
    facts: [
      'Wind speeds can exceed 150 mph in seconds',
      'Create divergent wind patterns spreading outward',
      'Responsible for multiple aviation disasters',
      'Can flip semi-trucks and level buildings'
    ],
    emoji: '💨',
    bitFact: 'Invisible wind attacks with instant KO potential!',
    scientificMechanism: "Evaporative cooling in a thunderstorm causes air to become denser and crash to the ground, spreading out radially upon impact.",
    historicalOccurrence: "Delta Flight 191 (1985) crashed due to a microburst, leading to modern wind shear detection systems.",
    howToSpot: "Look for a localized area of rain or virga beneath a thunderstorm with a sudden starburst of dust or debris at the surface. Pilots watch for rapid airspeed changes on approach.",
    dangerLevel: 5,
    whereToSee: "Common in the US Great Plains, Desert Southwest, and anywhere strong thunderstorms develop. Also frequent in tropical regions.",
    bestSeason: "Peak thunderstorm season: late spring through summer (May-September in temperate latitudes)."
  },
  {
    id: 'sprites',
    name: 'Sprites',
    category: 'Upper Atmosphere',
    rarity: 'Rare',
    description: 'Red lightning that shoots upward into space',
    facts: [
      'Occur 50-90km above thunderstorms',
      'Last only 1-5 milliseconds',
      'Can extend 50km vertically',
      'Only discovered in 1989 due to their brief nature'
    ],
    emoji: '🌌',
    bitFact: 'Space lightning that shoots into the cosmos!',
    scientificMechanism: "Quasi-electrostatic fields generated by massive positive cloud-to-ground lightning strikes that ionize the upper atmosphere.",
    historicalOccurrence: "Accidentally discovered by researchers at the University of Minnesota in 1989 while testing low-light cameras.",
    howToSpot: "Use a low-light or high-ISO camera aimed at the top of a distant thunderstorm (100-300 miles away) from a dark-sky location. They appear as brief red-orange tendrils above the cloud tops.",
    dangerLevel: 1,
    whereToSee: "Observable from the US Great Plains, southern France, northern India, and anywhere with a clear view of distant mesoscale convective systems.",
    bestSeason: "Summer months when large nocturnal thunderstorm complexes are most common (June-August)."
  },
  {
    id: 'elves',
    name: 'ELVES',
    category: 'Upper Atmosphere',
    rarity: 'Very Rare',
    description: 'Expanding rings of light in the ionosphere',
    facts: [
      'ELVES = Emissions of Light and VLF perturbations',
      'Expand to 300km diameter in milliseconds',
      'Occur 85-95km above Earth',
      'Appear as doughnut-shaped flashes'
    ],
    emoji: '💫',
    bitFact: 'Cosmic doughnuts of pure energy!',
    scientificMechanism: "Electromagnetic pulse (EMP) from lightning hitting the ionosphere, causing nitrogen molecules to glow.",
    historicalOccurrence: "First predicted theoretically, then confirmed by space shuttle cameras in the 1990s.",
    howToSpot: "Extremely difficult to see with the naked eye due to their sub-millisecond duration. Best captured with high-speed cameras pointed at the limb of a thunderstorm from space or high altitude.",
    dangerLevel: 1,
    whereToSee: "Best detected from orbit (ISS) or high-altitude aircraft. Ground-based observations possible over large oceanic thunderstorm systems from coastal dark-sky sites.",
    bestSeason: "Active thunderstorm seasons in tropical and subtropical regions; year-round over warm ocean basins."
  },
  {
    id: 'morning-glory',
    name: 'Morning Glory Clouds',
    category: 'Cloud Formation',
    rarity: 'Ultra Rare',
    description: 'Giant rolling cloud tubes up to 1000km long',
    facts: [
      'Can reach lengths of 1000+ kilometers',
      'Roll forward like massive atmospheric waves',
      'Predictable only in Northern Australia',
      'Glider pilots surf them like ocean waves'
    ],
    emoji: '☁️',
    bitFact: 'Cloud highways stretching across continents!',
    scientificMechanism: "Solitary waves (solitons) traveling along a stable inversion layer, often formed by sea breeze collisions.",
    historicalOccurrence: "Regularly appear in the Gulf of Carpentaria, Australia in September/October.",
    howToSpot: "Look for a long, low, horizontal rolling tube cloud at dawn, often traveling at 35-40 mph. The leading edge rolls forward while trailing wisps evaporate behind it.",
    dangerLevel: 1,
    whereToSee: "Most reliably seen in Burketown, Gulf of Carpentaria, Australia. Occasionally observed in the English Channel, central US, and the Sulu Sea.",
    bestSeason: "September through November in Northern Australia, coinciding with the transition from dry to wet season."
  },
  {
    id: 'polar-stratospheric',
    name: 'Polar Stratospheric Clouds',
    category: 'High Altitude',
    rarity: 'Rare',
    description: 'Rainbow clouds that destroy ozone',
    facts: [
      'Form only at -78°C (-108°F) or colder',
      'Create brilliant iridescent colors',
      'Destroy ozone molecules on their surfaces',
      'Only visible during polar winter twilight'
    ],
    emoji: '🌈',
    bitFact: 'Beautiful but deadly rainbow effect clouds!',
    scientificMechanism: "Ice crystals form in the stratosphere at extreme cold, providing surfaces for chemical reactions that release ozone-destroying chlorine.",
    historicalOccurrence: "Critical factor in the formation of the Antarctic Ozone Hole discovered in the 1980s.",
    howToSpot: "Look toward the twilight horizon during polar winter when the sun is 1-6 degrees below the horizon. They display vivid pastel iridescence unlike any tropospheric cloud.",
    dangerLevel: 1,
    whereToSee: "Polar regions: Scandinavia (especially northern Norway and Sweden), Iceland, Antarctica, and occasionally Scotland and southern Alaska.",
    bestSeason: "Polar winter months: December-February in the Arctic, June-August in the Antarctic."
  },
  {
    id: 'waterspouts',
    name: 'Waterspouts',
    category: 'Marine Weather',
    rarity: 'Uncommon',
    description: 'Tornadoes over water that can travel onto land',
    facts: [
      'Can form in fair weather without thunderstorms',
      'Winds can exceed 100 mph at the surface',
      'Can pick up marine life and drop it miles inland',
      'Florida Keys see 400+ waterspouts annually'
    ],
    emoji: '🌊',
    bitFact: 'Water-type whirlwind attacks that can travel!',
    scientificMechanism: "Fair-weather spouts form from the surface up due to wind shear and high humidity; tornadic spouts descend from thunderstorms.",
    historicalOccurrence: "The Great Malta Tornado of 1551 (started as a waterspout) destroyed the Grand Harbour shipping fleet.",
    howToSpot: "Watch for a dark spot on the water surface with a spray ring, then a visible funnel descending from cumulus clouds above. Fair-weather types are narrow and translucent.",
    dangerLevel: 3,
    whereToSee: "Florida Keys, Adriatic Sea, Great Lakes, coastal waters of southeast Asia, and the English Channel.",
    bestSeason: "Late summer and early autumn (August-October) when sea surface temperatures are warmest."
  },
  {
    id: 'dust-devils',
    name: 'Dust Devils',
    category: 'Desert Weather',
    rarity: 'Common',
    description: 'Mini-tornadoes formed by surface heating',
    facts: [
      'Can reach heights of 1000+ feet',
      'Wind speeds typically 45-60 mph',
      'Form on clear, hot days without storms',
      'Can move at 20+ mph across terrain'
    ],
    emoji: '🌪',
    bitFact: 'Desert tornadoes spawning from heat mirages!',
    scientificMechanism: "Hot air near the surface rises rapidly through cooler air above, creating a vertical vortex that stretches and spins faster.",
    historicalOccurrence: "Mars rovers frequently capture image of massive dust devils towering kilometers high on the Red Planet.",
    howToSpot: "Look for spinning columns of dust on hot days over flat, dry terrain. They form around midday when surface heating peaks and often wander erratically before dissipating.",
    dangerLevel: 2,
    whereToSee: "Desert regions worldwide: Sahara, Sonoran Desert, Australian Outback, Middle East, and the US Southwest.",
    bestSeason: "Peak summer heat: June-September in the Northern Hemisphere when surface temperatures are highest."
  },
  {
    id: 'thundersnow',
    name: 'Thundersnow',
    category: 'Winter Weather',
    rarity: 'Rare',
    description: 'Thunder and lightning during a snowstorm, combining the drama of a thunderstorm with heavy snowfall',
    facts: [
      'Lightning during thundersnow is typically closer to the ground than in summer storms',
      'Snowfall rates during thundersnow often exceed 2-4 inches per hour',
      'Thunder is muffled by snow and usually only audible within 2-3 miles',
      'Associated with some of the most intense nor-easters and lake-effect snowstorms'
    ],
    emoji: '🌩',
    bitFact: 'A blizzard boss fight with a lightning special attack -- like an ice level that suddenly unlocks the thunder spell!',
    scientificMechanism: "Strong lift in the lower atmosphere (often from frontal boundaries or lake-effect convergence) creates enough instability for charge separation within snow clouds, producing lightning despite sub-freezing temperatures.",
    historicalOccurrence: "The February 2011 Groundhog Day Blizzard produced widespread thundersnow across the Midwest, with meteorologist Jim Cantore's on-air excitement going viral.",
    howToSpot: "Listen for muffled thunder during heavy snowfall. Lightning flashes illuminate the snow with an eerie, diffused glow. Often occurs during the heaviest snow bands of a storm.",
    dangerLevel: 3,
    whereToSee: "Great Lakes region of the US, the northeastern US during nor-easters, Japan's Sea of Japan coast, and parts of the UK.",
    bestSeason: "Winter months (November-March), especially during intense cyclones and lake-effect events."
  },
  {
    id: 'volcanic-lightning',
    name: 'Volcanic Lightning',
    category: 'Geological',
    rarity: 'Very Rare',
    description: 'Lightning generated inside volcanic ash plumes, also known as dirty thunderstorms',
    facts: [
      'Caused by friction between ash particles, ice, and rock fragments in the eruption column',
      'Can produce hundreds of lightning bolts per minute during major eruptions',
      'Lightning occurs both at the vent and high in the ash plume',
      'Some bolts travel over 10 miles through the ash cloud'
    ],
    emoji: '🌋',
    bitFact: 'The ultimate combo attack -- fire and lightning merged into one volcanic super-move, like a final boss casting two elements at once!',
    scientificMechanism: "Charge separation occurs as ejected rock fragments, ash particles, and ice crystals collide within the turbulent eruption plume, creating electric fields strong enough to discharge as lightning.",
    historicalOccurrence: "The 2010 Eyjafjallajokull eruption in Iceland produced spectacular volcanic lightning displays photographed worldwide, while the 1883 Krakatoa eruption generated lightning visible 80 miles away.",
    howToSpot: "Observe an active eruption from a safe distance (miles away, upwind). Lightning appears as bright arcs within or above the ash plume, often most dramatic at night.",
    dangerLevel: 5,
    whereToSee: "Volcanic arcs worldwide: Iceland, Japan, Indonesia, the Andes, Kamchatka Peninsula, and the Cascades Range.",
    bestSeason: "No seasonal pattern -- depends entirely on volcanic activity. Most commonly documented during explosive Plinian and sub-Plinian eruptions."
  },
  {
    id: 'green-flash',
    name: 'Green Flash',
    category: 'Optical',
    rarity: 'Uncommon',
    description: 'A brief green light visible at the exact moment of sunrise or sunset as the sun crosses the horizon',
    facts: [
      'Lasts only 1-2 seconds under ideal conditions',
      'Caused by atmospheric refraction separating sunlight into colors',
      'The green wavelength is the last visible color before the sun disappears',
      'Pirates once believed it was the flash of souls departing the afterlife'
    ],
    emoji: '🟢',
    bitFact: 'The rarest sunrise Easter egg -- blink and you miss this hidden color palette swap, like a secret debug mode only 1% of players discover!',
    scientificMechanism: "Atmospheric refraction bends different wavelengths of sunlight by different amounts. As the sun sets, red and orange disappear first; blue and violet are scattered away, leaving green as the last visible color for a brief moment.",
    historicalOccurrence: "Jules Verne popularized the phenomenon in his 1882 novel 'The Green Ray,' claiming anyone who sees it will never be deceived in matters of the heart.",
    howToSpot: "Watch the very top edge of the sun as it crosses a clear, sharp horizon (ocean horizons work best). Use binoculars focused on the horizon, not directly at the sun. Air must be stable with little haze.",
    dangerLevel: 1,
    whereToSee: "Best observed over ocean horizons: Hawaii, the Canary Islands, the Mediterranean coast, and Key West, Florida.",
    bestSeason: "Year-round wherever clear ocean horizons exist, but most reliable during stable atmospheric conditions in spring and autumn."
  },
  {
    id: 'fogbow',
    name: 'Fogbow',
    category: 'Optical',
    rarity: 'Uncommon',
    description: 'A white or nearly colorless rainbow that forms in fog instead of rain',
    facts: [
      'Also called a white rainbow, ghost rainbow, or cloud bow',
      'Fog droplets are too small (< 0.05mm) to separate light into vivid colors',
      'The inner edge may show faint blue and the outer edge faint red',
      'Can display supernumerary bands -- faint interference fringes inside the arc'
    ],
    emoji: '🌫',
    bitFact: 'A desaturated rainbow sprite -- like when the color palette glitches and the rainbow renders in grayscale mode!',
    scientificMechanism: "Same optics as a standard rainbow (refraction and internal reflection in water droplets), but fog droplets are so tiny that diffraction dominates, overlapping colors into a broad white band.",
    historicalOccurrence: "Fogbows were documented by mariners for centuries and were sometimes called 'sea dogs' when seen from ships in thick fog banks.",
    howToSpot: "Stand with the sun at your back while facing a fog bank. Look for a broad, ghostly white arc. Mountain summits and coastal headlands at dawn are ideal spots.",
    dangerLevel: 1,
    whereToSee: "Coastal areas with frequent fog: San Francisco Bay, the British Isles, Newfoundland, the Faroe Islands, and mountain passes worldwide.",
    bestSeason: "Autumn and spring when radiation fog and advection fog are most common; year-round on foggy coastlines."
  },
  {
    id: 'catatumbo-lightning',
    name: 'Catatumbo Lightning',
    category: 'Electrical',
    rarity: 'Ultra Rare',
    description: 'Near-permanent lightning over Lake Maracaibo, Venezuela, occurring up to 300 nights per year',
    facts: [
      'Produces an average of 28 lightning strikes per minute at peak',
      'Occurs at the mouth of the Catatumbo River where it meets Lake Maracaibo',
      'Lightning storms can last 10 hours per night',
      'Has been used as a natural lighthouse by sailors for centuries'
    ],
    emoji: '⛈',
    bitFact: 'A permanent lightning storm zone -- like a never-ending boss arena where the thunder attack is always on cooldown and the sky never stops casting!',
    scientificMechanism: "Warm, moist air from the lake collides with cold air descending from the Andes and Sierra de Perija mountains, while methane from the swampy basin may enhance electrical conductivity in the atmosphere.",
    historicalOccurrence: "Used by Caribbean sailors as the 'Lighthouse of Maracaibo' for navigation since the 1500s. Sir Francis Drake's 1595 night attack on Maracaibo was foiled when the lightning revealed his ships.",
    howToSpot: "Travel to the southern shore of Lake Maracaibo at night and look toward the Catatumbo River delta. The silent, near-continuous flickering is visible from over 250 miles away.",
    dangerLevel: 3,
    whereToSee: "Exclusively at Lake Maracaibo, Venezuela, concentrated at the Catatumbo River mouth. Best viewed from the villages of Congo Mirador or Ologa.",
    bestSeason: "Most active from October to November, with a secondary peak in April-May. Briefly ceased in January-March 2010 due to drought."
  },
  {
    id: 'ice-circles',
    name: 'Ice Circles',
    category: 'Winter Weather',
    rarity: 'Rare',
    description: 'Perfectly circular rotating discs of ice that form in slow-moving rivers and streams',
    facts: [
      'Can range from a few feet to over 50 feet in diameter',
      'Rotate slowly due to the melting process and water currents',
      'The edges are smoothed into perfect circles by the surrounding water',
      'Sometimes called ice pans or ice discs'
    ],
    emoji: '🧊',
    bitFact: 'A spinning ice platform straight out of an arctic platformer level -- jump on it before it rotates you off the edge!',
    scientificMechanism: "A chunk of ice in a river eddy begins to rotate. As it turns, friction with the surrounding water melts and smooths its edges into a circle. The melting process itself can drive further rotation via temperature-differential currents.",
    historicalOccurrence: "A 91-meter (300-foot) ice disc in the Presumpscot River in Westbrook, Maine in January 2019 went viral, attracting international media and a dedicated webcam.",
    howToSpot: "Check slow-moving rivers and stream bends during the early freeze-up period. Look for a flat, circular ice sheet rotating gently in an eddy or at a river bend.",
    dangerLevel: 1,
    whereToSee: "Rivers in Scandinavia, the northern US (especially Maine and Michigan), Canada, Russia, and the UK during cold snaps.",
    bestSeason: "Early to mid-winter (November-January) during the initial freeze-up when river temperatures hover near 0°C."
  },
  {
    id: 'penitentes',
    name: 'Penitentes',
    category: 'Winter Weather',
    rarity: 'Rare',
    description: 'Tall, thin blades of ice or hardened snow formed by sublimation at high altitude, resembling rows of kneeling monks',
    facts: [
      'Can grow from a few centimeters to over 5 meters tall',
      'Named after the pointed hoods of penitent monks in religious processions',
      'Form only above 4,000 meters in dry conditions with intense sunlight',
      'Darwin described them in 1839 during his Andes crossing'
    ],
    emoji: '🏔',
    bitFact: 'A field of ice spikes that looks like a frozen spike trap level -- navigate carefully or take damage from these natural pixel hazards!',
    scientificMechanism: "Differential sublimation (ice converting directly to vapor) sculpts snow surfaces. Small depressions focus sunlight, accelerating sublimation at the base while tips remain frozen, creating tall spikes over weeks.",
    historicalOccurrence: "Charles Darwin encountered fields of penitentes while crossing the Andes in 1835, describing them as a forest of ice spikes that made travel nearly impossible.",
    howToSpot: "Trek to high-altitude snowfields above 4,000 meters in arid regions. Look for rows of blade-like ice formations pointing toward the midday sun, often covering large areas.",
    dangerLevel: 2,
    whereToSee: "High Andes (Argentina, Chile, Bolivia), Himalayas, Kilimanjaro, and high-altitude glaciers. Also detected on Jupiter's moon Europa.",
    bestSeason: "Dry season at high altitude: May-September in the Southern Hemisphere Andes, year-round above 5,000 meters in the tropics."
  },
  {
    id: 'sun-dogs',
    name: 'Sun Dogs (Parhelia)',
    category: 'Optical',
    rarity: 'Uncommon',
    description: 'Bright spots flanking the sun caused by refraction of light through hexagonal ice crystals in the atmosphere',
    facts: [
      'Appear as two bright patches exactly 22 degrees on either side of the sun',
      'Often display a reddish tint on the side closest to the sun',
      'Most vivid when the sun is near the horizon',
      'Can sometimes complete a full 22-degree halo ring around the sun'
    ],
    emoji: '☀️',
    bitFact: 'The sun spawning two mirror-image clones -- a triple boss encounter where you have to figure out which sun is the real one!',
    scientificMechanism: "Horizontally oriented hexagonal plate-shaped ice crystals in cirrostratus clouds refract sunlight at a minimum deviation angle of 22 degrees, creating bright spots on each side of the sun.",
    historicalOccurrence: "The Battle of Mortimer's Cross (1461) during the Wars of the Roses began with a parhelion display. Edward IV took it as a divine sign and adopted the 'Sun in Splendour' as his emblem.",
    howToSpot: "Look for bright, rainbow-tinged patches on either side of a low sun when thin cirrus or cirrostratus clouds are present. Hold your arm outstretched and spread your hand -- the distance from thumb to pinky is roughly 22 degrees.",
    dangerLevel: 1,
    whereToSee: "Common in cold climates: Canada, Scandinavia, Russia, the northern US, and Antarctica. Also visible from anywhere with high cirrus clouds.",
    bestSeason: "Winter months when ice crystal clouds are most prevalent and the sun stays low on the horizon (November-February in the Northern Hemisphere)."
  },
  {
    id: 'fire-rainbow',
    name: 'Fire Rainbow (Circumhorizontal Arc)',
    category: 'Optical',
    rarity: 'Rare',
    description: 'A brilliant horizontal band of rainbow colors appearing in high cirrus clouds, resembling fire in the sky',
    facts: [
      'Not actually related to fire or rainbows -- it is an ice halo phenomenon',
      'The sun must be higher than 58 degrees above the horizon for it to form',
      'Can stretch across the entire sky if the cirrus cloud layer is extensive',
      'Only visible from latitudes lower than about 55 degrees'
    ],
    emoji: '🔥',
    bitFact: 'The sky unlocking its ultimate rainbow beam attack -- a full-screen color blast like the rarest spell in the game only high-level players ever see!',
    scientificMechanism: "Sunlight enters through the flat top face of horizontally oriented hexagonal ice crystals in cirrus clouds and exits through a vertical side face, dispersing into a vivid horizontal spectrum at 46 degrees below the sun.",
    historicalOccurrence: "A massive circumhorizontal arc over Spokane, Washington in June 2006 was widely photographed and shared online, introducing the phenomenon to millions.",
    howToSpot: "On warm sunny days when wispy cirrus clouds are overhead and the sun is very high (above 58 degrees), scan the sky below the sun for a vivid horizontal rainbow band within the clouds.",
    dangerLevel: 1,
    whereToSee: "Mid-latitudes during summer: the continental US, southern Europe, Japan, and northern Australia. Cannot form at high latitudes where the sun is too low.",
    bestSeason: "Summer months when the sun reaches sufficient elevation: June-August in mid-northern latitudes, December-February in mid-southern latitudes."
  },
  {
    id: 'brinicles',
    name: 'Brinicles',
    category: 'Ocean',
    rarity: 'Very Rare',
    description: 'Underwater ice stalactites that form beneath sea ice and freeze everything they touch on the ocean floor',
    facts: [
      'Also called the "icicle of death" because they kill sea life on contact',
      'Form when super-cold, super-salty brine drains out of forming sea ice',
      'The brine stream is denser and colder than surrounding seawater, sinking rapidly',
      'First filmed in 2011 by the BBC for the Frozen Planet documentary'
    ],
    emoji: '🦑',
    bitFact: 'An underwater freeze ray that creates a trail of instant death -- like an ice beam trap in an underwater dungeon level!',
    scientificMechanism: "As sea ice forms, salt is expelled as concentrated brine. This brine is denser and much colder than seawater (-20°C), so it sinks, freezing the water around it into a descending hollow tube of ice.",
    historicalOccurrence: "First observed by divers under Antarctic sea ice in the 1960s, but not filmed until the BBC's Frozen Planet crew captured time-lapse footage in 2011 showing a brinicle reaching the seafloor and freezing starfish.",
    howToSpot: "Only observable by diving or using ROVs beneath newly forming sea ice in polar regions. Look for translucent ice tubes descending from the underside of sea ice in calm, shallow water.",
    dangerLevel: 2,
    whereToSee: "Beneath sea ice in both Arctic and Antarctic waters, particularly in shallow bays and fjords where conditions are calm enough for brinicles to form without breaking.",
    bestSeason: "Early winter during active sea ice formation: March-June in Antarctica, October-December in the Arctic."
  },
  {
    id: 'diamond-dust',
    name: 'Diamond Dust',
    category: 'Winter Weather',
    rarity: 'Uncommon',
    description: 'Tiny ice crystals sparkling in the air on clear, extremely cold days, creating a glittering effect without any clouds',
    facts: [
      'Occurs at temperatures below -30°C (-22°F) in clear skies',
      'Creates stunning halos, sundogs, and light pillars simultaneously',
      'Crystals are so small they float suspended in the air for hours',
      'Also known as ice crystal fog or clear-sky precipitation'
    ],
    emoji: '💎',
    bitFact: 'The air itself becomes a treasure chest of sparkling gems -- like walking through a bonus stage where every pixel is made of glitter!',
    scientificMechanism: "At extremely cold temperatures, the tiny amount of moisture in the air crystallizes directly into minute hexagonal ice plates and columns that remain suspended, glittering in sunlight as they slowly drift downward.",
    historicalOccurrence: "Common at the South Pole station during winter, where it was instrumental in discovering the optical phenomena of Bottlinger's rings and sub-sun displays.",
    howToSpot: "On extremely cold, calm, clear mornings, look toward the sun for thousands of tiny sparkles floating in the air. The effect is strongest in direct sunlight and may produce multiple halo displays simultaneously.",
    dangerLevel: 1,
    whereToSee: "Interior Antarctica, interior Alaska and Yukon, Siberia, northern Scandinavia, and high-altitude mountain stations during extreme cold.",
    bestSeason: "Deep winter when temperatures drop below -30°C: December-February in the Arctic, June-August in Antarctica."
  },
  {
    id: 'haboob',
    name: 'Haboob',
    category: 'Desert Weather',
    rarity: 'Uncommon',
    description: 'A massive wall of dust and sand driven by thunderstorm downdrafts that can reach over a mile high and span 60+ miles wide',
    facts: [
      'The name comes from the Arabic word "habb" meaning to blow',
      'Can reduce visibility to near zero in seconds',
      'Dust walls can reach altitudes of 5,000+ feet',
      'Wind speeds at the leading edge often exceed 60 mph'
    ],
    emoji: '🏜',
    bitFact: 'A massive dust wall scrolling across the screen like an unstoppable stage hazard -- no power-up can save you, just run!',
    scientificMechanism: "Cold air from a thunderstorm downdraft hits the ground and spreads outward as a density current, scooping up loose sand and dust into a towering wall that advances ahead of the storm.",
    historicalOccurrence: "A massive haboob struck Phoenix, Arizona on July 5, 2011, creating a dust wall over a mile high and 100 miles wide that was visible on weather radar and satellite imagery.",
    howToSpot: "Watch for an advancing brown or tan wall on the horizon ahead of a thunderstorm, often during late afternoon. The wall has a distinct, sharp leading edge and may be preceded by gusty winds.",
    dangerLevel: 3,
    whereToSee: "The Sahara and Sahel regions, the Arabian Peninsula, the US Desert Southwest (especially Phoenix and Tucson), Sudan, and parts of Australia.",
    bestSeason: "Summer monsoon season when thunderstorms are frequent over desert terrain: June-September in the Northern Hemisphere."
  },
  {
    id: 'heat-burst',
    name: 'Heat Burst',
    category: 'Wind',
    rarity: 'Rare',
    description: 'A sudden blast of extremely hot, dry wind at the surface from a dying thunderstorm, capable of raising temperatures 10-20°F in minutes',
    facts: [
      'Temperatures can spike to over 100°F even at night',
      'Dew points can plummet to negative values in minutes',
      'Wind gusts frequently exceed 70+ mph',
      'Dying thunderstorms produce them when rain evaporates before reaching the ground'
    ],
    emoji: '🥵',
    bitFact: 'A dying storm boss launching one last surprise fire attack when you think the fight is over -- the ultimate cheap shot from beyond the grave!',
    scientificMechanism: "Rain from a collapsing thunderstorm evaporates in dry air aloft, but the descending air retains its momentum. Without evaporative cooling, the air compresses and heats adiabatically as it plunges to the surface, arriving hot and bone-dry.",
    historicalOccurrence: "On May 22, 1996, a heat burst in Chickasha, Oklahoma raised temperatures from 88°F to 101°F at 3 AM, with dew points crashing to single digits and winds gusting to 87 mph.",
    howToSpot: "Watch for a sudden, dramatic rise in temperature and drop in humidity during the late evening or night, often accompanied by strong gusty winds. Usually follows the passage of a weakening radar echo.",
    dangerLevel: 3,
    whereToSee: "The US Great Plains (Oklahoma, Kansas, Texas), the Iberian Peninsula, the Middle East, and semi-arid regions of India and Australia.",
    bestSeason: "Late spring through early autumn when high-based thunderstorms form over dry environments: May-September in the US Great Plains."
  }
];
