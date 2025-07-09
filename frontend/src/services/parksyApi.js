const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://parksy-app.onrender.com';

// Helper function to extract parking spots from AI response
const extractParkingSpotsFromResponse = (responseText, locationInfo) => {
  const spotPattern = /(\d+)\.\s(.+?)\n\s+📍\s(.+?)\n\s+🚶\s(.+?)(?:\n|$)/g;
  const spots = [];
  let match;

  while ((match = spotPattern.exec(responseText)) !== null) {
    const distanceText = match[4];
    let distanceMeters;

    if (distanceText.includes('km')) {
      distanceMeters = parseFloat(distanceText) * 1000;
    } else {
      distanceMeters = parseInt(distanceText.replace('m', '')) || 0;
    }

    spots.push({
      id: `spot_${match[1]}_${Math.random().toString(36).substr(2, 6)}`,
      title: match[2].trim(),
      address: match[3].trim(),
      distance: distanceMeters,
      position: {
        lat: locationInfo?.lat ? locationInfo.lat + (Math.random() * 0.01 - 0.005) : 51.5074,
        lng: locationInfo?.lng ? locationInfo.lng + (Math.random() * 0.01 - 0.005) : -0.1278,
      },
      walking_time: distanceMeters ? `${Math.ceil(distanceMeters / 80)} min` : 'Unknown',
      rank: parseInt(match[1]),
    });
  }

  return spots;
};

// Transform API response for chat and parking search
const transformParkingResponse = (apiResponse, userMessage) => {
  const locationMatch = userMessage.match(
    /(?:in|near|at|around|by|close to|next to)\s+(.+?)(?:\s|$)/i
  );
  const location = locationMatch ? locationMatch[1].trim() : 'your location';

  const parkingSpots = extractParkingSpotsFromResponse(apiResponse.response, {
    lat: apiResponse.lat,
    lng: apiResponse.lng,
  }) || [];

  return {
    message: apiResponse.response || 'No response from Parksy.',
    top_recommendations: parkingSpots.slice(0, 5),
    all_spots: parkingSpots,
    search_context: {
      location: location,
      timestamp: apiResponse.timestamp || new Date().toISOString(),
    },
    data_status: {
      last_updated: apiResponse.timestamp || new Date().toISOString(),
      real_time: true,
    },
  };
};

// Retry logic for API calls
const fetchWithRetry = async (url, options, retries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      if (attempt === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }
};

// Send a chat message to the Parksy assistant
export const sendChatMessage = async (message, sessionId = null) => {
  try {
    const data = await fetchWithRetry(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        session_id: sessionId || `web-${Date.now()}`,
      }),
    });

    return transformParkingResponse(data, message);
  } catch (error) {
    console.error('Chat error:', error.message);
    return {
      message: "I'm having trouble connecting to Parksy right now. Please try again later.",
      top_recommendations: [],
      all_spots: [],
      search_context: {
        location: 'unknown',
        timestamp: new Date().toISOString(),
      },
      data_status: {
        last_updated: new Date().toISOString(),
        real_time: false,
      },
    };
  }
};

// Check API health
export const checkApiHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { timeout: 10000 });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return {
      status: data.status,
      service: data.service,
      healthy: data.status === 'healthy',
    };
  } catch (error) {
    console.error('Health check failed:', error.message);
    return {
      status: 'unhealthy',
      error: error.message,
      healthy: false,
    };
  }
};

const parksyApi = {
  sendChatMessage,
  checkApiHealth,
};

export default parksyApi;
