/**
 * Format a raw location string for display in the site header.
 *
 * Examples:
 *   "Dublin, CA, US"           → "Dublin, CA"
 *   "San Ramon, California, US" → "San Ramon, CA"
 *   "New York, NY, US"         → "New York, NY"
 */
export function formatHeaderLocation(location: string): string {
  // Handle all location formats and ensure consistent state abbreviations
  const parts = location.split(', ');

  // Comprehensive state name to abbreviation mapping
  const stateAbbreviations: { [key: string]: string } = {
    // Full state names to abbreviations
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
    // Already abbreviated states (pass through)
    'AL': 'AL', 'AK': 'AK', 'AZ': 'AZ', 'AR': 'AR', 'CA': 'CA', 'CO': 'CO', 'CT': 'CT',
    'DE': 'DE', 'FL': 'FL', 'GA': 'GA', 'HI': 'HI', 'ID': 'ID', 'IL': 'IL', 'IN': 'IN',
    'IA': 'IA', 'KS': 'KS', 'KY': 'KY', 'LA': 'LA', 'ME': 'ME', 'MD': 'MD', 'MA': 'MA',
    'MI': 'MI', 'MN': 'MN', 'MS': 'MS', 'MO': 'MO', 'MT': 'MT', 'NE': 'NE', 'NV': 'NV',
    'NH': 'NH', 'NJ': 'NJ', 'NM': 'NM', 'NY': 'NY', 'NC': 'NC', 'ND': 'ND', 'OH': 'OH',
    'OK': 'OK', 'OR': 'OR', 'PA': 'PA', 'RI': 'RI', 'SC': 'SC', 'SD': 'SD', 'TN': 'TN',
    'TX': 'TX', 'UT': 'UT', 'VT': 'VT', 'VA': 'VA', 'WA': 'WA', 'WV': 'WV', 'WI': 'WI', 'WY': 'WY'
  };

  // City-to-state fallback mapping for when API doesn't provide state
  const cityStateMap: { [key: string]: string } = {
    'Dublin': 'CA', 'San Ramon': 'CA', 'Beverly Hills': 'CA', 'Los Angeles': 'CA',
    'San Francisco': 'CA', 'San Diego': 'CA', 'Sacramento': 'CA', 'San Jose': 'CA',
    'Oakland': 'CA', 'Fresno': 'CA', 'Anaheim': 'CA', 'Bakersfield': 'CA', 'Long Beach': 'CA',
    'New York': 'NY', 'Brooklyn': 'NY', 'Buffalo': 'NY', 'Rochester': 'NY', 'Syracuse': 'NY',
    'Chicago': 'IL', 'Houston': 'TX', 'Phoenix': 'AZ', 'Philadelphia': 'PA', 'San Antonio': 'TX',
    'Dallas': 'TX', 'Austin': 'TX', 'Jacksonville': 'FL', 'Fort Worth': 'TX', 'Columbus': 'OH',
    'Charlotte': 'NC', 'Seattle': 'WA', 'Denver': 'CO', 'Boston': 'MA', 'Nashville': 'TN',
    'Baltimore': 'MD', 'Portland': 'OR', 'Las Vegas': 'NV', 'Atlanta': 'GA',
    'Detroit': 'MI', 'Memphis': 'TN', 'Louisville': 'KY', 'Milwaukee': 'WI', 'Albuquerque': 'NM',
    'Tucson': 'AZ', 'Mesa': 'AZ', 'Kansas City': 'MO', 'Virginia Beach': 'VA',
    'Omaha': 'NE', 'Colorado Springs': 'CO', 'Raleigh': 'NC', 'Miami Beach': 'FL'
  };

  if (parts.length >= 3) {
    // Format: "City, State, Country" -> "City, StateAbbrev"
    const city = parts[0];
    const state = parts[1];
    const abbreviatedState = stateAbbreviations[state] || state; // Convert to abbreviation or keep as-is
    return `${city}, ${abbreviatedState}`;
  } else if (parts.length === 2) {
    // Format: "City, Country" -> need to determine state
    const city = parts[0];
    const country = parts[1];

    if (country === 'US') {
      const state = cityStateMap[city] || 'US'; // Fallback to country if city not found
      return state === 'US' ? city : `${city}, ${state}`;
    } else {
      // Non-US locations, just return city
      return city;
    }
  } else {
    // Single part, just return as-is
    return parts[0];
  }
}
