const API_BASE_URL = 'https://parksy-app.onrender.com';

/**
 * Enhanced parking search with better error handling and timeout
 */
export const searchParking = async (location) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${API_BASE_URL}/api/search-parking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ location }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to search for parking');
    }

    const data = await response.json();
    
    // Enhance the response data with additional metadata
    return {
      ...data,
      metadata: {
        timestamp: new Date().toISOString(),
        locationSearched: location,
        totalResults: data.data?.parking_spots?.length || 0
      }
    };
    
  } catch (error) {
    console.error('Parking search error:', error);
    throw new Error(
      error.message === 'Failed to fetch' ? 
      'Network error. Please check your connection.' : 
      error.message || 'Failed to search for parking spots'
    );
  }
};

/**
 * Get detailed parking information with caching
 */
export const getParkingDetails = async (spotId) => {
  try {
    const cacheKey = `parking-details-${spotId}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const response = await fetch(`${API_BASE_URL}/api/parking-details`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ spot_id: spotId })
    });

    if (!response.ok) {
      throw new Error('Failed to get parking details');
    }

    const data = await response.json();
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    return data;

  } catch (error) {
    console.error('Parking details error:', error);
    throw new Error(
      error.message || 'Failed to get parking details. Please try again.'
    );
  }
};

/**
 * Comprehensive health check with diagnostics
 */
export const checkApiHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    if (!response.ok) return false;
    
    const data = await response.json();
    return {
      healthy: data.status === 'healthy',
      apiVersion: data.api_version,
      hereApiConfigured: data.here_api_configured,
      timestamp: data.timestamp
    };
    
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      healthy: false,
      error: error.message
    };
  }
};

/**
 * New function to get extended parking spot analysis
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
        safety: calculateSafetyScore(details.data)
      }
    };
  } catch (error) {
    console.error('Extended info error:', error);
    throw error;
  }
};

// Helper functions
const calculatePopularityScore = (spotData) => {
  // Implement your popularity scoring logic
  return Math.floor(Math.random() * 50) + 50; // Demo value
};

const calculateSafetyScore = (spotData) => {
  // Implement your safety scoring logic
  return Math.floor(Math.random() * 30) + 70; // Demo value
};