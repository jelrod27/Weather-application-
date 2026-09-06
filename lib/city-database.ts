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
 * Report issues: https://github.com/jelrod27/Weather-application-/issues
 */

export interface CityData {
  name: string;
  state?: string;
  country: string;
  searchTerm: string;
  hasPage?: boolean;
  pageSlug?: string;
}

// Cities with dedicated pages
const CITIES_WITH_PAGES: CityData[] = [
  { name: "New York", state: "NY", country: "US", searchTerm: "New York, NY", hasPage: true, pageSlug: "new-york-ny" },
  { name: "Los Angeles", state: "CA", country: "US", searchTerm: "Los Angeles, CA", hasPage: true, pageSlug: "los-angeles-ca" },
  { name: "Chicago", state: "IL", country: "US", searchTerm: "Chicago, IL", hasPage: true, pageSlug: "chicago-il" },
  { name: "Houston", state: "TX", country: "US", searchTerm: "Houston, TX", hasPage: true, pageSlug: "houston-tx" },
  { name: "Phoenix", state: "AZ", country: "US", searchTerm: "Phoenix, AZ", hasPage: true, pageSlug: "phoenix-az" },
  { name: "Philadelphia", state: "PA", country: "US", searchTerm: "Philadelphia, PA", hasPage: true, pageSlug: "philadelphia-pa" },
  { name: "San Antonio", state: "TX", country: "US", searchTerm: "San Antonio, TX", hasPage: true, pageSlug: "san-antonio-tx" },
  { name: "San Diego", state: "CA", country: "US", searchTerm: "San Diego, CA", hasPage: true, pageSlug: "san-diego-ca" },
  { name: "Dallas", state: "TX", country: "US", searchTerm: "Dallas, TX", hasPage: true, pageSlug: "dallas-tx" },
  { name: "Austin", state: "TX", country: "US", searchTerm: "Austin, TX", hasPage: true, pageSlug: "austin-tx" },
];

// Major US cities (top 100+)
const MAJOR_US_CITIES: CityData[] = [
  // Additional major US cities beyond the ones with pages
  { name: "Jacksonville", state: "FL", country: "US", searchTerm: "Jacksonville, FL" },
  { name: "Fort Worth", state: "TX", country: "US", searchTerm: "Fort Worth, TX" },
  { name: "Columbus", state: "OH", country: "US", searchTerm: "Columbus, OH" },
  { name: "Charlotte", state: "NC", country: "US", searchTerm: "Charlotte, NC" },
  { name: "San Francisco", state: "CA", country: "US", searchTerm: "San Francisco, CA" },
  { name: "Indianapolis", state: "IN", country: "US", searchTerm: "Indianapolis, IN" },
  { name: "Seattle", state: "WA", country: "US", searchTerm: "Seattle, WA" },
  { name: "Denver", state: "CO", country: "US", searchTerm: "Denver, CO" },
  { name: "Boston", state: "MA", country: "US", searchTerm: "Boston, MA" },
  { name: "Nashville", state: "TN", country: "US", searchTerm: "Nashville, TN" },
  { name: "Baltimore", state: "MD", country: "US", searchTerm: "Baltimore, MD" },
  { name: "Portland", state: "OR", country: "US", searchTerm: "Portland, OR" },
  { name: "Las Vegas", state: "NV", country: "US", searchTerm: "Las Vegas, NV" },
  { name: "Detroit", state: "MI", country: "US", searchTerm: "Detroit, MI" },
  { name: "Memphis", state: "TN", country: "US", searchTerm: "Memphis, TN" },
  { name: "Louisville", state: "KY", country: "US", searchTerm: "Louisville, KY" },
  { name: "Milwaukee", state: "WI", country: "US", searchTerm: "Milwaukee, WI" },
  { name: "Albuquerque", state: "NM", country: "US", searchTerm: "Albuquerque, NM" },
  { name: "Tucson", state: "AZ", country: "US", searchTerm: "Tucson, AZ" },
  { name: "Fresno", state: "CA", country: "US", searchTerm: "Fresno, CA" },
  { name: "Sacramento", state: "CA", country: "US", searchTerm: "Sacramento, CA" },
  { name: "Mesa", state: "AZ", country: "US", searchTerm: "Mesa, AZ" },
  { name: "Kansas City", state: "MO", country: "US", searchTerm: "Kansas City, MO" },
  { name: "Atlanta", state: "GA", country: "US", searchTerm: "Atlanta, GA" },
  { name: "Colorado Springs", state: "CO", country: "US", searchTerm: "Colorado Springs, CO" },
  { name: "Omaha", state: "NE", country: "US", searchTerm: "Omaha, NE" },
  { name: "Raleigh", state: "NC", country: "US", searchTerm: "Raleigh, NC" },
  { name: "Miami", state: "FL", country: "US", searchTerm: "Miami, FL" },
  { name: "Virginia Beach", state: "VA", country: "US", searchTerm: "Virginia Beach, VA" },
  { name: "Oakland", state: "CA", country: "US", searchTerm: "Oakland, CA" },
  { name: "Minneapolis", state: "MN", country: "US", searchTerm: "Minneapolis, MN" },
  { name: "Tulsa", state: "OK", country: "US", searchTerm: "Tulsa, OK" },
  { name: "Arlington", state: "TX", country: "US", searchTerm: "Arlington, TX" },
  { name: "New Orleans", state: "LA", country: "US", searchTerm: "New Orleans, LA" },
  { name: "Wichita", state: "KS", country: "US", searchTerm: "Wichita, KS" },
  { name: "Cleveland", state: "OH", country: "US", searchTerm: "Cleveland, OH" },
  { name: "Tampa", state: "FL", country: "US", searchTerm: "Tampa, FL" },
  { name: "Bakersfield", state: "CA", country: "US", searchTerm: "Bakersfield, CA" },
  { name: "Aurora", state: "CO", country: "US", searchTerm: "Aurora, CO" },
  { name: "Anaheim", state: "CA", country: "US", searchTerm: "Anaheim, CA" },
  { name: "Honolulu", state: "HI", country: "US", searchTerm: "Honolulu, HI" },
  { name: "Santa Ana", state: "CA", country: "US", searchTerm: "Santa Ana, CA" },
  { name: "Corpus Christi", state: "TX", country: "US", searchTerm: "Corpus Christi, TX" },
  { name: "Riverside", state: "CA", country: "US", searchTerm: "Riverside, CA" },
  { name: "Lexington", state: "KY", country: "US", searchTerm: "Lexington, KY" },
  { name: "Stockton", state: "CA", country: "US", searchTerm: "Stockton, CA" },
  { name: "Henderson", state: "NV", country: "US", searchTerm: "Henderson, NV" },
  { name: "Saint Paul", state: "MN", country: "US", searchTerm: "Saint Paul, MN" },
  { name: "St. Louis", state: "MO", country: "US", searchTerm: "St. Louis, MO" },
  { name: "Cincinnati", state: "OH", country: "US", searchTerm: "Cincinnati, OH" },
  { name: "Pittsburgh", state: "PA", country: "US", searchTerm: "Pittsburgh, PA" },
  { name: "Greensboro", state: "NC", country: "US", searchTerm: "Greensboro, NC" },
  { name: "Anchorage", state: "AK", country: "US", searchTerm: "Anchorage, AK" },
  { name: "Plano", state: "TX", country: "US", searchTerm: "Plano, TX" },
  { name: "Lincoln", state: "NE", country: "US", searchTerm: "Lincoln, NE" },
  { name: "Orlando", state: "FL", country: "US", searchTerm: "Orlando, FL" },
  { name: "Irvine", state: "CA", country: "US", searchTerm: "Irvine, CA" },
  { name: "Newark", state: "NJ", country: "US", searchTerm: "Newark, NJ" },
  { name: "Durham", state: "NC", country: "US", searchTerm: "Durham, NC" },
  { name: "Chula Vista", state: "CA", country: "US", searchTerm: "Chula Vista, CA" },
  { name: "Toledo", state: "OH", country: "US", searchTerm: "Toledo, OH" },
  { name: "Fort Wayne", state: "IN", country: "US", searchTerm: "Fort Wayne, IN" },
  { name: "St. Petersburg", state: "FL", country: "US", searchTerm: "St. Petersburg, FL" },
  { name: "Laredo", state: "TX", country: "US", searchTerm: "Laredo, TX" },
  { name: "Jersey City", state: "NJ", country: "US", searchTerm: "Jersey City, NJ" },
  { name: "Chandler", state: "AZ", country: "US", searchTerm: "Chandler, AZ" },
  { name: "Madison", state: "WI", country: "US", searchTerm: "Madison, WI" },
  { name: "Lubbock", state: "TX", country: "US", searchTerm: "Lubbock, TX" },
  { name: "Norfolk", state: "VA", country: "US", searchTerm: "Norfolk, VA" },
  { name: "Baton Rouge", state: "LA", country: "US", searchTerm: "Baton Rouge, LA" },
  { name: "Buffalo", state: "NY", country: "US", searchTerm: "Buffalo, NY" },
  { name: "Spokane", state: "WA", country: "US", searchTerm: "Spokane, WA" },
  { name: "Richmond", state: "VA", country: "US", searchTerm: "Richmond, VA" },
  { name: "Birmingham", state: "AL", country: "US", searchTerm: "Birmingham, AL" },
  { name: "Rochester", state: "NY", country: "US", searchTerm: "Rochester, NY" },
  { name: "San Jose", state: "CA", country: "US", searchTerm: "San Jose, CA" },
  { name: "Scottsdale", state: "AZ", country: "US", searchTerm: "Scottsdale, AZ" },
  { name: "Glendale", state: "AZ", country: "US", searchTerm: "Glendale, AZ" },
  { name: "Akron", state: "OH", country: "US", searchTerm: "Akron, OH" },
  { name: "Mobile", state: "AL", country: "US", searchTerm: "Mobile, AL" },
  { name: "Little Rock", state: "AR", country: "US", searchTerm: "Little Rock, AR" },
  { name: "Huntington Beach", state: "CA", country: "US", searchTerm: "Huntington Beach, CA" },
  { name: "Grand Rapids", state: "MI", country: "US", searchTerm: "Grand Rapids, MI" },
  { name: "Salt Lake City", state: "UT", country: "US", searchTerm: "Salt Lake City, UT" },
  { name: "Tallahassee", state: "FL", country: "US", searchTerm: "Tallahassee, FL" },
  { name: "Worcester", state: "MA", country: "US", searchTerm: "Worcester, MA" },
  { name: "Newport News", state: "VA", country: "US", searchTerm: "Newport News, VA" },
  { name: "Huntsville", state: "AL", country: "US", searchTerm: "Huntsville, AL" },
  { name: "Knoxville", state: "TN", country: "US", searchTerm: "Knoxville, TN" },
  { name: "Providence", state: "RI", country: "US", searchTerm: "Providence, RI" },
  { name: "Fort Lauderdale", state: "FL", country: "US", searchTerm: "Fort Lauderdale, FL" },
  { name: "Amarillo", state: "TX", country: "US", searchTerm: "Amarillo, TX" },
  { name: "Glendale", state: "CA", country: "US", searchTerm: "Glendale, CA" },
  { name: "Mobile", state: "AL", country: "US", searchTerm: "Mobile, AL" },
  { name: "Grand Prairie", state: "TX", country: "US", searchTerm: "Grand Prairie, TX" },
  { name: "Brownsville", state: "TX", country: "US", searchTerm: "Brownsville, TX" },
  { name: "Jackson", state: "MS", country: "US", searchTerm: "Jackson, MS" },
  { name: "Overland Park", state: "KS", country: "US", searchTerm: "Overland Park, KS" },
  { name: "Garden Grove", state: "CA", country: "US", searchTerm: "Garden Grove, CA" },
  { name: "Santa Clarita", state: "CA", country: "US", searchTerm: "Santa Clarita, CA" },
  { name: "Oceanside", state: "CA", country: "US", searchTerm: "Oceanside, CA" },
  { name: "Chattanooga", state: "TN", country: "US", searchTerm: "Chattanooga, TN" },
  { name: "Fort Collins", state: "CO", country: "US", searchTerm: "Fort Collins, CO" },
  { name: "Washington", state: "DC", country: "US", searchTerm: "Washington, DC" },
];

// Major international cities
const MAJOR_INTERNATIONAL_CITIES: CityData[] = [
  // Europe
  { name: "London", country: "United Kingdom", searchTerm: "London, United Kingdom" },
  { name: "Paris", country: "France", searchTerm: "Paris, France" },
  { name: "Berlin", country: "Germany", searchTerm: "Berlin, Germany" },
  { name: "Rome", country: "Italy", searchTerm: "Rome, Italy" },
  { name: "Madrid", country: "Spain", searchTerm: "Madrid, Spain" },
  { name: "Amsterdam", country: "Netherlands", searchTerm: "Amsterdam, Netherlands" },
  { name: "Vienna", country: "Austria", searchTerm: "Vienna, Austria" },
  { name: "Prague", country: "Czech Republic", searchTerm: "Prague, Czech Republic" },
  { name: "Warsaw", country: "Poland", searchTerm: "Warsaw, Poland" },
  { name: "Budapest", country: "Hungary", searchTerm: "Budapest, Hungary" },
  { name: "Stockholm", country: "Sweden", searchTerm: "Stockholm, Sweden" },
  { name: "Copenhagen", country: "Denmark", searchTerm: "Copenhagen, Denmark" },
  { name: "Oslo", country: "Norway", searchTerm: "Oslo, Norway" },
  { name: "Helsinki", country: "Finland", searchTerm: "Helsinki, Finland" },
  { name: "Zurich", country: "Switzerland", searchTerm: "Zurich, Switzerland" },
  { name: "Brussels", country: "Belgium", searchTerm: "Brussels, Belgium" },
  { name: "Dublin", country: "Ireland", searchTerm: "Dublin, Ireland" },
  { name: "Athens", country: "Greece", searchTerm: "Athens, Greece" },
  { name: "Lisbon", country: "Portugal", searchTerm: "Lisbon, Portugal" },
  { name: "Barcelona", country: "Spain", searchTerm: "Barcelona, Spain" },
  { name: "Milan", country: "Italy", searchTerm: "Milan, Italy" },
  { name: "Munich", country: "Germany", searchTerm: "Munich, Germany" },
  { name: "Frankfurt", country: "Germany", searchTerm: "Frankfurt, Germany" },
  
  // Asia
  { name: "Tokyo", country: "Japan", searchTerm: "Tokyo, Japan" },
  { name: "Beijing", country: "China", searchTerm: "Beijing, China" },
  { name: "Shanghai", country: "China", searchTerm: "Shanghai, China" },
  { name: "Seoul", country: "South Korea", searchTerm: "Seoul, South Korea" },
  { name: "Mumbai", country: "India", searchTerm: "Mumbai, India" },
  { name: "Delhi", country: "India", searchTerm: "Delhi, India" },
  { name: "Bangalore", country: "India", searchTerm: "Bangalore, India" },
  { name: "Singapore", country: "Singapore", searchTerm: "Singapore, Singapore" },
  { name: "Hong Kong", country: "Hong Kong", searchTerm: "Hong Kong, Hong Kong" },
  { name: "Bangkok", country: "Thailand", searchTerm: "Bangkok, Thailand" },
  { name: "Manila", country: "Philippines", searchTerm: "Manila, Philippines" },
  { name: "Jakarta", country: "Indonesia", searchTerm: "Jakarta, Indonesia" },
  { name: "Kuala Lumpur", country: "Malaysia", searchTerm: "Kuala Lumpur, Malaysia" },
  { name: "Ho Chi Minh City", country: "Vietnam", searchTerm: "Ho Chi Minh City, Vietnam" },
  { name: "Taipei", country: "Taiwan", searchTerm: "Taipei, Taiwan" },
  { name: "Osaka", country: "Japan", searchTerm: "Osaka, Japan" },
  { name: "Kyoto", country: "Japan", searchTerm: "Kyoto, Japan" },
  { name: "Guangzhou", country: "China", searchTerm: "Guangzhou, China" },
  { name: "Shenzhen", country: "China", searchTerm: "Shenzhen, China" },
  
  // Oceania
  { name: "Sydney", country: "Australia", searchTerm: "Sydney, Australia" },
  { name: "Melbourne", country: "Australia", searchTerm: "Melbourne, Australia" },
  { name: "Brisbane", country: "Australia", searchTerm: "Brisbane, Australia" },
  { name: "Perth", country: "Australia", searchTerm: "Perth, Australia" },
  { name: "Adelaide", country: "Australia", searchTerm: "Adelaide, Australia" },
  { name: "Auckland", country: "New Zealand", searchTerm: "Auckland, New Zealand" },
  { name: "Wellington", country: "New Zealand", searchTerm: "Wellington, New Zealand" },
  
  // Americas (excluding US)
  { name: "Toronto", country: "Canada", searchTerm: "Toronto, Canada" },
  { name: "Vancouver", country: "Canada", searchTerm: "Vancouver, Canada" },
  { name: "Montreal", country: "Canada", searchTerm: "Montreal, Canada" },
  { name: "Calgary", country: "Canada", searchTerm: "Calgary, Canada" },
  { name: "Ottawa", country: "Canada", searchTerm: "Ottawa, Canada" },
  { name: "Mexico City", country: "Mexico", searchTerm: "Mexico City, Mexico" },
  { name: "Guadalajara", country: "Mexico", searchTerm: "Guadalajara, Mexico" },
  { name: "Monterrey", country: "Mexico", searchTerm: "Monterrey, Mexico" },
  { name: "São Paulo", country: "Brazil", searchTerm: "São Paulo, Brazil" },
  { name: "Rio de Janeiro", country: "Brazil", searchTerm: "Rio de Janeiro, Brazil" },
  { name: "Buenos Aires", country: "Argentina", searchTerm: "Buenos Aires, Argentina" },
  { name: "Lima", country: "Peru", searchTerm: "Lima, Peru" },
  { name: "Bogotá", country: "Colombia", searchTerm: "Bogotá, Colombia" },
  { name: "Santiago", country: "Chile", searchTerm: "Santiago, Chile" },
  { name: "Caracas", country: "Venezuela", searchTerm: "Caracas, Venezuela" },
  
  // Africa & Middle East
  { name: "Cairo", country: "Egypt", searchTerm: "Cairo, Egypt" },
  { name: "Lagos", country: "Nigeria", searchTerm: "Lagos, Nigeria" },
  { name: "Cape Town", country: "South Africa", searchTerm: "Cape Town, South Africa" },
  { name: "Johannesburg", country: "South Africa", searchTerm: "Johannesburg, South Africa" },
  { name: "Nairobi", country: "Kenya", searchTerm: "Nairobi, Kenya" },
  { name: "Dubai", country: "UAE", searchTerm: "Dubai, UAE" },
  { name: "Tel Aviv", country: "Israel", searchTerm: "Tel Aviv, Israel" },
  { name: "Istanbul", country: "Turkey", searchTerm: "Istanbul, Turkey" },
  { name: "Riyadh", country: "Saudi Arabia", searchTerm: "Riyadh, Saudi Arabia" },
  { name: "Doha", country: "Qatar", searchTerm: "Doha, Qatar" },
];

// Combined city database
export const CITY_DATABASE: CityData[] = [
  ...CITIES_WITH_PAGES,
  ...MAJOR_US_CITIES,
  ...MAJOR_INTERNATIONAL_CITIES,
];

// Search function for autocomplete
export function searchCities(query: string, maxResults: number = 4): CityData[] {
  if (!query || query.length < 2) return [];
  
  const normalizedQuery = query.toLowerCase().trim();
  
  // First priority: exact name matches
  const exactMatches = CITY_DATABASE.filter(city =>
    city.name.toLowerCase().startsWith(normalizedQuery)
  );
  
  // Second priority: partial name matches
  const partialMatches = CITY_DATABASE.filter(city =>
    city.name.toLowerCase().includes(normalizedQuery) &&
    !city.name.toLowerCase().startsWith(normalizedQuery)
  );
  
  // Combine and limit results
  const results = [...exactMatches, ...partialMatches].slice(0, maxResults);
  
  // Sort cities with pages first
  return results.sort((a, b) => {
    if (a.hasPage && !b.hasPage) return -1;
    if (!a.hasPage && b.hasPage) return 1;
    return 0;
  });
}
