/**
 * City Metadata for SEO
 * 
 * Contains unique, keyword-rich content for major US cities.
 * Used by generateMetadata in city weather pages for SEO optimization.
 */

export const cityData: { [key: string]: { 
  name: string
  state: string
  searchTerm: string
  title: string
  description: string
  content: {
    intro: string
    climate: string
    patterns: string
  }
}} = {
  // TOP 10 CITIES (Full content)
  'new-york-ny': {
    name: 'New York',
    state: 'NY',
    searchTerm: 'New York, NY',
    title: 'New York Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for New York, NY. Real-time weather data with retro terminal aesthetics. Check temperature, humidity, wind, and more.',
    content: {
      intro: 'New York City experiences a humid subtropical climate with four distinct seasons. Located in the northeastern United States, the city\'s weather is influenced by its coastal position and urban heat island effect.',
      climate: 'Summers in NYC are typically hot and humid with average highs in the mid-80s°F (29°C), while winters are cold with temperatures often dropping below freezing. The city receives about 50 inches of precipitation annually, distributed fairly evenly throughout the year.',
      patterns: 'Weather patterns in New York are heavily influenced by the Atlantic Ocean and can change rapidly. The city experiences everything from nor\'easters in winter to thunderstorms and occasional heat waves in summer. Spring and fall offer the most pleasant weather conditions.'
    }
  },
  'los-angeles-ca': {
    name: 'Los Angeles',
    state: 'CA',
    searchTerm: 'Los Angeles, CA',
    title: 'Los Angeles Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Los Angeles, CA. Real-time weather data with retro terminal aesthetics. Check temperature, humidity, wind, and more.',
    content: {
      intro: 'Los Angeles enjoys a Mediterranean climate characterized by warm, dry summers and mild, wet winters. The city\'s location along the Pacific coast and surrounded by mountains creates diverse microclimates throughout the region.',
      climate: 'Summer temperatures typically range from the mid-70s to mid-80s°F (24-29°C) with very low humidity and minimal rainfall. Winters are mild with highs in the 60s-70s°F (15-21°C) and most of the year\'s 15 inches of rainfall occurring between November and March.',
      patterns: 'LA\'s weather is notably stable and predictable, with over 280 sunny days per year. The marine layer from the Pacific often creates morning fog and clouds that burn off by afternoon. Santa Ana winds occasionally bring hot, dry conditions and elevated fire risk.'
    }
  },
  'chicago-il': {
    name: 'Chicago',
    state: 'IL',
    searchTerm: 'Chicago, IL',
    title: 'Chicago Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Chicago, IL. Real-time weather data with retro terminal aesthetics. Check temperature, humidity, wind, and more.',
    content: {
      intro: 'Chicago experiences a continental climate with hot, humid summers and cold, snowy winters. The city\'s location on Lake Michigan significantly influences its weather patterns, moderating temperatures and increasing precipitation.',
      climate: 'Summer highs average in the low 80s°F (27°C) with high humidity, while winter temperatures often drop below freezing with average lows around 20°F (-7°C). The city receives about 38 inches of precipitation annually, including significant snowfall in winter.',
      patterns: 'Lake Michigan creates a significant "lake effect" that moderates temperatures year-round but can produce heavy snow in winter. The city experiences rapid weather changes due to its location in the path of many storm systems moving across the Great Plains. Summers can bring severe thunderstorms, while winters feature blizzards and frigid Arctic air masses.'
    }
  },
  'houston-tx': {
    name: 'Houston',
    state: 'TX',
    searchTerm: 'Houston, TX',
    title: 'Houston Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Houston, TX. Real-time weather data including humidity levels, Gulf Coast storm tracking, and hurricane season updates.',
    content: {
      intro: 'Houston has a humid subtropical climate with hot, humid summers and mild winters. Located near the Gulf of Mexico, the city experiences high humidity year-round and is prone to tropical weather systems during hurricane season.',
      climate: 'Summer temperatures regularly reach the 90s°F (32-37°C) with very high humidity making it feel even hotter. Winters are mild with highs in the 60s-70s°F (15-21°C). The city receives about 50 inches of rain annually, much of it from thunderstorms and tropical systems.',
      patterns: 'Houston\'s weather is dominated by Gulf moisture creating frequent afternoon and evening thunderstorms during summer. The city is vulnerable to hurricanes and tropical storms from June through November. Flash flooding is a significant concern during heavy rain events.'
    }
  },
  'phoenix-az': {
    name: 'Phoenix',
    state: 'AZ',
    searchTerm: 'Phoenix, AZ',
    title: 'Phoenix Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Phoenix, AZ. Real-time desert weather data including extreme heat warnings, monsoon tracking, and dust storm alerts.',
    content: {
      intro: 'Phoenix has a hot desert climate with extremely hot summers and mild winters. Located in the Sonoran Desert, the city experiences low humidity year-round and abundant sunshine with minimal precipitation.',
      climate: 'Summer temperatures routinely exceed 110°F (43°C) from May through September, making Phoenix one of the hottest major cities in the US. Winters are pleasant with highs in the 70s°F (21°C). Annual rainfall is only about 8 inches, mostly from winter storms and summer monsoons.',
      patterns: 'Phoenix weather is characterized by extreme heat and drought, broken by the North American Monsoon which brings thunderstorms, flash flooding, and dust storms (haboobs) from July through September. Winter months offer ideal outdoor weather conditions.'
    }
  },
  'philadelphia-pa': {
    name: 'Philadelphia',
    state: 'PA',
    searchTerm: 'Philadelphia, PA',
    title: 'Philadelphia Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Philadelphia, PA. Real-time weather data with four-season tracking and nor\'easter alerts.',
    content: {
      intro: 'Philadelphia has a humid subtropical climate with hot, humid summers and cool to cold winters. Located in southeastern Pennsylvania, the city experiences four distinct seasons with moderate precipitation throughout the year.',
      climate: 'Summer highs average in the mid-80s°F (29°C) with high humidity, while winter temperatures typically range from the 20s to 40s°F (-7 to 4°C). The city receives about 42 inches of precipitation annually, including snow in winter months.',
      patterns: 'Philadelphia\'s weather is influenced by both continental and maritime air masses, creating variable conditions. The city can experience nor\'easters, thunderstorms, and occasional severe weather. Spring and fall provide the most comfortable weather.'
    }
  },
  'san-antonio-tx': {
    name: 'San Antonio',
    state: 'TX',
    searchTerm: 'San Antonio, TX',
    title: 'San Antonio Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for San Antonio, TX. Real-time South Texas weather data with humidity and severe weather tracking.',
    content: {
      intro: 'San Antonio has a humid subtropical climate with hot summers and mild winters. Located in south-central Texas, the city experiences warm weather year-round with moderate to high humidity.',
      climate: 'Summer temperatures regularly reach the 90s-100s°F (32-38°C) with moderate humidity. Winters are mild with highs typically in the 60s°F (15°C) and lows rarely dropping below freezing. Annual precipitation is about 30 inches.',
      patterns: 'San Antonio\'s weather features long, hot summers and short, mild winters. The city occasionally experiences severe thunderstorms and is within range of Gulf hurricanes. Spring brings variable weather with tornado potential.'
    }
  },
  'san-diego-ca': {
    name: 'San Diego',
    state: 'CA',
    searchTerm: 'San Diego, CA',
    title: 'San Diego Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for San Diego, CA. Real-time coastal California weather with marine layer and beach conditions.',
    content: {
      intro: 'San Diego boasts a semi-arid Mediterranean climate with mild temperatures year-round. Located on the Pacific coast of Southern California, the city enjoys one of the most stable and pleasant climates in the United States.',
      climate: 'Temperatures are remarkably consistent, with summer highs in the mid-70s°F (24°C) and winter highs in the mid-60s°F (18°C). Humidity is generally low, and the city receives only about 10 inches of rain annually, mostly during winter months.',
      patterns: 'San Diego\'s weather is dominated by marine influence, creating cool ocean breezes and preventing extreme temperatures. "June Gloom" brings marine layer clouds in late spring and early summer. Fire weather conditions can develop during Santa Ana wind events.'
    }
  },
  'dallas-tx': {
    name: 'Dallas',
    state: 'TX',
    searchTerm: 'Dallas, TX',
    title: 'Dallas Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Dallas, TX. Real-time North Texas weather with severe storm and tornado tracking.',
    content: {
      intro: 'Dallas has a humid subtropical climate with hot summers and mild winters. Located in north-central Texas, the city experiences a continental climate influence with variable weather patterns and is in the heart of Tornado Alley.',
      climate: 'Summer temperatures frequently reach the 90s-100s°F (32-38°C) with moderate to high humidity. Winters are generally mild with highs in the 50s-60s°F (10-15°C), though occasional cold fronts can bring freezing temperatures. Annual precipitation is about 37 inches.',
      patterns: 'Dallas weather is characterized by hot summers, mild winters, and rapid weather changes. The city can experience severe thunderstorms, tornadoes, hail, and occasional ice storms. Spring is the most active severe weather season.'
    }
  },
  'austin-tx': {
    name: 'Austin',
    state: 'TX',
    searchTerm: 'Austin, TX',
    title: 'Austin Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Austin, TX. Real-time Central Texas weather with flash flood and severe storm tracking.',
    content: {
      intro: 'Austin has a humid subtropical climate with hot summers and mild winters. Located in the Texas Hill Country, the city experiences warm weather most of the year with distinct wet and dry seasons and is prone to flash flooding.',
      climate: 'Summer temperatures regularly exceed 95°F (35°C) with moderate humidity, while winters are mild with highs in the 60s°F (15°C) and lows rarely below freezing. The city receives about 34 inches of rain annually, with peak rainfall in spring and fall.',
      patterns: 'Austin\'s weather features long, hot summers and short, mild winters. The city experiences severe thunderstorms, flash flooding along creeks, and occasional tornadoes. Spring brings wildflower blooms and variable weather conditions.'
    }
  },
  // CITIES 11-25 (Medium content)
  'miami-fl': {
    name: 'Miami',
    state: 'FL',
    searchTerm: 'Miami, FL',
    title: 'Miami Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Miami, FL. Real-time tropical weather data with hurricane tracking and beach conditions.',
    content: {
      intro: 'Miami has a tropical monsoon climate with hot, humid summers and warm, dry winters. The city is heavily influenced by the Atlantic Ocean and Gulf Stream.',
      climate: 'Summer temperatures reach the upper 80s-90s°F (31-33°C) with very high humidity. Winters are warm with highs in the 70s°F (21-26°C). Annual rainfall exceeds 60 inches, mostly during the wet season from May to October.',
      patterns: 'Miami experiences daily afternoon thunderstorms in summer and is vulnerable to hurricanes from June through November. Sea breezes moderate temperatures year-round.'
    }
  },
  'atlanta-ga': {
    name: 'Atlanta',
    state: 'GA',
    searchTerm: 'Atlanta, GA',
    title: 'Atlanta Georgia Climate & Summer Weather Guide - 16 Bit Weather',
    description:
      'Atlanta climate and summer weather: humid subtropical seasons, monthly averages, severe storm risk, and the best time to visit.',
    content: {
      intro:
        'Atlanta has a humid subtropical climate with hot, stormy summers and mild winters. Sitting about 1,050 feet above sea level in Georgia\'s Piedmont, the city gets four seasons — and frequent severe thunderstorms in spring.',
      climate:
        'Summer highs reach the upper 80s–90s°F with high humidity and near-daily afternoon storms. Winters are mild (lows often in the 30s°F) but ice storms can shut the city down. Annual rainfall is about 50 inches — more than Seattle.',
      patterns:
        'Dixie Alley severe weather peaks in spring. Fall is the most comfortable season. Snow is rare (~2 inches/year), but even light ice events paralyze roads. Hurricane remnants occasionally bring heavy rain in late summer and fall.',
    },
  },
  'denver-co': {
    name: 'Denver',
    state: 'CO',
    searchTerm: 'Denver, CO',
    title: 'Denver Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Denver, CO. Real-time Mile High City weather with mountain snow and hail tracking.',
    content: {
      intro: 'Denver has a semi-arid continental climate with four distinct seasons. Located at the base of the Rocky Mountains at 5,280 feet elevation, the city experiences variable weather and low humidity.',
      climate: 'Summers are warm with highs in the 80s-90s°F (27-32°C) but low humidity. Winters are cold but sunny, with highs in the 40s°F (4-9°C). The city receives about 15 inches of precipitation annually, including significant snow.',
      patterns: 'Denver experiences rapid weather changes due to its mountain proximity. Chinook winds can raise temperatures 40°F in hours. Spring brings heavy snow and severe thunderstorms with large hail.'
    }
  },
  'seattle-wa': {
    name: 'Seattle',
    state: 'WA',
    searchTerm: 'Seattle, WA',
    title: 'Seattle Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Seattle, WA. Real-time Pacific Northwest weather with rain tracking and mountain conditions.',
    content: {
      intro: 'Seattle has an oceanic climate with mild, wet winters and warm, dry summers. Protected by the Olympic Mountains, the city receives less rain than its reputation suggests.',
      climate: 'Summers are pleasant with highs in the 70s°F (21-26°C) and minimal rain. Winters are mild with highs in the 40s°F (4-9°C) and frequent light rain. Annual precipitation is about 37 inches.',
      patterns: 'Seattle experiences persistent cloud cover in winter but enjoys sunny, dry summers. The "Seattle Freeze" of gray winter days contrasts with beautiful summer weather.'
    }
  },
  'san-francisco-ca': {
    name: 'San Francisco',
    state: 'CA',
    searchTerm: 'San Francisco, CA',
    title: 'San Francisco Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for San Francisco, CA. Real-time Bay Area weather with fog tracking and microclimate data.',
    content: {
      intro: 'San Francisco has a Mediterranean climate strongly influenced by cold ocean currents. The city is famous for its fog and cool summers, with distinct microclimates across neighborhoods.',
      climate: 'Temperatures are remarkably stable year-round, typically between 50-70°F (10-21°C). Summer can be foggy and cool, while fall offers the warmest weather. Annual rainfall is about 23 inches.',
      patterns: 'The famous fog rolls in through the Golden Gate, cooling western neighborhoods while eastern areas stay warm. Karl the Fog is most common in summer mornings.'
    }
  },
  'boston-ma': {
    name: 'Boston',
    state: 'MA',
    searchTerm: 'Boston, MA',
    title: 'Boston MA Climate & Year-Round Weather Guide - 16 Bit Weather',
    description:
      'Boston climate and year-round weather: monthly averages, nor\'easter winters, humid summers, and the best time to visit New England.',
    content: {
      intro:
        'Boston has a humid continental climate with cold, snowy winters and warm, humid summers. The Atlantic shoreline shapes the city\'s weather — ocean moderation, sea breezes, and powerful nor\'easters that define New England winters.',
      climate:
        'Year-round, Boston averages about 44 inches of precipitation. Summer highs typically sit in the upper 70s to low 80s°F with sticky humidity; winter highs hover in the upper 30s°F with frequent freezes. Snow averages near 48 inches per year, but individual winters swing from under a foot to more than 100 inches.',
      patterns:
        'Nor\'easters are the signature winter hazard, often tracking just offshore and dumping heavy snow on the metro. Spring arrives late; fall foliage peaks in mid-to-late October. Rapid air-mass changes are common when Canadian cold meets Atlantic moisture.',
    },
  },
  'las-vegas-nv': {
    name: 'Las Vegas',
    state: 'NV',
    searchTerm: 'Las Vegas, NV',
    title: 'Las Vegas Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Las Vegas, NV. Real-time desert weather with extreme heat warnings and monsoon tracking.',
    content: {
      intro: 'Las Vegas has a hot desert climate similar to Phoenix but at a slightly higher elevation. The city experiences extreme heat in summer and mild winters.',
      climate: 'Summer temperatures frequently exceed 100°F (38°C) with very low humidity. Winters are mild with highs in the 50s-60s°F (10-15°C). Annual rainfall is only about 4 inches.',
      patterns: 'Las Vegas experiences extreme heat from May through September. Summer monsoons can bring flash flooding. Winter occasionally sees snow on surrounding mountains.'
    }
  },
  'portland-or': {
    name: 'Portland',
    state: 'OR',
    searchTerm: 'Portland, OR',
    title: 'Portland Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Portland, OR. Real-time Pacific Northwest weather with rain and river tracking.',
    content: {
      intro: 'Portland has an oceanic climate with wet winters and warm, dry summers. The city sits at the confluence of the Willamette and Columbia rivers.',
      climate: 'Summers are warm and dry with highs in the 80s°F (27-29°C). Winters are mild and wet with highs in the 40s°F (4-7°C). Annual rainfall is about 43 inches.',
      patterns: 'Portland experiences persistent rain from October through June, with dry summers. Occasional ice storms occur in winter. Summer heat waves have become more common.'
    }
  },
  'nashville-tn': {
    name: 'Nashville',
    state: 'TN',
    searchTerm: 'Nashville, TN',
    title: 'Nashville Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Nashville, TN. Real-time Music City weather with severe storm and flood tracking.',
    content: {
      intro: 'Nashville has a humid subtropical climate with hot summers and mild winters. Located in the Cumberland River valley, the city is prone to flooding.',
      climate: 'Summer highs reach the 90s°F (32-35°C) with high humidity. Winters are mild with occasional snow and ice. Annual precipitation is about 47 inches.',
      patterns: 'Nashville experiences severe thunderstorms and tornadoes in spring. Flash flooding is a significant risk. Ice storms occasionally impact winter travel.'
    }
  },
  'minneapolis-mn': {
    name: 'Minneapolis',
    state: 'MN',
    searchTerm: 'Minneapolis, MN',
    title: 'Minneapolis Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Minneapolis, MN. Real-time Twin Cities weather with winter storm and severe weather tracking.',
    content: {
      intro: 'Minneapolis has a humid continental climate with extreme temperature variations. The city experiences very cold winters and warm summers.',
      climate: 'Summer highs reach the 80s°F (27-29°C). Winters are extremely cold with average highs in the teens°F (-7 to -12°C). Annual snowfall exceeds 50 inches.',
      patterns: 'Minneapolis experiences Arctic outbreaks in winter with temperatures dropping below -20°F. Severe thunderstorms and tornadoes occur in spring and summer.'
    }
  },
  // CITIES 26-50 (Concise content)
  'orlando-fl': {
    name: 'Orlando',
    state: 'FL',
    searchTerm: 'Orlando, FL',
    title: 'Orlando Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Orlando, FL. Real-time Central Florida weather with theme park conditions and afternoon storm tracking.',
    content: {
      intro: 'Orlando has a humid subtropical climate with hot summers and mild winters. Daily afternoon thunderstorms are common in summer.',
      climate: 'Summers are hot and humid with daily thunderstorms. Winters are mild and dry with highs in the 70s°F (21-24°C).',
      patterns: 'Afternoon thunderstorms occur almost daily from June through September. Hurricanes can impact the area.'
    }
  },
  'tampa-fl': {
    name: 'Tampa',
    state: 'FL',
    searchTerm: 'Tampa, FL',
    title: 'Tampa Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Tampa, FL. Real-time Tampa Bay weather with lightning and hurricane tracking.',
    content: {
      intro: 'Tampa has a humid subtropical climate and is known as the lightning capital of North America during summer.',
      climate: 'Hot, humid summers with frequent lightning storms. Mild winters rarely see frost.',
      patterns: 'Daily thunderstorms in summer, especially along sea breeze boundaries. Hurricane-prone during Atlantic season.'
    }
  },
  'detroit-mi': {
    name: 'Detroit',
    state: 'MI',
    searchTerm: 'Detroit, MI',
    title: 'Detroit Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Detroit, MI. Real-time Motor City weather with lake effect snow tracking.',
    content: {
      intro: 'Detroit has a humid continental climate influenced by the Great Lakes. Lake effect can enhance precipitation.',
      climate: 'Cold winters with significant snow. Warm, humid summers with thunderstorms.',
      patterns: 'Lake effect enhances winter snow and summer storms. Arctic outbreaks bring extreme cold.'
    }
  },
  'cleveland-oh': {
    name: 'Cleveland',
    state: 'OH',
    searchTerm: 'Cleveland, OH',
    title: 'Cleveland Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Cleveland, OH. Real-time Lake Erie weather with lake effect snow alerts.',
    content: {
      intro: 'Cleveland has a humid continental climate with significant lake effect from Lake Erie.',
      climate: 'Cold, snowy winters with lake effect enhancement. Warm summers with lake breezes.',
      patterns: 'Heavy lake effect snow in fall and winter. Summer storms can be enhanced by lake moisture.'
    }
  },
  'indianapolis-in': {
    name: 'Indianapolis',
    state: 'IN',
    searchTerm: 'Indianapolis, IN',
    title: 'Indianapolis Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Indianapolis, IN. Real-time Indiana weather with severe storm tracking.',
    content: {
      intro: 'Indianapolis has a humid continental climate with four distinct seasons and variable weather.',
      climate: 'Hot, humid summers. Cold winters with moderate snow. Spring and fall are pleasant but changeable.',
      patterns: 'Severe thunderstorms and occasional tornadoes in spring. Winter ice storms can occur.'
    }
  },
  'columbus-oh': {
    name: 'Columbus',
    state: 'OH',
    searchTerm: 'Columbus, OH',
    title: 'Columbus Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Columbus, OH. Real-time Central Ohio weather data.',
    content: {
      intro: 'Columbus has a humid continental climate with hot summers and cold winters typical of the Midwest.',
      climate: 'Hot, humid summers with frequent thunderstorms. Cold winters with moderate snowfall.',
      patterns: 'Severe weather possible in spring. Variable weather patterns common throughout the year.'
    }
  },
  'charlotte-nc': {
    name: 'Charlotte',
    state: 'NC',
    searchTerm: 'Charlotte, NC',
    title: 'Charlotte Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Charlotte, NC. Real-time Piedmont weather with severe storm tracking.',
    content: {
      intro: 'Charlotte has a humid subtropical climate with hot summers and mild winters.',
      climate: 'Hot, humid summers. Mild winters with occasional snow and ice. Pleasant spring and fall.',
      patterns: 'Severe thunderstorms in spring and summer. Winter ice storms can cause significant disruption.'
    }
  },
  'baltimore-md': {
    name: 'Baltimore',
    state: 'MD',
    searchTerm: 'Baltimore, MD',
    title: 'Baltimore Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Baltimore, MD. Real-time Chesapeake Bay area weather.',
    content: {
      intro: 'Baltimore has a humid subtropical climate influenced by the Chesapeake Bay.',
      climate: 'Hot, humid summers. Cold winters with variable precipitation including snow, sleet, and freezing rain.',
      patterns: 'Nor\'easters can bring significant snow. Summer thunderstorms are common.'
    }
  },
  'milwaukee-wi': {
    name: 'Milwaukee',
    state: 'WI',
    searchTerm: 'Milwaukee, WI',
    title: 'Milwaukee Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Milwaukee, WI. Real-time Lake Michigan weather with winter storm tracking.',
    content: {
      intro: 'Milwaukee has a humid continental climate strongly influenced by Lake Michigan.',
      climate: 'Cold winters with lake effect snow. Warm summers moderated by lake breezes.',
      patterns: 'Lake effect enhances winter snow. Arctic outbreaks bring dangerous cold.'
    }
  },
  'kansas-city-mo': {
    name: 'Kansas City',
    state: 'MO',
    searchTerm: 'Kansas City, MO',
    title: 'Kansas City Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Kansas City, MO. Real-time weather with severe storm and tornado tracking.',
    content: {
      intro: 'Kansas City has a humid continental climate with hot summers and cold winters in Tornado Alley.',
      climate: 'Hot, humid summers with severe weather. Cold winters with ice and snow.',
      patterns: 'Severe thunderstorms and tornadoes in spring. Rapid temperature changes from Arctic fronts.'
    }
  },
  'salt-lake-city-ut': {
    name: 'Salt Lake City',
    state: 'UT',
    searchTerm: 'Salt Lake City, UT',
    title: 'Salt Lake City Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Salt Lake City, UT. Real-time weather with ski conditions and inversions.',
    content: {
      intro: 'Salt Lake City has a semi-arid continental climate with four seasons and mountain influences.',
      climate: 'Hot, dry summers. Cold winters with significant snow in mountains. Inversions trap cold air.',
      patterns: 'Winter inversions create poor air quality. Lake effect snow from Great Salt Lake.'
    }
  },
  'raleigh-nc': {
    name: 'Raleigh',
    state: 'NC',
    searchTerm: 'Raleigh, NC',
    title: 'Raleigh Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Raleigh, NC. Real-time Triangle area weather.',
    content: {
      intro: 'Raleigh has a humid subtropical climate with hot summers and mild winters.',
      climate: 'Hot, humid summers with afternoon thunderstorms. Mild winters with occasional snow and ice.',
      patterns: 'Winter precipitation often a mix of rain, sleet, and snow. Hurricanes can bring heavy rain.'
    }
  },
  'new-orleans-la': {
    name: 'New Orleans',
    state: 'LA',
    searchTerm: 'New Orleans, LA',
    title: 'New Orleans Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for New Orleans, LA. Real-time Gulf weather with hurricane tracking.',
    content: {
      intro: 'New Orleans has a humid subtropical climate with very hot summers and mild winters near the Gulf.',
      climate: 'Very hot, humid summers with daily thunderstorms. Mild winters rarely see frost.',
      patterns: 'Vulnerable to hurricanes and tropical storms. Flash flooding common in heavy rain.'
    }
  },
  'virginia-beach-va': {
    name: 'Virginia Beach',
    state: 'VA',
    searchTerm: 'Virginia Beach, VA',
    title: 'Virginia Beach Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Virginia Beach, VA. Real-time beach weather and ocean conditions.',
    content: {
      intro: 'Virginia Beach has a humid subtropical climate moderated by the Atlantic Ocean.',
      climate: 'Warm, humid summers. Mild winters with occasional nor\'easters.',
      patterns: 'Nor\'easters can bring coastal flooding. Hurricanes can impact the area.'
    }
  },
  'sacramento-ca': {
    name: 'Sacramento',
    state: 'CA',
    searchTerm: 'Sacramento, CA',
    title: 'Sacramento Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Sacramento, CA. Real-time Central Valley weather.',
    content: {
      intro: 'Sacramento has a Mediterranean climate with hot, dry summers and mild, wet winters.',
      climate: 'Very hot summers with temperatures often exceeding 100°F. Mild, rainy winters. Dense fog in winter.',
      patterns: 'Tule fog can reduce visibility dramatically in winter. Atmospheric rivers bring heavy rain.'
    }
  },
  'pittsburgh-pa': {
    name: 'Pittsburgh',
    state: 'PA',
    searchTerm: 'Pittsburgh, PA',
    title: 'Pittsburgh Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Pittsburgh, PA. Real-time Steel City weather.',
    content: {
      intro: 'Pittsburgh has a humid continental climate with four distinct seasons at the confluence of three rivers.',
      climate: 'Warm, humid summers. Cold winters with significant snowfall. Frequent cloudy days.',
      patterns: 'One of the cloudiest cities in the US. Lake effect can enhance winter precipitation.'
    }
  },
  'st-louis-mo': {
    name: 'St. Louis',
    state: 'MO',
    searchTerm: 'St. Louis, MO',
    title: 'St. Louis Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for St. Louis, MO. Real-time Gateway City weather.',
    content: {
      intro: 'St. Louis has a humid continental climate with hot summers and cold winters near Tornado Alley.',
      climate: 'Hot, humid summers with severe weather potential. Cold winters with ice and snow.',
      patterns: 'Severe thunderstorms and tornadoes possible in spring. Summer heat waves common.'
    }
  },
  'cincinnati-oh': {
    name: 'Cincinnati',
    state: 'OH',
    searchTerm: 'Cincinnati, OH',
    title: 'Cincinnati Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Cincinnati, OH. Real-time Ohio Valley weather.',
    content: {
      intro: 'Cincinnati has a humid continental climate in the Ohio River valley.',
      climate: 'Hot, humid summers. Cold winters with moderate snow. Variable spring and fall.',
      patterns: 'Severe thunderstorms in spring and summer. Winter precipitation varies widely.'
    }
  },
  'honolulu-hi': {
    name: 'Honolulu',
    state: 'HI',
    searchTerm: 'Honolulu, HI',
    title: 'Honolulu Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Honolulu, HI. Real-time Hawaiian weather with trade wind tracking.',
    content: {
      intro: 'Honolulu has a tropical climate with warm temperatures year-round and trade wind breezes.',
      climate: 'Consistent temperatures in the 80s°F (27-29°C) year-round. Two seasons: dry and wet.',
      patterns: 'Trade winds keep conditions pleasant. Kona storms bring rain. Hurricane season June-November.'
    }
  },
  'anchorage-ak': {
    name: 'Anchorage',
    state: 'AK',
    searchTerm: 'Anchorage, AK',
    title: 'Anchorage Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Anchorage, AK. Real-time Alaska weather with aurora conditions.',
    content: {
      intro: 'Anchorage has a subarctic climate with cold winters and mild summers. Daylight varies dramatically by season.',
      climate: 'Cool summers with nearly 20 hours of daylight. Cold winters with short days. Moderate precipitation.',
      patterns: 'Chinook winds can rapidly warm winter temperatures. Summer stays cool due to ocean influence.'
    }
  },
  'san-jose-ca': {
    name: 'San Jose',
    state: 'CA',
    searchTerm: 'San Jose, CA',
    title: 'San Jose Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for San Jose, CA. Real-time Silicon Valley weather.',
    content: {
      intro: 'San Jose has a Mediterranean climate with warm, dry summers and mild, wet winters.',
      climate: 'Warm summers with low humidity. Mild winters with most rain occurring November-March.',
      patterns: 'Protected from coastal fog by mountains. Drought conditions are common.'
    }
  },
  'jacksonville-fl': {
    name: 'Jacksonville',
    state: 'FL',
    searchTerm: 'Jacksonville, FL',
    title: 'Jacksonville Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Jacksonville, FL. Real-time First Coast weather.',
    content: {
      intro: 'Jacksonville has a humid subtropical climate with hot summers and mild winters.',
      climate: 'Hot, humid summers with afternoon thunderstorms. Mild winters occasionally see frost.',
      patterns: 'Afternoon sea breezes moderate summer temperatures. Hurricanes can impact the area.'
    }
  },
  'fort-worth-tx': {
    name: 'Fort Worth',
    state: 'TX',
    searchTerm: 'Fort Worth, TX',
    title: 'Fort Worth Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Fort Worth, TX. Real-time DFW metroplex weather.',
    content: {
      intro: 'Fort Worth shares Dallas\'s climate with hot summers and mild winters in Tornado Alley.',
      climate: 'Hot summers often exceeding 100°F. Mild winters with occasional ice storms.',
      patterns: 'Severe thunderstorms and tornadoes in spring. Rapid temperature changes possible.'
    }
  },
  'albuquerque-nm': {
    name: 'Albuquerque',
    state: 'NM',
    searchTerm: 'Albuquerque, NM',
    title: 'Albuquerque Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Albuquerque, NM. Real-time high desert weather.',
    content: {
      intro: 'Albuquerque has a semi-arid climate with hot summers and cold nights at 5,000 feet elevation.',
      climate: 'Hot days and cool nights in summer. Mild winters with occasional snow. Low humidity.',
      patterns: 'Monsoon thunderstorms in July-August. Large temperature swings between day and night.'
    }
  },
  'tucson-az': {
    name: 'Tucson',
    state: 'AZ',
    searchTerm: 'Tucson, AZ',
    title: 'Tucson Weather Forecast - 16 Bit Weather',
    description: 'Current weather conditions and 5-day forecast for Tucson, AZ. Real-time Sonoran Desert weather.',
    content: {
      intro: 'Tucson has a hot desert climate similar to Phoenix but slightly cooler due to higher elevation.',
      climate: 'Very hot summers with temperatures over 100°F. Mild winters. Monsoon rains in summer.',
      patterns: 'Summer monsoon brings thunderstorms and dust storms. Low humidity most of the year.'
    }
  }
}

// ==========================================================================
// RICH SEO ENRICHMENTS
// Optional per-city marketing content used by the server-rendered city page.
// Cities without an entry here fall back to the intro/climate/patterns copy
// plus auto-generated structure. Flagship cities below should rank well for
// "<city> weather", "<city> climate", "best time to visit <city>" queries.
// ==========================================================================

export interface CitySeoEnrichment {
  /** Climate classification (Köppen or plain-English label). */
  climateType: string
  /** Seasonal breakdown — each string is 1-2 sentences. */
  seasons: {
    spring: string
    summer: string
    fall: string
    winter: string
  }
  /** 12 average monthly high temps in °F, Jan → Dec. */
  monthlyHighs: number[]
  /** 12 average monthly low temps in °F, Jan → Dec. */
  monthlyLows: number[]
  /** Short recommendation of when weather is most pleasant. */
  bestTimeToVisit: string
  /** Notable weather hazards — used as chips in the UI. */
  severeRisks: string[]
  /** Short factoids that differentiate this city from template copy. */
  uniqueFacts: string[]
  /** FAQ questions and answers — powers FAQPage JSON-LD for featured snippets. */
  faqs: { question: string; answer: string }[]
}

export const cityEnrichments: Record<string, CitySeoEnrichment> = {
  'new-york-ny': {
    climateType: 'Humid subtropical (Köppen Cfa)',
    seasons: {
      spring: 'Spring in NYC runs cool and variable — March can still see snow, April brings cherry blossoms, and May warms quickly into the 70s°F. Expect fast-changing conditions as winter storms give way to summer patterns.',
      summer: 'Summers are hot, humid, and sticky with average highs in the mid-80s°F and frequent heat waves pushing into the 90s. Afternoon thunderstorms roll off the Atlantic several times per month.',
      fall: 'Fall is widely considered NYC\'s best weather season. September stays mild, October brings crisp 60°F days and vivid foliage in nearby parks, and November edges toward cold.',
      winter: 'Winter is cold and often raw, with average highs in the 40s°F and lows in the 20s°F. The city averages 28 inches of snow per year, frequently delivered by a single nor\'easter or two.',
    },
    monthlyHighs: [40, 43, 51, 62, 72, 80, 85, 84, 77, 66, 55, 44],
    monthlyLows: [27, 29, 36, 45, 55, 65, 70, 69, 62, 51, 42, 32],
    bestTimeToVisit: 'Mid-September through late October offers the most comfortable weather — warm days, cool nights, low humidity, and fall foliage. Late April through early June is a close second.',
    severeRisks: ['Nor\'easters', 'Heat waves', 'Hurricane remnants', 'Ice storms', 'Urban flooding'],
    uniqueFacts: [
      'The urban heat island effect keeps NYC several degrees warmer than surrounding suburbs, especially at night.',
      'Central Park holds the city\'s official weather records dating back to 1869.',
      'Coastal proximity moderates extremes — NYC rarely sees temperatures below 0°F or above 100°F.',
    ],
    faqs: [
      { question: 'What is the best month to visit New York City for weather?', answer: 'October is typically the best month — average highs in the mid-60s°F, low humidity, minimal rain, and peak fall foliage. May is a close second for similar conditions before summer humidity arrives.' },
      { question: 'Does it snow a lot in New York City?', answer: 'NYC averages about 28 inches of snow per year, mostly between December and March. Individual nor\'easters can drop 8-24 inches at a time, and the biggest blizzards have buried the city in 30+ inches.' },
      { question: 'How humid does New York get in summer?', answer: 'July and August routinely see dewpoints above 70°F, which feels oppressive. Heat index values can push above 100°F during heat waves even when the air temperature is in the low 90s.' },
      { question: 'When is hurricane season in New York?', answer: 'The Atlantic hurricane season runs June 1 through November 30, but NYC impacts are most likely in August and September. Direct hits are rare, but remnants of tropical systems regularly bring heavy rain and flooding.' },
    ],
  },
  'los-angeles-ca': {
    climateType: 'Mediterranean (Köppen Csb)',
    seasons: {
      spring: 'Spring is mild and pleasant with highs in the 60s-70s°F. May gray brings a stubborn marine layer that often hangs around until afternoon, especially along the coast.',
      summer: 'Summers are warm, dry, and sunny — coastal LA stays in the 70s°F while inland valleys regularly push into the 90s and 100s°F. Rain is essentially nonexistent from June through September.',
      fall: 'Fall brings LA\'s warmest weather, with September and October often hotter than July. Santa Ana winds kick up from the desert, raising fire danger and pushing temperatures into the 90s°F.',
      winter: 'Winters are mild with highs in the 60s-70s°F. Most of LA\'s 15 inches of annual rain falls between December and March, sometimes arriving as intense atmospheric rivers.',
    },
    monthlyHighs: [68, 69, 70, 73, 74, 78, 83, 84, 83, 79, 73, 68],
    monthlyLows: [49, 51, 53, 56, 59, 63, 66, 67, 65, 60, 53, 48],
    bestTimeToVisit: 'March through May and September through November offer the best balance — warm, dry, and without the extreme summer inland heat or winter rains. October is a local favorite.',
    severeRisks: ['Wildfires', 'Santa Ana winds', 'Atmospheric rivers', 'Drought', 'Debris flows'],
    uniqueFacts: [
      'LA enjoys more than 280 sunny days per year — one of the highest in the US.',
      'Microclimates mean a 20°F difference between beach and valley on the same afternoon.',
      'The "June Gloom" marine layer can keep coastal temperatures 15°F below inland readings.',
    ],
    faqs: [
      { question: 'What is the best time of year to visit Los Angeles?', answer: 'April, May, October, and November offer the most comfortable weather — warm days in the 70s°F, cool nights, low humidity, and minimal rain. Summer is hot inland but perfect at the beach.' },
      { question: 'Does it ever rain in Los Angeles?', answer: 'Yes, but almost exclusively between November and April. LA averages about 15 inches of rain per year, most of it delivered by a handful of atmospheric river storms in winter.' },
      { question: 'What are Santa Ana winds?', answer: 'Santa Ana winds are hot, dry, downslope winds that blow from the Mojave Desert toward the coast, typically in fall. They dramatically lower humidity, raise temperatures, and create extreme wildfire risk.' },
      { question: 'Why is Los Angeles so foggy in May and June?', answer: 'The cold Pacific water offshore condenses into a thick marine layer that drifts onshore overnight. "May gray" and "June gloom" can keep coastal LA cloudy until late morning for weeks at a time.' },
    ],
  },
  'chicago-il': {
    climateType: 'Humid continental (Köppen Dfa)',
    seasons: {
      spring: 'Spring in Chicago is famously fickle — snow in April isn\'t unusual, but so are 80°F days. Temperatures swing wildly as Arctic and Gulf air masses collide over the city.',
      summer: 'Summers are hot and humid with highs in the low 80s°F and dewpoints pushing into the 70s. Afternoon and evening thunderstorms are frequent, some of them severe.',
      fall: 'Fall brings crisp air, colorful trees, and some of the year\'s most stable weather. Highs drop from the 70s°F in September to the 40s°F by late November.',
      winter: 'Winters are cold, snowy, and windy. Average highs sit in the low 30s°F, lows often drop into the teens, and Arctic outbreaks can plunge temperatures below 0°F. Lake effect and nor\'easter-style snowstorms combine for 37 inches of annual snowfall.',
    },
    monthlyHighs: [32, 36, 47, 59, 70, 80, 85, 83, 76, 63, 48, 36],
    monthlyLows: [18, 22, 32, 42, 52, 62, 68, 66, 58, 46, 34, 23],
    bestTimeToVisit: 'Late May through early October for warm weather, with September being the sweet spot — warm days, cool nights, and far less humidity than peak summer.',
    severeRisks: ['Blizzards', 'Tornadoes', 'Lake-effect snow', 'Polar vortex outbreaks', 'Severe thunderstorms'],
    uniqueFacts: [
      'Chicago\'s "Windy City" nickname is actually about politicians, not weather — though 10+ mph average winds help.',
      'Lake Michigan moderates temperatures year-round, keeping lakefront neighborhoods cooler in summer and milder in winter.',
      'The record low in Chicago is -27°F, set during the 1985 polar vortex.',
    ],
    faqs: [
      { question: 'When is the best time to visit Chicago weather-wise?', answer: 'September and early October deliver warm days in the 70s°F, cool nights, low humidity, and low rain chances. June is also excellent before summer humidity peaks.' },
      { question: 'How cold does Chicago get in winter?', answer: 'Average winter highs are in the low 30s°F with lows in the teens. Arctic outbreaks can push wind chills below -30°F. The city averages about 37 inches of snow per winter.' },
      { question: 'Does Chicago get tornadoes?', answer: 'Yes — Chicago sits at the northeastern edge of Tornado Alley, and the metro area averages several tornado warnings per year. Most occur between April and June.' },
      { question: 'What is the "lake effect" in Chicago?', answer: 'Cold air passing over warmer Lake Michigan picks up moisture and dumps it as heavy snow on the downwind shore. Chicago sees lake-effect snow less often than cities like Buffalo but it can still produce intense bursts.' },
    ],
  },
  'miami-fl': {
    climateType: 'Tropical monsoon (Köppen Am)',
    seasons: {
      spring: 'Spring is warm, dry, and sunny — arguably Miami\'s most pleasant season. Highs climb from the upper 70s°F in March to the upper 80s°F by May with low humidity.',
      summer: 'Summers are hot, humid, and stormy with daily afternoon thunderstorms rolling off the Everglades. Highs sit in the upper 80s to low 90s°F, and the real temperature feels well into the 100s with humidity.',
      fall: 'Fall is still warm and humid and represents the peak of hurricane season. September and October see the highest tropical threat; weather stays summer-like through November.',
      winter: 'Winters are warm and dry with highs in the mid-70s°F and lows in the 60s°F. Cold fronts occasionally push temperatures into the 40s°F for a night or two.',
    },
    monthlyHighs: [76, 78, 80, 83, 86, 89, 90, 90, 88, 85, 81, 77],
    monthlyLows: [61, 62, 65, 68, 72, 75, 77, 77, 76, 73, 68, 63],
    bestTimeToVisit: 'December through April — warm, dry, low humidity, minimal rain, and outside hurricane season. January and February are peak tourist months for a reason.',
    severeRisks: ['Hurricanes', 'Tropical storms', 'Flash flooding', 'Storm surge', 'Daily lightning'],
    uniqueFacts: [
      'Miami has a true tropical climate — the only major US city besides Honolulu that qualifies.',
      'The city averages 74 thunderstorm days per year, most concentrated in summer afternoons.',
      'Sea breeze collisions between the Atlantic and Gulf fronts create intense, predictable daily storms.',
    ],
    faqs: [
      { question: 'When is the best time to visit Miami?', answer: 'December through April is ideal — warm, dry, sunny, low humidity, and outside hurricane season. Expect highs in the 70s-80s°F and minimal rain.' },
      { question: 'When is hurricane season in Miami?', answer: 'The Atlantic hurricane season runs June 1 through November 30, with the highest risk in August, September, and October. Miami is one of the most hurricane-exposed major US cities.' },
      { question: 'Does Miami get cold in winter?', answer: 'Rarely. Winter highs average in the mid-70s°F and lows in the 60s°F. A strong cold front can briefly push temperatures into the 40s°F, but freezes are extremely rare.' },
      { question: 'Why does it rain every afternoon in Miami?', answer: 'The daily sea breeze pulls moist air inland where it collides with warmer surfaces and triggers afternoon thunderstorms. From June through September, these storms happen nearly every day between 2-6 PM.' },
    ],
  },
  'seattle-wa': {
    climateType: 'Oceanic / marine west coast (Köppen Cfb)',
    seasons: {
      spring: 'Spring is cool and damp with highs slowly climbing from the 50s°F in March to the 60s°F in May. Expect frequent light rain but also longer stretches of sunshine as the season progresses.',
      summer: 'Summers are glorious — warm, dry, and sunny with highs in the upper 70s°F and comfortable low humidity. July and August are the driest months, with almost no rain at all.',
      fall: 'Fall starts pleasant in September and quickly turns wet. By mid-October the Pacific storm track returns, bringing the classic Seattle drizzle and increasingly short days.',
      winter: 'Winters are mild but overcast, with highs in the 40s°F and persistent light rain. Snow is rare in the city itself but common in the nearby Cascades.',
    },
    monthlyHighs: [48, 50, 54, 59, 66, 71, 77, 77, 71, 60, 51, 47],
    monthlyLows: [37, 38, 40, 43, 48, 53, 57, 58, 53, 46, 41, 36],
    bestTimeToVisit: 'July through early September — warm, dry, long days, and some of the best summer weather in the country. Book in advance; locals are outside.',
    severeRisks: ['Atmospheric rivers', 'Wildfire smoke', 'Windstorms', 'Ice storms', 'Landslides'],
    uniqueFacts: [
      'Seattle receives less annual rainfall than New York, Miami, or Atlanta — its reputation comes from drizzle frequency, not volume.',
      'The city enjoys some of the longest summer days in the lower 48, with over 16 hours of daylight in June.',
      'The Olympic Mountains create a rain shadow that keeps Seattle drier than the coast to the west.',
    ],
    faqs: [
      { question: 'Does it really rain all the time in Seattle?', answer: 'Not really. Seattle averages 37 inches of rain per year — less than NYC, Miami, or Atlanta. But it rains often in small amounts, with 150+ cloudy days per year from October through May.' },
      { question: 'When is the best time to visit Seattle?', answer: 'Mid-July through early September. Warm, dry, sunny weather with highs in the upper 70s°F, long daylight hours, and minimal rain. September is a quieter alternative.' },
      { question: 'Does Seattle get snow?', answer: 'Only occasionally. The city averages about 5 inches of snow per year, usually in brief events. When snow does fall, the hilly streets make travel difficult.' },
      { question: 'How cold does Seattle get?', answer: 'Mild by US standards — winter highs average in the upper 40s°F and lows in the upper 30s°F. Hard freezes happen a few times per year but extended deep cold is rare.' },
    ],
  },
  'houston-tx': {
    climateType: 'Humid subtropical (Köppen Cfa)',
    seasons: {
      spring: 'Spring starts pleasant in March with 70s°F, but humidity and temperatures climb fast. By May, afternoon heat indices regularly push past 95°F and severe thunderstorms roll in off the Gulf.',
      summer: 'Summers are oppressive — highs in the mid-90s°F, dewpoints near 75°F, and heat index values over 105°F on most afternoons. Daily pop-up thunderstorms offer brief relief.',
      fall: 'October finally breaks the heat and brings Houston\'s best weather. Highs drop into the 80s°F, humidity falls, and October-November are peak hurricane-watching months.',
      winter: 'Winters are mild with highs in the 60s°F and lows in the 40s°F. Hard freezes happen once or twice per year when Arctic fronts punch deep into Texas.',
    },
    monthlyHighs: [62, 66, 73, 80, 87, 92, 94, 94, 90, 82, 72, 64],
    monthlyLows: [43, 46, 53, 60, 68, 73, 75, 75, 71, 62, 53, 45],
    bestTimeToVisit: 'Late October through early April — warm days, cool nights, low humidity, minimal storm risk, and outside of hurricane season. January is ideal for outdoor activities.',
    severeRisks: ['Hurricanes', 'Flash flooding', 'Severe thunderstorms', 'Heat waves', 'Hard freezes'],
    uniqueFacts: [
      'Houston averages 50 inches of rain per year — more than Seattle and comparable to Miami.',
      'The city sits just 50 miles from the Gulf, making it one of the most hurricane-exposed major US metros.',
      'Hurricane Harvey dropped 60+ inches of rain on parts of Houston in 2017, a US record.',
    ],
    faqs: [
      { question: 'When is the best time to visit Houston?', answer: 'November through March offers Houston\'s most pleasant weather — mild temperatures in the 60s-70s°F, low humidity, and minimal storm risk. January and February are peak outdoor months.' },
      { question: 'Is Houston really that humid?', answer: 'Yes. Summer dewpoints regularly exceed 75°F, which feels oppressive. The heat index often climbs above 105°F from June through September, making outdoor activity genuinely dangerous in peak afternoon.' },
      { question: 'When is hurricane season in Houston?', answer: 'Hurricane season runs June 1 through November 30, with peak risk in August and September. Houston has been hit or grazed by over a dozen major storms in the past 50 years, including Harvey (2017) and Ike (2008).' },
      { question: 'Does it ever snow in Houston?', answer: 'Very rarely — maybe once every few years, and usually just a dusting. The last memorable Houston snowstorm was in 2017, when the city saw about an inch.' },
    ],
  },
  'phoenix-az': {
    climateType: 'Hot desert (Köppen BWh)',
    seasons: {
      spring: 'Spring starts perfect in March with highs in the 70s°F and blue skies, but by mid-April temperatures are already climbing past 90°F. Wildflower season in the Sonoran Desert peaks in March.',
      summer: 'Summers are brutal — highs routinely exceed 110°F from late May through early September, with several days per year topping 115°F. The North American Monsoon brings dramatic evening thunderstorms and dust storms (haboobs) in July and August.',
      fall: 'Fall cools slowly. September still sees 100°F days, but October drops into the 80s°F and November is delightful. This is when snowbirds start arriving.',
      winter: 'Winters are Phoenix\'s best-kept secret — sunny, dry, with highs in the 60s-70s°F and lows in the 40s°F. Essentially zero rain and perfect outdoor weather.',
    },
    monthlyHighs: [67, 72, 78, 86, 95, 104, 106, 104, 100, 89, 76, 66],
    monthlyLows: [46, 49, 53, 60, 69, 78, 83, 83, 77, 65, 54, 46],
    bestTimeToVisit: 'November through April is Phoenix\'s prime season — warm, dry, sunny, and outside the extreme summer heat. February and March are peak snowbird months for a reason.',
    severeRisks: ['Extreme heat', 'Dust storms (haboobs)', 'Monsoon thunderstorms', 'Flash flooding', 'Wildfires'],
    uniqueFacts: [
      'Phoenix averages 110 days per year with highs over 100°F — more than anywhere else in the US.',
      'The all-time record high is 122°F, set in 1990 when airplanes couldn\'t legally take off.',
      'Annual rainfall is only about 8 inches, most of it from summer monsoon thunderstorms.',
    ],
    faqs: [
      { question: 'When is the best time to visit Phoenix?', answer: 'November through April. Daytime highs in the 60s-80s°F, cool nights, sunshine, and essentially no rain. Summer (May-September) is dangerously hot and best avoided unless you have a pool.' },
      { question: 'How hot does Phoenix actually get?', answer: 'Summer highs routinely hit 110-115°F, with the record at 122°F. Pavement temperatures can exceed 180°F — hot enough to cause serious burns from a brief fall.' },
      { question: 'What is monsoon season in Phoenix?', answer: 'The North American Monsoon runs from mid-June through September, bringing dramatic late-afternoon and evening thunderstorms, heavy rain, lightning, and massive dust storms called haboobs that can reduce visibility to zero.' },
      { question: 'Does it ever freeze in Phoenix?', answer: 'Very rarely. Winter nights occasionally dip into the upper 30s°F, and the record low is 16°F from 1913. A hard freeze affecting the whole metro happens only every few decades.' },
    ],
  },
  'philadelphia-pa': {
    climateType: 'Humid subtropical (Köppen Cfa)',
    seasons: {
      spring: 'Spring is variable with highs climbing from the 50s°F in March to the 70s°F by May. Cherry blossoms peak in early April and outdoor cafes start filling in.',
      summer: 'Summers are hot and humid with highs in the mid-80s°F and frequent heat waves pushing past 90°F. Afternoon thunderstorms rumble through several times a month.',
      fall: 'Fall is Philadelphia at its best — mild, sunny days in the 60s°F, crisp nights, and peak foliage in mid-October. Arguably the best weather season in the city.',
      winter: 'Winters are cold with highs in the 40s°F and lows in the upper 20s°F. The city averages 22 inches of snow per year, mostly from nor\'easters in January and February.',
    },
    monthlyHighs: [40, 43, 52, 63, 73, 82, 87, 85, 78, 67, 56, 45],
    monthlyLows: [25, 27, 34, 44, 54, 64, 69, 68, 60, 48, 39, 30],
    bestTimeToVisit: 'Mid-September through late October, or late April through early June. Both deliver mild temperatures, low humidity, and minimal rain. October brings the added bonus of peak fall foliage.',
    severeRisks: ['Nor\'easters', 'Heat waves', 'Hurricane remnants', 'Ice storms', 'Severe thunderstorms'],
    uniqueFacts: [
      'Philadelphia sits in a transition zone between the cold Northeast and the humid South, which creates its variable weather.',
      'The city averages 22 inches of snow per year, but the 2009-10 winter dropped over 78 inches.',
      'Summer heat waves are often worse in Philly than NYC because the city sits further from coastal moderation.',
    ],
    faqs: [
      { question: 'When is the best time to visit Philadelphia?', answer: 'October is the sweet spot — warm days in the 60s-70s°F, cool evenings, low humidity, minimal rain, and peak fall foliage. May is a close second for similar conditions before summer humidity arrives.' },
      { question: 'How much snow does Philadelphia get?', answer: 'About 22 inches per year on average, but individual nor\'easters can drop 10-20+ inches at a time. The historic 2009-10 winter buried Philly under nearly 80 inches total.' },
      { question: 'Does Philadelphia get hurricanes?', answer: 'Direct hits are rare, but remnants of tropical storms frequently bring heavy rain and flooding. Hurricane Sandy (2012) and Ida (2021) both caused significant damage to the Philadelphia region.' },
      { question: 'Is Philadelphia humid in summer?', answer: 'Yes. July and August dewpoints regularly push into the low 70s°F, which feels muggy. Heat index values above 100°F happen several times per summer.' },
    ],
  },
  'san-antonio-tx': {
    climateType: 'Humid subtropical (Köppen Cfa)',
    seasons: {
      spring: 'Spring is beautiful and fleeting — March and April bring wildflower blooms (especially bluebonnets) and mild 70s-80s°F days. By May the heat is already cranking up.',
      summer: 'Summers are long and intense with highs consistently in the mid-90s°F and occasional triple-digit days. The heat is less humid than Houston but still draining by afternoon.',
      fall: 'Fall weather finally arrives in late October, dropping temperatures into the 80s°F. November is mild, pleasant, and one of the best times for outdoor activities along the River Walk.',
      winter: 'Winters are short and mild with highs in the 60s°F and occasional cold fronts. Hard freezes happen once or twice per year when Arctic air pushes south.',
    },
    monthlyHighs: [63, 67, 74, 81, 87, 93, 96, 96, 91, 82, 72, 64],
    monthlyLows: [41, 44, 51, 59, 67, 73, 75, 75, 70, 61, 51, 43],
    bestTimeToVisit: 'Mid-October through April. Mild temperatures, low rain chances, and comfortable humidity make this the prime time for Fiesta, the River Walk, and outdoor exploration.',
    severeRisks: ['Severe thunderstorms', 'Hail', 'Flash flooding', 'Heat waves', 'Drought'],
    uniqueFacts: [
      'San Antonio sits on the edge of "Flash Flood Alley" — a narrow corridor prone to explosive rainfall events.',
      'The Fiesta celebration in late April coincides with the last comfortable weather before summer heat.',
      'Texas Hill Country to the north creates upslope enhancement during storms, boosting rainfall totals.',
    ],
    faqs: [
      { question: 'When is the best time to visit San Antonio?', answer: 'Late October through April delivers San Antonio\'s best weather — highs in the 60s-80s°F, low humidity, and minimal storm risk. April brings wildflowers and Fiesta season.' },
      { question: 'How hot are San Antonio summers?', answer: 'Very hot. June through September averages highs in the mid-90s°F with occasional triple-digit days. It\'s drier than Houston but still draining.' },
      { question: 'Does San Antonio flood?', answer: 'Yes — the area is part of "Flash Flood Alley." Heavy rainfall from tropical systems or severe thunderstorms can cause rapid flooding, especially in low-water crossings and creeks.' },
      { question: 'Does it ever snow in San Antonio?', answer: 'Very rarely. A dusting of snow occurs maybe once every 5-10 years, and accumulating snow is a once-a-generation event. February 2021 was a notable exception when a hard freeze brought several inches.' },
    ],
  },
  'san-diego-ca': {
    climateType: 'Semi-arid Mediterranean (Köppen BSk/Csb)',
    seasons: {
      spring: 'Spring is mild and sunny with highs in the 60s-70s°F. The marine layer (May gray) can keep mornings cloudy along the coast, typically clearing by early afternoon.',
      summer: 'Summers are San Diego\'s defining feature — sunny, dry, and perfectly comfortable with highs in the 70s°F at the beach and low 80s°F inland. Humidity stays low and ocean breezes are constant.',
      fall: 'Fall brings the warmest weather with September and October often topping summer averages. Santa Ana winds occasionally push temperatures past 90°F and raise wildfire risk.',
      winter: 'Winters are mild with highs in the mid-60s°F and lows in the 50s°F. Most of the city\'s 10 inches of annual rain falls between December and March.',
    },
    monthlyHighs: [66, 66, 66, 68, 69, 72, 76, 78, 77, 74, 70, 66],
    monthlyLows: [50, 52, 54, 56, 59, 62, 66, 67, 65, 61, 55, 50],
    bestTimeToVisit: 'Honestly, any time — San Diego\'s climate is remarkably consistent year-round. September and October offer the warmest, driest conditions; March through May is beautiful and less crowded.',
    severeRisks: ['Wildfires', 'Santa Ana winds', 'Drought', 'Atmospheric rivers', 'Coastal fog'],
    uniqueFacts: [
      'San Diego has the most stable climate of any major US city — monthly average highs vary only 12°F from January to August.',
      'Downtown San Diego has never recorded a temperature below 25°F or above 111°F in 150+ years of records.',
      'Annual rainfall is only about 10 inches, making San Diego drier than most of California\'s coast.',
    ],
    faqs: [
      { question: 'What is the best time of year to visit San Diego?', answer: 'San Diego is great year-round, but September and October offer the warmest, driest weather with highs in the upper 70s°F and minimal fog. Spring (March-May) is pleasant and less crowded.' },
      { question: 'Does it rain much in San Diego?', answer: 'Barely. San Diego averages only about 10 inches of rain per year, almost all between November and April. Summer is essentially dry, and it often goes months without measurable rain.' },
      { question: 'What is "May gray" and "June gloom"?', answer: 'A persistent marine layer that forms when cold Pacific water cools moist air into low clouds. Coastal neighborhoods can stay cloudy until late morning or early afternoon for weeks in May and June.' },
      { question: 'Does San Diego get hot?', answer: 'Rarely. Coastal highs stay in the 70s°F most of the year. The main exception is Santa Ana wind events in fall, when inland temperatures can briefly push past 100°F.' },
    ],
  },
  'dallas-tx': {
    climateType: 'Humid subtropical (Köppen Cfa)',
    seasons: {
      spring: 'Spring is Dallas\'s most dangerous weather season — this is peak tornado and severe thunderstorm time. April and May bring large hail, damaging winds, and occasional tornadoes across the metroplex.',
      summer: 'Summers are long, hot, and relentless. Highs routinely push past 100°F from June through early September, and it\'s not uncommon to see 30+ triple-digit days in a row.',
      fall: 'Fall finally arrives in October with temperatures dropping into the 80s°F. November is mild and pleasant — the best outdoor weather of the year.',
      winter: 'Winters are mostly mild but punctuated by occasional ice storms and Arctic blasts. Highs average in the 50s°F with lows in the 30s°F, but temperatures can swing 50°F in 24 hours.',
    },
    monthlyHighs: [57, 62, 70, 77, 85, 93, 97, 97, 89, 79, 67, 58],
    monthlyLows: [37, 41, 48, 56, 65, 73, 76, 76, 69, 58, 47, 39],
    bestTimeToVisit: 'October and November for mild, dry, pleasant weather before winter cold fronts. Late March through early May is also beautiful, though severe weather risk is elevated.',
    severeRisks: ['Tornadoes', 'Large hail', 'Severe thunderstorms', 'Ice storms', 'Extreme heat'],
    uniqueFacts: [
      'Dallas sits in the heart of Tornado Alley — the North Texas region averages several tornado warnings each spring.',
      'The 2011 summer saw 70 days of 100°F+ temperatures, a modern record.',
      'February 2021\'s historic freeze brought temperatures below 0°F and triggered statewide power failures.',
    ],
    faqs: [
      { question: 'When is the best time to visit Dallas?', answer: 'October and November offer Dallas\'s most comfortable weather — mild temperatures, low humidity, minimal storm risk, and the start of football season. April is pretty but carries severe weather risk.' },
      { question: 'Does Dallas get tornadoes?', answer: 'Yes. The DFW metroplex sits in the heart of Tornado Alley and sees multiple tornado warnings each spring. April, May, and June are peak months. Historic events include the 2019 tornado outbreak and the 2015 Christmas tornadoes.' },
      { question: 'How hot does Dallas get?', answer: 'Summer highs routinely top 100°F from June through early September. Some summers (like 2011) see 70+ triple-digit days. The record high is 113°F.' },
      { question: 'Does Dallas get ice storms?', answer: 'Yes. When Arctic air meets Gulf moisture, Dallas can see damaging ice storms — the 2013 and 2021 events shut down the city. Freezing rain is more common and more dangerous than snow.' },
    ],
  },
  'austin-tx': {
    climateType: 'Humid subtropical (Köppen Cfa)',
    seasons: {
      spring: 'Spring is Austin\'s wildflower season — bluebonnets peak in late March and April, temperatures are mild in the 70s-80s°F, and SXSW packs downtown in March. Severe thunderstorms can still pop up.',
      summer: 'Summers are hot and long with highs routinely exceeding 100°F from June through early September. The nearby Hill Country rivers and swimming holes provide the only real relief.',
      fall: 'Fall is slow to arrive but worth the wait. October finally breaks the heat, ACL Festival takes over Zilker Park, and November delivers mild, dry, picture-perfect weather.',
      winter: 'Winters are short and mild with highs in the 60s°F. Occasional cold fronts bring brief freezes, but extended cold is rare and hard freezes happen only once or twice per year.',
    },
    monthlyHighs: [61, 64, 72, 79, 85, 92, 96, 97, 90, 81, 71, 62],
    monthlyLows: [40, 44, 51, 58, 66, 72, 74, 74, 69, 60, 50, 42],
    bestTimeToVisit: 'Late October through April. November and March-April are especially nice — mild temperatures, low humidity, wildflowers, and no triple-digit heat. SXSW (March) and ACL (October) both land in the best weather windows.',
    severeRisks: ['Flash flooding', 'Severe thunderstorms', 'Extreme heat', 'Drought', 'Ice storms'],
    uniqueFacts: [
      'Austin sits in "Flash Flood Alley" — the hills channel rainfall into rivers that can rise 20+ feet in hours.',
      'The 2011 and 2023 summers both saw stretches of 40+ days with highs over 100°F.',
      'Barton Springs stays a constant 68°F year-round, making it the city\'s unofficial summer escape.',
    ],
    faqs: [
      { question: 'When is the best time to visit Austin?', answer: 'October-November or March-April. Both windows deliver mild temperatures in the 70s-80s°F, low humidity, and minimal rain. March coincides with SXSW and wildflower bloom; October brings ACL Festival.' },
      { question: 'How hot are Austin summers?', answer: 'Very hot. June through early September averages highs in the mid-90s°F with frequent stretches above 100°F. Some summers see 40+ triple-digit days, and heat index values can push past 110°F.' },
      { question: 'Does Austin flood?', answer: 'Yes — the city sits in "Flash Flood Alley," where the Hill Country\'s steep terrain can turn ordinary thunderstorms into catastrophic flooding events. The Halloween 2013 and Memorial Day 2015 floods caused major damage.' },
      { question: 'Does Austin get snow?', answer: 'Very rarely — maybe once every 5-10 years, and usually just flurries. The historic February 2021 freeze brought several inches of snow and sub-zero temperatures, which was unprecedented.' },
    ],
  },
  'atlanta-ga': {
    climateType: 'Humid subtropical (Köppen Cfa)',
    seasons: {
      spring: 'Spring is glorious in Atlanta — azaleas and dogwoods bloom in late March through April, highs climb from the 60s°F to the 80s°F, and the city lights up in color. Severe thunderstorms are a regular feature.',
      summer: 'Summers are hot, humid, and stormy. Highs in the upper 80s°F, dewpoints in the low 70s°F, and afternoon thunderstorms are a near-daily routine from June through August.',
      fall: 'Fall is Atlanta\'s best-weather season — cool, dry, sunny, and with gorgeous foliage in the North Georgia mountains. October highs in the 70s°F are ideal.',
      winter: 'Winters are mild but variable. Highs average in the low 50s°F but occasional cold snaps bring freezing temperatures. Ice storms — more than snowstorms — are the main winter hazard.',
    },
    monthlyHighs: [52, 57, 65, 73, 81, 87, 89, 88, 82, 73, 63, 54],
    monthlyLows: [33, 36, 43, 50, 60, 68, 71, 70, 64, 52, 43, 35],
    bestTimeToVisit: 'Mid-September through early November, or mid-March through May. Both offer mild temperatures, low humidity, and a break from both summer humidity and winter storms.',
    severeRisks: ['Severe thunderstorms', 'Tornadoes', 'Ice storms', 'Flash flooding', 'Hurricane remnants'],
    uniqueFacts: [
      'Atlanta sits 1,050 feet above sea level — the highest major city east of the Mississippi — which moderates summer heat.',
      'The 2014 "Snowpocalypse" dropped just 2 inches but paralyzed the city for days due to icy roads.',
      'Atlanta averages about 50 inches of rain per year, more than Seattle.',
    ],
    faqs: [
      { question: 'What is Atlanta Georgia climate like?', answer: 'Atlanta has a humid subtropical climate (Köppen Cfa): hot humid summers, mild winters, about 50 inches of rain per year, and a lively severe-weather season in spring.' },
      { question: 'What is Atlanta summer weather like?', answer: 'Summers are hot and humid with highs in the upper 80s°F, dewpoints often in the low 70s°F, and frequent afternoon thunderstorms from June through August.' },
      { question: 'When is the best time to visit Atlanta?', answer: 'Mid-September through early November offers the best weather — mild, dry, sunny days in the 70s°F with spectacular fall color in the nearby mountains. Spring (March-May) is also beautiful with blooming trees.' },
      { question: 'Does Atlanta get tornadoes?', answer: 'Yes. Atlanta sits in "Dixie Alley" and sees several tornado warnings each spring and occasionally in fall. The 2008 Atlanta tornado caused damage to downtown — rare for a major city.' },
      { question: 'How much snow does Atlanta get?', answer: 'Very little — about 2 inches per year on average. The city is poorly equipped for snow and ice, and even small amounts can shut down highways. January and February are the most likely months.' },
      { question: 'Is Atlanta humid in summer?', answer: 'Yes, but less oppressive than Houston or Miami. Summer dewpoints average in the upper 60s°F with frequent afternoon thunderstorms providing brief cooling.' },
    ],
  },
  'denver-co': {
    climateType: 'Semi-arid continental (Köppen BSk)',
    seasons: {
      spring: 'Spring is Denver\'s stormiest season — March and April bring heavy wet snow, severe thunderstorms with large hail, and wild temperature swings. May is often the wettest month of the year.',
      summer: 'Summers are warm and dry with highs in the 80s-90s°F but low humidity. Afternoon thunderstorms build over the Rockies and can produce large hail, especially in June and July.',
      fall: 'Fall is short and spectacular — highs in the 60s-70s°F, low humidity, and aspens turning gold in the mountains. By mid-October the first snow typically falls.',
      winter: 'Winters are cold but surprisingly mild between storms — Chinook winds can raise temperatures 40°F in hours. The city averages 57 inches of snow per year, but it often melts quickly thanks to intense high-altitude sun.',
    },
    monthlyHighs: [45, 47, 55, 61, 71, 82, 89, 86, 78, 65, 53, 44],
    monthlyLows: [17, 20, 27, 34, 44, 53, 59, 57, 48, 36, 25, 17],
    bestTimeToVisit: 'September and early October deliver Denver\'s best weather — warm, sunny days, cool nights, low humidity, and fall color in the Rockies. June is also excellent before afternoon storms peak.',
    severeRisks: ['Blizzards', 'Large hail', 'Severe thunderstorms', 'Chinook winds', 'Wildfires'],
    uniqueFacts: [
      'Denver sits at exactly 5,280 feet — the "Mile High City" nickname is literal, not metaphorical.',
      'The city averages 300+ sunny days per year, more than Miami or San Diego.',
      'Chinook winds can rapidly warm temperatures — a rise of 40°F in one hour was recorded in 1943.',
    ],
    faqs: [
      { question: 'When is the best time to visit Denver?', answer: 'September and early October. Warm days in the 70s°F, cool nights, minimal humidity, dry weather, and aspens turning gold in the Rockies make this Denver\'s prime season.' },
      { question: 'How much does Denver elevation affect the weather?', answer: 'Significantly. At 5,280 feet, the thin air means intense UV, rapid temperature swings, and cool nights even in summer. The high altitude also lets snow melt quickly between storms.' },
      { question: 'Does Denver get a lot of snow?', answer: 'Yes — about 57 inches per year on average. But Denver\'s snow often disappears quickly thanks to sunshine and Chinook winds. Big blizzards can drop 20+ inches at a time, especially in March.' },
      { question: 'What are Chinook winds?', answer: 'Warm, dry downslope winds that blow from the Rockies toward Denver. They can raise temperatures 30-40°F in an hour and rapidly melt snow. Denverites call them "snow eaters."' },
    ],
  },
  'san-francisco-ca': {
    climateType: 'Mediterranean / cool-summer subtropical (Köppen Csb)',
    seasons: {
      spring: 'Spring is mild, often sunnier than summer along the coast. Highs in the 60s°F, cool nights, and hills turning green from winter rains before drying out.',
      summer: 'San Francisco summers defy expectations — cold, foggy, and windy along the coast with highs barely reaching 65°F. "Karl the Fog" dominates mornings and evenings, especially in the Sunset and Richmond districts.',
      fall: 'Fall is San Francisco\'s secret best season. September and October bring the warmest, sunniest, fog-free weather of the year with highs in the 70s°F.',
      winter: 'Winters are mild and rainy with highs in the upper 50s°F and lows in the 40s°F. Most of the city\'s 23 inches of annual rain falls between December and March during atmospheric river events.',
    },
    monthlyHighs: [58, 61, 63, 65, 66, 68, 68, 69, 72, 70, 63, 58],
    monthlyLows: [46, 48, 49, 50, 52, 54, 55, 56, 55, 54, 50, 46],
    bestTimeToVisit: 'September and October. Warmest temperatures, minimal fog, low rain, and uncrowded attractions. Locals call this the city\'s "real summer." March-May is also pleasant and less foggy than June-August.',
    severeRisks: ['Coastal fog', 'Atmospheric rivers', 'Wildfire smoke', 'King tides', 'Wind events'],
    uniqueFacts: [
      'San Francisco\'s July average high is 67°F — cooler than New York, Chicago, or even Seattle.',
      'Microclimates mean neighborhoods 5 miles apart can have 15°F temperature differences on the same afternoon.',
      'The coldest temperature ever recorded in SF is 27°F — the city has never officially seen snow stick downtown.',
    ],
    faqs: [
      { question: 'Why is San Francisco cold in summer?', answer: 'Cold Pacific water offshore creates a marine layer of fog that\'s sucked in through the Golden Gate by rising warm air in the Central Valley. The result: July and August are often the coldest months of the year in SF.' },
      { question: 'When is the best time to visit San Francisco?', answer: 'September and October. The fog retreats, skies clear, temperatures push into the 70s°F, and locals finally wear short sleeves. This is the city\'s true summer.' },
      { question: 'Does it rain much in San Francisco?', answer: 'About 23 inches per year, almost entirely between November and April. Summer is essentially dry, and individual atmospheric river storms can dump 2-4 inches in a day.' },
      { question: 'What is "Karl the Fog"?', answer: 'Locals named the persistent coastal fog "Karl." It rolls in through the Golden Gate most afternoons in summer, blanketing the western neighborhoods while eastern areas stay sunny. Karl even has his own Twitter account.' },
    ],
  },
  'boston-ma': {
    climateType: 'Humid continental (Köppen Dfa)',
    seasons: {
      spring: 'Spring comes late to Boston — March can still bring major snowstorms, April is cool and rainy, and May finally warms into the 60s°F. Cherry blossoms peak in mid-to-late April.',
      summer: 'Summers are warm and humid with highs in the 80s°F and occasional heat waves pushing past 90°F. Thunderstorms are less frequent than in the Midwest but can be severe.',
      fall: 'Fall is Boston\'s finest season — crisp, clear, and with some of the best foliage in New England. Mid-to-late October brings peak color. Highs drop from the 70s°F to the 50s°F.',
      winter: 'Winters are cold and snowy. Highs average in the upper 30s°F, lows in the 20s°F, and nor\'easters regularly dump a foot or more of snow. The 2014-15 winter delivered a record 108 inches.',
    },
    monthlyHighs: [36, 39, 46, 57, 67, 76, 82, 80, 72, 61, 51, 41],
    monthlyLows: [22, 24, 31, 41, 50, 60, 66, 65, 57, 46, 38, 27],
    bestTimeToVisit: 'Mid-September through October. Crisp, sunny, mild weather with peak foliage in the second half of October. Late May and June are also excellent before summer humidity peaks.',
    severeRisks: ['Nor\'easters', 'Blizzards', 'Coastal flooding', 'Heat waves', 'Ice storms'],
    uniqueFacts: [
      'Boston averages 48 inches of snow per year, but individual winters have ranged from 9 inches to 110 inches.',
      'The city\'s coastal location means nor\'easters often track just offshore, dumping heavy snow on the metro.',
      'The 2015 winter broke Boston\'s all-time snowfall record with 110.6 inches, including 94 inches in February alone.',
    ],
    faqs: [
      { question: 'What is the climate in Boston Massachusetts?', answer: 'Boston has a humid continental climate (Köppen Dfa): cold snowy winters, warm humid summers, and about 44 inches of precipitation a year. The Atlantic coast moderates extremes but fuels nor\'easters.' },
      { question: 'What is Boston weather like year round?', answer: 'Winters average highs in the upper 30s°F with frequent snow; springs are cool and late; summers reach the 80s°F with humidity; fall is crisp with peak foliage in mid-to-late October. Expect rapid day-to-day changes.' },
      { question: 'How cold does Boston get in winter?', answer: 'Average winter highs are in the upper 30s°F with lows in the 20s°F. Arctic outbreaks can push temperatures below zero, and coastal wind chills feel much colder during nor\'easters.' },
      { question: 'How cold is Boston compared with inland New England?', answer: 'Boston is usually a few degrees milder than inland Massachusetts because of the ocean, but wind and coastal flooding can make storms feel harsher along the shore.' },
      { question: 'When is the best time to visit Boston?', answer: 'Late September through mid-October delivers Boston\'s best weather — mild days in the 60s-70s°F, cool nights, sunshine, and peak fall foliage. Late spring (May-June) is also beautiful.' },
      { question: 'How much snow does Boston get?', answer: 'About 48 inches per year on average, but variability is extreme — some winters see 15 inches, others over 100. The historic 2014-15 winter dropped 110 inches in three months.' },
      { question: 'What is a nor\'easter?', answer: 'A powerful storm that tracks up the US East Coast, pulling moisture from the Atlantic and slamming New England with heavy snow, high winds, and coastal flooding. Boston can get multiple nor\'easters per winter.' },
    ],
  },
  'las-vegas-nv': {
    climateType: 'Hot desert (Köppen BWh)',
    seasons: {
      spring: 'Spring is Las Vegas at its best — warm sunny days in the 70s-80s°F, cool nights, clear skies, and no rain. March and April draw crowds for a reason.',
      summer: 'Summers are brutally hot with highs routinely exceeding 105°F from June through August and occasional days over 115°F. The heat is dry but still dangerous.',
      fall: 'Fall cools off through September and October. By November, highs are in the 60s-70s°F with crisp nights — perfect outdoor weather.',
      winter: 'Winters are mild, sunny, and dry with highs in the 50s-60s°F and cold nights in the 30s-40s°F. Snow on the surrounding mountains is common but rarely sticks in the valley.',
    },
    monthlyHighs: [57, 62, 70, 78, 88, 99, 104, 102, 95, 82, 68, 57],
    monthlyLows: [39, 44, 50, 57, 66, 75, 81, 80, 72, 59, 47, 38],
    bestTimeToVisit: 'March-May or October-November for ideal outdoor weather. Summer is too hot for anything outdoors; winter is great for shows, dining, and pool season for the cold-tolerant.',
    severeRisks: ['Extreme heat', 'Flash flooding', 'Dust storms', 'Wildfires', 'Drought'],
    uniqueFacts: [
      'Las Vegas receives only about 4 inches of rain per year — drier than most of the Sonoran Desert.',
      'The surrounding mountains can get feet of snow in winter while the valley stays dry and sunny.',
      'Summer monsoon flash floods are surprisingly dangerous in the desert — water rushes through washes in minutes.',
    ],
    faqs: [
      { question: 'When is the best time to visit Las Vegas?', answer: 'March-May and October-November. Mild temperatures in the 70s-80s°F, sunshine, low humidity, and no extreme heat. Winter is also nice if you don\'t need the pool.' },
      { question: 'How hot is Las Vegas in summer?', answer: 'Extremely hot. Highs average 104-106°F in July, with record highs above 115°F. Pavement and sand can burn skin, and heat illness is a real risk for tourists outdoors.' },
      { question: 'Does Las Vegas get cold in winter?', answer: 'Days are mild (50s-60s°F) but nights can dip into the 30s°F. Occasional cold snaps drop temperatures into the 20s°F. Snow in the valley is rare — maybe once every few years for a dusting.' },
      { question: 'Does it rain in Las Vegas?', answer: 'Rarely. Annual rainfall is only about 4 inches. When it does rain, it often comes in intense monsoon thunderstorms that can trigger flash floods in washes and underpasses.' },
    ],
  },
  'portland-or': {
    climateType: 'Oceanic / marine west coast (Köppen Cfb)',
    seasons: {
      spring: 'Spring is long and gradual — cool, damp, with highs climbing from the 50s°F in March to the 60s-70s°F by May. Rose Festival in early June marks the unofficial start of dry season.',
      summer: 'Summers are glorious — warm, dry, sunny, and with low humidity. Highs in the upper 70s to low 80s°F. Heat waves have become more frequent in recent years, occasionally pushing past 100°F.',
      fall: 'Fall starts sunny in September and turns wet by mid-October. Foliage is solid in the Willamette Valley and nearby Columbia River Gorge.',
      winter: 'Winters are mild but persistently wet and gray. Highs in the 40s°F, lows in the upper 30s°F, and frequent light rain from October through May. Snow is rare but ice storms occasionally paralyze the city.',
    },
    monthlyHighs: [48, 52, 57, 61, 68, 74, 82, 82, 76, 64, 54, 46],
    monthlyLows: [36, 37, 40, 43, 48, 54, 58, 58, 53, 46, 41, 35],
    bestTimeToVisit: 'Mid-July through early September — warm, dry, sunny, long daylight hours, and perfect hiking weather in the Gorge and Mount Hood area. June is also good but not yet fully dry.',
    severeRisks: ['Atmospheric rivers', 'Ice storms', 'Heat waves', 'Wildfire smoke', 'Windstorms'],
    uniqueFacts: [
      'Portland\'s reputation for rain is misleading — the city receives less annual precipitation than NYC or Atlanta.',
      'The June 2021 heat dome pushed Portland to 116°F, shattering records and killing hundreds in the Pacific Northwest.',
      'Portland averages only 3 inches of snow per year, but rare ice storms can cripple the hilly city.',
    ],
    faqs: [
      { question: 'Does it rain all the time in Portland?', answer: 'Not really. Portland averages 43 inches per year, comparable to NYC. But rain falls in frequent small amounts from October through May, with 150+ cloudy days per year — creating the reputation.' },
      { question: 'When is the best time to visit Portland?', answer: 'July through early September. Warm, dry, sunny weather with highs in the 80s°F and long daylight hours. Ideal for hiking, beer gardens, and the Oregon coast.' },
      { question: 'Does Portland get snow?', answer: 'Only occasionally. The city averages about 3 inches per year, typically in one or two brief events. When it does snow, Portland\'s hills become dangerous and the city largely shuts down.' },
      { question: 'How bad are Portland heat waves?', answer: 'Historically mild, but increasingly extreme. The June 2021 heat dome reached 116°F, the hottest temperature ever recorded in Portland. Most homes lack air conditioning, which makes heat events dangerous.' },
    ],
  },
  'nashville-tn': {
    climateType: 'Humid subtropical (Köppen Cfa)',
    seasons: {
      spring: 'Spring is beautiful but stormy — dogwoods and redbuds bloom, highs climb from the 60s°F to the 80s°F, and severe thunderstorms with tornadoes are a regular feature in March and April.',
      summer: 'Summers are hot and humid with highs in the upper 80s°F and dewpoints pushing into the low 70s°F. Afternoon thunderstorms are frequent.',
      fall: 'Fall is Nashville\'s best weather — mild, dry, sunny, with peak foliage in mid-to-late October. Highs in the 70s°F make for perfect outdoor concert weather.',
      winter: 'Winters are mild but punctuated by occasional ice storms and cold snaps. Highs average in the upper 40s°F with lows in the upper 20s°F.',
    },
    monthlyHighs: [47, 52, 61, 70, 78, 86, 89, 89, 83, 72, 61, 50],
    monthlyLows: [29, 32, 40, 48, 57, 66, 70, 69, 62, 50, 41, 32],
    bestTimeToVisit: 'Mid-September through early November for crisp, sunny, mild weather and peak foliage. Late April through May is also lovely but carries severe weather risk.',
    severeRisks: ['Tornadoes', 'Severe thunderstorms', 'Flash flooding', 'Ice storms', 'Hail'],
    uniqueFacts: [
      'Nashville sits in the Cumberland Plateau region, where severe thunderstorms and tornadoes are a spring staple.',
      'The 2010 flood dropped 13 inches of rain in two days, causing catastrophic damage to downtown.',
      'Deadly December 2015 and March 2020 tornadoes struck the Nashville metro, both late-season outbreaks.',
    ],
    faqs: [
      { question: 'When is the best time to visit Nashville?', answer: 'Mid-September through early November — mild days in the 70s°F, low humidity, minimal rain, and fall color. This is also peak season for outdoor concerts and events.' },
      { question: 'Does Nashville get tornadoes?', answer: 'Yes. The Nashville area sees multiple tornado warnings each spring (March-May) and occasional outbreaks in late fall. The March 2020 tornadoes caused major damage to East Nashville and surrounding counties.' },
      { question: 'How humid are Nashville summers?', answer: 'Very humid. July and August dewpoints regularly exceed 70°F, pushing heat index values past 100°F. Afternoon thunderstorms are common but only briefly cool things off.' },
      { question: 'Does Nashville get snow?', answer: 'About 6 inches per year on average — just enough to be inconvenient when it happens. The city is poorly equipped for snow and ice, so even small accumulations can shut down roads.' },
    ],
  },
  'minneapolis-mn': {
    climateType: 'Humid continental (Köppen Dfa/Dfb)',
    seasons: {
      spring: 'Spring comes late and fast. April still sees snow, but by May highs are in the 60s°F and everything melts and blooms at once. Severe thunderstorms and tornadoes are a spring feature.',
      summer: 'Summers are warm and humid with highs in the low 80s°F and occasional heat waves. Days are long — over 15 hours of daylight at the summer solstice.',
      fall: 'Fall is spectacular but brief — crisp September days in the 60s-70s°F, brilliant foliage in October, and the first hard freeze typically arrives by late October or early November.',
      winter: 'Winters are brutal. Highs average in the 20s°F, lows regularly drop below zero, and the city often sees temperatures below -20°F during Arctic outbreaks. Snow cover usually lasts from December through March.',
    },
    monthlyHighs: [24, 28, 40, 57, 69, 79, 84, 81, 72, 58, 42, 28],
    monthlyLows: [9, 13, 25, 36, 48, 58, 63, 61, 52, 39, 26, 14],
    bestTimeToVisit: 'Late June through early October. Summer brings warm days, long sunlight, and Minneapolis\'s many outdoor festivals. September is peak weather — mild, dry, and gorgeous.',
    severeRisks: ['Blizzards', 'Polar vortex outbreaks', 'Tornadoes', 'Ice storms', 'Severe thunderstorms'],
    uniqueFacts: [
      'Minneapolis is the coldest major US city — average January high is just 24°F.',
      'The all-time record low is -41°F, set in 1888 and nearly matched in modern polar vortex events.',
      'The skyway system connects downtown buildings so residents can walk for miles without going outside in winter.',
    ],
    faqs: [
      { question: 'How cold does Minneapolis get?', answer: 'Average January highs are 24°F with lows in the low teens°F. Arctic outbreaks can push temperatures below -20°F with wind chills below -40°F. Extended cold is the norm, not an exception.' },
      { question: 'When is the best time to visit Minneapolis?', answer: 'July through September. Summer days reach the 80s°F with long sunlight hours, and September offers mild temperatures and low humidity. Winter is beautiful but genuinely dangerous without preparation.' },
      { question: 'How much snow does Minneapolis get?', answer: 'About 52 inches per year on average. Snow cover typically lasts from December through March, and the ground often stays frozen from November into April.' },
      { question: 'Does Minneapolis get tornadoes?', answer: 'Yes. The Twin Cities sit on the northern edge of Tornado Alley and see several severe weather outbreaks each spring and summer. The 2011 North Minneapolis tornado was a notable event.' },
    ],
  },
  'orlando-fl': {
    climateType: 'Humid subtropical (Köppen Cfa)',
    seasons: {
      spring: 'Spring is warm, dry, and sunny — arguably Orlando\'s best weather season. Highs climb from the 70s°F in March to the upper 80s°F by May with low humidity.',
      summer: 'Summers are hot, humid, and stormy. Highs in the low 90s°F, high humidity, and near-daily afternoon thunderstorms from June through September. Orlando gets more lightning than almost anywhere in the US.',
      fall: 'Fall stays warm and humid into October. Hurricane season peaks in August-September but November finally brings cooler, drier weather.',
      winter: 'Winters are warm and dry with highs in the mid-70s°F and lows in the 50s°F. Occasional cold fronts can drop temperatures into the 30s°F for a night or two.',
    },
    monthlyHighs: [72, 74, 79, 84, 89, 91, 92, 92, 90, 85, 79, 73],
    monthlyLows: [50, 52, 56, 61, 67, 72, 74, 74, 73, 67, 59, 52],
    bestTimeToVisit: 'November through April. Warm, dry, sunny, low humidity, and outside hurricane season. January and February are peak tourist months with highs in the 70s°F.',
    severeRisks: ['Hurricanes', 'Lightning', 'Flash flooding', 'Tornadoes', 'Heat waves'],
    uniqueFacts: [
      'Orlando sits in "Lightning Alley" — the area between Tampa and Orlando gets more lightning strikes per square mile than anywhere else in the US.',
      'Daily summer thunderstorms happen when Gulf and Atlantic sea breezes collide right over Central Florida.',
      'Orlando hasn\'t had measurable snow since 1977, when a trace fell on Disney World.',
    ],
    faqs: [
      { question: 'When is the best time to visit Orlando?', answer: 'November through April. Pleasant temperatures, low humidity, minimal rain, and outside hurricane season. Spring break (March) and winter holidays (December-January) are peak crowds.' },
      { question: 'How often does it storm in Orlando?', answer: 'Almost daily from June through September. Afternoon thunderstorms roll in between 2-6 PM, bringing heavy rain, lightning, and brief cooling. Most storms last only 30-60 minutes.' },
      { question: 'When is hurricane season in Orlando?', answer: 'The Atlantic hurricane season runs June 1 through November 30. Peak risk is August-October. Orlando is inland, so storm surge is not a concern, but hurricanes still bring damaging winds and flooding.' },
      { question: 'Does it ever get cold in Orlando?', answer: 'Rarely. Winter highs average in the 70s°F. Occasional cold fronts can drop temperatures into the 30s°F at night, but freezes are uncommon and brief.' },
    ],
  },
  'tampa-fl': {
    climateType: 'Humid subtropical (Köppen Cfa)',
    seasons: {
      spring: 'Spring is Tampa\'s prime season — warm, sunny, dry, and with low humidity. Highs climb from the upper 70s°F to the upper 80s°F. Baseball spring training packs the area.',
      summer: 'Summers are hot, humid, and electric. Tampa Bay is the lightning capital of North America with daily afternoon thunderstorms from June through September.',
      fall: 'Fall stays warm and muggy through October, with hurricane risk peaking in August-September. November finally brings drier, cooler weather.',
      winter: 'Winters are warm and mostly dry with highs in the low 70s°F. Snowbirds and retirees fill the area. Rare cold fronts can drop temperatures into the 40s°F.',
    },
    monthlyHighs: [71, 73, 77, 82, 88, 90, 91, 91, 89, 85, 78, 73],
    monthlyLows: [52, 54, 58, 62, 68, 74, 75, 75, 74, 68, 60, 54],
    bestTimeToVisit: 'November through April delivers Tampa\'s best weather — warm, sunny, low humidity, minimal rain, and no hurricanes. March is especially popular for spring training and beach days.',
    severeRisks: ['Hurricanes', 'Lightning', 'Storm surge', 'Tornadoes', 'Flash flooding'],
    uniqueFacts: [
      'Tampa Bay is the lightning capital of North America — some years see over 100 thunderstorm days.',
      'The area is considered one of the most hurricane-vulnerable metros in the US due to Tampa Bay\'s geography.',
      'Tampa has gone 100+ years without a direct major hurricane hit, a statistical anomaly that worries emergency planners.',
    ],
    faqs: [
      { question: 'When is the best time to visit Tampa?', answer: 'November through April. Pleasant temperatures in the 70s-80s°F, low humidity, minimal rain, and outside hurricane season. March brings spring training baseball and ideal beach weather.' },
      { question: 'Why is Tampa called the lightning capital?', answer: 'Tampa Bay\'s geography — warm water on three sides and converging sea breezes — creates near-daily summer thunderstorms. The area records more lightning strikes per square mile than anywhere else in North America.' },
      { question: 'Is Tampa at risk for hurricanes?', answer: 'Yes — Tampa Bay is considered highly vulnerable to hurricane storm surge. While the city hasn\'t taken a direct major hit in over a century, forecasters consider a catastrophic strike inevitable.' },
      { question: 'Does Tampa get cold?', answer: 'Rarely. Winter highs average in the low 70s°F, and freezing temperatures are uncommon. The coldest weather comes from occasional Arctic fronts that drop lows into the 30s°F for a night or two.' },
    ],
  },
  'detroit-mi': {
    climateType: 'Humid continental (Köppen Dfa)',
    seasons: {
      spring: 'Spring is slow and variable. March still sees snow, April is chilly and rainy, and May finally warms into the 60s°F. Severe thunderstorms become possible by late spring.',
      summer: 'Summers are warm and humid with highs in the low 80s°F. Lake Erie and Lake St. Clair moderate temperatures, keeping Detroit cooler than inland Michigan cities.',
      fall: 'Fall is beautiful in September and October with crisp air and gorgeous foliage in the surrounding forests. November turns cold and gray as Great Lakes weather takes over.',
      winter: 'Winters are cold, cloudy, and snowy. Highs in the low 30s°F, lows in the teens°F, and about 42 inches of snow per year. Lake effect enhances snowfall on the west side of the city.',
    },
    monthlyHighs: [32, 35, 45, 58, 70, 79, 83, 82, 74, 62, 49, 36],
    monthlyLows: [19, 20, 28, 38, 48, 58, 63, 62, 54, 43, 34, 24],
    bestTimeToVisit: 'June through October for warm weather and outdoor activities. September is especially nice with mild temperatures, low humidity, and fall color around the Great Lakes.',
    severeRisks: ['Lake-effect snow', 'Polar vortex outbreaks', 'Severe thunderstorms', 'Ice storms', 'Tornadoes'],
    uniqueFacts: [
      'Detroit is the only major US city where you look SOUTH to Canada — the Detroit River runs east-west here.',
      'The Great Lakes moderate Detroit\'s climate, making it milder than Chicago in winter and cooler in summer.',
      'Detroit averages 184 cloudy days per year, among the highest in the country.',
    ],
    faqs: [
      { question: 'When is the best time to visit Detroit?', answer: 'Late June through early October. Summer brings warm days in the 80s°F and outdoor festivals; September offers mild, low-humidity weather with early fall color.' },
      { question: 'How cold does Detroit get in winter?', answer: 'Average winter highs are in the low 30s°F with lows in the teens°F. Polar vortex events can drop temperatures below zero. Detroit averages 42 inches of snow per year.' },
      { question: 'Does Detroit get lake-effect snow?', answer: 'Some — the city is downwind of Lake St. Clair and can see enhanced snow bands. However, Detroit gets less lake-effect snow than Cleveland or Buffalo because it sits on the "wrong" side of the lakes.' },
      { question: 'Is Detroit really cloudy?', answer: 'Yes. Detroit averages about 184 cloudy days per year — one of the cloudiest major cities in the US. Winter months can go weeks without meaningful sunshine.' },
    ],
  },
  'cleveland-oh': {
    climateType: 'Humid continental (Köppen Dfa)',
    seasons: {
      spring: 'Spring is cool, damp, and slow to arrive. March can still bring lake-effect snow squalls, April is rainy, and May finally warms into the 60s°F.',
      summer: 'Summers are warm and humid with highs in the upper 70s°F, moderated by Lake Erie breezes. Thunderstorms are common but less severe than in the Midwest.',
      fall: 'Fall is Cleveland\'s best season — crisp, sunny, and with spectacular foliage in the Cuyahoga Valley. Lake effect can boost rainfall totals.',
      winter: 'Winters are cold, cloudy, and buried under lake-effect snow. Highs in the low 30s°F and annual snowfall averages 68 inches, among the highest of any major US city.',
    },
    monthlyHighs: [33, 36, 46, 58, 69, 78, 82, 81, 74, 62, 49, 37],
    monthlyLows: [20, 21, 28, 38, 48, 58, 63, 62, 55, 44, 35, 25],
    bestTimeToVisit: 'June through October. September and early October are especially nice with mild weather and fall color. Summer brings lake breezes and outdoor festivals along the waterfront.',
    severeRisks: ['Lake-effect snow', 'Blizzards', 'Severe thunderstorms', 'Ice storms', 'Polar vortex outbreaks'],
    uniqueFacts: [
      'Cleveland averages 68 inches of snow per year — more than any other major US city outside of the Rockies.',
      'Lake-effect snow bands can drop 2-3 feet in 24 hours on the city\'s east side while the west side stays dry.',
      'Cleveland\'s annual sunshine percentage is the lowest of any US city east of the Rockies.',
    ],
    faqs: [
      { question: 'Why does Cleveland get so much snow?', answer: 'Cold Arctic air passing over relatively warm Lake Erie picks up moisture and dumps it as heavy lake-effect snow on Cleveland\'s east side and snowbelt. Individual storms can drop several feet.' },
      { question: 'When is the best time to visit Cleveland?', answer: 'June through October. Summer brings warm weather and lakefront festivals; September and October deliver mild temperatures and spectacular fall foliage in the Cuyahoga Valley.' },
      { question: 'How cloudy is Cleveland really?', answer: 'Extremely. Cleveland averages about 200 cloudy days per year, the most of any major US city east of the Rockies. Winters can go weeks without significant sunshine.' },
      { question: 'Does Cleveland get tornadoes?', answer: 'Occasionally. Northeast Ohio sees a few tornado warnings each year, most often in spring and summer. Major tornadoes are rare but not unheard of.' },
    ],
  },
  'indianapolis-in': {
    climateType: 'Humid continental (Köppen Dfa)',
    seasons: {
      spring: 'Spring is unpredictable — late snow in March is possible, but April and May warm quickly into the 60s-70s°F. Severe thunderstorms are a regular feature.',
      summer: 'Summers are hot and humid with highs in the mid-80s°F. The Indy 500 in late May marks the unofficial start of summer. Afternoon thunderstorms are frequent.',
      fall: 'Fall is Indianapolis\'s best weather season — mild, dry, sunny, and with pleasant foliage. October highs in the 60s°F make for ideal outdoor weather.',
      winter: 'Winters are cold and variable with highs in the upper 30s°F and lows in the 20s°F. Ice storms are a bigger hazard than pure snowstorms.',
    },
    monthlyHighs: [36, 41, 52, 64, 74, 83, 86, 84, 78, 66, 52, 39],
    monthlyLows: [20, 23, 32, 42, 52, 62, 66, 64, 56, 44, 34, 24],
    bestTimeToVisit: 'Late April through May and mid-September through October. Both offer mild temperatures, low humidity, and minimal storm risk. May brings the Indy 500 and its festivities.',
    severeRisks: ['Severe thunderstorms', 'Tornadoes', 'Ice storms', 'Blizzards', 'Flash flooding'],
    uniqueFacts: [
      'Indianapolis sits in Tornado Alley\'s eastern edge and sees multiple severe weather outbreaks each spring.',
      'The city\'s geographic center of Indiana means extreme temperature swings as fronts pass through.',
      'The 2002 "Super Bowl Tornado Outbreak" tracked through central Indiana, causing major damage.',
    ],
    faqs: [
      { question: 'When is the best time to visit Indianapolis?', answer: 'May for the Indy 500 and spring weather, or September-October for mild, sunny days with fall color. Both windows deliver comfortable temperatures and minimal storm risk.' },
      { question: 'Does Indianapolis get tornadoes?', answer: 'Yes. Central Indiana sees multiple tornado warnings each spring (March-June) and occasionally in fall. The 2002 and 2023 outbreaks both caused major damage in the metro area.' },
      { question: 'How cold does Indianapolis get?', answer: 'Average winter highs are in the upper 30s°F with lows in the 20s°F. Arctic outbreaks can push temperatures below zero. The city averages 22 inches of snow per year.' },
      { question: 'Is Indianapolis humid in summer?', answer: 'Yes. July and August dewpoints average in the upper 60s°F, making heat index values climb into the 90s°F regularly. Afternoon thunderstorms are common.' },
    ],
  },
  'columbus-oh': {
    climateType: 'Humid continental (Köppen Dfa)',
    seasons: {
      spring: 'Spring warms from the 50s°F in March to the 70s°F by May. Rain is frequent and severe weather begins to pop up by late April.',
      summer: 'Summers are warm and humid with highs in the mid-80s°F. Afternoon thunderstorms are common, especially in June and July.',
      fall: 'Fall is Columbus\'s standout season — cool, sunny, dry days in the 60s-70s°F with beautiful foliage across central Ohio.',
      winter: 'Winters are cold and cloudy with highs in the upper 30s°F. Snow is moderate (about 22 inches per year) and ice storms are the biggest winter hazard.',
    },
    monthlyHighs: [37, 41, 51, 63, 73, 82, 85, 83, 77, 65, 52, 40],
    monthlyLows: [21, 23, 31, 41, 51, 60, 64, 63, 55, 43, 34, 25],
    bestTimeToVisit: 'Late April through June and September through October. Both deliver mild temperatures, manageable humidity, and minimal storm risk.',
    severeRisks: ['Severe thunderstorms', 'Tornadoes', 'Ice storms', 'Flash flooding', 'Polar vortex outbreaks'],
    uniqueFacts: [
      'Columbus is one of the cloudiest major cities in the US, averaging over 175 cloudy days per year.',
      'The city sits in a low-tornado zone compared to Indianapolis, but severe thunderstorms with damaging winds are common.',
      'Annual snowfall averages about 22 inches, much less than Cleveland to the north.',
    ],
    faqs: [
      { question: 'When is the best time to visit Columbus?', answer: 'Late April through early June or September through October. Mild temperatures, low humidity, and minimal rain. OSU home football games make fall weekends especially popular.' },
      { question: 'How cold does Columbus get?', answer: 'Average winter highs are in the upper 30s°F with lows in the 20s°F. Polar vortex events can drop temperatures below zero, though extended deep cold is less common than further north.' },
      { question: 'Does Columbus get tornadoes?', answer: 'Yes but less often than Indianapolis. Central Ohio sees occasional severe weather outbreaks each spring and summer. Ice storms are the more common winter hazard.' },
      { question: 'Is Columbus always cloudy?', answer: 'Close to it. The city averages 175+ cloudy days per year, especially November through March. Summer brings more sunshine but also more humidity.' },
    ],
  },
  'charlotte-nc': {
    climateType: 'Humid subtropical (Köppen Cfa)',
    seasons: {
      spring: 'Spring is beautiful with blooming azaleas and dogwoods, highs climbing from the 60s°F to the 80s°F, and occasional severe thunderstorms. April is especially pleasant.',
      summer: 'Summers are hot and humid with highs in the upper 80s°F and frequent afternoon thunderstorms. Heat index values can push past 100°F during heat waves.',
      fall: 'Fall is Charlotte\'s best weather season — cool, dry, sunny, with vivid foliage in the nearby Blue Ridge Mountains. October is the sweet spot.',
      winter: 'Winters are mild with highs in the 50s°F and lows in the 30s°F. Snow is rare (about 4 inches per year) but ice storms can cause major disruption.',
    },
    monthlyHighs: [52, 56, 64, 72, 80, 87, 90, 88, 82, 72, 62, 54],
    monthlyLows: [31, 34, 41, 49, 58, 67, 71, 70, 63, 51, 42, 34],
    bestTimeToVisit: 'Mid-September through early November and mid-March through May. Both offer mild temperatures, low humidity, and minimal rain. October brings fall color in the mountains.',
    severeRisks: ['Severe thunderstorms', 'Ice storms', 'Hurricane remnants', 'Tornadoes', 'Flash flooding'],
    uniqueFacts: [
      'Charlotte is the largest city in the Carolinas and sits in the Piedmont region between the mountains and the coast.',
      'Winter precipitation is often a messy mix of rain, sleet, freezing rain, and snow — ice storms are more common than pure snowstorms.',
      'Hurricane Hugo (1989) brought hurricane-force winds to Charlotte, 200 miles inland — an unprecedented event.',
    ],
    faqs: [
      { question: 'When is the best time to visit Charlotte?', answer: 'October and April are ideal — mild temperatures in the 70s°F, low humidity, sunshine, and minimal rain. October has the added bonus of fall foliage in the Blue Ridge Mountains.' },
      { question: 'Does Charlotte get snow?', answer: 'Rarely. The city averages only about 4 inches of snow per year, usually in one or two brief events. Ice storms are more common and more dangerous than pure snow.' },
      { question: 'Is Charlotte affected by hurricanes?', answer: 'Yes, though inland. Hurricanes weaken by the time they reach Charlotte but still bring heavy rain, flooding, and power outages. Hurricane Hugo (1989) was a historic exception with hurricane-force winds.' },
      { question: 'How humid are Charlotte summers?', answer: 'Very humid. Summer dewpoints average in the upper 60s to low 70s°F, making heat index values climb into the 90s°F regularly. Afternoon thunderstorms provide brief cooling.' },
    ],
  },
  'baltimore-md': {
    climateType: 'Humid subtropical (Köppen Cfa)',
    seasons: {
      spring: 'Spring is variable with cool, rainy weather in March giving way to warm, sunny days in May. Cherry blossoms peak in early April at the nearby D.C. Tidal Basin.',
      summer: 'Summers are hot and humid with highs in the mid-80s°F and frequent heat waves pushing past 90°F. Chesapeake Bay humidity makes the heat feel worse.',
      fall: 'Fall is Baltimore\'s best season — mild, sunny, dry, with peak foliage in mid-to-late October. Perfect outdoor weather around the Inner Harbor.',
      winter: 'Winters are cold with highs in the low 40s°F and occasional nor\'easters dumping heavy snow. The 2009-10 winter delivered over 70 inches.',
    },
    monthlyHighs: [42, 45, 54, 65, 75, 84, 89, 86, 79, 68, 58, 46],
    monthlyLows: [26, 28, 35, 45, 54, 64, 69, 67, 60, 48, 39, 31],
    bestTimeToVisit: 'Mid-September through October for crisp fall weather and foliage, or late April through May for spring blooms and mild temperatures.',
    severeRisks: ['Nor\'easters', 'Heat waves', 'Ice storms', 'Hurricane remnants', 'Severe thunderstorms'],
    uniqueFacts: [
      'Baltimore averages 21 inches of snow per year, but the 2009-10 "Snowmageddon" winter delivered 77 inches.',
      'The Chesapeake Bay moderates Baltimore\'s climate but also boosts summer humidity considerably.',
      'The city sits in a transition zone between northern and southern climate regimes, creating highly variable weather.',
    ],
    faqs: [
      { question: 'When is the best time to visit Baltimore?', answer: 'Mid-September through October delivers the best weather — mild temperatures, low humidity, sunshine, and fall foliage. May is also excellent with blooming trees and pleasant temperatures.' },
      { question: 'How much snow does Baltimore get?', answer: 'About 21 inches per year on average, but variable — some winters see just a few inches while others (like 2009-10) deliver over 70. Nor\'easters are the main winter snowmakers.' },
      { question: 'Is Baltimore humid in summer?', answer: 'Yes. The Chesapeake Bay and the Gulf stream bring moisture, pushing dewpoints into the low 70s°F by July and August. Heat index values above 100°F are common during heat waves.' },
      { question: 'Does Baltimore get hurricanes?', answer: 'Direct hits are rare, but remnants of tropical systems frequently bring heavy rain and flooding. Hurricane Isabel (2003) and Ida (2021) caused significant damage to the Baltimore region.' },
    ],
  },
  'milwaukee-wi': {
    climateType: 'Humid continental (Köppen Dfa/Dfb)',
    seasons: {
      spring: 'Spring is cool and slow to arrive. Lake Michigan keeps the lakefront cool well into May, and lake-breeze fronts can drop temperatures 20°F in minutes.',
      summer: 'Summers are warm and humid with highs in the upper 70s°F along the lake, moderated by cool breezes. The Summerfest music festival draws crowds to the lakefront in late June.',
      fall: 'Fall is pleasant with crisp September days in the 60s-70s°F and vivid foliage in October. By November, the first significant snow arrives.',
      winter: 'Winters are cold and snowy with highs in the upper 20s°F and lows in the teens°F. Lake-effect and nor\'easter-style storms combine for 47 inches of annual snowfall.',
    },
    monthlyHighs: [29, 33, 43, 55, 66, 76, 81, 79, 71, 58, 45, 33],
    monthlyLows: [15, 19, 27, 37, 46, 57, 63, 62, 54, 42, 31, 20],
    bestTimeToVisit: 'June through September — warm weather, lake breezes, outdoor festivals, and long daylight hours. Summerfest in late June and early July is a highlight.',
    severeRisks: ['Blizzards', 'Lake-effect snow', 'Polar vortex outbreaks', 'Severe thunderstorms', 'Tornadoes'],
    uniqueFacts: [
      'Lake Michigan creates a "lake breeze" that can keep the lakefront 15°F cooler than inland Milwaukee on summer afternoons.',
      'Milwaukee averages 47 inches of snow per year, with lake-effect bands delivering some of the biggest storms.',
      'The city sits on the same latitude as Toronto and Portland, OR — but has far more extreme winters than either.',
    ],
    faqs: [
      { question: 'When is the best time to visit Milwaukee?', answer: 'Late June through August for warm weather, outdoor festivals (Summerfest), and lake activities. September is also great with mild temperatures and fewer crowds.' },
      { question: 'How cold does Milwaukee get?', answer: 'Average winter highs are in the upper 20s°F with lows in the teens°F. Arctic outbreaks can drop temperatures below zero, and wind chills along the lakefront can feel much colder.' },
      { question: 'Does Lake Michigan affect Milwaukee weather?', answer: 'Significantly. The lake moderates temperatures year-round — cooler summers and milder winters along the shore. Lake breezes can drop afternoon temperatures 15-20°F near the water.' },
      { question: 'How much snow does Milwaukee get?', answer: 'About 47 inches per year on average. Lake-effect snow bands can dump 6-12 inches on the city while nearby suburbs stay dry. Nor\'easter-style storms are also common.' },
    ],
  },
  'kansas-city-mo': {
    climateType: 'Humid continental (Köppen Dfa)',
    seasons: {
      spring: 'Spring is wet and stormy — this is peak severe weather season for Kansas City. April and May bring large hail, tornadoes, and flooding rains, but also mild temperatures and blooming flowers.',
      summer: 'Summers are hot and humid with highs in the upper 80s°F and frequent 90°F+ days. Afternoon and evening thunderstorms are common.',
      fall: 'Fall is Kansas City\'s best weather season — mild, dry, sunny, and with gorgeous foliage. October highs in the 60s-70s°F make for ideal BBQ and football weather.',
      winter: 'Winters are cold and variable with highs in the low 40s°F and occasional ice storms. Arctic outbreaks can push temperatures below zero.',
    },
    monthlyHighs: [40, 44, 55, 65, 74, 83, 88, 87, 79, 67, 54, 42],
    monthlyLows: [22, 26, 35, 45, 55, 64, 69, 67, 59, 47, 35, 25],
    bestTimeToVisit: 'September through early November for mild, dry, sunny weather. April is also pleasant but carries significant severe weather risk.',
    severeRisks: ['Tornadoes', 'Large hail', 'Severe thunderstorms', 'Ice storms', 'Blizzards'],
    uniqueFacts: [
      'Kansas City sits squarely in Tornado Alley and sees several severe weather outbreaks each spring.',
      'The 1957 Ruskin Heights tornado killed 44 people in the metro area, one of the deadliest in KC history.',
      'The city averages 18 inches of snow per year, but big blizzards can drop a foot or more in a single event.',
    ],
    faqs: [
      { question: 'When is the best time to visit Kansas City?', answer: 'September through October delivers the best weather — mild days in the 60s-70s°F, low humidity, dry conditions, and fall color. This is also peak BBQ and football season.' },
      { question: 'Does Kansas City get tornadoes?', answer: 'Yes — KC sits in the heart of Tornado Alley. Multiple tornado warnings each spring, occasional direct hits. The 1957 Ruskin Heights tornado was one of the deadliest in regional history.' },
      { question: 'How cold does Kansas City get?', answer: 'Average winter highs are in the low 40s°F with lows in the 20s°F. Arctic outbreaks can push temperatures below zero, and ice storms are a regular winter hazard.' },
      { question: 'Is Kansas City humid in summer?', answer: 'Yes. July and August dewpoints average in the upper 60s to low 70s°F, making heat index values climb into the 100s°F regularly. Evening thunderstorms provide brief cooling.' },
    ],
  },
  'salt-lake-city-ut': {
    climateType: 'Semi-arid continental (Köppen BSk)',
    seasons: {
      spring: 'Spring is variable with late snowstorms in March and April giving way to warm, sunny weather in May. Mountain snowmelt feeds the Great Salt Lake and surrounding rivers.',
      summer: 'Summers are hot and dry with highs in the upper 80s to mid-90s°F but very low humidity. Afternoon thunderstorms pop up over the mountains, occasionally reaching the city.',
      fall: 'Fall is spectacular — warm sunny days, cool nights, brilliant aspen foliage in the Wasatch, and the first snow dusting peaks by late October.',
      winter: 'Winters are cold with highs in the upper 30s°F and frequent snowstorms in the mountains. Temperature inversions trap cold, polluted air in the Salt Lake Valley for days at a time.',
    },
    monthlyHighs: [38, 44, 53, 62, 72, 83, 92, 90, 80, 66, 51, 39],
    monthlyLows: [23, 27, 34, 41, 50, 58, 66, 65, 54, 42, 32, 24],
    bestTimeToVisit: 'Mid-May through early October for warm, dry, sunny weather. For skiing, December through March delivers Utah\'s legendary "Greatest Snow on Earth."',
    severeRisks: ['Blizzards', 'Temperature inversions', 'Flash flooding', 'Wildfires', 'Windstorms'],
    uniqueFacts: [
      'The Wasatch Mountains receive some of the lightest, driest snow in North America — Utah\'s "Greatest Snow on Earth" slogan isn\'t marketing.',
      'Salt Lake City sits in a bowl that traps cold air in winter, causing severe temperature inversions and poor air quality.',
      'The Great Salt Lake creates its own lake-effect snow bands that can dump inches of snow on the city.',
    ],
    faqs: [
      { question: 'When is the best time to visit Salt Lake City?', answer: 'Mid-May through early October for warm, dry weather and outdoor activities. For world-class skiing, December through March is ideal with consistent powder in the Wasatch resorts.' },
      { question: 'How much snow does Salt Lake City get?', answer: 'About 56 inches per year in the city, but the nearby Cottonwood Canyon resorts average 500+ inches. Utah\'s light, dry powder is famous among skiers worldwide.' },
      { question: 'What is a temperature inversion?', answer: 'Cold, dense air settles into the Salt Lake Valley and gets trapped under warmer air above. This causes days or weeks of cold, foggy, polluted conditions in winter. Pollution alerts are common.' },
      { question: 'Does Salt Lake City get thunderstorms?', answer: 'Yes — summer afternoons and evenings can bring thunderstorms rolling off the Wasatch Mountains. Flash flooding in desert canyons is a real risk during monsoon season in July and August.' },
    ],
  },
  'raleigh-nc': {
    climateType: 'Humid subtropical (Köppen Cfa)',
    seasons: {
      spring: 'Spring is gorgeous with azaleas and dogwoods blooming in March and April, highs climbing into the 70s°F, and pleasant outdoor weather. Occasional severe thunderstorms pop up.',
      summer: 'Summers are hot and humid with highs in the upper 80s°F and frequent afternoon thunderstorms. Heat index values can push past 100°F during heat waves.',
      fall: 'Fall is Raleigh\'s best season — mild, sunny, dry, with beautiful foliage. October highs in the 70s°F are near-perfect.',
      winter: 'Winters are mild with highs in the low 50s°F and occasional cold snaps. Ice storms are more common than pure snowstorms.',
    },
    monthlyHighs: [51, 55, 63, 72, 79, 86, 89, 88, 82, 73, 63, 54],
    monthlyLows: [31, 33, 40, 47, 57, 65, 69, 68, 62, 50, 41, 33],
    bestTimeToVisit: 'Mid-September through early November for mild, dry, sunny weather and fall color. April-May is also beautiful with blooming trees.',
    severeRisks: ['Hurricane remnants', 'Ice storms', 'Severe thunderstorms', 'Tornadoes', 'Heat waves'],
    uniqueFacts: [
      'Raleigh sits in the Research Triangle, a mild-climate zone that draws transplants fleeing northern winters.',
      'Winter precipitation is often a messy mix — rain, sleet, freezing rain, and occasional snow within the same storm.',
      'Hurricane Florence (2018) dropped over 30 inches of rain on parts of the Raleigh area, causing catastrophic flooding.',
    ],
    faqs: [
      { question: 'When is the best time to visit Raleigh?', answer: 'October offers Raleigh\'s best weather — mild temperatures in the 70s°F, low humidity, sunshine, and fall color. April is a close second with blooming azaleas and dogwoods.' },
      { question: 'Does Raleigh get snow?', answer: 'Rarely — about 5 inches per year on average, usually in one or two brief events. Ice storms are more common and more dangerous than pure snowstorms.' },
      { question: 'How humid are Raleigh summers?', answer: 'Very humid. July and August dewpoints average in the low 70s°F, making heat index values climb past 100°F. Afternoon thunderstorms provide brief but welcome cooling.' },
      { question: 'Does Raleigh get hurricanes?', answer: 'Yes. Atlantic hurricanes can track inland and affect Raleigh with heavy rain, flooding, and tropical-storm-force winds. Hurricane Florence (2018) dropped record rainfall on parts of the region.' },
    ],
  },
  'new-orleans-la': {
    climateType: 'Humid subtropical (Köppen Cfa)',
    seasons: {
      spring: 'Spring is beautiful — warm, sunny, and with Mardi Gras crowds filling the French Quarter in February or early March. Highs in the 70s-80s°F with low humidity and wildflowers.',
      summer: 'Summers are oppressive — highs in the low 90s°F, dewpoints near 75°F, and daily afternoon thunderstorms. The heat index regularly tops 105°F.',
      fall: 'Fall stays warm and humid into October, with hurricane risk peaking in August-September. November finally brings cooler, drier weather.',
      winter: 'Winters are mild with highs in the mid-60s°F and lows in the 40s°F. Hard freezes are rare but can damage the region\'s sensitive vegetation.',
    },
    monthlyHighs: [63, 66, 72, 78, 85, 89, 91, 91, 87, 80, 71, 64],
    monthlyLows: [45, 48, 54, 60, 68, 73, 75, 75, 72, 62, 53, 47],
    bestTimeToVisit: 'Late October through early April. Mild temperatures, low humidity, minimal rain, and outside hurricane season. February (Mardi Gras) and March (Jazz Fest in early April) are peak tourist months.',
    severeRisks: ['Hurricanes', 'Storm surge', 'Flash flooding', 'Tornadoes', 'Tropical storms'],
    uniqueFacts: [
      'New Orleans sits at or below sea level in many neighborhoods, making flood control infrastructure critical.',
      'Hurricane Katrina (2005) caused catastrophic flooding when the levees failed — the deadliest hurricane in modern US history.',
      'Average annual rainfall exceeds 62 inches — more than Miami and nearly double Seattle.',
    ],
    faqs: [
      { question: 'When is the best time to visit New Orleans?', answer: 'Late October through April. Pleasant temperatures, lower humidity, and outside hurricane season. February (Mardi Gras) and early April (Jazz Fest) are especially popular but book accommodations well in advance.' },
      { question: 'How humid is New Orleans in summer?', answer: 'Extremely humid. July and August dewpoints push past 75°F, making the heat index climb past 105°F on most afternoons. Daily thunderstorms provide brief cooling but add more moisture.' },
      { question: 'When is hurricane season in New Orleans?', answer: 'June 1 through November 30, with peak risk in August and September. New Orleans is one of the most hurricane-vulnerable major US cities due to its below-sea-level location.' },
      { question: 'Does it ever snow in New Orleans?', answer: 'Very rarely — maybe once every decade or so, and usually just flurries. The December 2017 snowfall was a notable exception when the city saw several inches.' },
    ],
  },
  'virginia-beach-va': {
    climateType: 'Humid subtropical (Köppen Cfa)',
    seasons: {
      spring: 'Spring is pleasant with warming temperatures and blooming trees. April and May deliver mild 70s°F days and the start of beach season.',
      summer: 'Summers are warm, humid, and beach-friendly with highs in the mid-80s°F. Ocean breezes moderate the heat, and afternoon thunderstorms are common.',
      fall: 'Fall is Virginia Beach\'s best weather season — mild, dry, sunny, with comfortable beach weather extending into October. Peak hurricane season runs August-October.',
      winter: 'Winters are mild with highs in the upper 40s°F and lows in the 30s°F. Nor\'easters can bring heavy rain, wind, and coastal flooding.',
    },
    monthlyHighs: [48, 51, 58, 67, 75, 83, 87, 86, 80, 71, 62, 52],
    monthlyLows: [33, 34, 41, 50, 59, 68, 72, 71, 66, 55, 45, 36],
    bestTimeToVisit: 'Late May through early October for beach weather. September is especially nice with warm ocean temperatures, lower crowds, and mild air.',
    severeRisks: ['Hurricanes', 'Nor\'easters', 'Coastal flooding', 'Severe thunderstorms', 'Beach erosion'],
    uniqueFacts: [
      'Virginia Beach sits at the mouth of the Chesapeake Bay, where tropical storms and nor\'easters both bring storm surge threats.',
      'The city\'s 35-mile oceanfront is especially vulnerable to beach erosion from repeated coastal storms.',
      'Hurricane Matthew (2016) and Isabel (2003) both caused major coastal flooding in the region.',
    ],
    faqs: [
      { question: 'When is the best time to visit Virginia Beach?', answer: 'September is ideal — warm ocean water, mild air temperatures in the 70s-80s°F, lower humidity than July-August, and smaller crowds than peak summer.' },
      { question: 'Does Virginia Beach get hurricanes?', answer: 'Yes. The coastal location makes it vulnerable to both direct hurricane hits and grazing impacts. Isabel (2003), Irene (2011), and Matthew (2016) all caused significant damage.' },
      { question: 'How warm does the ocean get in summer?', answer: 'Ocean temperatures peak in August, typically in the mid-70s to low 80s°F — pleasantly warm for swimming. September often stays warm thanks to residual summer heat.' },
      { question: 'Does Virginia Beach get cold in winter?', answer: 'Mild compared to inland Virginia. Winter highs average in the upper 40s°F and lows in the 30s°F. The ocean moderates temperatures and extended deep cold is rare.' },
    ],
  },
  'sacramento-ca': {
    climateType: 'Mediterranean / hot-summer (Köppen Csa)',
    seasons: {
      spring: 'Spring is beautiful with wildflowers, blooming trees, and mild 70s°F days. March through May is the best outdoor weather of the year, before summer heat arrives.',
      summer: 'Summers are hot and dry with highs frequently exceeding 95°F and occasional stretches above 100°F. But low humidity and the "Delta breeze" cooling from the Pacific make it more tolerable than Texas or the Southeast.',
      fall: 'Fall is gradual — September still sees 90°F days, but October drops into the 70s°F. Wine country is at its best during harvest season.',
      winter: 'Winters are mild but wet and foggy. Highs in the mid-50s°F, lows in the upper 30s°F, and the Central Valley\'s famous "tule fog" can cut visibility to near zero for weeks.',
    },
    monthlyHighs: [55, 61, 66, 72, 80, 87, 92, 92, 88, 78, 65, 55],
    monthlyLows: [39, 42, 44, 47, 52, 56, 58, 58, 56, 50, 43, 38],
    bestTimeToVisit: 'April-May and September-October. Both offer mild temperatures, low humidity, and minimal rain. Wine country visits peak in September-October during harvest.',
    severeRisks: ['Heat waves', 'Wildfires', 'Atmospheric rivers', 'Tule fog', 'Drought'],
    uniqueFacts: [
      'Sacramento is hotter than Los Angeles in summer — inland Central Valley heat pushes regularly past 100°F.',
      'The "Delta breeze" is a cool ocean draft that flows in through the Carquinez Strait on summer evenings, dropping temperatures 20°F.',
      'Tule fog in winter is thick enough to cause multi-car pileups on Central Valley highways.',
    ],
    faqs: [
      { question: 'When is the best time to visit Sacramento?', answer: 'April-May or September-October. Mild temperatures in the 70s°F, low humidity, minimal rain, and great wine country conditions. Summer is hot but dry.' },
      { question: 'How hot does Sacramento get in summer?', answer: 'Very hot — average highs in July and August exceed 90°F, with frequent stretches above 100°F. The record high is 115°F. But low humidity and evening Delta breeze cooling help.' },
      { question: 'What is tule fog?', answer: 'A thick, dense fog that forms in the Central Valley during winter when cold, moist air gets trapped under warmer air above. It can reduce visibility to near zero and is a major highway hazard from November through February.' },
      { question: 'Does Sacramento get rain?', answer: 'About 18 inches per year, almost entirely between November and April. Summer is essentially dry. Atmospheric river events can drop several inches at a time during winter.' },
    ],
  },
  'pittsburgh-pa': {
    climateType: 'Humid continental (Köppen Dfa/Dfb)',
    seasons: {
      spring: 'Spring is cool and damp with frequent rain and cloudy skies. Highs climb from the 50s°F in March to the 70s°F by May. Severe thunderstorms pop up by late spring.',
      summer: 'Summers are warm and humid with highs in the low 80s°F. Thunderstorms are frequent and can be severe, especially in June and July.',
      fall: 'Fall is Pittsburgh\'s best season — crisp, sunny, dry days with brilliant foliage in the surrounding Allegheny Mountains. October highs in the 60s°F are ideal.',
      winter: 'Winters are cold, cloudy, and snowy with highs in the upper 30s°F. The city averages 41 inches of snow per year, and January is particularly gloomy with few sunny days.',
    },
    monthlyHighs: [36, 39, 49, 61, 71, 79, 83, 81, 75, 63, 51, 40],
    monthlyLows: [21, 23, 30, 40, 50, 59, 63, 62, 55, 43, 34, 25],
    bestTimeToVisit: 'Mid-September through October for crisp fall weather and spectacular foliage. Late May and June are also pleasant with warm days and blooming trees.',
    severeRisks: ['Blizzards', 'Ice storms', 'Severe thunderstorms', 'Flash flooding', 'Polar vortex outbreaks'],
    uniqueFacts: [
      'Pittsburgh is one of the cloudiest major cities in the US, averaging over 200 cloudy days per year.',
      'The city sits at the confluence of three rivers, which can fuel dramatic flash flooding during heavy rain events.',
      'The 1993 "Storm of the Century" dropped over 2 feet of snow on the Pittsburgh area in a single storm.',
    ],
    faqs: [
      { question: 'When is the best time to visit Pittsburgh?', answer: 'Mid-September through October delivers the best weather — mild temperatures, low humidity, sunshine, and vivid fall foliage in the Allegheny Mountains. Late May and June are also pleasant.' },
      { question: 'Is Pittsburgh really cloudy?', answer: 'Yes. Pittsburgh averages over 200 cloudy days per year, among the most of any major US city. Winter months can go weeks with minimal sunshine, contributing to the city\'s reputation for gray weather.' },
      { question: 'How much snow does Pittsburgh get?', answer: 'About 41 inches per year on average. Lake-effect snow bands from Lake Erie can enhance totals in the city, and individual storms can drop a foot or more at a time.' },
      { question: 'Does Pittsburgh flood?', answer: 'Yes. The three-river confluence makes Pittsburgh vulnerable to flooding from heavy rain or rapid snowmelt. The 1936 flood and Hurricane Agnes (1972) both caused catastrophic damage.' },
    ],
  },
  'st-louis-mo': {
    climateType: 'Humid continental (Köppen Dfa)',
    seasons: {
      spring: 'Spring is wet and stormy — this is peak severe weather season. April and May bring large hail, tornadoes, and flooding rains, but also pleasant mild temperatures and blooming flowers.',
      summer: 'Summers are hot and humid with highs in the upper 80s°F and frequent heat waves. St. Louis routinely sees some of the highest heat index values in the Midwest.',
      fall: 'Fall is beautiful with crisp September days in the 70s°F, vivid October foliage, and mild November weather. Low humidity and minimal storms make it the best outdoor season.',
      winter: 'Winters are cold and variable with highs in the low 40s°F and occasional ice storms. Arctic outbreaks can push temperatures below zero.',
    },
    monthlyHighs: [40, 45, 56, 67, 76, 85, 89, 87, 80, 68, 54, 42],
    monthlyLows: [23, 27, 36, 46, 56, 65, 70, 68, 60, 48, 36, 27],
    bestTimeToVisit: 'September through October for mild, dry, sunny weather and fall foliage. Late April through May is also lovely but carries severe weather risk.',
    severeRisks: ['Tornadoes', 'Severe thunderstorms', 'Ice storms', 'Flash flooding', 'Heat waves'],
    uniqueFacts: [
      'St. Louis sits at the confluence of the Missouri and Mississippi rivers — and at the eastern edge of Tornado Alley.',
      'The 1896 St. Louis Tornado killed over 250 people, one of the deadliest in US history.',
      'The city is known for some of the highest heat index values in the Midwest due to its river valley humidity.',
    ],
    faqs: [
      { question: 'When is the best time to visit St. Louis?', answer: 'September through October delivers the best weather — mild days in the 70s°F, low humidity, minimal storm risk, and fall color. April-May is also pleasant but with significant severe weather risk.' },
      { question: 'Does St. Louis get tornadoes?', answer: 'Yes. St. Louis sits at the eastern edge of Tornado Alley and sees multiple severe weather outbreaks each spring. The historic 1896 tornado killed over 250 people, and modern outbreaks regularly threaten the metro.' },
      { question: 'How hot does St. Louis get in summer?', answer: 'Very hot. July and August average highs in the upper 80s°F with frequent 90°F+ days. High humidity pushes heat index values past 105°F regularly during heat waves.' },
      { question: 'Does St. Louis get flooding?', answer: 'Yes. The confluence of the Missouri and Mississippi rivers makes the metro area vulnerable to major flooding. The 1993 flood was one of the worst in US history, with levees failing and entire neighborhoods underwater.' },
    ],
  },
  'cincinnati-oh': {
    climateType: 'Humid continental (Köppen Dfa)',
    seasons: {
      spring: 'Spring is variable and often wet, with highs climbing from the 50s°F in March to the 70s°F by May. Severe thunderstorms become possible by late spring.',
      summer: 'Summers are warm and humid with highs in the mid-80s°F. Afternoon thunderstorms are common, especially in June and July.',
      fall: 'Fall is Cincinnati\'s best weather season — crisp, sunny, dry days with pleasant foliage in the surrounding Ohio River valley. October is especially nice.',
      winter: 'Winters are cold and cloudy with highs in the low 40s°F. Snow is moderate (about 22 inches per year) and ice storms are a common hazard.',
    },
    monthlyHighs: [39, 43, 53, 65, 74, 82, 86, 84, 78, 66, 53, 42],
    monthlyLows: [22, 24, 32, 42, 52, 61, 65, 63, 55, 44, 34, 26],
    bestTimeToVisit: 'Mid-September through October for crisp fall weather and foliage. Late April through early June is also pleasant with blooming trees and mild temperatures.',
    severeRisks: ['Severe thunderstorms', 'Tornadoes', 'Ice storms', 'Flash flooding', 'Polar vortex outbreaks'],
    uniqueFacts: [
      'Cincinnati sits in a river valley that can trap both cold air in winter and humid air in summer.',
      'The 1974 Super Outbreak spawned a catastrophic F5 tornado that destroyed Xenia, Ohio, just outside the metro.',
      'Cincinnati averages about 22 inches of snow per year, significantly less than cities further north.',
    ],
    faqs: [
      { question: 'When is the best time to visit Cincinnati?', answer: 'Mid-September through October for crisp, mild weather and fall foliage along the Ohio River. Late April through early June is also pleasant with blooming trees.' },
      { question: 'How humid are Cincinnati summers?', answer: 'Very humid. July and August dewpoints average in the upper 60s to low 70s°F, making heat index values climb into the 90s°F regularly. Afternoon thunderstorms provide brief cooling.' },
      { question: 'Does Cincinnati get tornadoes?', answer: 'Yes. Southwest Ohio sees occasional severe weather outbreaks each spring and summer. The 1974 Super Outbreak included the devastating Xenia tornado, just east of Cincinnati.' },
      { question: 'How cold does Cincinnati get?', answer: 'Average winter highs are in the low 40s°F with lows in the 20s°F. Arctic outbreaks can drop temperatures below zero, though extended deep cold is less common than further north.' },
    ],
  },
  'honolulu-hi': {
    climateType: 'Tropical (Köppen As)',
    seasons: {
      spring: 'Spring is warm, sunny, and dry with trade wind breezes. Highs in the low 80s°F and nights in the upper 60s°F. Dry season runs April through October.',
      summer: 'Summers are warm and mostly dry with persistent trade winds keeping things comfortable. Highs in the upper 80s°F and ocean temperatures near 80°F.',
      fall: 'Fall brings the end of trade wind season and the start of occasional tropical systems. October is usually still dry and warm, while November starts the wet season.',
      winter: 'Winters are mild and wetter — this is the rainy season, but "rain" in Honolulu usually means brief showers followed by sunshine. Highs in the upper 70s°F and ocean temperatures still warm.',
    },
    monthlyHighs: [80, 80, 81, 83, 85, 87, 88, 89, 89, 87, 84, 81],
    monthlyLows: [66, 66, 68, 70, 72, 74, 75, 76, 75, 73, 71, 68],
    bestTimeToVisit: 'April through June and September through October. These shoulder seasons offer ideal weather with fewer crowds than peak winter season. Hurricane risk is low May-October.',
    severeRisks: ['Tropical storms', 'Kona storms', 'Vog (volcanic fog)', 'Flash flooding', 'High surf'],
    uniqueFacts: [
      'Honolulu\'s temperatures vary only about 12°F between the coldest and warmest months — one of the most stable climates in the US.',
      'Trade winds blow steadily from the northeast 70% of the year, keeping the city comfortable despite tropical latitude.',
      'Kona storms (from the southwest) are rare but bring the heaviest rains when they occur.',
    ],
    faqs: [
      { question: 'When is the best time to visit Honolulu?', answer: 'April-June or September-October offer the best balance — warm, mostly dry weather with fewer crowds and lower prices than peak winter tourist season. Hurricane risk is low in these months.' },
      { question: 'Does Honolulu have seasons?', answer: 'Two — a warmer, drier summer (April-October) and a cooler, wetter winter (November-March). The temperature difference is minimal, usually just a few degrees, but rainfall varies significantly.' },
      { question: 'Does Honolulu get hurricanes?', answer: 'Rarely but it happens. Hurricane Iniki (1992) caused major damage to Kauai, and tropical systems occasionally track near the Hawaiian islands. Peak risk is July-October.' },
      { question: 'What is vog?', answer: 'Volcanic fog — a haze created by sulfur dioxide gas from Kilauea volcano on the Big Island. Trade winds occasionally blow vog to Oahu, creating poor air quality and reduced visibility.' },
    ],
  },
  'anchorage-ak': {
    climateType: 'Subarctic (Köppen Dfc)',
    seasons: {
      spring: 'Spring arrives late and slowly. March and April are still cold and snowy, but by May temperatures climb into the 50s°F and daylight expands rapidly toward 18 hours at the summer solstice.',
      summer: 'Summers are cool and pleasant with highs in the low 60s°F and nearly continuous daylight (over 19 hours on June 21). Rainfall is moderate and mountains stay snow-capped.',
      fall: 'Fall is short and spectacular — crisp mornings, yellow-gold birch foliage, and the start of aurora season. By late September daylight is noticeably shrinking.',
      winter: 'Winters are cold, dark, and snowy. Highs in the 20s°F, lows in the single digits°F, and only about 6 hours of daylight at the winter solstice. Anchorage averages 75 inches of snow per year.',
    },
    monthlyHighs: [22, 26, 33, 44, 56, 63, 66, 64, 56, 40, 28, 23],
    monthlyLows: [10, 13, 19, 30, 40, 48, 52, 50, 42, 28, 16, 10],
    bestTimeToVisit: 'June through August for warm (by Alaska standards) days, long sunlight, and accessible outdoor activities. September offers fall color and better aurora viewing odds.',
    severeRisks: ['Blizzards', 'Extreme cold', 'Earthquakes', 'Wind events', 'Icing conditions'],
    uniqueFacts: [
      'Anchorage receives over 19 hours of daylight on June 21 and under 6 hours on December 21.',
      'The city sits on the edge of the Chugach Mountains, which dramatically moderate what would otherwise be a harsher interior climate.',
      'Chinook winds from the Talkeetna Mountains can raise winter temperatures 30°F in hours.',
    ],
    faqs: [
      { question: 'When is the best time to visit Anchorage?', answer: 'June through August for warm weather (by Alaska standards), long daylight hours, and full access to outdoor activities. September offers fall color and improving aurora viewing.' },
      { question: 'How cold does Anchorage get?', answer: 'Average winter highs are in the 20s°F with lows in the single digits°F. Extended cold snaps can push temperatures below -20°F. The record low is -38°F, set in 1947.' },
      { question: 'Can you see the northern lights in Anchorage?', answer: 'Yes, but the city lights make viewing harder than darker locations like Fairbanks. Best aurora season runs late August through April, with peak viewing around the fall and spring equinoxes.' },
      { question: 'How much snow does Anchorage get?', answer: 'About 75 inches per year on average, though variability is extreme. Snow cover typically lasts from November through April, and cross-country skiing is a city-wide winter pastime.' },
    ],
  },
  'san-jose-ca': {
    climateType: 'Mediterranean (Köppen Csa/Csb)',
    seasons: {
      spring: 'Spring is mild and sunny with highs in the 60s-70s°F. Cherry blossoms, wildflowers, and hills that briefly turn green before drying out for the long summer.',
      summer: 'Summers are warm and dry with highs in the low 80s°F and cool evenings. Less fog than San Francisco, more heat than Monterey — Silicon Valley\'s "Goldilocks" weather.',
      fall: 'Fall brings the warmest weather of the year, with September and October often topping summer averages. Santa Ana-like conditions occasionally bring heat waves.',
      winter: 'Winters are mild with highs in the upper 50s°F and lows in the 40s°F. Most of the city\'s 15 inches of annual rain falls between December and March.',
    },
    monthlyHighs: [58, 62, 66, 70, 75, 80, 83, 83, 81, 74, 64, 57],
    monthlyLows: [42, 44, 45, 47, 51, 55, 57, 57, 55, 51, 46, 42],
    bestTimeToVisit: 'Any time — San Jose\'s climate is consistently pleasant. April-May and September-October are particularly nice with warm days, cool nights, and minimal rain.',
    severeRisks: ['Wildfires', 'Heat waves', 'Atmospheric rivers', 'Drought', 'Earthquakes'],
    uniqueFacts: [
      'San Jose averages 300+ sunny days per year, more than San Francisco or Los Angeles.',
      'Mountains to the west block coastal fog from reaching the city, keeping Silicon Valley warmer and drier than SF.',
      'The surrounding hills create a distinct microclimate that\'s warmer than the coast but cooler than the Central Valley.',
    ],
    faqs: [
      { question: 'When is the best time to visit San Jose?', answer: 'September and October deliver the warmest, driest weather with minimal fog. Spring (April-May) is also beautiful with wildflowers. The climate is pleasant year-round with only minor variation.' },
      { question: 'Is San Jose different from San Francisco weather?', answer: 'Significantly. San Jose is warmer, sunnier, and foggier-free than SF. Summer highs are often 15-20°F warmer in San Jose than at the SF coast. The mountains block the marine layer.' },
      { question: 'Does San Jose get cold?', answer: 'Rarely. Winter highs average in the upper 50s°F and lows in the 40s°F. Freezing temperatures are uncommon. Snow is essentially unheard of in the city itself.' },
      { question: 'How much does San Jose rain?', answer: 'About 15 inches per year, almost entirely between November and April. Summer is essentially dry. The 2022-23 winter brought exceptional rainfall and flooding from atmospheric river events.' },
    ],
  },
  'jacksonville-fl': {
    climateType: 'Humid subtropical (Köppen Cfa)',
    seasons: {
      spring: 'Spring is warm and sunny with highs climbing from the 70s°F to the upper 80s°F. March and April are especially pleasant with low humidity and blooming azaleas.',
      summer: 'Summers are hot and humid with highs in the low 90s°F and daily afternoon thunderstorms. Ocean breezes provide some relief along the coast.',
      fall: 'Fall stays warm and muggy through October, with peak hurricane risk in September. November finally brings drier, cooler weather.',
      winter: 'Winters are mild with highs in the mid-60s°F and lows in the 40s°F. Occasional cold fronts can drop temperatures into the 30s°F for a night or two.',
    },
    monthlyHighs: [65, 68, 74, 80, 86, 90, 92, 91, 87, 80, 73, 66],
    monthlyLows: [44, 46, 52, 58, 65, 72, 74, 74, 71, 63, 54, 46],
    bestTimeToVisit: 'Mid-October through April. Mild temperatures, low humidity, minimal rain, and outside hurricane season. February and March are especially nice with highs in the 70s°F.',
    severeRisks: ['Hurricanes', 'Severe thunderstorms', 'Lightning', 'Flash flooding', 'Tropical storms'],
    uniqueFacts: [
      'Jacksonville is one of the few Florida cities that occasionally sees hard freezes in winter.',
      'The city\'s coastal location and river mouth create some of Florida\'s most diverse weather patterns.',
      'Hurricane Matthew (2016) brought major coastal flooding to Jacksonville Beach despite tracking offshore.',
    ],
    faqs: [
      { question: 'When is the best time to visit Jacksonville?', answer: 'Mid-October through April. Pleasant temperatures, low humidity, minimal rain, and outside hurricane season. March delivers mild days perfect for golf and beach activities.' },
      { question: 'Does Jacksonville get hurricanes?', answer: 'Yes. Atlantic hurricanes occasionally impact the area, most notably Matthew (2016) and Irma (2017). Jacksonville\'s coastal location and St. Johns River make storm surge and flooding major concerns.' },
      { question: 'How cold does Jacksonville get?', answer: 'Milder than most of the northern Florida interior, but colder than Miami or Tampa. Winter highs average in the mid-60s°F. Hard freezes happen a few times per winter when Arctic air reaches the Southeast.' },
      { question: 'How humid are Jacksonville summers?', answer: 'Very humid. July and August dewpoints push past 75°F, making heat index values climb into the 100s°F. Daily thunderstorms provide brief cooling but add more moisture.' },
    ],
  },
  'fort-worth-tx': {
    climateType: 'Humid subtropical (Köppen Cfa)',
    seasons: {
      spring: 'Spring is stormy and beautiful — this is peak severe weather season. April and May bring large hail, tornadoes, and flooding rains, but also wildflower blooms and mild temperatures.',
      summer: 'Summers are hot and dry with highs routinely past 100°F from June through early September. The heat is less humid than Houston but still draining.',
      fall: 'Fall arrives slowly. October finally breaks the heat, and November brings mild, dry weather ideal for outdoor events and football games.',
      winter: 'Winters are variable with mild days punctuated by occasional ice storms and Arctic blasts. Temperatures can swing 50°F in a single day.',
    },
    monthlyHighs: [56, 61, 69, 76, 84, 92, 97, 97, 89, 78, 66, 58],
    monthlyLows: [35, 39, 47, 55, 64, 72, 76, 75, 68, 57, 46, 37],
    bestTimeToVisit: 'October and November for mild, dry weather. Late March through early May is beautiful but carries significant severe weather risk. Both windows deliver pleasant temperatures and sunshine.',
    severeRisks: ['Tornadoes', 'Large hail', 'Severe thunderstorms', 'Ice storms', 'Extreme heat'],
    uniqueFacts: [
      'Fort Worth sits in the heart of Tornado Alley and shares climate almost identically with Dallas.',
      'The 2000 Fort Worth tornado struck downtown during rush hour, damaging skyscrapers — one of very few urban tornado hits.',
      'Stock Show and Rodeo (January-February) usually enjoys mild weather but can be disrupted by Arctic cold fronts.',
    ],
    faqs: [
      { question: 'When is the best time to visit Fort Worth?', answer: 'October and November offer the best weather — mild temperatures, low humidity, minimal storm risk, and pleasant conditions for outdoor events. Late March is beautiful but with significant severe weather risk.' },
      { question: 'Does Fort Worth get tornadoes?', answer: 'Yes. The city sits squarely in Tornado Alley. The 2000 Fort Worth tornado was one of the very few to strike a major urban downtown. Multiple severe weather outbreaks hit the metroplex each spring.' },
      { question: 'How hot does Fort Worth get?', answer: 'Very hot. June through early September averages highs near 95-97°F with frequent stretches above 100°F. The 2011 summer saw over 70 days of 100°F+ temperatures.' },
      { question: 'Does Fort Worth get ice storms?', answer: 'Yes. When Arctic air meets Gulf moisture, the DFW area can see damaging ice storms — the 2013, 2021, and 2023 events all shut down the metroplex. Freezing rain is more common than pure snow.' },
    ],
  },
  'albuquerque-nm': {
    climateType: 'Semi-arid / cool steppe (Köppen BSk)',
    seasons: {
      spring: 'Spring is windy and variable. March and April bring gusty winds and wild temperature swings, but May warms into the 70s-80s°F with mostly sunny skies.',
      summer: 'Summers are hot but dry with highs in the upper 80s to low 90s°F. The North American Monsoon brings dramatic afternoon thunderstorms from July through September.',
      fall: 'Fall is spectacular — crisp days in the 60s-70s°F, cool nights, and brilliant cottonwood foliage along the Rio Grande. The Albuquerque Balloon Fiesta in early October is the main event.',
      winter: 'Winters are cold but sunny with highs in the upper 40s°F and cold nights in the 20s°F. Snow is occasional but usually light and melts quickly thanks to high-altitude sun.',
    },
    monthlyHighs: [48, 54, 62, 71, 80, 90, 92, 89, 82, 71, 57, 47],
    monthlyLows: [26, 30, 36, 44, 53, 63, 68, 67, 60, 47, 35, 27],
    bestTimeToVisit: 'Early October for the Balloon Fiesta and perfect fall weather. Late April through May and September-October are all excellent with warm days, cool nights, and minimal rain.',
    severeRisks: ['Monsoon thunderstorms', 'Flash flooding', 'Wildfires', 'Dust storms', 'Wind events'],
    uniqueFacts: [
      'Albuquerque sits at 5,312 feet elevation — even higher than Denver.',
      'The city receives over 300 sunny days per year, more than Miami or San Diego.',
      'The famous Albuquerque Balloon Fiesta takes advantage of the "Albuquerque Box" wind pattern that helps balloons navigate.',
    ],
    faqs: [
      { question: 'When is the best time to visit Albuquerque?', answer: 'Early October is legendary — it\'s when the International Balloon Fiesta fills the skies with hundreds of hot air balloons under perfect fall weather. Spring (April-May) is also excellent for outdoor exploration.' },
      { question: 'How cold does Albuquerque get?', answer: 'Cold for the Southwest but mild compared to the Midwest. Winter highs average in the upper 40s°F with cold nights in the 20s°F. Arctic outbreaks can push temperatures below zero but are relatively brief.' },
      { question: 'Does Albuquerque have monsoon season?', answer: 'Yes. The North American Monsoon runs July through September, bringing dramatic afternoon thunderstorms, flash flood risk, and spectacular sunsets. This is when most of the year\'s rain falls.' },
      { question: 'How much elevation does Albuquerque have?', answer: '5,312 feet in the city center, with the Sandia Mountains to the east rising above 10,000 feet. The high altitude means intense UV, cool nights even in summer, and rapid weather changes.' },
    ],
  },
  'tucson-az': {
    climateType: 'Hot desert (Köppen BWh)',
    seasons: {
      spring: 'Spring is Tucson\'s peak wildflower season — saguaro cacti bloom in April-May and desert colors peak. Highs climb from the 70s°F to the 90s°F with low humidity.',
      summer: 'Summers are intensely hot with highs regularly exceeding 100°F from May through September. The North American Monsoon in July-August brings dramatic afternoon thunderstorms and some of the most beautiful skies in the US.',
      fall: 'Fall cools slowly through September and October. By November, highs are in the 70s-80s°F with crisp nights and perfect outdoor weather.',
      winter: 'Winters are mild and sunny with highs in the mid-60s°F and cool nights in the 40s°F. Occasional cold fronts can drop temperatures into the 30s°F overnight.',
    },
    monthlyHighs: [65, 68, 74, 82, 91, 100, 100, 98, 95, 84, 73, 65],
    monthlyLows: [41, 44, 48, 54, 62, 71, 75, 74, 69, 58, 47, 41],
    bestTimeToVisit: 'October through April. Mild-to-warm days, cool nights, sunshine, and no extreme heat. March-April is peak wildflower season and ideal for hiking Saguaro National Park.',
    severeRisks: ['Extreme heat', 'Monsoon thunderstorms', 'Flash flooding', 'Dust storms', 'Wildfires'],
    uniqueFacts: [
      'Tucson sits at 2,400 feet elevation, making it slightly cooler than Phoenix despite being further south.',
      'The North American Monsoon brings some of the most photogenic lightning and sunset skies in the US.',
      'Saguaro National Park\'s namesake cacti only exist in the Sonoran Desert around Tucson and Phoenix.',
    ],
    faqs: [
      { question: 'When is the best time to visit Tucson?', answer: 'October through April delivers Tucson\'s best weather — mild temperatures, sunshine, and no extreme heat. March and April bring wildflower season and ideal hiking weather in Saguaro National Park.' },
      { question: 'Is Tucson cooler than Phoenix?', answer: 'Slightly. Tucson\'s higher elevation (2,400 ft vs Phoenix\'s 1,100 ft) means summer highs are typically 4-6°F cooler. It\'s still brutally hot in summer, just not quite as extreme.' },
      { question: 'What is monsoon season in Tucson?', answer: 'The North American Monsoon runs from late June through September, bringing dramatic afternoon thunderstorms, flash flood risk, dust storms, and some of the most spectacular skies in the US. Most of the year\'s rain falls during this window.' },
      { question: 'Does Tucson ever freeze?', answer: 'Occasionally. Winter nights can dip into the upper 20s°F, and hard freezes happen every few winters. The last major freeze was February 2011, when temperatures dropped below 20°F and damaged desert vegetation.' },
    ],
  },
}

/**
 * Neighbor map for internal linking — each city points to 3-4 geographically
 * or climatologically adjacent cities. Powers the "Explore nearby cities"
 * section on every city page, which gives Googlebot a dense crawl graph.
 */
export const cityNeighbors: Record<string, string[]> = {
  'new-york-ny': ['philadelphia-pa', 'boston-ma', 'baltimore-md', 'pittsburgh-pa'],
  'los-angeles-ca': ['san-diego-ca', 'las-vegas-nv', 'san-jose-ca', 'phoenix-az'],
  'chicago-il': ['milwaukee-wi', 'indianapolis-in', 'minneapolis-mn', 'detroit-mi'],
  'houston-tx': ['dallas-tx', 'austin-tx', 'san-antonio-tx', 'new-orleans-la'],
  'phoenix-az': ['tucson-az', 'las-vegas-nv', 'albuquerque-nm', 'los-angeles-ca'],
  'philadelphia-pa': ['new-york-ny', 'baltimore-md', 'pittsburgh-pa', 'boston-ma'],
  'san-antonio-tx': ['austin-tx', 'houston-tx', 'dallas-tx', 'fort-worth-tx'],
  'san-diego-ca': ['los-angeles-ca', 'las-vegas-nv', 'phoenix-az', 'san-jose-ca'],
  'dallas-tx': ['fort-worth-tx', 'austin-tx', 'houston-tx', 'san-antonio-tx'],
  'austin-tx': ['san-antonio-tx', 'houston-tx', 'dallas-tx', 'fort-worth-tx'],
  'miami-fl': ['orlando-fl', 'tampa-fl', 'jacksonville-fl', 'new-orleans-la'],
  'atlanta-ga': ['nashville-tn', 'charlotte-nc', 'jacksonville-fl', 'raleigh-nc'],
  'denver-co': ['salt-lake-city-ut', 'albuquerque-nm', 'kansas-city-mo', 'las-vegas-nv'],
  'seattle-wa': ['portland-or', 'san-francisco-ca', 'san-jose-ca', 'anchorage-ak'],
  'san-francisco-ca': ['san-jose-ca', 'sacramento-ca', 'portland-or', 'los-angeles-ca'],
  'boston-ma': ['new-york-ny', 'philadelphia-pa', 'pittsburgh-pa', 'baltimore-md'],
  'las-vegas-nv': ['phoenix-az', 'salt-lake-city-ut', 'los-angeles-ca', 'tucson-az'],
  'portland-or': ['seattle-wa', 'san-francisco-ca', 'sacramento-ca', 'san-jose-ca'],
  'nashville-tn': ['atlanta-ga', 'charlotte-nc', 'st-louis-mo', 'cincinnati-oh'],
  'minneapolis-mn': ['milwaukee-wi', 'chicago-il', 'kansas-city-mo', 'detroit-mi'],
  'orlando-fl': ['tampa-fl', 'miami-fl', 'jacksonville-fl', 'atlanta-ga'],
  'tampa-fl': ['orlando-fl', 'miami-fl', 'jacksonville-fl', 'new-orleans-la'],
  'detroit-mi': ['cleveland-oh', 'chicago-il', 'milwaukee-wi', 'indianapolis-in'],
  'cleveland-oh': ['detroit-mi', 'columbus-oh', 'cincinnati-oh', 'pittsburgh-pa'],
  'indianapolis-in': ['columbus-oh', 'cincinnati-oh', 'chicago-il', 'st-louis-mo'],
  'columbus-oh': ['cincinnati-oh', 'cleveland-oh', 'indianapolis-in', 'pittsburgh-pa'],
  'charlotte-nc': ['raleigh-nc', 'atlanta-ga', 'nashville-tn', 'virginia-beach-va'],
  'baltimore-md': ['philadelphia-pa', 'new-york-ny', 'virginia-beach-va', 'pittsburgh-pa'],
  'milwaukee-wi': ['chicago-il', 'minneapolis-mn', 'detroit-mi', 'indianapolis-in'],
  'kansas-city-mo': ['st-louis-mo', 'minneapolis-mn', 'denver-co', 'indianapolis-in'],
  'salt-lake-city-ut': ['denver-co', 'las-vegas-nv', 'phoenix-az', 'albuquerque-nm'],
  'raleigh-nc': ['charlotte-nc', 'virginia-beach-va', 'atlanta-ga', 'nashville-tn'],
  'new-orleans-la': ['houston-tx', 'jacksonville-fl', 'miami-fl', 'tampa-fl'],
  'virginia-beach-va': ['raleigh-nc', 'baltimore-md', 'charlotte-nc', 'philadelphia-pa'],
  'sacramento-ca': ['san-francisco-ca', 'san-jose-ca', 'portland-or', 'los-angeles-ca'],
  'pittsburgh-pa': ['cleveland-oh', 'philadelphia-pa', 'columbus-oh', 'baltimore-md'],
  'st-louis-mo': ['kansas-city-mo', 'indianapolis-in', 'nashville-tn', 'cincinnati-oh'],
  'cincinnati-oh': ['columbus-oh', 'indianapolis-in', 'cleveland-oh', 'nashville-tn'],
  'honolulu-hi': ['anchorage-ak', 'san-francisco-ca', 'san-jose-ca', 'los-angeles-ca'],
  'anchorage-ak': ['seattle-wa', 'portland-or', 'honolulu-hi', 'san-francisco-ca'],
  'san-jose-ca': ['san-francisco-ca', 'sacramento-ca', 'los-angeles-ca', 'portland-or'],
  'jacksonville-fl': ['orlando-fl', 'tampa-fl', 'miami-fl', 'atlanta-ga'],
  'fort-worth-tx': ['dallas-tx', 'austin-tx', 'houston-tx', 'san-antonio-tx'],
  'albuquerque-nm': ['phoenix-az', 'tucson-az', 'denver-co', 'salt-lake-city-ut'],
  'tucson-az': ['phoenix-az', 'albuquerque-nm', 'las-vegas-nv', 'san-diego-ca'],
}

/** Return rich SEO enrichment for a city, or null if not yet curated. */
export function getCityEnrichment(slug: string): CitySeoEnrichment | null {
  return cityEnrichments[slug] ?? null
}

/**
 * Resolve neighbor slugs into full name/state records for link rendering.
 * Filters out any neighbor that isn't in cityData (should never happen but
 * protects against typos in the neighbor map).
 */
export function getNearbyCities(slug: string): Array<{ slug: string; name: string; state: string }> {
  const neighbors = cityNeighbors[slug] ?? []
  return neighbors
    .map(neighborSlug => {
      const data = cityData[neighborSlug]
      if (!data) return null
      return { slug: neighborSlug, name: data.name, state: data.state }
    })
    .filter((x): x is { slug: string; name: string; state: string } => x !== null)
}

