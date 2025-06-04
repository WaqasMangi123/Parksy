const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://parksy-app.onrender.com';

// Helper function to provide default UK parking rules
const getDefaultUKRules = () => [
  "Standard UK parking regulations apply",
  "Check local signage for specific restrictions",
  "Payment required during operational hours",
  "Disabled bays are strictly enforced",
  "No parking on double yellow lines",
];

// Helper function to provide city-specific UK parking rules
const getCityRules = (city) => {
  const cityLower = city.toLowerCase();
  const rules = [...getDefaultUKRules()];
  
  if (cityLower.includes('london')) {
    rules.push(
      "Congestion Charge may apply (Mon-Fri, 7am-6pm)",
      "ULEZ charges apply for non-compliant vehicles",
    );
  }
  
  if (cityLower.includes('manchester') || cityLower.includes('birmingham')) {
    rules.push(
      "City centre time limits enforced",
      "Evening restrictions may apply until 8pm",
    );
  }
  
  if (cityLower.includes('edinburgh')) {
    rules.push(
      "Controlled Parking Zones (CPZs) operate Mon-Fri, 8:30am-6:30pm",
      "Resident permit zones limit non-permit parking to 4 hours",
      "Pay-and-display rates vary by zone (£3-£5/hour in central areas)",
      "Check for event-related restrictions near venues",
    );
  }
  
  if (cityLower.includes('leeds')) {
    rules.push(
      "Clean Air Zone charges may apply for non-compliant vehicles",
      "City centre parking limited to 2-3 hours in some areas",
      "Evening restrictions in entertainment districts until 8pm",
    );
  }
  
  return rules;
};

// Transform API response for parking search to match frontend expectations
const transformParkingResponse = (apiResponse, location) => {
  if (!apiResponse || !apiResponse.all_spots?.length) {
    return generateFallbackData(location);
  }

  const transformedSpots = apiResponse.all_spots.map((spot) => ({
    id: spot.id || `spot_${Math.random().toString(36).substr(2, 9)}`,
    title: spot.title || 'Unnamed Parking Spot',
    address: spot.address || 'Address not available',
    distance: spot.distance ? parseInt(spot.distance.replace('m', ''), 10) : 500,
    position: spot.coordinates || { lat: 51.5074, lng: -0.1278 },
    recommendation_score: spot.recommendation_score || 70,
    pricing: {
      hourly_rate: spot.pricing?.hourly_rate || '£2.50-£4.50',
      payment_methods: spot.pricing?.payment_methods || ['Card', 'Mobile App', 'Cash'],
      daily_rate: spot.pricing?.daily_rate || '£15.00-£25.00',
    },
    availability: {
      status: spot.availability?.status || 'Available',
      spaces_available: spot.availability?.spaces_available || 'Unknown',
    },
    special_features: spot.special_features || ['CCTV', 'Lighting'],
    restrictions: spot.restrictions || getCityRules(apiResponse.search_context?.location || location),
    uk_specific: true,
    analysis: spot.analysis || {},
    walking_time: spot.walking_time || '5 minutes',
  }));

  return {
    message: apiResponse.message || `Found parking options for ${apiResponse.search_context?.location || location}! 😊`,
    top_recommendations: transformedSpots.slice(0, 5),
    all_spots: transformedSpots,
    search_context: {
      location: apiResponse.search_context?.location || location,
      local_regulations: getCityRules(apiResponse.search_context?.location || location),
    },
    summary: {
      total_options: apiResponse.summary?.total_options || transformedSpots.length,
      average_price: apiResponse.summary?.average_price || '£3.00/hour',
      closest_option: apiResponse.summary?.closest_option || transformedSpots[0],
      cheapest_option: apiResponse.summary?.cheapest_option || transformedSpots[0],
    },
    recommendations: {
      best_overall: transformedSpots.find(s => s.id === apiResponse.recommendations?.best_overall?.id) || transformedSpots[0],
      best_value: transformedSpots.find(s => s.id === apiResponse.recommendations?.best_value?.id) || transformedSpots[1] || transformedSpots[0],
      closest: transformedSpots.find(s => s.id === apiResponse.recommendations?.closest?.id) || transformedSpots[0],
    },
    area_insights: {
      area_type: apiResponse.area_insights?.area_type || 'Urban',
      parking_density: apiResponse.area_insights?.parking_density || 'Moderate',
      typical_pricing: apiResponse.area_insights?.typical_pricing || '£2.00-£4.00/hour',
      best_parking_strategy: apiResponse.area_insights?.best_parking_strategy || 'Arrive early for best spots',
    },
    tips: apiResponse.tips || [
      "Consider public transport for city centre locations",
      "Check for evening and weekend restrictions",
      "Look for parking apps that offer discounts",
    ],
  };
};

// Transform API response for parking details to match frontend expectations
const transformDetailsResponse = (apiResponse, spotId) => {
  const spot = apiResponse || {};

  return {
    id: spotId,
    title: spot.title || 'UK Parking Spot',
    address: spot.address || 'Address not available',
    position: spot.coordinates || { lat: 51.5074, lng: -0.1278 },
    detailed_info: {
      live_availability: spot.detailed_info?.live_availability || 'Available',
      nearby_amenities: spot.detailed_info?.nearby_amenities || ['CCTV', 'Lighting'],
      recent_reviews: spot.detailed_info?.recent_reviews || [
        { rating: 4, comment: "Good location but a bit pricey" },
        { rating: 5, comment: "Very convenient with good security" },
      ],
      traffic_conditions: spot.detailed_info?.traffic_conditions || "Moderate traffic during peak hours",
    },
    booking_options: spot.booking_options?.map((method) => ({
      provider: method.provider || 'Standard',
      advance_booking: method.advance_booking !== false,
      mobile_payment: method.mobile_payment !== false,
    })) || [{ provider: 'Standard', advance_booking: false, mobile_payment: true }],
    restrictions: spot.restrictions || getDefaultUKRules(),
    accessibility: spot.accessibility ? 'Available' : 'Standard',
    type: spot.type || 'Public Parking',
    location: spot.location || 'UK',
    last_updated: new Date().toISOString(),
    uk_specific: true,
    analysis: spot.analysis || {},
  };
};

// Generate fallback data for when API fails or returns no results
const generateFallbackData = (location) => {
  const city = location.split(',')[0].trim().toLowerCase();
  const isEdinburgh = city.includes('edinburgh');
  const isLeeds = city.includes('leeds');
  
  const cityLat = isEdinburgh ? 55.9533 : isLeeds ? 53.8008 : 51.5074;
  const cityLng = isEdinburgh ? -3.1883 : isLeeds ? -1.5491 : -0.1278;
  
  const demoSpots = [
    {
      id: `fallback_${city}_1`,
      title: `${city.charAt(0).toUpperCase() + city.slice(1)} City Centre Car Park`,
      address: `City Centre, ${city.charAt(0).toUpperCase() + city.slice(1)}`,
      distance: 500,
      position: { lat: cityLat + Math.random() * 0.02 - 0.01, lng: cityLng + Math.random() * 0.02 - 0.01 },
      recommendation_score: 80,
      pricing: {
        hourly_rate: isEdinburgh ? '£3.00-£5.00' : '£2.50-£4.50',
        payment_methods: ['Card', 'Mobile App', 'Cash'],
        daily_rate: isEdinburgh ? '£20.00-£30.00' : '£15.00-£25.00',
      },
      availability: {
        status: 'Available',
        spaces_available: isEdinburgh ? 'Limited in CPZs' : 'Likely available',
      },
      special_features: isEdinburgh ? ['CCTV', 'Pay-and-Display', 'Resident Permits'] : ['CCTV', 'Payment kiosk', 'Lighting'],
      restrictions: getCityRules(city),
      uk_specific: true,
      walking_time: '5 minutes',
    },
    {
      id: `fallback_${city}_2`,
      title: `${city.charAt(0).toUpperCase() + city.slice(1)} Shopping Centre Parking`,
      address: `Retail Park, ${city.charAt(0).toUpperCase() + city.slice(1)}`,
      distance: 800,
      position: { lat: cityLat + Math.random() * 0.02 - 0.01, lng: cityLng + Math.random() * 0.02 - 0.01 },
      recommendation_score: 75,
      pricing: {
        hourly_rate: isEdinburgh ? 'First 2 hours free, then £2.50/hour' : 'First 2 hours free, then £2/hour',
        payment_methods: ['Card', 'Mobile App'],
        daily_rate: isEdinburgh ? '£15.00-£25.00' : '£10.00-£20.00',
      },
      availability: {
        status: 'Available',
        spaces_available: 'Free for shoppers',
      },
      special_features: ['CCTV', 'Disabled access'],
      restrictions: getCityRules(city),
      uk_specific: true,
      walking_time: '8 minutes',
    },
  ];

  return {
    message: `No live data for ${city.charAt(0).toUpperCase() + city.slice(1)}, showing sample parking options! 😊`,
    top_recommendations: demoSpots,
    all_spots: demoSpots,
    search_context: {
      location: city.charAt(0).toUpperCase() + city.slice(1),
      local_regulations: getCityRules(city),
    },
    summary: {
      total_options: demoSpots.length,
      average_price: isEdinburgh ? '£3.50/hour' : '£3.00/hour',
      closest_option: demoSpots[0],
      cheapest_option: demoSpots[1],
    },
    recommendations: {
      best_overall: demoSpots[0],
      best_value: demoSpots[1],
      closest: demoSpots[0],
    },
    area_insights: {
      area_type: 'Urban',
      parking_density: 'Moderate',
      typical_pricing: isEdinburgh ? '£3.00-£5.00/hour' : '£2.00-£4.00/hour',
      best_parking_strategy: 'Arrive early for best spots',
    },
    tips: [
      "Consider public transport for city centre locations",
      "Check for evening and weekend restrictions",
      "Look for parking apps that offer discounts",
    ],
  };
};

/**
 * Send a chat message to the parking assistant
 * @param {string} message - The message to send
 * @returns {Promise<Object>} - The assistant's response
 */
export const sendChatMessage = async (message) => {
  try {
    // Handle parking search queries
    if (message.toLowerCase().includes('parking') || 
        message.toLowerCase().includes('park') ||
        message.toLowerCase().includes('where can i') ||
        message.toLowerCase().includes('find')) {
      const locationMatch = message.match(/in (.+)|near (.+)|(.+)/i);
      const location = locationMatch ? (locationMatch[1] || locationMatch[2] || locationMatch[3] || 'London') : 'London';
      return await searchParking(location);
    }

    // Use the chat API
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        message,
        user_id: 'web-user',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to send chat message`);
    }

    const data = await response.json();
    return transformParkingResponse(data, data.search_context?.location || 'London');
  } catch (error) {
    console.error('Chat error:', error.message);
    return {
      message: `I'm having trouble connecting to the parking service. Here's some sample parking information for ${message}:`,
      ...generateFallbackData(message),
    };
  }
};

/**
 * Search for parking in a UK location
 * @param {string} location - The location to search for parking
 * @returns {Promise<Object>} - Transformed parking data
 */
export const searchParking = async (location) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${API_BASE_URL}/api/parking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        location,
        country: 'UK',
        features: ['availability', 'pricing', 'restrictions'],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to search for parking`);
    }

    const data = await response.json();
    return transformParkingResponse(data, location);
  } catch (error) {
    console.error('Parking search error:', error.message);
    console.warn('Using fallback data for', location);
    return generateFallbackData(location);
  }
};

/**
 * Get detailed parking information for a specific spot
 * @param {string} spotId - The ID of the parking spot
 * @returns {Promise<Object>} - Transformed parking details
 */
export const getParkingDetails = async (spotId) => {
  try {
    const cacheKey = `parking-details-${spotId}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const response = await fetch(`${API_BASE_URL}/api/spot-details/${spotId}`, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to get parking details`);
    }

    const data = await response.json();
    const transformed = transformDetailsResponse(data, spotId);

    sessionStorage.setItem(cacheKey, JSON.stringify(transformed));
    return transformed;
  } catch (error) {
    console.error('Parking details error:', error.message);
    return transformDetailsResponse({}, spotId);
  }
};

/**
 * Get area parking analysis for a location
 * @param {string} location - The location to analyze
 * @returns {Promise<Object>} - Area analysis data
 */
export const getAreaAnalysis = async (location) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/area-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ location }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to get area analysis`);
    }

    return await response.json();
  } catch (error) {
    console.error('Area analysis error:', error.message);
    return {
      area_type: 'Urban',
      parking_density: 'Moderate',
      typical_pricing: '£2.00-£4.00/hour',
      best_parking_strategy: 'Arrive early for best spots',
    };
  }
};

/**
 * Check API health
 * @returns {Promise<Object>} - API health status
 */
export const checkApiHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (!response.ok) {
      return {
        healthy: false,
        status: 'unavailable',
        coverage: 'UK',
        fallback_mode: true,
      };
    }

    const data = await response.json();
    return {
      healthy: data.status === 'active',
      apiVersion: data.version || 'unknown',
      features: data.features || ['parking_search', 'spot_details', 'area_analysis'],
      timestamp: new Date().toISOString(),
      coverage: 'UK',
      fallback_mode: false,
    };
  } catch (error) {
    console.error('Health check failed:', error.message);
    return {
      healthy: false,
      error: error.message,
      coverage: 'UK',
      fallback_mode: true,
    };
  }
};

const parksyApi = {
  sendChatMessage,
  searchParking,
  getParkingDetails,
  getAreaAnalysis,
  checkApiHealth,
};

export default parksyApi;