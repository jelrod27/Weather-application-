/**
 * 16-Bit Weather Platform - v1.0.0
 * 
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 * 
 * Use Limitation: 5 users
 * See LICENSE file for full terms
 * 
 * BETA SOFTWARE NOTICE:
 * This software is in active development. Features may change.
 * Report issues: https://github.com/deephouse23/Weather-application-/issues
 */

/**
 * Temperature Extremes Data Service
 * Fetches and manages global temperature extremes
 * Version 0.3.2
 */

// Known extreme temperature locations to monitor
export const HOT_LOCATIONS = [
  // Desert regions known for extreme heat
  { name: 'Death Valley', country: 'USA', lat: 36.5323, lon: -116.9325, emoji: '🏜️' },
  { name: 'Kuwait City', country: 'Kuwait', lat: 29.3759, lon: 47.9774, emoji: '🌵' },
  { name: 'Basra', country: 'Iraq', lat: 30.5085, lon: 47.7804, emoji: '☀️' },
  { name: 'Ahvaz', country: 'Iran', lat: 31.3183, lon: 48.6706, emoji: '🔥' },
  { name: 'Dubai', country: 'UAE', lat: 25.2048, lon: 55.2708, emoji: '🏙️' },
  { name: 'Phoenix', country: 'USA', lat: 33.4484, lon: -112.0740, emoji: '🌵' },
  { name: 'Las Vegas', country: 'USA', lat: 36.1699, lon: -115.1398, emoji: '🎰' },
  { name: 'Mecca', country: 'Saudi Arabia', lat: 21.4225, lon: 39.8262, emoji: '🕌' },
  { name: 'Jacobabad', country: 'Pakistan', lat: 28.2769, lon: 68.4514, emoji: '🌡️' },
  { name: 'Dallol', country: 'Ethiopia', lat: 14.2417, lon: 40.2997, emoji: '🌋' },
  { name: 'Timbuktu', country: 'Mali', lat: 16.7735, lon: -3.0074, emoji: '🏜️' },
  { name: 'Alice Springs', country: 'Australia', lat: -23.6980, lon: 133.8807, emoji: '🦘' },
  { name: 'Marble Bar', country: 'Australia', lat: -21.1653, lon: 119.7506, emoji: '🏜️' },
  { name: 'Turbat', country: 'Pakistan', lat: 26.0043, lon: 63.0440, emoji: '☀️' },
  { name: 'Ghadames', country: 'Libya', lat: 30.1337, lon: 9.4951, emoji: '🌵' }
];

// Enhanced descriptions for extreme locations
export const LOCATION_DETAILS: { [key: string]: { description: string; climateType: string; bestTime: string; travelTip: string } } = {
  'Death Valley': {
    description: 'A desert valley in Eastern California, it is the lowest point in North America and holds the record for the highest reliably recorded air temperature on Earth.',
    climateType: 'Subtropical, hot desert climate',
    bestTime: 'November to March',
    travelTip: 'Bring gallons of water and avoid hiking after 10 AM in summer.'
  },
  'Kuwait City': {
    description: 'The capital of Kuwait, known for its modern architecture and intense summer heat, frequently exceeding 50°C.',
    climateType: 'Hot desert climate',
    bestTime: 'November to April',
    travelTip: 'Visit indoor attractions like the Avenues Mall during peak heat hours.'
  },
  'Vostok Station': {
    description: 'A Russian research station in inland Princess Elizabeth Land, Antarctica. It is the coldest place on Earth.',
    climateType: 'Ice cap climate',
    bestTime: 'December to January (Summer)',
    travelTip: 'Only accessible by specialized expeditions with polar gear.'
  },
  'Oymyakon': {
    description: 'A rural locality in the Sakha Republic, Russia, located along the Indigirka River. It is the coldest permanently inhabited settlement on Earth.',
    climateType: 'Extreme subarctic climate',
    bestTime: 'June to August',
    travelTip: 'Don\'t turn off your car engine; the oil might freeze instantly.'
  },
  'Phoenix': {
    description: 'The capital of Arizona, known for its year-round sun and sweltering summer temperatures.',
    climateType: 'Hot desert climate',
    bestTime: 'November to April',
    travelTip: 'Hydrate constantly and embrace the siesta lifestyle.'
  },
  'Yakutsk': {
    description: 'The capital city of the Sakha Republic, Russia, located about 450 kilometers south of the Arctic Circle.',
    climateType: 'Subarctic climate',
    bestTime: 'July (Temperatures can reach 30°C)',
    travelTip: 'Visit the Mammoth Museum and the Permafrost Kingdom.'
  },
  'Dubai': {
    description: 'A city and emirate in the United Arab Emirates known for luxury shopping, ultramodern architecture, and lively nightlife.',
    climateType: 'Hot desert climate',
    bestTime: 'November to March',
    travelTip: 'Book a desert safari for sunset, when temperatures are milder.'
  },
  'Alice Springs': {
    description: 'A remote town in Australia\'s Northern Territory, a gateway to exploring the Red Centre.',
    climateType: 'Hot desert climate',
    bestTime: 'April to September',
    travelTip: 'Visit Uluru at sunrise for spectacular colors and cooler temps.'
  },
  'Danakil Depression': {
    description: 'One of the hottest, driest, and lowest places on Earth, featuring colorful hydrothermal pools.',
    climateType: 'Hot desert climate',
    bestTime: 'November to February',
    travelTip: 'A professional guide and armed escort are mandatory for safety.'
  }
};

export const COLD_LOCATIONS = [
  // Polar and extremely cold regions
  { name: 'Vostok Station', country: 'Antarctica', lat: -78.4645, lon: 106.8339, emoji: '🧊' },
  { name: 'Oymyakon', country: 'Russia', lat: 63.4608, lon: 142.7858, emoji: '❄️' },
  { name: 'Verkhoyansk', country: 'Russia', lat: 67.5505, lon: 133.3908, emoji: '🥶' },
  { name: 'Yakutsk', country: 'Russia', lat: 62.0355, lon: 129.6755, emoji: '⛄' },
  { name: 'International Falls', country: 'USA', lat: 48.6011, lon: -93.4103, emoji: '🌨️' },
  { name: 'Fraser', country: 'USA', lat: 39.9447, lon: -105.8169, emoji: '🏔️' },
  { name: 'Snag', country: 'Canada', lat: 62.3833, lon: -140.8833, emoji: '🍁' },
  { name: 'Ulaanbaatar', country: 'Mongolia', lat: 47.8864, lon: 106.9057, emoji: '🐎' },
  { name: 'Barrow', country: 'USA', lat: 71.2906, lon: -156.7886, emoji: '🐻‍❄️' },
  { name: 'Yellowknife', country: 'Canada', lat: 62.4540, lon: -114.3718, emoji: '💎' },
  { name: 'Norilsk', country: 'Russia', lat: 69.3535, lon: 88.2027, emoji: '⛏️' },
  { name: 'Murmansk', country: 'Russia', lat: 68.9585, lon: 33.0827, emoji: '🚢' },
  { name: 'Svalbard', country: 'Norway', lat: 78.2232, lon: 15.6267, emoji: '🐻‍❄️' },
  { name: 'Resolute', country: 'Canada', lat: 74.6973, lon: -94.8297, emoji: '🧊' },
  { name: 'Alert', country: 'Canada', lat: 82.5018, lon: -62.3481, emoji: '🌨️' }
];

// Fun facts about extreme locations
export const LOCATION_FACTS: { [key: string]: string } = {
  'Death Valley': 'Holds the world record for highest air temperature: 134°F (56.7°C) in 1913',
  'Kuwait City': 'Recorded 127°F (52.7°C) in 2021, one of the highest temps in recent history',
  'Vostok Station': 'Recorded Earth\'s lowest temperature: -128.6°F (-89.2°C) in 1983',
  'Oymyakon': 'Known as the coldest permanently inhabited place on Earth',
  'Phoenix': 'Has over 110 days per year above 100°F (38°C)',
  'Yakutsk': 'Largest city built on continuous permafrost',
  'Dallol': 'Has the highest average annual temperature on Earth',
  'Marble Bar': 'Once had 160 consecutive days above 100°F (37.8°C)',
  'Turbat': 'Recorded 128.3°F (53.5°C) in 2017',
  'Alert': 'The northernmost permanently inhabited place in the world',
  'Barrow': 'Experiences 65 days of total darkness in winter',
  'Fraser': 'Nicknamed the "Icebox of the Nation"',
  'Ulaanbaatar': 'Coldest capital city in the world',
  'Svalbard': 'Home to polar bears and the Global Seed Vault',
  'International Falls': 'Calls itself the "Icebox of the Nation"'
};

// Historical average temperatures for context
export const HISTORICAL_AVERAGES: { [key: string]: { summer: number; winter: number } } = {
  'Death Valley': { summer: 115, winter: 65 },
  'Kuwait City': { summer: 115, winter: 60 },
  'Vostok Station': { summer: -20, winter: -85 },
  'Oymyakon': { summer: 58, winter: -58 },
  'Phoenix': { summer: 105, winter: 65 },
  'Yakutsk': { summer: 65, winter: -40 },
  'Dubai': { summer: 105, winter: 75 },
  'Alert': { summer: 35, winter: -25 },
  'Marble Bar': { summer: 105, winter: 70 },
  'Ulaanbaatar': { summer: 70, winter: -10 }
};

export interface LocationTemperature {
  name: string;
  country: string;
  lat: number;
  lon: number;
  emoji: string;
  temp: number;
  tempC: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  fact?: string;
  description?: string;
  climateType?: string;
  bestTime?: string;
  travelTip?: string;
  historicalAvg?: { summer: number; winter: number };
  lastUpdated: number;
}

export interface ExtremesData {
  hottest: LocationTemperature;
  coldest: LocationTemperature;
  topHot: LocationTemperature[];
  topCold: LocationTemperature[];
  userLocation?: {
    temp: number;
    tempC: number;
    globalRank?: number;
    totalLocations: number;
  };
  lastUpdated: number;
}

// NOTE: the fetch/cache pipeline that used to live here (fetchLocation-
// Temperature, fetchExtremeTemperatures, getCachedExtremes,
// setCachedExtremes) was an unused duplicate of app/api/extremes/route.ts
// with unbounded fetches and an apiKey parameter in a client-importable
// module. Removed in the 2026-06 review (finding L4); this file now holds
// only the shared data tables and types.
