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
    // Decommissioned 2026: this URL now 302s to an HTML landing page, not XML.
    // USGS retired its volcano RSS/CAP feeds; the only live replacement is the
    // getElevatedVolcanoes JSON API (format not yet supported by the aggregator).
    // Disabled so the volcano category isn't polluted by an HTML parse; the
    // Smithsonian Global Volcanism feed below still covers this category.
    // TODO(news-overhaul Phase 3+): add JSON-format support and wire up
    // https://volcanoes.usgs.gov/hans-public/api/volcano/getElevatedVolcanoes
    url: 'https://volcanoes.usgs.gov/vhp/updates.xml',
    category: 'volcanoes',
    priority: 'high',
    enabled: false,
    format: 'rss',
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
    // Old /feeds/all/feed.xml path returns 404; current feed lives at /rss.xml.
    url: 'https://www.climate.gov/rss.xml',
    category: 'climate',
    priority: 'medium',
    enabled: true,
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
  icon: string;
  color: string;
  description: string;
}> = {
  earthquakes: {
    label: 'Earthquakes',
    icon: 'activity',
    color: 'text-orange-500',
    description: 'Seismic activity worldwide from USGS',
  },
  volcanoes: {
    label: 'Volcanoes',
    icon: 'mountain',
    color: 'text-red-500',
    description: 'Volcanic activity and eruption alerts',
  },
  space: {
    label: 'Space',
    icon: 'sun',
    color: 'text-purple-500',
    description: 'Space weather, solar activity, and NASA updates',
  },
  climate: {
    label: 'Climate',
    icon: 'thermometer',
    color: 'text-blue-500',
    description: 'Climate science and environmental news',
  },
  severe: {
    label: 'Severe',
    icon: 'cloud-lightning',
    color: 'text-yellow-500',
    description: 'Severe weather alerts and warnings',
  },
  science: {
    label: 'Science',
    icon: 'flask-conical',
    color: 'text-green-500',
    description: 'Earth science research and discoveries',
  },
  hurricanes: {
    label: 'Hurricanes',
    icon: 'wind',
    color: 'text-cyan-500',
    description: 'Tropical storms and hurricane tracking',
  },
};


