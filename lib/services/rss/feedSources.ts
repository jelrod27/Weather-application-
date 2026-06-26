/**
 * 16-Bit Weather Platform - RSS Feed Sources Configuration
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 */

export type FeedCategory =
  | 'earthquakes'
  | 'volcanoes'
  | 'space'
  | 'climate'
  | 'severe'
  | 'science'
  | 'hurricanes';

export interface FeedSource {
  id: string;
  name: string;
  url: string;
  category: FeedCategory;
  priority: 'high' | 'medium' | 'low';
  enabled: boolean;
  format: 'rss' | 'atom' | 'json';
  refreshInterval: number; // minutes
}

export const FEED_SOURCES: FeedSource[] = [
  // Earthquakes
  {
    id: 'usgs-significant',
    name: 'USGS Significant Earthquakes',
    url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.atom',
    category: 'earthquakes',
    priority: 'high',
    enabled: true,
    format: 'atom',
    refreshInterval: 360, // 6 hours = 2x daily
  },
  {
    id: 'usgs-m45',
    name: 'USGS M4.5+ Earthquakes',
    url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.atom',
    category: 'earthquakes',
    priority: 'medium',
    enabled: true,
    format: 'atom',
    refreshInterval: 360, // 6 hours = 2x daily
  },
  {
    id: 'usgs-m25',
    name: 'USGS M2.5+ Earthquakes',
    url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.atom',
    category: 'earthquakes',
    priority: 'low',
    enabled: true,
    format: 'atom',
    refreshInterval: 360, // 6 hours = 2x daily
  },

  // Volcanoes
  {
    id: 'usgs-volcanoes',
    name: 'USGS Volcano Alerts',
    // USGS retired its volcano RSS/CAP feeds (the old vhp/updates.xml now 302s to
    // an HTML page). The live replacement is the getElevatedVolcanoes JSON API,
    // which returns currently-elevated volcanoes with color code + alert level.
    // Parsed by parseUsgsVolcanoesJson in rssAggregator (format: 'json').
    url: 'https://volcanoes.usgs.gov/hans-public/api/volcano/getElevatedVolcanoes',
    category: 'volcanoes',
    priority: 'high',
    enabled: true,
    format: 'json',
    refreshInterval: 30,
  },
  {
    id: 'smithsonian-volcanoes',
    name: 'Smithsonian Global Volcanism',
    url: 'https://volcano.si.edu/news/WeeklyVolcanoRSS.xml',
    category: 'volcanoes',
    priority: 'medium',
    enabled: true,
    format: 'rss',
    refreshInterval: 60,
  },

  // Space Weather
  {
    id: 'nasa-breaking',
    name: 'NASA Breaking News',
    url: 'https://www.nasa.gov/news-release/feed/',
    category: 'space',
    priority: 'high',
    enabled: true,
    format: 'rss',
    refreshInterval: 30,
  },
  {
    id: 'spaceweather',
    name: 'SpaceWeather.com',
    // spaceweather.com/rss/news.xml returns 404; the maintained replacement is
    // the Space Weather Archive WordPress feed (verified 200, RSS 2.0).
    url: 'https://spaceweatherarchive.com/feed/',
    category: 'space',
    priority: 'medium',
    enabled: true,
    format: 'rss',
    refreshInterval: 60,
  },
  {
    id: 'nasa-earth',
    name: 'NASA Earth Observatory',
    url: 'https://earthobservatory.nasa.gov/feeds/earth-observatory.rss',
    category: 'space',
    priority: 'medium',
    enabled: true,
    format: 'rss',
    refreshInterval: 60,
  },

  // Climate
  {
    id: 'noaa-climate',
    name: 'NOAA Climate.gov',
    // Disabled 2026: climate.gov/rss.xml is abandoned — its newest item is from
    // April 2021, so every item falls outside the aggregator's age window and the
    // feed only added latency. No fresh climate.gov/NOAA RSS replacement is
    // available (other paths 404/403); Carbon Brief below covers the climate
    // category with current content. Re-enable if NOAA ships a live feed.
    url: 'https://www.climate.gov/rss.xml',
    category: 'climate',
    priority: 'medium',
    enabled: false,
    format: 'rss',
    refreshInterval: 60,
  },
  {
    id: 'carbonbrief',
    name: 'Carbon Brief',
    // Use the canonical trailing-slash URL to skip the 301 redirect.
    url: 'https://www.carbonbrief.org/feed/',
    category: 'climate',
    priority: 'low',
    enabled: true,
    format: 'rss',
    refreshInterval: 120,
  },
  {
    id: 'yale-climate',
    name: 'Yale Climate Connections',
    url: 'https://yaleclimateconnections.org/feed/',
    category: 'climate',
    priority: 'medium',
    enabled: true,
    format: 'rss',
    refreshInterval: 120,
  },

  // Severe Weather
  {
    id: 'nws-alerts',
    name: 'NWS National Alerts',
    // alerts.weather.gov/cap/us.php was decommissioned (returns 000), which
    // silently emptied the `severe` category. Replaced by the api.weather.gov
    // active-alerts Atom feed, constrained to Severe/Extreme + Immediate/Expected
    // so the category stays meaningful and isn't flooded by minor advisories.
    url: 'https://api.weather.gov/alerts/active.atom?severity=Severe,Extreme&urgency=Immediate,Expected',
    category: 'severe',
    priority: 'high',
    enabled: true,
    format: 'atom',
    refreshInterval: 5,
  },
  {
    id: 'spc-outlooks',
    name: 'SPC Convective Outlooks',
    url: 'https://www.spc.noaa.gov/products/spcacrss.xml',
    category: 'severe',
    priority: 'high',
    enabled: true,
    format: 'rss',
    refreshInterval: 15,
  },

  // Hurricanes / Tropical
  {
    id: 'nhc-atlantic',
    name: 'NHC Atlantic Outlook',
    url: 'https://www.nhc.noaa.gov/index-at.xml',
    category: 'hurricanes',
    priority: 'high',
    enabled: true,
    format: 'rss',
    refreshInterval: 15,
  },
  {
    id: 'nhc-pacific',
    name: 'NHC Eastern Pacific',
    url: 'https://www.nhc.noaa.gov/index-ep.xml',
    category: 'hurricanes',
    priority: 'high',
    enabled: true,
    format: 'rss',
    refreshInterval: 15,
  },

  // Science / Earth News
  {
    id: 'sciencedaily-weather',
    name: 'ScienceDaily Weather',
    url: 'https://www.sciencedaily.com/rss/earth_climate/weather.xml',
    category: 'science',
    priority: 'low',
    enabled: true,
    format: 'rss',
    refreshInterval: 120,
  },
  {
    id: 'sciencedaily-earthquakes',
    name: 'ScienceDaily Earthquakes',
    url: 'https://www.sciencedaily.com/rss/earth_climate/earthquakes.xml',
    category: 'science',
    priority: 'low',
    enabled: true,
    format: 'rss',
    refreshInterval: 120,
  },
  {
    id: 'phys-earth',
    name: 'Phys.org Earth Sciences',
    url: 'https://phys.org/rss-feed/earth-news/',
    category: 'science',
    priority: 'low',
    enabled: true,
    format: 'rss',
    refreshInterval: 120,
  },
];

export const CATEGORY_CONFIG: Record<FeedCategory, {
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  badgeClass: string;
  bannerClass: string;
  tabActiveClass: string;
}> = {
  earthquakes: {
    label: 'Earthquakes',
    shortLabel: 'QUAKES',
    icon: 'activity',
    description: 'Seismic activity worldwide from USGS',
    badgeClass: 'bg-orange-600 text-white border-orange-800',
    bannerClass: 'bg-orange-600/90 border-orange-800',
    tabActiveClass: 'data-[state=active]:ring-orange-500',
  },
  volcanoes: {
    label: 'Volcanoes',
    shortLabel: 'VOLCANOES',
    icon: 'mountain',
    description: 'Volcanic activity and eruption alerts',
    badgeClass: 'bg-red-700 text-white border-red-900',
    bannerClass: 'bg-red-700/90 border-red-900',
    tabActiveClass: 'data-[state=active]:ring-red-500',
  },
  space: {
    label: 'Space',
    shortLabel: 'SPACE',
    icon: 'sun',
    description: 'Space weather, solar activity, and NASA updates',
    badgeClass: 'bg-purple-600 text-white border-purple-800',
    bannerClass: 'bg-purple-600/90 border-purple-800',
    tabActiveClass: 'data-[state=active]:ring-purple-500',
  },
  climate: {
    label: 'Climate',
    shortLabel: 'CLIMATE',
    icon: 'thermometer',
    description: 'Climate science and environmental news',
    badgeClass: 'bg-teal-600 text-white border-teal-800',
    bannerClass: 'bg-teal-600/90 border-teal-800',
    tabActiveClass: 'data-[state=active]:ring-teal-500',
  },
  severe: {
    label: 'Severe',
    shortLabel: 'SEVERE',
    icon: 'cloud-lightning',
    description: 'Severe weather alerts and warnings',
    badgeClass: 'bg-yellow-500 text-black border-yellow-700',
    bannerClass: 'bg-yellow-500/90 border-yellow-700',
    tabActiveClass: 'data-[state=active]:ring-yellow-500',
  },
  science: {
    label: 'Science',
    shortLabel: 'SCIENCE',
    icon: 'flask-conical',
    description: 'Earth science research and discoveries',
    badgeClass: 'bg-green-600 text-white border-green-800',
    bannerClass: 'bg-green-600/90 border-green-800',
    tabActiveClass: 'data-[state=active]:ring-green-500',
  },
  hurricanes: {
    label: 'Hurricanes',
    shortLabel: 'TROPICAL',
    icon: 'wind',
    description: 'Tropical storms and hurricane tracking',
    badgeClass: 'bg-cyan-600 text-white border-cyan-800',
    bannerClass: 'bg-cyan-600/90 border-cyan-800',
    tabActiveClass: 'data-[state=active]:ring-cyan-500',
  },
};

/** Short labels for enabled feed sources (footer attribution). */
export function getEnabledSourceNames(): string[] {
  return FEED_SOURCES.filter((source) => source.enabled).map((source) => source.name);
}


