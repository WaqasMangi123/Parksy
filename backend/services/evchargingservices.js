// Deployment-safe EV Charging Service
let axios;

// Safe axios import with fallback
try {
  axios = require('axios');
} catch (error) {
  console.error('❌ Failed to load axios:', error.message);
  // Create a minimal fallback
  axios = {
    request: () => Promise.reject(new Error('Axios not available'))
  };
}

class EvChargingService {
  constructor() {
    this.baseURL = 'https://api.openchargemap.io/v3';
    this.apiKey = process.env.OPEN_CHARGE_MAP_API_KEY || '89499cfe-4016-4300-a570-2e435f249707';
    this.timeout = 15000; // Increased for deployment
    this.isInitialized = false;
    
    // Initialize safely
    this.initialize();
  }

  // Safe initialization
  initialize() {
    try {
      if (!this.apiKey) {
        console.warn('⚠️ No EV API key configured');
      }
      this.isInitialized = true;
      console.log('✅ EV Charging Service initialized');
    } catch (error) {
      console.error('❌ EV Service initialization failed:', error.message);
      this.isInitialized = false;
    }
  }

  // Check if service is ready
  isReady() {
    return this.isInitialized && this.apiKey && axios;
  }

  // Make API request to Open Charge Map with enhanced error handling
  async makeRequest(endpoint, params = {}) {
    // Check if service is ready
    if (!this.isReady()) {
      throw new Error('EV Charging Service not ready - check API key and dependencies');
    }

    try {
      const config = {
        method: 'GET',
        url: `${this.baseURL}${endpoint}`,
        params: {
          key: this.apiKey,
          output: 'json',
          ...params
        },
        timeout: this.timeout,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'ParkingFinder-Backend/1.0'
        },
        // Additional axios config for deployment stability
        validateStatus: (status) => status >= 200 && status < 500,
        maxRedirects: 3,
        decompress: true
      };

      console.log('🔌 Making Open Charge Map API request:', {
        endpoint,
        paramsCount: Object.keys(params).length,
        timestamp: new Date().toISOString()
      });

      const response = await axios(config);

      // Handle different response statuses
      if (response.status >= 400) {
        throw new Error(`API returned status ${response.status}: ${response.statusText}`);
      }

      return {
        success: true,
        data: response.data || [],
        status: response.status,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Open Charge Map API Error:', {
        message: error.message,
        status: error.response?.status,
        endpoint,
        timestamp: new Date().toISOString()
      });

      // Return empty data instead of throwing to prevent deployment crashes
      return {
        success: false,
        data: [],
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Search by coordinates with fallback
  async searchByLocation(params) {
    try {
      const {
        latitude,
        longitude,
        distance = 20,
        maxresults = 50,
        countrycode = 'GB',
        levelid,
        operatorid
      } = params;

      // Validate required parameters
      if (!latitude || !longitude) {
        return {
          success: false,
          data: [],
          error: 'Latitude and longitude are required'
        };
      }

      const searchParams = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        distance: parseInt(distance),
        maxresults: parseInt(maxresults),
        countrycode
      };

      if (levelid) searchParams.levelid = parseInt(levelid);
      if (operatorid) searchParams.operatorid = parseInt(operatorid);

      const result = await this.makeRequest('/poi', searchParams);
      
      // Process and enhance the data if successful
      if (result.success && Array.isArray(result.data)) {
        result.data = this.processChargingStations(result.data);
      }
      
      return result;

    } catch (error) {
      console.error('❌ searchByLocation error:', error.message);
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  // Search by area/city name with fallback
  async searchByArea(params) {
    try {
      const {
        area,
        maxresults = 50,
        countrycode = 'GB',
        levelid,
        operatorid
      } = params;

      if (!area) {
        return {
          success: false,
          data: [],
          error: 'Area name is required'
        };
      }

      // Try to get coordinates for the area
      const areaCoordinates = this.getAreaCoordinates(area, countrycode);
      
      if (areaCoordinates) {
        return await this.searchByLocation({
          latitude: areaCoordinates.lat,
          longitude: areaCoordinates.lng,
          distance: 25,
          maxresults,
          countrycode,
          levelid,
          operatorid
        });
      } else {
        // Fallback to country search
        const searchParams = {
          countrycode,
          maxresults: parseInt(maxresults)
        };

        if (levelid) searchParams.levelid = parseInt(levelid);
        if (operatorid) searchParams.operatorid = parseInt(operatorid);

        const result = await this.makeRequest('/poi', searchParams);
        
        // Filter by area name in the results
        if (result.success && Array.isArray(result.data)) {
          const areaLower = area.toLowerCase().trim();
          result.data = result.data.filter(station => 
            station.AddressInfo?.Town?.toLowerCase().includes(areaLower) ||
            station.AddressInfo?.AddressLine1?.toLowerCase().includes(areaLower) ||
            station.AddressInfo?.Title?.toLowerCase().includes(areaLower)
          );
          
          result.data = this.processChargingStations(result.data);
        }

        return result;
      }

    } catch (error) {
      console.error('❌ searchByArea error:', error.message);
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  // Get available operators with fallback
  async getOperators() {
    try {
      const result = await this.makeRequest('/operators');
      return result;
    } catch (error) {
      console.error('❌ getOperators error:', error.message);
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  // Get connection types with fallback
  async getConnectionTypes() {
    try {
      const result = await this.makeRequest('/connectiontypes');
      return result;
    } catch (error) {
      console.error('❌ getConnectionTypes error:', error.message);
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  // Get station by ID with fallback
  async getStationById(id) {
    try {
      if (!id) {
        return {
          success: false,
          data: null,
          error: 'Station ID is required'
        };
      }

      const result = await this.makeRequest('/poi', { chargepointid: parseInt(id) });
      return result;
    } catch (error) {
      console.error('❌ getStationById error:', error.message);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // Get predefined area coordinates (safe method)
  getAreaCoordinates(area, countrycode = 'GB') {
    try {
      const locations = {
        'GB': {
          'london': { lat: 51.5074, lng: -0.1278 },
          'manchester': { lat: 53.4808, lng: -2.2426 },
          'birmingham': { lat: 52.4862, lng: -1.8904 },
          'leeds': { lat: 53.8008, lng: -1.5491 },
          'glasgow': { lat: 55.8642, lng: -4.2518 },
          'liverpool': { lat: 53.4084, lng: -2.9916 },
          'bristol': { lat: 51.4545, lng: -2.5879 },
          'edinburgh': { lat: 55.9533, lng: -3.1883 },
          'sheffield': { lat: 53.3811, lng: -1.4701 },
          'cardiff': { lat: 51.4816, lng: -3.1791 },
          'newcastle': { lat: 54.9783, lng: -1.6178 },
          'nottingham': { lat: 52.9548, lng: -1.1581 },
          'plymouth': { lat: 50.3755, lng: -4.1427 },
          'southampton': { lat: 50.9097, lng: -1.4044 },
          'reading': { lat: 51.4543, lng: -0.9781 }
        }
      };

      const countryLocations = locations[countrycode.toUpperCase()];
      if (!countryLocations) return null;

      const normalizedArea = area.toLowerCase().trim();
      return countryLocations[normalizedArea] || null;
    } catch (error) {
      console.error('❌ getAreaCoordinates error:', error.message);
      return null;
    }
  }

  // Process and enhance charging station data (safe method)
  processChargingStations(stations) {
    try {
      if (!Array.isArray(stations)) return [];

      return stations.map(station => {
        try {
          return {
            id: station.ID || null,
            uuid: station.UUID || null,
            title: station.AddressInfo?.Title || 'Charging Station',
            operator: station.OperatorInfo?.Title || 'Unknown Operator',
            operator_id: station.OperatorInfo?.ID || null,
            address: {
              line1: station.AddressInfo?.AddressLine1 || '',
              line2: station.AddressInfo?.AddressLine2 || '',
              town: station.AddressInfo?.Town || '',
              county: station.AddressInfo?.StateOrProvince || '',
              postcode: station.AddressInfo?.Postcode || '',
              country: station.AddressInfo?.Country?.Title || ''
            },
            location: {
              latitude: station.AddressInfo?.Latitude || null,
              longitude: station.AddressInfo?.Longitude || null
            },
            connections: this.processConnections(station.Connections),
            status: {
              is_operational: station.StatusType?.IsOperational || false,
              title: station.StatusType?.Title || 'Unknown'
            },
            access: {
              is_public: station.UsageType?.IsPublic || false,
              is_membership_required: station.UsageType?.IsMembershipRequired || false,
              access_comments: station.UsageType?.Title || ''
            },
            cost_info: station.UsageCost || 'Contact operator',
            date_created: station.DateCreated || null,
            date_last_updated: station.DateLastStatusUpdate || null,
            // Enhanced fields for frontend
            formatted_address: this.formatAddress(station.AddressInfo),
            max_power: this.getMaxPower(station.Connections),
            charging_speed_category: this.getChargingSpeedCategory(station.Connections),
            connector_types: this.getConnectorTypes(station.Connections),
            availability_status: station.StatusType?.IsOperational ? 'Available' : 'Unavailable',
            distance_km: null,
            estimated_cost: this.estimateChargingCost(station),
            features: this.extractFeatures(station)
          };
        } catch (stationError) {
          console.error('❌ Error processing station:', stationError.message);
          return null;
        }
      }).filter(Boolean); // Remove null entries

    } catch (error) {
      console.error('❌ processChargingStations error:', error.message);
      return [];
    }
  }

  // Safe helper methods
  processConnections(connections) {
    try {
      if (!Array.isArray(connections)) return [];
      
      return connections.map(conn => ({
        type: conn.ConnectionType?.Title || 'Unknown',
        power_kw: conn.PowerKW || 0,
        current_type: conn.CurrentType?.Title || 'Unknown',
        status: conn.StatusType?.Title || 'Unknown',
        is_fast_charge: (conn.PowerKW || 0) >= 22
      }));
    } catch (error) {
      return [];
    }
  }

  getMaxPower(connections) {
    try {
      if (!Array.isArray(connections)) return 0;
      const powers = connections.map(c => c.PowerKW || 0);
      return Math.max(...powers, 0);
    } catch (error) {
      return 0;
    }
  }

  getConnectorTypes(connections) {
    try {
      if (!Array.isArray(connections)) return [];
      const types = connections
        .map(c => c.ConnectionType?.Title)
        .filter(Boolean);
      return [...new Set(types)];
    } catch (error) {
      return [];
    }
  }

  formatAddress(addressInfo) {
    try {
      if (!addressInfo) return 'Address not available';
      
      const parts = [
        addressInfo.AddressLine1,
        addressInfo.Town,
        addressInfo.Postcode
      ].filter(Boolean);
      
      return parts.length > 0 ? parts.join(', ') : 'Address not available';
    } catch (error) {
      return 'Address not available';
    }
  }

  getChargingSpeedCategory(connections) {
    try {
      const maxPower = this.getMaxPower(connections);
      
      if (maxPower >= 150) return 'Ultra Rapid';
      if (maxPower >= 50) return 'Rapid';
      if (maxPower >= 22) return 'Fast';
      if (maxPower >= 7) return 'Slow';
      return 'Trickle';
    } catch (error) {
      return 'Unknown';
    }
  }

  estimateChargingCost(station) {
    try {
      const maxPower = this.getMaxPower(station.Connections);
      
      if (maxPower >= 50) return '£0.40-0.60/kWh';
      if (maxPower >= 22) return '£0.30-0.50/kWh';
      return '£0.20-0.40/kWh';
    } catch (error) {
      return 'Contact operator';
    }
  }

  extractFeatures(station) {
    try {
      const features = [];
      
      if (station.StatusType?.IsOperational) features.push('Operational');
      if (station.UsageType?.IsPublic) features.push('Public Access');
      if (station.UsageType?.IsMembershipRequired) features.push('Membership Required');
      if (this.getMaxPower(station.Connections) >= 50) features.push('Rapid Charging');
      if (station.UsageCost && station.UsageCost.includes('Free')) features.push('Free Charging');
      
      return features;
    } catch (error) {
      return [];
    }
  }

  // Test API connection (safe method)
  async testConnection() {
    try {
      if (!this.isReady()) {
        return {
          success: false,
          message: 'EV Charging Service not ready - check configuration'
        };
      }

      const result = await this.makeRequest('/poi', { 
        maxresults: 1,
        countrycode: 'GB'
      });
      
      return {
        success: result.success,
        message: result.success 
          ? 'Open Charge Map API connection successful'
          : 'API connection failed',
        sample_data: result.data?.[0] || null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create and export a singleton instance with error handling
let serviceInstance;

try {
  serviceInstance = new EvChargingService();
  console.log('✅ EV Charging Service instance created successfully');
} catch (error) {
  console.error('❌ Failed to create EV Charging Service:', error.message);
  
  // Create a fallback service
  serviceInstance = {
    searchByLocation: async () => ({ success: false, data: [], error: 'Service unavailable' }),
    searchByArea: async () => ({ success: false, data: [], error: 'Service unavailable' }),
    getOperators: async () => ({ success: false, data: [], error: 'Service unavailable' }),
    getConnectionTypes: async () => ({ success: false, data: [], error: 'Service unavailable' }),
    getStationById: async () => ({ success: false, data: null, error: 'Service unavailable' }),
    testConnection: async () => ({ success: false, message: 'Service unavailable' }),
    isReady: () => false
  };
}

module.exports = serviceInstance;