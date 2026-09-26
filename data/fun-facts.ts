/** Sourced phenomenon summaries. Ratings are editorial, not official hazard scales. */
import type { GuideSource } from '@/lib/education/content'

export interface WeatherPhenomena {
  id: string
  name: string
  category: string
  rarity: string
  description: string
  facts: string[]
  emoji: string
  bitFact: string
  scientificMechanism?: string
  historicalOccurrence?: string
  howToSpot: string
  dangerLevel: number
  whereToSee: string
  bestSeason: string
  sources: GuideSource[]
}

export const PHENOMENON_RATINGS_NOTE = 'Rarity and hazard ratings are informal editorial guides, not measured occurrence rates or official warnings. Local conditions determine actual risk.'

export const weatherPhenomena: WeatherPhenomena[] = [
  {
    id: "ball-lightning",
    name: "Ball Lightning",
    category: "Electrical",
    rarity: "Not established",
    description: "Reports of luminous, ball-like objects near thunderstorms remain difficult to explain and study.",
    facts: [
      "Eyewitness accounts are not all independently verified.",
      "A 2014 paper reported a recorded event after a cloud-to-ground strike, with light from elements found in soil.",
      "That observation does not establish one mechanism for every report."
    ],
    emoji: "⚡",
    bitFact: "A mysterious glowing sprite whose rulebook is still being investigated.",
    scientificMechanism: "Several explanations have been proposed. The recorded spectrum supports a role for vaporised soil in that event; a general explanation remains unsettled.",
    howToSpot: "There is no reliable way to seek it out. During thunderstorms, stay inside a substantial building or enclosed vehicle, away from windows.",
    dangerLevel: 4,
    whereToSee: "Reports exist from different locations; there is no established viewing hotspot.",
    bestSeason: "No reliable viewing season is established.",
    sources: [
      {
        label: "NWS — Ball lightning",
        url: "https://www.weather.gov/wrn/spring-science-sm"
      },
      {
        label: "Cen, Yuan & Xue (2014) — Recorded optical spectrum",
        url: "https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.112.035001"
      },
      {
        label: "NWS — Lightning safety",
        url: "https://www.weather.gov/safety/lightning"
      }
    ]
  },
  {
    id: "st-elmos-fire",
    name: "St. Elmo's Fire",
    category: "Electrical",
    rarity: "Rare",
    description: "A blue or violet electrical glow around pointed objects in a strong atmospheric electric field.",
    facts: [
      "It is a corona discharge, not burning fuel.",
      "Ship masts and aircraft surfaces can glow.",
      "The surrounding thunderstorm or volcanic ash can be hazardous even when the glow itself is not hot."
    ],
    emoji: "🔥",
    bitFact: "A neon outline effect around the edges of a storm scene.",
    scientificMechanism: "Electric fields concentrate near sharp points. When air there becomes ionised, it can emit a visible glow.",
    howToSpot: "Look at documented photographs of glowing tips and edges; do not approach exposed objects during a storm.",
    dangerLevel: 2,
    whereToSee: "Reported on ships and aircraft in strongly electrified air.",
    bestSeason: "Depends on electrical conditions rather than a fixed season.",
    sources: [
      {
        label: "Hong Kong Observatory — St. Elmo’s fire",
        url: "https://www.weather.gov.hk/en/education/aviation-and-marine/aviation/00534-st-elmos-fire-as-seen-from-aircraft.html"
      }
    ]
  },
  {
    id: "rogue-waves",
    name: "Rogue Waves",
    category: "Ocean",
    rarity: "Rare",
    description: "An unusually large ocean wave, more than twice the height of surrounding waves.",
    facts: [
      "Rogue waves can arrive unexpectedly and have steep faces.",
      "Several wave and current processes can contribute.",
      "A single formation explanation does not fit every event."
    ],
    emoji: "🌊",
    bitFact: "An ocean level with an unexpectedly oversized wave obstacle.",
    scientificMechanism: "Waves can reinforce each other when their crests coincide. Opposing currents can also concentrate wave energy and increase steepness.",
    howToSpot: "There is no dependable visual countdown. Follow marine forecasts and warnings rather than trying to find one.",
    dangerLevel: 5,
    whereToSee: "Open ocean and other waters where waves and currents interact.",
    bestSeason: "Conditions matter more than the calendar.",
    sources: [
      {
        label: "NOAA Ocean Service — What is a rogue wave?",
        url: "https://oceanservice.noaa.gov/facts/roguewaves.html"
      }
    ]
  },
  {
    id: "fire-whirls",
    name: "Fire Whirls",
    category: "Fire Weather",
    rarity: "Uncommon",
    description: "Rotating columns of rising, fire-heated air that can carry flames, smoke and burning debris.",
    facts: [
      "They form when strong heating interacts with rotating air.",
      "Their size and intensity vary.",
      "Lofted burning material can spread a fire."
    ],
    emoji: "🌪",
    bitFact: "A swirling flame animation with a trail of ember particles.",
    scientificMechanism: "A strong updraft over a fire can draw in and intensify a local circulation. The resulting vortex may entrain flames and embers.",
    howToSpot: "Recognise rotating flame or smoke in official footage. Keep clear of active fires and follow evacuation instructions.",
    dangerLevel: 5,
    whereToSee: "Active fires with suitable heating and wind conditions.",
    bestSeason: "Whenever fires occur; local fire seasons vary.",
    sources: [
      {
        label: "NWS — Fire weather glossary",
        url: "https://www.weather.gov/ohx/fireweather_glossary"
      },
      {
        label: "NWS — Fire whirls",
        url: "https://www.weather.gov/wrn/tornado-sm"
      }
    ]
  },
  {
    id: "ice-storms",
    name: "Ice Storms",
    category: "Winter Weather",
    rarity: "Uncommon",
    description: "Damaging ice accumulation from freezing rain, coating roads, trees and exposed structures.",
    facts: [
      "Freezing rain reaches the surface as liquid and freezes on cold objects.",
      "It differs from sleet, which freezes before reaching the ground.",
      "Ice weight can break branches and power lines."
    ],
    emoji: "❄️",
    bitFact: "A freeze spell repainting the landscape with an icy texture.",
    scientificMechanism: "A common setup has a warm layer that melts falling snow above a shallow subfreezing layer. Drops remain liquid until they strike freezing surfaces.",
    howToSpot: "A growing glaze on outdoor surfaces is a warning sign. Avoid unnecessary travel and keep away from fallen power lines.",
    dangerLevel: 4,
    whereToSee: "Regions where rain falls onto freezing surfaces.",
    bestSeason: "Usually the local cold season.",
    sources: [
      {
        label: "NWS — Snow, sleet and freezing rain",
        url: "https://www.weather.gov/iwx/sleetvsfreezingrain"
      },
      {
        label: "NWS — Downed power lines",
        url: "https://www.weather.gov/arx/powerprep"
      }
    ]
  },
  {
    id: "microbursts",
    name: "Microbursts",
    category: "Wind",
    rarity: "Uncommon",
    description: "Small, intense downdrafts that spread damaging winds outward when they reach the ground.",
    facts: [
      "The affected outflow area is less than about 2.5 miles across.",
      "Wet microbursts bring substantial rain; dry ones may bring little to the surface.",
      "Rapid changes in wind are especially dangerous to aircraft near the ground."
    ],
    emoji: "💨",
    bitFact: "A downward wind burst that spreads out like a shockwave animation.",
    scientificMechanism: "Falling precipitation and evaporative cooling can accelerate a downdraft. On reaching the surface, it fans outward as straight-line wind.",
    howToSpot: "A rain shaft or spreading dust may be visible, but appearances are unreliable. Use official thunderstorm warnings.",
    dangerLevel: 5,
    whereToSee: "Beneath showers and thunderstorms in suitable environments.",
    bestSeason: "During the local convective-weather season, though not limited to summer.",
    sources: [
      {
        label: "NWS — How downbursts form",
        url: "https://www.weather.gov/lmk/downburst"
      }
    ]
  },
  {
    id: "sprites",
    name: "Sprites",
    category: "Upper Atmosphere",
    rarity: "Rare",
    description: "Brief, often reddish flashes high above thunderstorms, sometimes shaped like columns or jellyfish.",
    facts: [
      "Sprites are transient luminous events in the upper atmosphere.",
      "They are triggered by lightning below, not bolts travelling into outer space.",
      "The first camera recording in 1989 helped open this field of study."
    ],
    emoji: "🌌",
    bitFact: "A fleeting red sprite above the storm layer of the screen.",
    scientificMechanism: "A lightning discharge changes the electric field above a storm and can excite gases in the thin upper atmosphere, producing light.",
    howToSpot: "They are fleeting and difficult to see. Research photographs and low-light video reveal their structure.",
    dangerLevel: 1,
    whereToSee: "High above thunderstorms in many parts of the world.",
    bestSeason: "Associated with thunderstorms; dark skies help observation.",
    sources: [
      {
        label: "NASA — The great sprites chase",
        url: "https://science.nasa.gov/blogs/the-sun-spot/2022/10/27/the-great-sprites-chase/"
      },
      {
        label: "NASA — Spritacular",
        url: "https://science.nasa.gov/science-research/earth-science/spritacular/"
      }
    ]
  },
  {
    id: "elves",
    name: "ELVES",
    category: "Upper Atmosphere",
    rarity: "Very Rare",
    description: "Extremely brief, expanding rings of light in the upper atmosphere associated with lightning.",
    facts: [
      "ELVES are a type of transient luminous event.",
      "They appear as broad rings or flattened disks.",
      "Their short duration makes them difficult to capture."
    ],
    emoji: "💫",
    bitFact: "A glowing ring animation that disappears before the next frame.",
    scientificMechanism: "An electromagnetic pulse from lightning can excite gases near the bottom of the ionosphere. On Earth, nitrogen contributes to their reddish light.",
    howToSpot: "Specialised recordings are much more useful than trying to spot a ring by eye.",
    dangerLevel: 1,
    whereToSee: "Above thunderstorms, high in the atmosphere.",
    bestSeason: "Thunderstorm activity and observing conditions determine opportunities.",
    sources: [
      {
        label: "NASA — Sprites and elves",
        url: "https://www.nasa.gov/centers-and-facilities/jpl/juno-data-indicates-sprites-or-elves-frolic-in-jupiters-atmosphere/"
      },
      {
        label: "NASA — Upper-atmosphere phenomena",
        url: "https://www.nasa.gov/image-article/upper-atmosphere-phenomena-caused-by-thunderstorms/"
      }
    ]
  },
  {
    id: "morning-glory",
    name: "Morning Glory Clouds",
    category: "Cloud Formation",
    rarity: "Ultra Rare",
    description: "Long roll clouds marking atmospheric waves, famously observed around Australia’s Gulf of Carpentaria.",
    facts: [
      "They can extend for hundreds of kilometres.",
      "The Gulf of Carpentaria has a recognised spring observing season.",
      "Cloud forms in rising air at a wave’s front and evaporates behind it."
    ],
    emoji: "☁️",
    bitFact: "A long cloud ribbon scrolling across the sky background.",
    scientificMechanism: "In the Gulf, interacting sea breezes and cooling land can generate waves along a stable layer. Moist air rising in the waves produces the rolling cloud bands.",
    howToSpot: "Look for a long horizontal roll in documented Gulf observations. A smooth-looking cloud does not establish safe flying conditions.",
    dangerLevel: 1,
    whereToSee: "Especially the Gulf of Carpentaria near Burketown; roll clouds also occur elsewhere.",
    bestSeason: "September to November in the Gulf of Carpentaria.",
    sources: [
      {
        label: "Bureau of Meteorology — Morning glory clouds",
        url: "https://media.bom.gov.au/social/blog/2272/whats-the-science-behind-these-spectacular-weather-photos/"
      }
    ]
  },
  {
    id: "polar-stratospheric",
    name: "Polar Stratospheric Clouds",
    category: "High Altitude",
    rarity: "Rare",
    description: "Clouds formed in the extremely cold polar stratosphere; some show vivid pearly colours.",
    facts: [
      "Different types contain ice or nitric-acid-bearing particles.",
      "Cloud-particle surfaces support reactions that activate ozone-destroying chlorine.",
      "Sunlight returning in spring helps drive the resulting ozone loss."
    ],
    emoji: "🌈",
    bitFact: "A pearly sky palette with a chemistry puzzle behind the colours.",
    scientificMechanism: "Very low temperatures allow particles to form in the normally dry stratosphere. Their surfaces alter the chemistry of chlorine compounds; the clouds do not simply consume ozone themselves.",
    howToSpot: "Some appear as luminous, coloured patches around twilight. Colour alone is not enough for identification.",
    dangerLevel: 1,
    whereToSee: "Cold stratospheric air over polar regions.",
    bestSeason: "Polar winter and, when sufficiently cold, early spring.",
    sources: [
      {
        label: "NASA — Polar stratospheric clouds",
        url: "https://science.nasa.gov/earth/earth-observatory/polar-stratospheric-clouds-622/"
      },
      {
        label: "NOAA — Ozone hole science",
        url: "https://csl.noaa.gov/assessments/ozone/2022/twentyquestions/"
      }
    ]
  },
  {
    id: "waterspouts",
    name: "Waterspouts",
    category: "Marine Weather",
    rarity: "Uncommon",
    description: "Rotating columns over water, including both tornadic and fair-weather varieties.",
    facts: [
      "Tornadic waterspouts are tornadoes over water.",
      "Fair-weather waterspouts often develop beneath growing cumulus clouds.",
      "Either type can threaten boats and people."
    ],
    emoji: "🌊",
    bitFact: "A rotating water-level hazard with a cloud connection overhead.",
    scientificMechanism: "Fair-weather waterspouts build from a surface circulation beneath growing clouds. Tornadic waterspouts are associated with thunderstorm rotation or tornadoes moving over water.",
    howToSpot: "A funnel and rotating spray may be visible. Never approach; monitor special marine warnings and follow official avoidance advice.",
    dangerLevel: 3,
    whereToSee: "Coastal waters and lakes, including South Florida’s coastal waters.",
    bestSeason: "Fair-weather waterspouts are common in South Florida from late spring to early fall; tornadic ones can occur at other times.",
    sources: [
      {
        label: "NWS — Waterspout types and safety",
        url: "https://www.weather.gov/mfl/waterspouts"
      }
    ]
  },
  {
    id: "dust-devils",
    name: "Dust Devils",
    category: "Desert Weather",
    rarity: "Common",
    description: "Rotating columns of air made visible by dust over strongly heated ground.",
    facts: [
      "They usually develop in fair weather rather than beneath thunderstorms.",
      "They are distinct from tornadoes.",
      "Even a small-looking vortex can lift debris and cause damage."
    ],
    emoji: "🌪",
    bitFact: "A spinning dust particle effect across a sun-baked map.",
    scientificMechanism: "Hot ground heats the air above it. Rising air can acquire rotation and concentrate it into a small vortex.",
    howToSpot: "A narrow, moving dust column over sunlit ground is a clue. Keep clear of the vortex and flying debris.",
    dangerLevel: 2,
    whereToSee: "Dry, exposed surfaces with strong daytime heating.",
    bestSeason: "Warm sunny days, particularly during strong afternoon heating.",
    sources: [
      {
        label: "NWS — Dust devils",
        url: "https://www.weather.gov/fgz/DustDevil"
      }
    ]
  },
  {
    id: "thundersnow",
    name: "Thundersnow",
    category: "Winter Weather",
    rarity: "Rare",
    description: "Lightning and thunder occurring while snow is falling.",
    facts: [
      "Lightning is possible in winter storms, not just warm-season thunderstorms.",
      "Strong updrafts and mixed ice particles help clouds become electrified.",
      "Thunder does not establish a particular snowfall rate."
    ],
    emoji: "🌩",
    bitFact: "An ice-level scene with an unexpected lightning animation.",
    scientificMechanism: "Collisions among ice particles can separate electrical charge in a cloud. If the electric field becomes strong enough, a lightning discharge can occur while snow reaches the surface.",
    howToSpot: "A flash and thunder during snowfall identify the event. Lightning safety still applies in winter; observe from shelter.",
    dangerLevel: 3,
    whereToSee: "Snow-producing storms with suitable convective conditions.",
    bestSeason: "The local snow season.",
    sources: [
      {
        label: "NOAA NSSL — Lightning questions",
        url: "https://www.nssl.noaa.gov/education/svrwx101/lightning/faq/"
      },
      {
        label: "NWS — Lightning safety",
        url: "https://www.weather.gov/safety/lightning"
      }
    ]
  },
  {
    id: "volcanic-lightning",
    name: "Volcanic Lightning",
    category: "Geological",
    rarity: "Very Rare",
    description: "Electrical discharges in an eruption plume containing ash and, in some cases, ice.",
    facts: [
      "Colliding ash particles can contribute to electrical charging.",
      "Ice charging can matter in tall, cold plumes.",
      "Not every eruption produces detectable lightning."
    ],
    emoji: "🌋",
    bitFact: "An eruption scene layered with branching lightning effects.",
    scientificMechanism: "Ash collisions near the vent and interactions among ice particles higher in the plume can separate charge. Which process dominates depends on the eruption and plume conditions.",
    howToSpot: "Use observatory imagery; follow exclusion zones and official eruption advice instead of approaching a plume.",
    dangerLevel: 5,
    whereToSee: "Explosive volcanic eruptions with suitable plume conditions.",
    bestSeason: "Eruption-dependent, not seasonal.",
    sources: [
      {
        label: "USGS — Volcanic lightning charging",
        url: "https://www.usgs.gov/news/science-snippet/hazard-guess-riskiest-science-quiz-you-will-ever-take-14"
      },
      {
        label: "USGS — Bogoslof observations",
        url: "https://www.usgs.gov/publications/did-ice-charging-generate-volcanic-lightning-during-2016-2017-eruption-bogoslof"
      }
    ]
  },
  {
    id: "green-flash",
    name: "Green Flash",
    category: "Optical",
    rarity: "Uncommon",
    description: "A brief green colour near the Sun’s upper edge around sunrise or sunset.",
    facts: [
      "Atmospheric refraction separates colours near the horizon.",
      "Different mirage conditions produce different kinds of flash.",
      "A clear horizon helps, but a flash is not guaranteed."
    ],
    emoji: "🟢",
    bitFact: "A momentary green palette change at the edge of the sky scene.",
    scientificMechanism: "The atmosphere bends different wavelengths by different amounts. Mirage effects can enlarge the small colour separation at the Sun’s edge.",
    howToSpot: "Study recorded images. Never aim unfiltered binoculars or a telescope at the Sun, and do not stare at it.",
    dangerLevel: 1,
    whereToSee: "An unobstructed horizon, often over the sea.",
    bestSeason: "Any season with suitable horizon and atmospheric conditions.",
    sources: [
      {
        label: "WMO — Green flash",
        url: "https://cloudatlas.wmo.int/en/green-flash.html"
      },
      {
        label: "NOAA — Atmospheric refraction",
        url: "https://nauticalcharts.noaa.gov/publications/coast-pilot/files/cp2/CPB2_C03_WEB.pdf"
      },
      {
        label: "NASA — Solar viewing safety",
        url: "https://science.nasa.gov/eclipses/safety/"
      }
    ]
  },
  {
    id: "fogbow",
    name: "Fogbow",
    category: "Optical",
    rarity: "Uncommon",
    description: "A broad, pale bow formed when light meets very small droplets in fog or mist.",
    facts: [
      "It is sometimes called a white rainbow.",
      "Faint red and blue edges can be present.",
      "Small droplets produce a much less colourful bow than typical rain."
    ],
    emoji: "🌫",
    bitFact: "A rainbow sprite rendered with a nearly white palette.",
    scientificMechanism: "Refraction, internal reflection and diffraction of light in tiny droplets create the bow.",
    howToSpot: "With the Sun behind you, look toward illuminated fog. Stay in a safe place if visibility is poor.",
    dangerLevel: 1,
    whereToSee: "Fog or mist lit by sunlight; moonlight can also produce one.",
    bestSeason: "Whenever local fog and suitable illumination coincide.",
    sources: [
      {
        label: "WMO — Fog bow",
        url: "https://cloudatlas.wmo.int/fog-bow.html"
      }
    ]
  },
  {
    id: "catatumbo-lightning",
    name: "Catatumbo Lightning",
    category: "Electrical",
    rarity: "Location-dependent",
    description: "Frequent thunderstorms around Venezuela’s Lake Maracaibo, known for intense nighttime lightning.",
    facts: [
      "Satellite observations identify Lake Maracaibo as a major lightning hotspot.",
      "Activity varies through the year and is not continuous.",
      "The name refers to the Catatumbo region, not a separate kind of lightning."
    ],
    emoji: "⛈",
    bitFact: "A storm-rich map region with repeated lightning animations.",
    scientificMechanism: "Warm, moist air and local wind circulations around the lake and surrounding mountains favour repeated thunderstorm development.",
    howToSpot: "Use documented observations or remote imagery. Frequent lightning still requires ordinary storm shelter precautions.",
    dangerLevel: 3,
    whereToSee: "Lake Maracaibo and the nearby Catatumbo region of Venezuela.",
    bestSeason: "Activity varies seasonally; no individual night is guaranteed.",
    sources: [
      {
        label: "NASA Earthdata — The Maracaibo beacon",
        url: "https://www.earthdata.nasa.gov/s3fs-public/imported/NASA_SOP_2016_the_maracaibo_beacon.pdf"
      }
    ]
  },
  {
    id: "ice-circles",
    name: "Ice Circles",
    category: "Winter Weather",
    rarity: "Rare",
    description: "Round pieces of floating ice that can rotate slowly on the water.",
    facts: [
      "Currents and melting can affect their motion and shape.",
      "Experiments suggest both meltwater and residual water motion can influence rotation.",
      "A laboratory mechanism does not explain every natural ice circle."
    ],
    emoji: "🧊",
    bitFact: "A slowly rotating ice sprite viewed from the riverbank.",
    scientificMechanism: "A 2016 study linked rotation to sinking meltwater. A 2023 follow-up found that residual water motion can trigger rotation, with meltwater possibly amplifying it. Natural rivers add further currents and ice interactions.",
    howToSpot: "Observe from stable ground; a floating ice disk is not a safe platform.",
    dangerLevel: 1,
    whereToSee: "Cold waterways with floating ice and open water.",
    bestSeason: "During freezing or thawing conditions.",
    sources: [
      {
        label: "Dorbolo and colleagues (2016) — Melting ice disk experiments",
        url: "https://pubmed.ncbi.nlm.nih.gov/27078452/"
      },
      {
        label: "Schellenberg, Newton & Hunt (2023) — Rotation of melting ice disks",
        url: "https://link.springer.com/article/10.1007/s10652-023-09912-6"
      }
    ]
  },
  {
    id: "penitentes",
    name: "Penitentes",
    category: "Winter Weather",
    rarity: "Rare",
    description: "Blade-like snow and ice formations found in dry, high mountain environments.",
    facts: [
      "Sublimation removes ice directly as water vapour.",
      "Melting can also deepen troughs between the blades.",
      "Wind alone does not sculpt the characteristic pattern."
    ],
    emoji: "🏔",
    bitFact: "A field of icy spikes forming a natural pixel landscape.",
    scientificMechanism: "Sunlight and very dry air drive uneven loss of snow and ice. Depressions concentrate radiation, deepening troughs and leaving pointed ridges between them.",
    howToSpot: "Look for closely spaced blades in mountain photographs; walking through such terrain can be difficult.",
    dangerLevel: 2,
    whereToSee: "High, dry terrain such as the Chilean Andes.",
    bestSeason: "When strong sunshine acts on an existing snow or ice cover.",
    sources: [
      {
        label: "ESO — Icy penitents on Chajnantor",
        url: "https://www.eso.org/public/images/potw1221a/"
      }
    ]
  },
  {
    id: "sun-dogs",
    name: "Sun Dogs (Parhelia)",
    category: "Optical",
    rarity: "Uncommon",
    description: "Bright, sometimes coloured spots to either side of the Sun, also called parhelia.",
    facts: [
      "Sunlight refracting through ice crystals produces the spots.",
      "With a low Sun, they appear roughly 22 degrees to either side.",
      "One or both spots may be visible, with red toward the Sun."
    ],
    emoji: "☀️",
    bitFact: "Two bright companion sprites flanking the Sun.",
    scientificMechanism: "Plate-shaped ice crystals falling with roughly horizontal faces refract sunlight into preferred viewing directions.",
    howToSpot: "Keep the Sun blocked by a building or another opaque object; do not look directly at it or use unfiltered optics.",
    dangerLevel: 1,
    whereToSee: "Where suitably oriented ice crystals are present in the atmosphere.",
    bestSeason: "Possible year-round; the crystals aloft need not mean freezing weather at the ground.",
    sources: [
      {
        label: "NWS — Halos, sundogs and pillars",
        url: "https://www.weather.gov/arx/why_halos_sundogs_pillars"
      },
      {
        label: "NWS — Ice-crystal optics",
        url: "https://www.weather.gov/media/mfr/fall2016.pdf"
      }
    ]
  },
  {
    id: "fire-rainbow",
    name: "Fire Rainbow (Circumhorizontal Arc)",
    category: "Optical",
    rarity: "Rare",
    description: "A colourful ice-crystal halo called a circumhorizontal arc, unrelated to fire.",
    facts: [
      "It extends roughly parallel to the horizon below the Sun.",
      "The Sun must be higher than about 58 degrees.",
      "It is a halo phenomenon, distinct from a raindrop rainbow."
    ],
    emoji: "🔥",
    bitFact: "A horizontal rainbow-colour band across the sky layer.",
    scientificMechanism: "Sunlight is refracted through suitably oriented ice crystals, producing a coloured arc when the Sun is high enough.",
    howToSpot: "Look for a horizontal band of colour in ice cloud well below a high Sun. Keep the Sun out of your direct view.",
    dangerLevel: 1,
    whereToSee: "Places and times where the Sun rises high enough and suitable ice crystals are present.",
    bestSeason: "Often near summer midday at mid-latitudes; solar elevation is the key condition.",
    sources: [
      {
        label: "WMO — Circumhorizontal arc",
        url: "https://cloudatlas.wmo.int/en/circumhorizontal-arc.html"
      },
      {
        label: "WMO — Halo phenomena",
        url: "https://cloudatlas.wmo.int/en/halo-phenomena.html"
      }
    ]
  },
  {
    id: "brinicles",
    name: "Brinicles",
    category: "Ocean",
    rarity: "Very Rare",
    description: "Hollow ice tubes that grow downward beneath sea ice around a flow of cold, salty brine.",
    facts: [
      "Sea ice formation leaves concentrated brine behind.",
      "Dense brine can drain downward into the sea.",
      "Surrounding seawater freezes around that cold flow."
    ],
    emoji: "🦑",
    bitFact: "An underwater icicle extending through a polar scene.",
    scientificMechanism: "Salt-rich brine stays liquid below the freezing point of less-salty seawater. As it drains from sea ice, heat transfer can freeze a tube around the descending stream.",
    howToSpot: "Research footage shows their underwater growth; observing beneath sea ice requires specialist diving operations.",
    dangerLevel: 2,
    whereToSee: "Beneath growing sea ice in polar oceans.",
    bestSeason: "During sea-ice growth when cold brine drains out.",
    sources: [
      {
        label: "Cartwright and colleagues (2013) — Brinicle formation",
        url: "https://arxiv.org/abs/1304.1774"
      }
    ]
  },
  {
    id: "diamond-dust",
    name: "Diamond Dust",
    category: "Winter Weather",
    rarity: "Uncommon",
    description: "Tiny ice crystals falling from a clear sky, often visible as sparkles in sunlight.",
    facts: [
      "WMO describes it especially in clear, calm, cold weather.",
      "It can form at temperatures much warmer than −30°C.",
      "Well-formed crystals can produce halos; diamond dust is distinct from ice fog."
    ],
    emoji: "💎",
    bitFact: "A glittering ice-particle layer across a winter scene.",
    scientificMechanism: "Water vapour deposits as small ice crystals in a cold air mass. Slow-falling crystals can appear suspended and catch the light.",
    howToSpot: "Look for glittering crystals in cold clear air while protecting yourself from the cold.",
    dangerLevel: 1,
    whereToSee: "Polar and alpine areas and cold continental interiors.",
    bestSeason: "Cold periods; local temperature and moisture matter more than a fixed month.",
    sources: [
      {
        label: "WMO — Diamond dust",
        url: "https://cloudatlas.wmo.int/en/diamond-dust.html"
      },
      {
        label: "WMO — Ice fog",
        url: "https://cloudatlas.wmo.int/en/ice-fog.html"
      }
    ]
  },
  {
    id: "haboob",
    name: "Haboob",
    category: "Desert Weather",
    rarity: "Uncommon",
    description: "An advancing wall of dust raised by thunderstorm outflow winds.",
    facts: [
      "Visibility can fall sharply as the dust arrives.",
      "Blowing dust makes roads hazardous.",
      "Haboobs occur especially in dry regions with loose surface material."
    ],
    emoji: "🏜",
    bitFact: "A moving dust-wall background that signals a hazardous scene.",
    scientificMechanism: "Air descending from a thunderstorm spreads across the ground and lifts dust into the advancing outflow.",
    howToSpot: "An approaching dust wall is a reason to avoid travel into it. Follow NWS dust-storm driving guidance; never stop in a traffic lane.",
    dangerLevel: 3,
    whereToSee: "Dry regions, including the US Southwest.",
    bestSeason: "Periods when thunderstorms occur over dry, dusty ground.",
    sources: [
      {
        label: "NWS — Dust storms, haboobs and driving safety",
        url: "https://www.weather.gov/safety/wind-dust-storm"
      }
    ]
  },
  {
    id: "heat-burst",
    name: "Heat Burst",
    category: "Wind",
    rarity: "Rare",
    description: "A sudden rise in temperature with drying and gusty winds near a weakening shower or thunderstorm.",
    facts: [
      "Heat bursts often occur at night.",
      "A falling dew point can accompany the temperature jump.",
      "Not every weakening storm produces one."
    ],
    emoji: "🥵",
    bitFact: "A late wind-and-heat effect as the storm scene fades.",
    scientificMechanism: "Evaporation initially cools descending air and helps it accelerate. Once precipitation evaporates, compression can warm the still-descending air enough to reach the surface hotter and drier.",
    howToSpot: "Weather-station records may show temperature rising while dew point falls and winds increase. Remain sheltered during strong gusts.",
    dangerLevel: 3,
    whereToSee: "Environments with dry air aloft and a shallow cooler surface layer.",
    bestSeason: "When suitable showers and temperature layers coincide, often during the warm season.",
    sources: [
      {
        label: "NWS — Heat bursts",
        url: "https://www.weather.gov/abq/localfeatureheatburst"
      }
    ]
  }
]
