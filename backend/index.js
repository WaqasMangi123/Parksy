// Safe EV Charging Service - No immediate execution
let axios;

// Safe axios import
try {
  axios = require('axios');
} catch (error) {
  console.error('❌ Failed to load axios:', error.message);
  axios = null;
}

class EvChargingService {
  constructor() {
    this.baseURL = 'https://api.openchargemap.io/v3';
    this.apiKey = process.env.OPEN_CHARGE_MAP_API_KEY || '89499cfe-4016-4300-a570-2e435f249707';
    this.timeout = 15000;
    this.isInitialized = false;
  }

  // Lazy initialization - only when first method is called
  initialize() {
    if (this.isInitialized) return;
    
    try {
      if (!axios) {
        console.warn('⚠️ Axios not available');
        return false;
      }
      
      this.isInitialized = true;
      console.log('✅ EV Charging Service initialized');
      return true;
    } catch (error) {
      console.error('❌ EV Service initialization failed:', error.message);
      return false;
    }
  }

  isReady() {
    return this.initialize() && this.apiKey && axios;
  }

  async makeRequest(endpoint, params = {}) {
    if (!this.isReady()) {
      return {
        success: false,
        data: [],
        error: 'EV Charging Service not ready'
      };
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
          'Content-Type': 'application/json'
        }
      };

      const response = await axios(config);

      return {
        success: true,
        data: response.data || [],
        status: response.status
      };

    } catch (error) {
      console.error('❌ Open Charge Map API Error:', error.message);
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

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
      
      if (result.success && Array.isArray(result.data)) {
        result.data = this.processChargingStations(result.data);
      }
      
      return result;

    } catch (error) {
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

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
        const searchParams = {
          countrycode,
          maxresults: parseInt(maxresults)
        };

        if (levelid) searchParams.levelid = parseInt(levelid);
        if (operatorid) searchParams.operatorid = parseInt(operatorid);

        const result = await this.makeRequest('/poi', searchParams);
        
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
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  async getOperators() {
    try {
      return await this.makeRequest('/operators');
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  async getConnectionTypes() {
    try {
      return await this.makeRequest('/connectiontypes');
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  async getStationById(id) {
    try {
      if (!id) {
        return {
          success: false,
          data: null,
          error: 'Station ID is required'
        };
      }

      return await this.makeRequest('/poi', { chargepointid: parseInt(id) });
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

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
          'cardiff': { lat: 51.4816, lng: -3.1791 }
        }
      };

      const countryLocations = locations[countrycode.toUpperCase()];
      if (!countryLocations) return null;

      const normalizedArea = area.toLowerCase().trim();
      return countryLocations[normalizedArea] || null;
    } catch (error) {
      return null;
    }
  }

  processChargingStations(stations) {
    try {
      if (!Array.isArray(stations)) return [];

      return stations.map(station => {
        try {
          return {
            id: station.ID || null,
            title: station.AddressInfo?.Title || 'Charging Station',
            operator: station.OperatorInfo?.Title || 'Unknown Operator',
            operator_id: station.OperatorInfo?.ID || null,
            location: {
              latitude: station.AddressInfo?.Latitude || null,
              longitude: station.AddressInfo?.Longitude || null
            },
            formatted_address: this.formatAddress(station.AddressInfo),
            max_power: this.getMaxPower(station.Connections),
            charging_speed_category: this.getChargingSpeedCategory(station.Connections),
            connector_types: this.getConnectorTypes(station.Connections),
            status: {
              is_operational: station.StatusType?.IsOperational || false,
              title: station.StatusType?.Title || 'Unknown'
            },
            estimated_cost: this.estimateChargingCost(station),
            features: this.extractFeatures(station)
          };
        } catch (stationError) {
          return null;
        }
      }).filter(Boolean);

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
      if (this.getMaxPower(station.Connections) >= 50) features.push('Rapid Charging');
      
      return features;
    } catch (error) {
      return [];
    }
  }

  async testConnection() {
    try {
      if (!this.isReady()) {
        return {
          success: false,
          message: 'EV Charging Service not ready'
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
          : 'API connection failed'
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error.message}`
      };
    }
  }
}

// SAFE EXPORT - No immediate instance creation
module.exports = EvChargingService;