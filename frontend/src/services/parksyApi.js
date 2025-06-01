const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://parksy-app.onrender.com';

// UK city coordinates mapping
const UK_CITY_COORDINATES = {
  london: { lat: 51.5074, lng: -0.1278 },
  manchester: { lat: 53.4808, lng: -2.2426 },
  birmingham: { lat: 52.4862, lng: -1.8904 },
  leeds: { lat: 53.8008, lng: -1.5491 },
  liverpool: { lat: 53.4084, lng: -2.9916 },
  bristol: { lat: 51.4545, lng: -2.5879 },
  sheffield: { lat: 53.3811, lng: -1.4701 },
  glasgow: { lat: 55.8642, lng: -4.2518 },
  edinburgh: { lat: 55.9533, lng: -3.1883 }
};

// Helper Functions

const isUKCity = (location) => {
  if (!location) return false;
  return Object.keys(UK_CITY_COORDINATES).some(city => 
    location.toLowerCase().includes(city)
  );
};

const getCityCoordinates = (location) => {
  if (!location) return { lat: 51.5074, lng: -0.1278 }; // Default to London
  
  const cityKey = Object.keys(UK_CITY_COORDINATES).find(city => 
    location.toLowerCase().includes(city)
  );
  
  return UK_CITY_COORDINATES[cityKey] || { lat: 51.5074, lng: -0.1278 };
};

const getDefaultUKRules = () => [
  "Standard UK parking regulations apply",
  "Check local signage for specific restrictions",
  "Payment required during operational hours",
  "Disabled bays are strictly enforced",
  "No parking on double yellow lines"
];

const getCityRules = (city) => {
  const cityLower = city.toLowerCase();
  const rules = [...getDefaultUKRules()];
  
  if (cityLower.includes('london')) {
    rules.push(
      "Congestion Charge may apply (Mon-Fri 7am-6pm)",
      "ULEZ charges apply for non-compliant vehicles"
    );
  }
  
  if (cityLower.includes('manchester') || cityLower.includes('birmingham')) {
    rules.push(
      "City centre time limits enforced",
      "Evening restrictions may apply until 8pm"
    );
  }
  
  return rules;
};

const getCityPricing = (city) => {
  const cityLower = city.toLowerCase();
  
  if (cityLower.includes('london')) {
    return {
      estimated_hourly: '£4.90-£8.00',
      estimated_daily: '£30.00-£50.00',
      notes: ['Central London premium rates', 'Evening discounts available']
    };
  }
  
  if (cityLower.includes('manchester') || cityLower.includes('birmingham')) {
    return {
      estimated_hourly: '£1.50-£3.50',
      estimated_daily: '£8.00-£20.00',
      notes: ['City centre rates', 'Retail parking often free for first hours']
    };
  }
  
  return {
    estimated_hourly: '£1.00-£2.50',
    estimated_daily: '£5.00-£15.00',
    notes: ['Local variations apply', 'Check for free periods']
  };
};

const calculateParkingScore = (spot) => {
  let score = 70; // Base score
  
  // Increase score for good amenities
  if (spot.uk_analysis?.payment_methods?.includes('App likely available')) score += 10;
  if (spot.uk_analysis?.recommended_for?.includes('Security')) score += 5;
  
  // Decrease score for restrictions
  if (spot.uk_analysis?.likely_restrictions?.length > 2) score -= 5;
  
  return Math.min(100, Math.max(0, score)); // Keep between 0-100
};

const getAmenitiesFromSpot = (spot) => {
  const amenities = [];
  
  if (spot.uk_analysis) {
    if (spot.uk_analysis.type.includes('Multi-storey')) amenities.push('Covered parking');
    if (spot.uk_analysis.recommended_for?.includes('Security')) amenities.push('Security cameras');
    if (spot.uk_analysis.accessibility === 'Disabled spaces available') amenities.push('Disabled access');
  }
  
  // Default amenities for UK parking
  if (amenities.length === 0) {
    amenities.push('Standard parking', 'CCTV likely', 'Payment kiosk');
  }
  
  return amenities;
};

const generateFallbackUKData = (location) => {
  const cityName = location.split(',')[0].trim();
  const coordinates = getCityCoordinates(location);
  
  const demoSpots = [
    {
      id: `fallback_${cityName.toLowerCase()}_1`,
      title: `${cityName} City Centre Car Park`,
      address: `City Centre, ${cityName}`,
      distance: 500,
      position: coordinates,
      score: 80,
      parking_type: {
        estimated_cost: '£2.50-£4.50/hour',
        typical_time_limit: 'Max 4 hours'
      },
      availability: {
        status: 'Available',
        message: 'Likely spaces available'
      },
      detailed_rules: getDefaultUKRules(),
      amenities: ['CCTV', 'Payment kiosk', 'Lighting'],
      payment_methods: ['Card', 'Mobile App', 'Cash'],
      uk_specific: true
    },
    {
      id: `fallback_${cityName.toLowerCase()}_2`,
      title: `${cityName} Shopping Centre Parking`,
      address: `Retail Park, ${cityName}`,
      distance: 800,
      position: {
        lat: coordinates.lat + 0.005,
        lng: coordinates.lng + 0.005
      },
      score: 75,
      parking_type: {
        estimated_cost: 'First 2 hours free, then £2/hour',
        typical_time_limit: 'Customer parking only'
      },
      availability: {
        status: 'Available',
        message: 'Free for shoppers'
      },
      detailed_rules: getDefaultUKRules(),
      amenities: ['CCTV', 'Disabled access'],
      payment_methods: ['Card', 'Mobile App'],
      uk_specific: true
    }
  ];

  return {
    data: {
      parking_spots: demoSpots,
      location: cityName,
      general_rules: getCityRules(cityName),
      pricing_guide: getCityPricing(cityName),
      search_radius: '1 mile',
      last_updated: new Date().toISOString()
    },
    metadata: {
      source: 'fallback',
      timestamp: new Date().toISOString()
    }
  };
};

const getFallbackDataForUKCity = (location) => {
  if (isUKCity(location)) {
    return generateFallbackUKData(location);
  }
  return null;
};

const getFallbackDetails = (spotId) => {
  // Extract city from spot ID (format: fallback_[city]_1)
  const cityMatch = spotId.match(/fallback_([a-z]+)_/i);
  if (cityMatch && cityMatch[1]) {
    const city = cityMatch[1];
    const fallbackData = generateFallbackUKData(city);
    return {
      data: fallbackData.data.parking_spots.find(spot => spot.id === spotId) || {}
    };
  }
  return null;
};

const generateSpotId = () => `spot_${Math.random().toString(36).substr(2, 9)}`;

const calculatePopularityScore = (spotData) => {
  if (spotData.address?.toLowerCase().includes('city centre')) return 85;
  if (spotData.address?.toLowerCase().includes('london')) return 90;
  return 70;
};

const calculateSafetyScore = (spotData) => {
  if (spotData.amenities?.includes('Security cameras')) return 85;
  if (spotData.type?.includes('Multi-storey')) return 80;
  return 75;
};

/**
 * Enhanced UK parking search with fallback data
 */
export const searchParking = async (location) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ 
        message: `Find parking in ${location}`,
        user_id: 'web-user' 
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to search for parking');
    }

    const data = await response.json();
    
    // Transform and enhance the response
    return transformUKParkingResponse(data, location);
    
  } catch (error) {
    console.error('Parking search error:', error);
    
    // Return fallback data for known UK cities
    const fallbackData = getFallbackDataForUKCity(location);
    if (fallbackData) {
      console.warn('Using fallback data for', location);
      return fallbackData;
    }

    throw new Error(
      error.message === 'Failed to fetch' ? 
      'Network error. Please check your connection.' : 
      error.message || 'Failed to search for parking spots'
    );
  }
};

/**
 * Enhanced response transformer with UK-specific data
 */
const transformUKParkingResponse = (apiResponse, location) => {
  // Check if we have valid parking spots
  const hasValidSpots = apiResponse.data?.parking_spots?.length > 0;
  
  // If no spots but location is a UK city, generate fallback
  if (!hasValidSpots && isUKCity(location)) {
    return generateFallbackUKData(location);
  }

  // Transform the spots we do have
  const transformedSpots = (apiResponse.data?.parking_spots || []).map(spot => ({
    id: spot.id || generateSpotId(),
    title: spot.title || `${location} Parking`,
    address: spot.address || 'Address not specified',
    distance: spot.distance || Math.floor(Math.random() * 1000) + 100,
    position: spot.position || getCityCoordinates(location),
    score: calculateParkingScore(spot),
    parking_type: {
      estimated_cost: spot.pricing_estimate?.estimated_hourly || '£2.00-£4.00',
      typical_time_limit: spot.uk_analysis?.likely_restrictions?.join(', ') || 'Check local signs'
    },
    availability: {
      status: 'Available',
      message: 'Likely spaces available'
    },
    detailed_rules: spot.rules_applicable || getDefaultUKRules(),
    amenities: getAmenitiesFromSpot(spot),
    payment_methods: spot.uk_analysis?.payment_methods || ['Card', 'Mobile App', 'Cash'],
    uk_specific: true
  }));

  return {
    data: {
      parking_spots: transformedSpots,
      location: apiResponse.data?.location || location,
      general_rules: apiResponse.data?.location_rules || getCityRules(location),
      pricing_guide: apiResponse.data?.pricing_guide || getCityPricing(location),
      search_radius: '1 mile',
      last_updated: new Date().toISOString()
    },
    metadata: {
      source: apiResponse.data ? 'live' : 'fallback',
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Get detailed parking information with UK context
 */
export const getParkingDetails = async (spotId) => {
  try {
    // Check cache first
    const cacheKey = `parking-details-${spotId}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) return JSON.parse(cachedData);

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ 
        message: `Get details for parking spot ${spotId}`,
        user_id: 'web-user'
      })
    });

    if (!response.ok) throw new Error('Failed to get parking details');

    const data = await response.json();
    const transformed = transformUKDetailsResponse(data, spotId);
    
    // Cache the response
    sessionStorage.setItem(cacheKey, JSON.stringify(transformed));
    return transformed;

  } catch (error) {
    console.error('Parking details error:', error);
    
    // Return fallback details if available
    const fallbackDetails = getFallbackDetails(spotId);
    if (fallbackDetails) {
      console.warn('Using fallback details for spot', spotId);
      return fallbackDetails;
    }

    throw new Error(
      error.message || 'Failed to get parking details. Please try again.'
    );
  }
};

/**
 * Enhanced details transformer with UK-specific data
 */
const transformUKDetailsResponse = (apiResponse, spotId) => {
  const spot = apiResponse.data?.parking_spots?.find(s => s.id === spotId) || {};
  const location = spot.address?.split(',')[1]?.trim() || 'UK';

  return {
    data: {
      id: spotId,
      title: spot.title || 'UK Parking Spot',
      address: spot.address || 'Address not available',
      position: spot.position || { lat: 51.5074, lng: -0.1278 }, // Default to London
      detailed_rules: spot.rules_applicable || getDefaultUKRules(),
      amenities: getAmenitiesFromSpot(spot),
      payment_methods: spot.uk_analysis?.payment_methods || ['Card', 'Mobile App', 'Cash'],
      pricing: spot.pricing_estimate || {
        estimated_hourly: '£2.00-£4.00',
        estimated_daily: '£15.00-£25.00',
        notes: ['Prices may vary by time and day']
      },
      restrictions: spot.uk_analysis?.likely_restrictions || [
        "Time limits may apply",
        "Check for resident permit requirements"
      ],
      accessibility: spot.uk_analysis?.accessibility || 'Standard',
      type: spot.uk_analysis?.type || 'Public Parking',
      location: location,
      last_updated: new Date().toISOString(),
      uk_specific: true
    }
  };
};

/**
 * Health check with enhanced UK status reporting
 */
export const checkApiHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    if (!response.ok) {
      return {
        healthy: false,
        status: 'unavailable',
        coverage: 'UK',
        fallback_mode: true
      };
    }
    
    const data = await response.json();
    return {
      healthy: data.status === 'healthy',
      apiVersion: data.version,
      hereApiConfigured: data.here_api_configured,
      timestamp: data.timestamp,
      coverage: data.coverage || 'UK',
      fallback_mode: !data.here_api_configured
    };
    
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      healthy: false,
      error: error.message,
      coverage: 'UK',
      fallback_mode: true
    };
  }
};

/**
 * Get extended parking info with UK context
 */
export const getExtendedParkingInfo = async (spotId) => {
  try {
    const [details, health] = await Promise.all([
      getParkingDetails(spotId),
      checkApiHealth()
    ]);
    
    return {
      ...details,
      systemStatus: health,
      lastUpdated: new Date().toISOString(),
      analytics: {
        popularity: calculatePopularityScore(details.data),
        safety: calculateSafetyScore(details.data),
        uk_specific: true
      }
    };
  } catch (error) {
    console.error('Extended info error:', error);
    throw error;
  }
};

export default {
  searchParking,
  getParkingDetails,
  checkApiHealth,
  getExtendedParkingInfo
};