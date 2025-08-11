const axios = require('axios');

class EvChargingService {
  constructor() {
    this.baseURL = 'https://api.openchargemap.io/v3';
    this.apiKey = '89499cfe-4016-4300-a570-2e435f249707';
    this.timeout = 10000; // 10 seconds
  }

  // Make API request to Open Charge Map
  async makeRequest(endpoint, params = {}) {
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

      console.log('🔌 Making Open Charge Map API request:', {
        url: config.url,
        params: config.params
      });

      const response = await axios(config);

      return {
        success: true,
        data: response.data,
        status: response.status
      };

    } catch (error) {
      console.error('❌ Open Charge Map API Error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      throw new Error(`Open Charge Map API failed: ${error.message}`);
    }
  }

  // Search by coordinates
  async searchByLocation(params) {
    const {
      latitude,
      longitude,
      distance = 20,
      maxresults = 50,
      countrycode = 'GB',
      levelid,
      operatorid
    } = params;

    const searchParams = {
      latitude,
      longitude,
      distance,
      maxresults,
      countrycode
    };

    if (levelid) searchParams.levelid = levelid;
    if (operatorid) searchParams.operatorid = operatorid;

    const result = await this.makeRequest('/poi', searchParams);
    
    // Process and enhance the data
    result.data = this.processChargingStations(result.data);
    
    return result;
  }

  // Search by area/city name
  async searchByArea(params) {
    const {
      area,
      maxresults = 50,
      countrycode = 'GB',
      levelid,
      operatorid
    } = params;

    // First, try to geocode the area name to get coordinates
    // For now, we'll use some predefined locations
    const areaCoordinates = this.getAreaCoordinates(area, countrycode);
    
    if (areaCoordinates) {
      return await this.searchByLocation({
        latitude: areaCoordinates.lat,
        longitude: areaCoordinates.lng,
        distance: 25, // Larger radius for area searches
        maxresults,
        countrycode,
        levelid,
        operatorid
      });
    } else {
      // Fallback to country search
      const searchParams = {
        countrycode,
        maxresults
      };

      if (levelid) searchParams.levelid = levelid;
      if (operatorid) searchParams.operatorid = operatorid;

      const result = await this.makeRequest('/poi', searchParams);
      
      // Filter by area name in the results
      if (result.data && Array.isArray(result.data)) {
        result.data = result.data.filter(station => 
          station.AddressInfo?.Town?.toLowerCase().includes(area.toLowerCase()) ||
          station.AddressInfo?.AddressLine1?.toLowerCase().includes(area.toLowerCase()) ||
          station.AddressInfo?.Title?.toLowerCase().includes(area.toLowerCase())
        );
      }

      result.data = this.processChargingStations(result.data);
      return result;
    }
  }

  // Get available operators
  async getOperators() {
    return await this.makeRequest('/operators');
  }

  // Get connection types
  async getConnectionTypes() {
    return await this.makeRequest('/connectiontypes');
  }

  // Get station by ID
  async getStationById(id) {
    return await this.makeRequest('/poi', { chargepointid: id });
  }

  // Get predefined area coordinates
  getAreaCoordinates(area, countrycode = 'GB') {
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

    const countryLocations = locations[countrycode];
    if (!countryLocations) return null;

    const normalizedArea = area.toLowerCase().trim();
    return countryLocations[normalizedArea] || null;
  }

  // Process and enhance charging station data
  processChargingStations(stations) {
    if (!Array.isArray(stations)) return [];

    return stations.map(station => ({
      id: station.ID,
      uuid: station.UUID,
      title: station.AddressInfo?.Title || 'Charging Station',
      operator: station.OperatorInfo?.Title || 'Unknown Operator',
      operator_id: station.OperatorInfo?.ID,
      address: {
        line1: station.AddressInfo?.AddressLine1,
        line2: station.AddressInfo?.AddressLine2,
        town: station.AddressInfo?.Town,
        county: station.AddressInfo?.StateOrProvince,
        postcode: station.AddressInfo?.Postcode,
        country: station.AddressInfo?.Country?.Title
      },
      location: {
        latitude: station.AddressInfo?.Latitude,
        longitude: station.AddressInfo?.Longitude
      },
      connections: station.Connections?.map(conn => ({
        type: conn.ConnectionType?.Title,
        power_kw: conn.PowerKW,
        current_type: conn.CurrentType?.Title,
        status: conn.StatusType?.Title,
        is_fast_charge: conn.PowerKW >= 22
      })) || [],
      status: {
        is_operational: station.StatusType?.IsOperational,
        title: station.StatusType?.Title
      },
      access: {
        is_public: station.UsageType?.IsPublic,
        is_membership_required: station.UsageType?.IsMembershipRequired,
        access_comments: station.UsageType?.Title
      },
      cost_info: station.UsageCost,
      date_created: station.DateCreated,
      date_last_updated: station.DateLastStatusUpdate,
      // Enhanced fields for frontend
      formatted_address: this.formatAddress(station.AddressInfo),
      max_power: Math.max(...(station.Connections?.map(c => c.PowerKW || 0) || [0])),
      charging_speed_category: this.getChargingSpeedCategory(station.Connections),
      connector_types: [...new Set(station.Connections?.map(c => c.ConnectionType?.Title).filter(Boolean) || [])],
      availability_status: station.StatusType?.IsOperational ? 'Available' : 'Unavailable',
      distance_km: null, // Will be calculated if user location provided
      estimated_cost: this.estimateChargingCost(station),
      features: this.extractFeatures(station)
    }));
  }

  // Helper methods
  formatAddress(addressInfo) {
    if (!addressInfo) return 'Address not available';
    
    const parts = [
      addressInfo.AddressLine1,
      addressInfo.Town,
      addressInfo.Postcode
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  getChargingSpeedCategory(connections) {
    if (!connections || connections.length === 0) return 'Unknown';
    
    const maxPower = Math.max(...connections.map(c => c.PowerKW || 0));
    
    if (maxPower >= 150) return 'Ultra Rapid';
    if (maxPower >= 50) return 'Rapid';
    if (maxPower >= 22) return 'Fast';
    if (maxPower >= 7) return 'Slow';
    return 'Trickle';
  }

  estimateChargingCost(station) {
    // Simple cost estimation logic
    const maxPower = Math.max(...(station.Connections?.map(c => c.PowerKW || 0) || [0]));
    
    if (maxPower >= 50) return '£0.40-0.60/kWh';
    if (maxPower >= 22) return '£0.30-0.50/kWh';
    return '£0.20-0.40/kWh';
  }

  extractFeatures(station) {
    const features = [];
    
    if (station.StatusType?.IsOperational) features.push('Operational');
    if (station.UsageType?.IsPublic) features.push('Public Access');
    if (station.UsageType?.IsMembershipRequired) features.push('Membership Required');
    if (station.Connections?.some(c => c.PowerKW >= 50)) features.push('Rapid Charging');
    if (station.UsageCost?.includes('Free')) features.push('Free Charging');
    
    return features;
  }

  // Test API connection
  async testConnection() {
    try {
      const result = await this.makeRequest('/poi', { 
        maxresults: 1,
        countrycode: 'GB'
      });
      
      return {
        success: true,
        message: 'Open Charge Map API connection successful',
        sample_data: result.data?.[0] || null
      };
    } catch (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }
}

module.exports = new EvChargingService();