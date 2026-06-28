import { TOPIC_SLUGS, type TopicSlug } from './topics';

export type ImageLicense = 'PD-USGov' | 'PD' | 'CC0' | 'CC-BY-4.0';

/**
 * Image classification — used by the generator prompt and the hero-image
 * picker to avoid presenting historical imagery as if it depicts this
 * week's events.
 *   - 'live':     real-time data product (GOES latest, SWPC current Kp, SDO live).
 *                 Safe to caption as current.
 *   - 'archival': dated photograph of a historical event. The prompt MUST
 *                 frame these as illustrative; the hero picker skips them
 *                 in favor of live imagery when available.
 *   - 'reference': diagram/schematic with no time semantics (jet stream
 *                  diagram, mesocyclone schematic). Always safe.
 * Entries without `kind` default to 'reference'.
 */
export type ImageKind = 'live' | 'archival' | 'reference';

export interface ImageEntry {
  id: string;
  url: string;
  caption: string;
  credit: string;
  topic_tags: TopicSlug[];
  license: ImageLicense;
  kind?: ImageKind;
  archival_year?: number;
}

export interface ImageAuditEntry {
  id: string;
  caption: string;
  topic_tags: TopicSlug[];
  anchor: string;
  lane: string;
}

/**
 * Curated catalog of public-domain weather and earth-science imagery.
 * Sourced from NOAA, NASA, USGS, and Wikimedia Commons (PD/CC0 only).
 *
 * Validation: run `npm run validate:images` to HEAD-check every URL.
 * Any non-200 entry should be replaced, not silently ignored.
 *
 * Distribution: every topic has at least 3 entries. Some entries are
 * tagged with multiple topics where the imagery applies cross-domain
 * (e.g. a sea-ice photo covers both `cryosphere` and `paleoclimate`).
 */
export const IMAGES: ImageEntry[] = [
  // ============================================================
  // volcanoes
  // ============================================================
  {
    id: 'st-helens-eruption-1980',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/MSH80_eruption_mount_st_helens_05-18-80.jpg?width=1280',
    caption: 'Mount St. Helens lateral blast and ash column, May 18, 1980.',
    credit: 'Austin Post / USGS',
    topic_tags: ['volcanoes', 'historical_events'],
    license: 'PD-USGov',
    kind: 'archival',
    archival_year: 1980,
  },
  {
    id: 'pinatubo-eruption-1991',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pinatubo91eruption_clark_air_base.jpg?width=1280',
    caption: 'Mount Pinatubo eruption column from Clark Air Base, June 1991.',
    credit: 'USGS',
    topic_tags: ['volcanoes', 'historical_events'],
    license: 'PD-USGov',
    kind: 'archival',
    archival_year: 1991,
  },
  {
    id: 'eyjafjallajokull-2010',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Eyjafjallajokull_volcano_plume_2010_04_18.JPG?width=1280',
    caption: 'Eyjafjallajökull ash plume drifting over the North Atlantic, April 2010.',
    credit: 'NASA Earth Observatory',
    topic_tags: ['volcanoes', 'aviation'],
    license: 'PD-USGov',
    kind: 'archival',
    archival_year: 2010,
  },

  // ============================================================
  // ocean_currents
  // ============================================================
  {
    id: 'enso-sst-anomaly',
    url: 'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/figure01.gif',
    caption: 'NOAA Climate Prediction Center sea surface temperature anomaly map.',
    credit: 'NOAA CPC',
    topic_tags: ['ocean_currents', 'tropical'],
    license: 'PD-USGov',
  },
  {
    id: 'gulf-stream-sst',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Golfstream.jpg?width=1280',
    caption: 'Gulf Stream visualized in sea surface temperature data.',
    credit: 'NASA',
    topic_tags: ['ocean_currents'],
    license: 'PD-USGov',
  },
  {
    id: 'thermohaline-circulation',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Thermohaline_circulation.svg?width=1280',
    caption: 'Global thermohaline circulation schematic.',
    credit: 'NASA / Wikimedia Commons',
    topic_tags: ['ocean_currents', 'cryosphere'],
    license: 'PD-USGov',
  },
  {
    id: 'el-nino-comparison',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Enso_normal.png?width=1280',
    caption: 'Pacific equatorial conditions during ENSO neutral phase.',
    credit: 'NOAA',
    topic_tags: ['ocean_currents', 'tropical'],
    license: 'PD-USGov',
  },

  // ============================================================
  // cryosphere
  // ============================================================
  {
    id: 'arctic-sea-ice-extent',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Arctic_sea_ice_loss_animation.gif?width=1280',
    caption: 'Arctic sea ice extent decline visualized from satellite records.',
    credit: 'NASA Goddard',
    topic_tags: ['cryosphere', 'paleoclimate'],
    license: 'PD-USGov',
  },
  {
    id: 'greenland-ice-sheet',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Greenland_ice_sheet_AMSL_thickness_map-en.png?width=1280',
    caption: 'Greenland ice sheet thickness map.',
    credit: 'NASA / NOAA',
    topic_tags: ['cryosphere', 'paleoclimate'],
    license: 'PD-USGov',
  },
  {
    id: 'antarctic-ice-shelf',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Larsen_B_Collapse.jpg?width=1280',
    caption: 'Larsen B Ice Shelf collapse imaged by NASA MODIS, 2002.',
    kind: 'archival',
    archival_year: 2002,
    credit: 'NASA',
    topic_tags: ['cryosphere'],
    license: 'PD-USGov',
  },

  // ============================================================
  // severe_storms
  // ============================================================
  {
    id: 'lightning-noaa',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Lightning_NOAA.jpg?width=1280',
    caption: 'Cloud-to-ground lightning strike captured by NOAA.',
    credit: 'NOAA',
    topic_tags: ['severe_storms'],
    license: 'PD-USGov',
  },
  {
    id: 'lightning-pritzerbe',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Lightning_Pritzerbe_01_%28MK%29.jpg?width=1280',
    caption: 'Cloud-to-ground lightning over Pritzerbe, Germany.',
    credit: 'M. Klüver / Wikimedia',
    topic_tags: ['severe_storms'],
    license: 'CC0',
  },
  {
    id: 'wall-cloud-lightning',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Wall_cloud_with_lightning_-_NOAA.jpg?width=1280',
    caption: 'Supercell wall cloud illuminated by lightning.',
    credit: 'NOAA',
    topic_tags: ['severe_storms'],
    license: 'PD-USGov',
  },
  {
    id: 'chaparral-supercell',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Chaparral_Supercell_2.JPG?width=1280',
    caption: 'Classic supercell thunderstorm over Chaparral, New Mexico.',
    credit: 'Greg Lundeen / NOAA',
    topic_tags: ['severe_storms'],
    license: 'PD-USGov',
  },
  {
    id: 'anvil-cumulonimbus',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Anvil_shaped_cumulus_panorama_edit_crop.jpg?width=1280',
    caption: 'Anvil-shaped cumulonimbus thunderstorm.',
    credit: 'Wikimedia Commons',
    topic_tags: ['severe_storms', 'aviation'],
    license: 'CC0',
  },
  {
    id: 'f5-tornado-elie',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/F5_tornado_Elie_Manitoba_2007.jpg?width=1280',
    caption: 'F5 tornado near Elie, Manitoba (2007) — only F5 ever recorded in Canada.',
    credit: 'Justin Hobson / Wikimedia',
    topic_tags: ['severe_storms', 'historical_events'],
    license: 'CC0',
    kind: 'archival',
    archival_year: 2007,
  },
  {
    id: 'binger-tornado',
    url: 'https://www.spc.noaa.gov/faq/tornado/binger.jpg',
    caption: 'Wedge tornado near Binger, Oklahoma (1981).',
    credit: 'NOAA NSSL archive',
    topic_tags: ['severe_storms'],
    license: 'PD-USGov',
    kind: 'archival',
    archival_year: 1981,
  },
  {
    id: 'mesocyclone-diagram',
    url: 'https://www.spc.noaa.gov/faq/tornado/mesof.gif',
    caption: 'Schematic of mesocyclone structure within a supercell.',
    credit: 'NOAA SPC',
    topic_tags: ['severe_storms'],
    license: 'PD-USGov',
  },

  // ============================================================
  // earthquakes
  // ============================================================
  {
    id: 'fault-types-usgs',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Fault_types.svg?width=1280',
    caption: 'USGS diagram of normal, reverse, and strike-slip fault motion.',
    credit: 'USGS',
    topic_tags: ['earthquakes'],
    license: 'PD-USGov',
  },
  {
    id: 'earthquake-wave-paths',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Earthquake_wave_paths.svg?width=1280',
    caption: 'Seismic wave paths through Earth after an earthquake.',
    credit: 'USGS / Wikimedia Commons',
    topic_tags: ['earthquakes', 'atmosphere_layers'],
    license: 'PD',
  },
  {
    id: 'pacific-ring-of-fire',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pacific_Ring_of_Fire.svg?width=1280',
    caption: 'Pacific Ring of Fire — major volcanic and earthquake belt around the Pacific basin.',
    credit: 'Wikimedia Commons',
    topic_tags: ['earthquakes', 'volcanoes'],
    license: 'PD',
  },

  // ============================================================
  // tropical
  // ============================================================
  {
    id: 'hurricane-katrina-2005',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Hurricane_Katrina_August_28_2005_NASA.jpg?width=1280',
    caption: 'Hurricane Katrina at peak intensity, August 28, 2005.',
    credit: 'NASA',
    topic_tags: ['tropical', 'historical_events'],
    license: 'PD-USGov',
    kind: 'archival',
    archival_year: 2005,
  },
  {
    id: 'hurricane-eye-from-space',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Hurricane_Isabel_from_ISS.jpg?width=1280',
    caption: 'Hurricane Isabel eye photographed from the International Space Station.',
    credit: 'NASA',
    topic_tags: ['tropical'],
    license: 'PD-USGov',
  },
  {
    id: 'goes-conus-geocolor',
    url: 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS/GEOCOLOR/1250x750.jpg',
    caption: 'Latest GOES-16 GeoColor view of the contiguous US.',
    credit: 'NOAA NESDIS',
    topic_tags: ['tropical', 'severe_storms'],
    license: 'PD-USGov',
    kind: 'live',
  },
  {
    id: 'goes-conus-infrared',
    url: 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS/13/1250x750.jpg',
    caption: 'Latest GOES-16 longwave infrared view of CONUS.',
    credit: 'NOAA NESDIS',
    topic_tags: ['tropical', 'severe_storms'],
    license: 'PD-USGov',
    kind: 'live',
  },

  // ============================================================
  // atmosphere_layers
  // ============================================================
  {
    id: 'atmosphere-layers-diagram',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Atmosphere_layers-en.svg?width=1280',
    caption: 'Vertical structure of Earth\'s atmosphere.',
    credit: 'Kelvinsong / Wikimedia',
    topic_tags: ['atmosphere_layers'],
    license: 'CC0',
  },
  {
    id: 'jet-stream-pattern',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jetstreamconfig.jpg?width=1280',
    caption: 'Polar and subtropical jet stream configuration.',
    credit: 'NOAA',
    topic_tags: ['atmosphere_layers', 'aviation'],
    license: 'PD-USGov',
  },

  // ============================================================
  // space_weather
  // ============================================================
  {
    id: 'aurora-borealis-classic',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Northern_Lights_02.jpg?width=1280',
    caption: 'Aurora borealis curtain over a snow-covered landscape.',
    credit: 'United States Air Force',
    topic_tags: ['space_weather'],
    license: 'PD-USGov',
  },
  {
    id: 'aurora-from-iss',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Aurora_Borealis_and_Australis_Poster.jpg?width=1280',
    caption: 'Aurora borealis and australis composite from the ISS.',
    credit: 'NASA',
    topic_tags: ['space_weather'],
    license: 'PD-USGov',
  },
  {
    id: 'aurora-forecast-northern',
    url: 'https://services.swpc.noaa.gov/images/aurora-forecast-northern-hemisphere.jpg',
    caption: 'Latest NOAA SWPC aurora forecast for the northern hemisphere.',
    credit: 'NOAA SWPC',
    topic_tags: ['space_weather'],
    license: 'PD-USGov',
    kind: 'live',
  },
  {
    id: 'solar-limb-flare',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/171879main_LimbFlareJan12_lg.jpg?width=1280',
    caption: 'Solar limb flare imaged by NASA TRACE (2007).',
    credit: 'NASA TRACE archive',
    topic_tags: ['space_weather'],
    license: 'PD-USGov',
    kind: 'archival',
    archival_year: 2007,
  },
  {
    id: 'sdo-current-193',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0193.jpg',
    caption: 'Current Sun in 193 Å — outer corona, ~1 million K plasma.',
    credit: 'NASA SDO',
    topic_tags: ['space_weather'],
    license: 'PD-USGov',
    kind: 'live',
  },
  {
    id: 'sdo-current-171',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0171.jpg',
    caption: 'Current Sun in 171 Å — quiet corona, ~600,000 K plasma.',
    credit: 'NASA SDO',
    topic_tags: ['space_weather'],
    license: 'PD-USGov',
    kind: 'live',
  },
  {
    id: 'sdo-current-304',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0304.jpg',
    caption: 'Current Sun in 304 Å — chromosphere and transition region.',
    credit: 'NASA SDO',
    topic_tags: ['space_weather'],
    license: 'PD-USGov',
    kind: 'live',
  },

  // ============================================================
  // historical_events
  // ============================================================
  {
    id: 'dust-bowl-storm',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Dust-storm-Texas-1935.png?width=1280',
    caption: 'Dust storm approaches Stratford, Texas, April 1935.',
    kind: 'archival',
    archival_year: 1935,
    credit: 'NOAA George E. Marsh Album / PD',
    topic_tags: ['historical_events', 'agricultural'],
    license: 'PD-USGov',
  },
  {
    id: 'tambora-caldera',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Caldera_Mt_Tambora_Sumbawa_Indonesia.jpg?width=1280',
    caption: 'Mount Tambora caldera — site of the 1815 eruption that triggered the Year Without a Summer.',
    kind: 'archival',
    archival_year: 1815,
    credit: 'NASA',
    topic_tags: ['historical_events', 'volcanoes', 'paleoclimate'],
    license: 'PD-USGov',
  },

  // ============================================================
  // biometeorology
  // ============================================================
  {
    id: 'pollen-grains-sem',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Misc_pollen.jpg?width=1280',
    caption: 'Diverse pollen grains imaged by scanning electron microscopy.',
    credit: 'Dartmouth Electron Microscope Facility / PD',
    topic_tags: ['biometeorology'],
    license: 'PD',
  },

  // ============================================================
  // urban_climate
  // ============================================================
  {
    id: 'urban-heat-island-thermal',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Urban_heat_island_%28Celsius%29.png?width=1280',
    caption: 'Urban heat island temperature profile across rural-suburban-urban gradient.',
    credit: 'EPA / Wikimedia',
    topic_tags: ['urban_climate'],
    license: 'PD-USGov',
  },

  // ============================================================
  // aviation
  // ============================================================
  {
    id: 'contrails-over-land',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Contrails.jpg?width=1280',
    caption: 'Persistent contrail cluster over a major flight corridor.',
    credit: 'NASA',
    topic_tags: ['aviation', 'urban_climate'],
    license: 'PD-USGov',
  },

  // ============================================================
  // marine
  // ============================================================
  {
    id: 'wave-breaking',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Big_wave_breaking_in_Santa_Cruz.jpg?width=1280',
    caption: 'Large breaking wave at Santa Cruz, California.',
    credit: 'NOAA / Wikimedia',
    topic_tags: ['marine'],
    license: 'CC0',
  },

  // ============================================================
  // agricultural
  // ============================================================
  {
    id: 'drought-cracked-soil',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Drought.jpg?width=1280',
    caption: 'Cracked soil from prolonged drought.',
    credit: 'USDA NRCS',
    topic_tags: ['agricultural', 'historical_events'],
    license: 'PD-USGov',
  },

  // ============================================================
  // paleoclimate
  // ============================================================
  {
    id: 'tree-ring-cross-section',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Tree_rings.jpg?width=1280',
    caption: 'Tree ring cross section — each ring records one growing season\'s conditions.',
    credit: 'USFS / Wikimedia',
    topic_tags: ['paleoclimate'],
    license: 'PD-USGov',
  },

  // ============================================================
  // tech_and_models
  // ============================================================
  {
    id: 'supercomputer-rack',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Cray-1-deutsches-museum.jpg?width=1280',
    caption: 'Cray-1 supercomputer — early generation of weather modeling hardware.',
    credit: 'Wikimedia Commons',
    topic_tags: ['tech_and_models', 'historical_events'],
    license: 'CC-BY-4.0',
  },

  // ============================================================
  // Operational live products — fill thin topics
  // (NOAA NESDIS, NWS, SWPC, NCEP — all PD-USGov, stable URLs)
  // ============================================================
  {
    id: 'goes16-water-vapor',
    url: 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS/09/1250x750.jpg',
    caption: 'GOES-16 mid-level water vapor — visualizes upper-tropospheric moisture and jet stream flow.',
    credit: 'NOAA NESDIS',
    topic_tags: ['atmosphere_layers', 'tropical', 'tech_and_models'],
    license: 'PD-USGov',
    kind: 'live',
  },
  {
    id: 'goes16-visible-conus',
    url: 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS/02/1250x750.jpg',
    caption: 'GOES-16 visible-band view of the contiguous US.',
    credit: 'NOAA NESDIS',
    topic_tags: ['severe_storms', 'tech_and_models'],
    license: 'PD-USGov',
    kind: 'live',
  },
  {
    id: 'goes16-full-disk-geocolor',
    url: 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/FD/GEOCOLOR/678x678.jpg',
    caption: 'GOES-16 full-disk GeoColor view of the western hemisphere.',
    credit: 'NOAA NESDIS',
    topic_tags: ['marine', 'tropical', 'tech_and_models'],
    license: 'PD-USGov',
    kind: 'live',
  },
  {
    id: 'swpc-space-weather-overview',
    url: 'https://services.swpc.noaa.gov/images/swx-overview-large.gif',
    caption: 'NOAA SWPC space-weather overview — real-time Kp, X-ray flux, and proton flux.',
    credit: 'NOAA SWPC',
    topic_tags: ['space_weather', 'tech_and_models'],
    license: 'PD-USGov',
    kind: 'live',
  },
  {
    id: 'swpc-ovation-aurora',
    url: 'https://services.swpc.noaa.gov/images/animations/ovation/north/latest.jpg',
    caption: 'OVATION model aurora forecast for the northern hemisphere.',
    credit: 'NOAA SWPC',
    topic_tags: ['space_weather', 'atmosphere_layers'],
    license: 'PD-USGov',
    kind: 'live',
  },
  {
    id: 'opc-atlantic-surface',
    url: 'https://ocean.weather.gov/A_sfc_full_ocean.gif',
    caption: 'NOAA Ocean Prediction Center Atlantic surface analysis.',
    credit: 'NOAA OPC',
    topic_tags: ['marine', 'tropical', 'tech_and_models'],
    license: 'PD-USGov',
    kind: 'live',
  },
  {
    id: 'opc-pacific-surface',
    url: 'https://ocean.weather.gov/P_sfc_full_ocean.gif',
    caption: 'NOAA Ocean Prediction Center Pacific surface analysis.',
    credit: 'NOAA OPC',
    topic_tags: ['marine', 'tropical'],
    license: 'PD-USGov',
    kind: 'live',
  },
  {
    id: 'us-drought-monitor',
    url: 'https://droughtmonitor.unl.edu/data/png/current/current_usdm.png',
    caption: 'Current US Drought Monitor — composite drought severity by county.',
    credit: 'USDA / NDMC',
    topic_tags: ['agricultural', 'historical_events'],
    license: 'PD-USGov',
    kind: 'live',
  },
  {
    id: 'cpc-precip-outlook',
    url: 'https://www.cpc.ncep.noaa.gov/products/predictions/long_range/lead01/off01_prcp.gif',
    caption: 'NOAA CPC monthly precipitation outlook — probabilistic anomalies.',
    credit: 'NOAA CPC',
    topic_tags: ['agricultural', 'tech_and_models', 'ocean_currents', 'biometeorology'],
    license: 'PD-USGov',
    kind: 'live',
  },
  {
    id: 'cpc-temp-outlook',
    url: 'https://www.cpc.ncep.noaa.gov/products/predictions/long_range/lead01/off01_temp.gif',
    caption: 'NOAA CPC monthly temperature outlook — probabilistic anomalies.',
    credit: 'NOAA CPC',
    topic_tags: ['biometeorology', 'urban_climate', 'tech_and_models'],
    license: 'PD-USGov',
    kind: 'live',
  },
  {
    id: 'sdo-current-hmi-magnetogram',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_HMIB.jpg',
    caption: 'SDO HMI magnetogram — current solar magnetic field strength and polarity.',
    credit: 'NASA SDO',
    topic_tags: ['space_weather', 'tech_and_models'],
    license: 'PD-USGov',
    kind: 'live',
  },

  // ============================================================
  // Catalog expansion (2026-06) — deepen the thin Sunday lanes
  // (earthquakes, forecast/atmosphere, severe/winter/flood, tropical)
  // so content-matched selection always has an on-topic option.
  // Every URL HTTP-validated (200/206) before commit.
  // ============================================================

  // --- earthquakes ---
  {
    id: 'san-francisco-earthquake-1906',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sanfranciscoearthquake1906.jpg?width=1280',
    caption: 'Smoldering ruins along Market Street in San Francisco after the April 18, 1906 earthquake and fire.',
    credit: 'U.S. National Archives (ARC 531006)',
    topic_tags: ['earthquakes', 'historical_events'],
    license: 'PD',
    kind: 'archival',
    archival_year: 1906,
  },
  {
    id: 'alaska-earthquake-1964-fourth-ave',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/AlaskaQuake-FourthAve.jpg?width=1280',
    caption: 'Graben subsidence collapsing Fourth Avenue in downtown Anchorage during the 1964 Great Alaska earthquake.',
    credit: 'U.S. Army / USGS',
    topic_tags: ['earthquakes', 'historical_events'],
    license: 'PD-USGov',
    kind: 'archival',
    archival_year: 1964,
  },
  {
    id: 'tohoku-tsunami-otsuchi-2011',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/US_Navy_110315-N-5503T-307_An_aerial_view_of_damage_to_Otsuchi,_Japan,_after_a_9.0_magnitude_earthquake_and_subsequent_tsunami_devastated_the_area_in_northern_Japan.jpg?width=1280',
    caption: 'Aerial view of Otsuchi, Japan, devastated by the tsunami from the magnitude 9.0 Tōhoku earthquake, March 11, 2011.',
    credit: 'U.S. Navy / MC3 Alexander Tidd',
    topic_tags: ['earthquakes', 'marine', 'historical_events'],
    license: 'PD-USGov',
    kind: 'archival',
    archival_year: 2011,
  },
  {
    id: 'global-quake-epicenters-1963-98',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Quake_epicenters_1963-98.png?width=1280',
    caption: 'Global map of earthquake epicenters from 1963 to 1998, tracing the world\'s tectonic plate boundaries.',
    credit: 'NASA DTAM project team',
    topic_tags: ['earthquakes', 'tech_and_models'],
    license: 'PD-USGov',
    kind: 'reference',
  },
  {
    id: 'tectonic-plate-boundaries-map',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Tectonic_plate_boundaries_clean.png?width=1280',
    caption: 'Map of Earth\'s major tectonic plate boundaries — the source regions for most of the world\'s earthquakes.',
    credit: 'USGS',
    topic_tags: ['earthquakes', 'tech_and_models'],
    license: 'PD-USGov',
    kind: 'reference',
  },
  {
    id: 'sumatra-moment-tensor-2004',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/USGS_sumatra_mts.gif?width=1280',
    caption: 'USGS moment tensor (beachball) solution for the magnitude 9.1 2004 Sumatra-Andaman earthquake.',
    credit: 'USGS National Earthquake Information Center',
    topic_tags: ['earthquakes', 'tech_and_models'],
    license: 'PD-USGov',
    kind: 'reference',
  },

  // --- forecast / atmospheric structure ---
  {
    id: 'wpc-surface-analysis-fronts',
    url: 'https://www.wpc.ncep.noaa.gov/noaa/noaad1.gif',
    caption: 'Latest NWS/WPC US surface analysis showing fronts, pressure centers, and isobars.',
    credit: 'NOAA/NWS Weather Prediction Center',
    topic_tags: ['atmosphere_layers', 'tech_and_models'],
    license: 'PD-USGov',
    kind: 'live',
  },
  {
    id: 'wpc-day1-qpf',
    url: 'https://www.wpc.ncep.noaa.gov/qpf/94qwbg.gif',
    caption: 'NWS/WPC Day 1 Quantitative Precipitation Forecast — expected accumulated rainfall across the contiguous US.',
    credit: 'NOAA/NWS Weather Prediction Center',
    topic_tags: ['atmosphere_layers', 'tech_and_models'],
    license: 'PD-USGov',
    kind: 'live',
  },
  {
    id: 'goes19-fulldisk-water-vapor',
    url: 'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/09/1808x1808.jpg',
    caption: 'GOES-19 (GOES-East) full-disk mid-level water vapor imagery revealing moisture transport and upper-level flow.',
    credit: 'NOAA NESDIS / STAR',
    topic_tags: ['atmosphere_layers', 'tech_and_models'],
    license: 'PD-USGov',
    kind: 'live',
  },
  {
    id: 'goes19-fulldisk-airmass-rgb',
    url: 'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/AirMass/1808x1808.jpg',
    caption: 'GOES-19 (GOES-East) full-disk Air Mass RGB distinguishing warm, cold, dry, and stratospheric air and jet-stream structure.',
    credit: 'NOAA NESDIS / STAR',
    topic_tags: ['atmosphere_layers', 'tech_and_models'],
    license: 'PD-USGov',
    kind: 'live',
  },
  {
    id: 'nws-conus-radar-mosaic',
    url: 'https://radar.weather.gov/ridge/standard/CONUS_0.gif',
    caption: 'Latest NWS national base reflectivity radar mosaic across the contiguous US.',
    credit: 'NOAA/NWS',
    topic_tags: ['atmosphere_layers', 'severe_storms'],
    license: 'PD-USGov',
    kind: 'live',
  },

  // --- severe / winter / flooding ---
  {
    id: 'vivian-sd-record-hailstone-2010',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Record%20hailstone%20Vivian,%20SD.jpg?width=1280',
    caption: 'The record 7.9-inch hailstone that fell in Vivian, South Dakota on July 23, 2010 — the largest U.S. hailstone on record.',
    credit: 'NWS Aberdeen, SD / NOAA',
    topic_tags: ['severe_storms', 'historical_events'],
    license: 'PD-USGov',
    kind: 'archival',
    archival_year: 2010,
  },
  {
    id: 'derecho-damage-wakarusa-indiana-2020',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/2020aug-derecho-damage-Wakarusa-Indiana.jpg?width=1280',
    caption: 'Farm buildings destroyed near Wakarusa, Indiana during the August 10, 2020 Midwest derecho.',
    credit: 'NWS Northern Indiana (IWX) storm survey / NOAA',
    topic_tags: ['severe_storms', 'historical_events'],
    license: 'PD-USGov',
    kind: 'archival',
    archival_year: 2020,
  },
  {
    id: 'storm-of-the-century-1993-goes7',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Storm%20of%20the%20Century%201993-03-13%201431Z.jpg?width=1280',
    caption: 'GOES-7 view of the March 1993 Storm of the Century over the eastern US — one of the most intense winter cyclones on record.',
    credit: 'NOAA (GOES-7) / NASA',
    topic_tags: ['atmosphere_layers', 'historical_events'],
    license: 'PD-USGov',
    kind: 'archival',
    archival_year: 1993,
  },
  {
    id: 'north-american-ice-storm-1998-goes8',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/1998%20Ice%20Storm%20GOES8-ir-1998-01-09-0015TU.png?width=1280',
    caption: 'GOES-8 infrared image from January 9, 1998 showing the cloud shield of the catastrophic North American Ice Storm of 1998.',
    credit: 'NOAA National Climatic Data Center',
    topic_tags: ['severe_storms', 'historical_events'],
    license: 'PD-USGov',
    kind: 'archival',
    archival_year: 1998,
  },
  {
    id: 'mississippi-river-flooding-modis-2019',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Flooding%20on%20the%20Mississippi%20River%20(MODIS%202019-01-29).jpg?width=1280',
    caption: 'NASA Terra/MODIS false-color image of the lower Mississippi River swollen above flood stage, January 2019.',
    credit: 'MODIS Land Rapid Response Team, NASA GSFC',
    topic_tags: ['severe_storms', 'historical_events'],
    license: 'PD-USGov',
    kind: 'archival',
    archival_year: 2019,
  },

  // --- tropical (in-season; also feeds Wednesday tropical topic) ---
  {
    id: 'nhc-atlantic-tropical-outlook',
    url: 'https://www.nhc.noaa.gov/xgtwo/two_atl_7d0.png',
    caption: 'National Hurricane Center 7-day Tropical Weather Outlook for the Atlantic basin.',
    credit: 'NOAA / National Hurricane Center',
    topic_tags: ['tropical', 'marine'],
    license: 'PD-USGov',
    kind: 'live',
  },
  {
    id: 'nhc-epacific-tropical-outlook',
    url: 'https://www.nhc.noaa.gov/xgtwo/two_pac_7d0.png',
    caption: 'National Hurricane Center 7-day Tropical Weather Outlook for the eastern Pacific basin.',
    credit: 'NOAA / National Hurricane Center',
    topic_tags: ['tropical', 'marine'],
    license: 'PD-USGov',
    kind: 'live',
  },
  {
    id: 'goes-tropical-atlantic-geocolor',
    url: 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/GEOCOLOR/1800x1080.jpg',
    caption: 'Latest GOES-East GeoColor view of the Tropical Atlantic — the Caribbean and the hurricane main development region.',
    credit: 'NOAA NESDIS / STAR',
    topic_tags: ['tropical', 'severe_storms'],
    license: 'PD-USGov',
    kind: 'live',
  },
  {
    id: 'nhc-tafb-surface-analysis',
    url: 'https://www.nhc.noaa.gov/tafb_latest/USA_latest.gif',
    caption: 'NOAA Tropical Analysis and Forecast Branch unified Atlantic surface analysis — tropical waves, fronts, and pressure systems.',
    credit: 'NOAA / NHC Tropical Analysis and Forecast Branch',
    topic_tags: ['tropical', 'marine'],
    license: 'PD-USGov',
    kind: 'live',
  },
];

const TOPIC_NEIGHBORS: Record<TopicSlug, TopicSlug[]> = {
  volcanoes: ['atmosphere_layers', 'historical_events', 'paleoclimate'],
  ocean_currents: ['cryosphere', 'tropical', 'paleoclimate'],
  cryosphere: ['ocean_currents', 'paleoclimate'],
  severe_storms: ['tropical', 'aviation'],
  earthquakes: ['volcanoes', 'historical_events'],
  tropical: ['severe_storms', 'ocean_currents', 'marine'],
  atmosphere_layers: ['aviation', 'space_weather', 'tech_and_models'],
  space_weather: ['atmosphere_layers'],
  historical_events: ['severe_storms', 'tropical', 'volcanoes', 'agricultural'],
  biometeorology: ['agricultural', 'urban_climate'],
  // Urban climate imagery should stay built-environment focused. Pulling
  // biometeorology/marine neighbors produced pollen and surf photos in a
  // Chicago heat-island post, which is technically weather-adjacent but
  // visually misleading.
  urban_climate: [],
  aviation: ['severe_storms', 'atmosphere_layers'],
  marine: ['tropical', 'urban_climate'],
  agricultural: ['historical_events', 'biometeorology'],
  paleoclimate: ['cryosphere', 'ocean_currents', 'volcanoes'],
  tech_and_models: ['atmosphere_layers', 'tropical'],
};

export interface SelectImagesOptions {
  topic: TopicSlug;
  count: number;
  excludeIds: Set<string>;
  allowPartial?: boolean;
  rng?: () => number;
}

/**
 * Select N distinct images for a given topic. Drops anything in
 * `excludeIds` (the 8-week reuse window) and falls back to topic-adjacent
 * tags if the primary topic pool is too thin after exclusions.
 *
 * Throws if the catalog cannot satisfy the request even after fallback unless
 * `allowPartial` is set. Sunday uses partial results so a starved but relevant
 * lane still contributes one good image instead of being skipped entirely.
 */
export function selectImages(opts: SelectImagesOptions): ImageEntry[] {
  const { topic, count, excludeIds, allowPartial = false, rng = Math.random } = opts;
  const picked: ImageEntry[] = [];
  const usedIds = new Set<string>();

  const primary = IMAGES.filter(
    (img) => img.topic_tags.includes(topic) && !excludeIds.has(img.id),
  );
  pickFrom(primary, count, picked, usedIds, rng);

  if (picked.length < count) {
    const neighbors = TOPIC_NEIGHBORS[topic] ?? [];
    const fallback = IMAGES.filter(
      (img) =>
        !usedIds.has(img.id) &&
        !excludeIds.has(img.id) &&
        img.topic_tags.some((t) => neighbors.includes(t)),
    );
    pickFrom(fallback, count, picked, usedIds, rng);
  }

  if (picked.length < count && !allowPartial) {
    throw new Error(
      `image catalog could not satisfy ${count} entries for topic "${topic}" (got ${picked.length}). The 8-week reuse window may have starved the pool — expand the catalog or shorten the window.`,
    );
  }
  return picked;
}

function pickFrom(
  pool: ImageEntry[],
  target: number,
  picked: ImageEntry[],
  usedIds: Set<string>,
  rng: () => number,
): void {
  const shuffled = [...pool].sort(() => rng() - 0.5);
  for (const img of shuffled) {
    if (picked.length >= target) return;
    if (usedIds.has(img.id)) continue;
    picked.push(img);
    usedIds.add(img.id);
  }
}

/**
 * Returns the set of topic slugs that are "live" given the week's actual
 * data. Used by Sunday image selection so we don't drop Hurricane Katrina
 * into a post about late-April Plains tornadoes (it has happened).
 *
 * Only broad forecast-analysis topics stay on by default. Event-driven topics
 * must have a real signal so Sunday posts do not pull solar, drought, or
 * tropical imagery for a tornado/earthquake lead.
 */
export interface ActivityIndicators {
  severeReportCount: number;
  maxKpPastWeek: number;
  notableFlareCount: number;
  significantQuakeCount: number;
  /** Caller can pass a date override for tests. Defaults to now. */
  now?: Date;
}

export function getActiveTopics(indicators: ActivityIndicators): Set<TopicSlug> {
  const now = indicators.now ?? new Date();
  const month = now.getUTCMonth() + 1; // 1-12
  // Atlantic hurricane season is June 1 – November 30. Eastern Pacific is
  // similar. Outside this window, only allow tropical imagery if there is
  // an explicit signal — and we currently don't pull NHC active basins,
  // so for v1 we simply gate by season.
  const inHurricaneSeason = month >= 6 && month <= 11;

  const active = new Set<TopicSlug>();
  // Always-on forecast-analysis imagery.
  for (const slug of [
    'atmosphere_layers',
    'tech_and_models',
  ] as TopicSlug[]) {
    active.add(slug);
  }
  if (indicators.severeReportCount > 0) active.add('severe_storms');
  if (indicators.significantQuakeCount > 0) active.add('earthquakes');
  if (indicators.maxKpPastWeek >= 4 || indicators.notableFlareCount > 0) {
    active.add('space_weather');
  }
  if (inHurricaneSeason) active.add('tropical');
  return active;
}

export function countImagesByTopic(): Record<TopicSlug, number> {
  const counts = Object.fromEntries(TOPIC_SLUGS.map((s) => [s, 0])) as Record<TopicSlug, number>;
  for (const img of IMAGES) {
    for (const tag of img.topic_tags) {
      if (tag in counts) counts[tag] += 1;
    }
  }
  return counts;
}
