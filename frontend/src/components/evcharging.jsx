import React, { useState, useEffect, useCallback } from "react";
import { 
  MapPin, Zap, Search, Clock, ChevronRight, 
  X, Loader2, Battery, Power, Filter, Target, 
  CheckCircle, AlertCircle, Navigation, Globe
} from "lucide-react";
import "./evcharging.css";

const EvChargingComponent = ({ 
  userLocation, 
  currentLocation, 
  mapRef, 
  mapLoaded, 
  initializeMap 
}) => {
  // API Configuration
  const API_BASE_URL = "https://parksy-backend.onrender.com";

  // EV Charging images with high-quality visuals
  const evChargingImages = {
    'tesla': 'https://images.unsplash.com/photo-1631347826177-de288776ed3b?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'ionity': 'https://plus.unsplash.com/premium_photo-1714672716183-c717a99f857f?q=80&w=1032&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'shell': 'https://plus.unsplash.com/premium_photo-1715789261470-fb25ffbf70d3?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'bp_pulse': 'https://plus.unsplash.com/premium_photo-1715789261504-82b7c43b0b0d?q=80&w=897&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'ecotricity': 'https://images.unsplash.com/photo-1620678126869-6fc893412804?q=80&w=385&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'default': 'https://images.unsplash.com/photo-1607197109166-3ab4ee4b468f?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
  };

  // EV Charging State
  const [selectedEvStation, setSelectedEvStation] = useState(null);
  const [evChargingStations, setEvChargingStations] = useState([]);
  const [filteredEvStations, setFilteredEvStations] = useState([]);
  const [evSearchQuery, setEvSearchQuery] = useState("");
  const [evLocationSearch, setEvLocationSearch] = useState("");
  const [evOperators, setEvOperators] = useState([]);
  const [evConnectionTypes, setEvConnectionTypes] = useState([]);
  const [evFilters, setEvFilters] = useState({
    operatorId: '',
    chargingSpeed: '',
    distance: 20,
    showOnlyAvailable: false
  });
  const [evConnectionStatus, setEvConnectionStatus] = useState('checking');
  const [evIsLoading, setEvIsLoading] = useState(false);
  const [evApiError, setEvApiError] = useState(null);
  const [viewMode, setViewMode] = useState("gallery"); // gallery or map
  const [searchAttempted, setSearchAttempted] = useState(false); // Track if search was attempted

  // API functions
  const makeAPIRequest = async (endpoint, options = {}) => {
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  };

  const testEvBackendConnection = async () => {
    try {
      setEvConnectionStatus('testing');
      const response = await fetch(`${API_BASE_URL}/api/ev-charging/health`);
      
      if (response.ok) {
        setEvConnectionStatus('connected');
        return true;
      } else {
        setEvConnectionStatus('failed');
        return false;
      }
    } catch (error) {
      setEvConnectionStatus('failed');
      setEvApiError(`EV API connection failed: ${error.message}`);
      return false;
    }
  };

  // EV Charging API functions
  const loadEvOperators = async () => {
    try {
      const isConnected = await testEvBackendConnection();
      if (!isConnected) return;

      const response = await makeAPIRequest('/api/ev-charging/operators');
      if (response.success) {
        setEvOperators(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load EV operators:', error);
      setEvApiError(`Failed to load operators: ${error.message}`);
    }
  };

  const loadEvConnectionTypes = async () => {
    try {
      const response = await makeAPIRequest('/api/ev-charging/connection-types');
      if (response.success) {
        setEvConnectionTypes(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load connection types:', error);
      setEvApiError(`Failed to load connection types: ${error.message}`);
    }
  };

  const searchEvStationsByLocation = async () => {
    if (!userLocation || evConnectionStatus !== 'connected') {
      setEvApiError('Location not available or EV API not connected');
      return;
    }

    setEvIsLoading(true);
    setEvApiError(null);
    setSearchAttempted(true);

    try {
      const params = new URLSearchParams({
        latitude: userLocation.lat.toString(),
        longitude: userLocation.lng.toString(),
        distance: evFilters.distance.toString(),
        maxresults: '50',
        countrycode: 'GB'
      });

      if (evFilters.operatorId) params.append('operatorid', evFilters.operatorId);

      const response = await makeAPIRequest(`/api/ev-charging/search-by-location?${params}`);
      
      if (response.success && response.data && response.data.length > 0) {
        const processedStations = response.data.map(station => ({
          ...station,
          image: getEvStationImage(station.operator),
          distance_km: calculateDistance(
            userLocation.lat, 
            userLocation.lng, 
            station.location?.latitude, 
            station.location?.longitude
          ),
          last_updated: new Date().toLocaleTimeString()
        }));

        // Sort by distance
        processedStations.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));

        setEvChargingStations(processedStations);
        setFilteredEvStations(processedStations);
        console.log('Found EV stations:', processedStations.length);
      } else {
        setEvChargingStations([]);
        setFilteredEvStations([]);
        setEvApiError('No EV charging stations found in your area');
      }
    } catch (error) {
      console.error('Search error:', error);
      setEvApiError(`Search failed: ${error.message}`);
      setEvChargingStations([]);
      setFilteredEvStations([]);
    } finally {
      setEvIsLoading(false);
    }
  };

  const searchEvStationsByArea = async (area) => {
    if (evConnectionStatus !== 'connected') {
      setEvApiError('EV API not connected');
      return;
    }

    if (!area && !evLocationSearch.trim()) {
      setEvApiError('Please enter a location to search');
      return;
    }

    setEvIsLoading(true);
    setEvApiError(null);
    setSearchAttempted(true);

    try {
      const searchArea = area || evLocationSearch.trim();
      const params = new URLSearchParams({
        area: searchArea,
        maxresults: '50',
        countrycode: 'GB'
      });

      if (evFilters.operatorId) params.append('operatorid', evFilters.operatorId);

      console.log('Searching for area:', searchArea);
      const response = await makeAPIRequest(`/api/ev-charging/search-by-area?${params}`);
      
      if (response.success && response.data && response.data.length > 0) {
        const processedStations = response.data.map(station => ({
          ...station,
          image: getEvStationImage(station.operator),
          distance_km: userLocation ? calculateDistance(
            userLocation.lat, 
            userLocation.lng, 
            station.location?.latitude, 
            station.location?.longitude
          ) : null,
          last_updated: new Date().toLocaleTimeString()
        }));

        // Sort by distance if user location is available
        if (userLocation) {
          processedStations.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
        }

        setEvChargingStations(processedStations);
        setFilteredEvStations(processedStations);
        console.log('Found EV stations for area:', processedStations.length);
      } else {
        setEvChargingStations([]);
        setFilteredEvStations([]);
        setEvApiError(`No EV charging stations found in "${searchArea}"`);
      }
    } catch (error) {
      console.error('Area search error:', error);
      setEvApiError(`Search failed: ${error.message}`);
      setEvChargingStations([]);
      setFilteredEvStations([]);
    } finally {
      setEvIsLoading(false);
    }
  };

  // Helper functions
  const getEvStationImage = (operator) => {
    const operatorLower = operator?.toLowerCase() || '';
    
    if (operatorLower.includes('tesla')) return evChargingImages.tesla;
    if (operatorLower.includes('ionity')) return evChargingImages.ionity;
    if (operatorLower.includes('shell')) return evChargingImages.shell;
    if (operatorLower.includes('bp') || operatorLower.includes('pulse')) return evChargingImages.bp_pulse;
    if (operatorLower.includes('ecotricity')) return evChargingImages.ecotricity;
    
    return evChargingImages.default;
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;

    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  };

  // Event handlers
  const handleEvSearch = () => {
    if (evLocationSearch.trim()) {
      console.log('Searching by area:', evLocationSearch.trim());
      searchEvStationsByArea(evLocationSearch.trim());
    } else if (userLocation) {
      console.log('Searching by current location');
      searchEvStationsByLocation();
    } else {
      setEvApiError('Please enter a location or enable location services');
    }
  };

  const handleEvFilterChange = (filterType, value) => {
    setEvFilters(prev => ({ ...prev, [filterType]: value }));
  };

  // Clear search and results
  const clearSearch = () => {
    setEvLocationSearch("");
    setEvSearchQuery("");
    setEvChargingStations([]);
    setFilteredEvStations([]);
    setEvApiError(null);
    setSearchAttempted(false);
  };

  // Filter EV stations
  useEffect(() => {
    if (!evSearchQuery) {
      let filtered = [...evChargingStations];
      
      // Apply filters
      if (evFilters.operatorId) {
        filtered = filtered.filter(station => station.operator_id === parseInt(evFilters.operatorId));
      }
      
      if (evFilters.chargingSpeed) {
        filtered = filtered.filter(station => station.charging_speed_category === evFilters.chargingSpeed);
      }
      
      if (evFilters.showOnlyAvailable) {
        filtered = filtered.filter(station => station.status?.is_operational);
      }
      
      if (evFilters.distance && userLocation) {
        filtered = filtered.filter(station => (station.distance_km || 999) <= evFilters.distance);
      }
      
      setFilteredEvStations(filtered);
    } else {
      const filtered = evChargingStations.filter(station => 
        station.title?.toLowerCase().includes(evSearchQuery.toLowerCase()) ||
        station.operator?.toLowerCase().includes(evSearchQuery.toLowerCase()) ||
        station.formatted_address?.toLowerCase().includes(evSearchQuery.toLowerCase()) ||
        station.connector_types?.some(type => 
          type.toLowerCase().includes(evSearchQuery.toLowerCase())
        )
      );
      setFilteredEvStations(filtered);
    }
  }, [evSearchQuery, evChargingStations, evFilters, userLocation]);

  // Initialize EV data
  useEffect(() => {
    loadEvOperators();
    loadEvConnectionTypes();
  }, []);

  // Don't auto-load stations - let user search manually
  // Removed the auto-search effect

  const PremiumEvStationCard = ({ station }) => {
    return (
      <div 
        className="premium-ev-card"
        onClick={() => setSelectedEvStation(station)}
      >
        <div className="card-image-container ev">
          <img 
            src={station.image || evChargingImages.default} 
            alt={station.operator}
            className="card-image"
          />
          
          <div className="image-badges ev">
            <div className={`availability-badge ${station.status?.is_operational ? 'operational' : 'offline'}`}>
              <Zap size={12} />
              {station.status?.is_operational ? 'Operational' : 'Offline'}
            </div>
            <div className="feature-badge charging-speed">
              <Power size={12} />
              {station.charging_speed_category || 'Standard'}
            </div>
            {station.distance_km && (
              <div className="distance-badge">
                <MapPin size={12} />
                {station.distance_km}km away
              </div>
            )}
          </div>

          <div className="operator-badge">
            {station.operator || 'Unknown'}
          </div>

          <div className="real-time-badge ev">
            <div className="live-pulse"></div>
            LIVE - Updated: {station.last_updated || 'Now'}
          </div>
        </div>

        <div className="card-content ev">
          <div className="card-header">
            <h3 className="station-name">{station.title || 'EV Charging Station'}</h3>
            <div className="station-info">
              <span className="station-id">ID: {station.id || 'N/A'}</span>
              <div className="power-display">
                <Battery size={14} fill="#10b981" />
                <span>{station.max_power || '0'}kW Max</span>
              </div>
            </div>
          </div>

          <div className="location-info ev">
            <MapPin size={16} />
            <span>{station.formatted_address || station.address || 'Address not available'}</span>
          </div>

          <div className="charging-section">
            <div className="power-info">
              <span className="power-label">Max Power:</span>
              <span className="power-value">{station.max_power || '0'}kW</span>
              <div className="speed-indicator">
                <div className="speed-pulse"></div>
                <span>{station.charging_speed_category || 'Standard'}</span>
              </div>
            </div>
            <div className="pricing-details ev">
              <div className="cost-info">
                <span className="cost-label">Est. Cost:</span>
                <span className="cost-value">{station.estimated_cost || 'Contact operator'}</span>
              </div>
            </div>
          </div>

          <div className="connection-details">
            <div className="connector-count">
              <span className="count-label">Connectors:</span>
              <span className="count-value">{station.connections?.length || 0}</span>
            </div>
          </div>

          <div className="connector-grid">
            {station.connector_types && station.connector_types.slice(0, 3).map((connector, idx) => (
              <div key={idx} className="connector-chip">
                <div className="connector-icon">
                  <Zap size={10} />
                </div>
                <span className="connector-text">{connector}</span>
              </div>
            ))}
          </div>

          <div className="features-grid ev">
            {station.features && station.features.slice(0, 3).map((feature, idx) => (
              <div key={idx} className="feature-chip ev">
                <div className="feature-icon">
                  {feature.includes('Public') && <Globe size={10} />}
                  {feature.includes('Free') && <CheckCircle size={10} />}
                  {feature.includes('Rapid') && <Zap size={10} />}
                  {!feature.includes('Public') && !feature.includes('Free') && !feature.includes('Rapid') && <CheckCircle size={10} />}
                </div>
                <span className="feature-text">{feature}</span>
              </div>
            ))}
          </div>

          <button
            className="premium-charge-btn"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEvStation(station);
            }}
          >
            <span className="btn-text">View Details</span>
            <ChevronRight size={18} className="btn-icon" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="ev-charging-component">
      {/* Status Banner */}
      {evConnectionStatus === 'failed' && (
        <div className="api-status-banner error">
          <AlertCircle size={16} />
          <span>❌ EV CHARGING API NOT AVAILABLE - Backend service required</span>
        </div>
      )}
      
      {evApiError && (
        <div className="api-status-banner error">
          <AlertCircle size={16} />
          <span>{evApiError}</span>
          <button 
            onClick={clearSearch}
            style={{ marginLeft: '10px', padding: '2px 8px', fontSize: '12px' }}
          >
            Clear
          </button>
        </div>
      )}

      {evConnectionStatus === 'connected' && (
        <div className="api-status-banner success ev">
          <CheckCircle size={16} />
          <span>🔴 LIVE EV CONNECTION - Real-time charging data from Parksy</span>
        </div>
      )}

      {/* Search Section */}
      <section className="ev-search-section">
        <div className="search-container">
          <div className="search-glass-panel ev">
            
            {/* EV Search Parameters */}
            <div className="search-parameters ev">
              <div className="param-group ev">
                <label className="param-label">
                  <MapPin size={16} />
                  Location Search
                </label>
                <input
                  type="text"
                  className="param-input"
                  placeholder="Enter city or area (e.g., London, Manchester)"
                  value={evLocationSearch}
                  onChange={(e) => setEvLocationSearch(e.target.value)}
                  disabled={evConnectionStatus !== 'connected'}
                  onKeyPress={(e) => e.key === 'Enter' && handleEvSearch()}
                />
              </div>

              <div className="param-group ev">
                <label className="param-label">
                  <Target size={16} />
                  Search Radius
                </label>
                <select
                  className="param-input select-input"
                  value={evFilters.distance}
                  onChange={(e) => handleEvFilterChange('distance', parseInt(e.target.value))}
                  disabled={evConnectionStatus !== 'connected'}
                >
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={20}>20 km</option>
                  <option value={50}>50 km</option>
                  <option value={100}>100 km</option>
                </select>
              </div>

              <div className="param-group ev">
                <label className="param-label">
                  <Zap size={16} />
                  Charging Speed
                </label>
                <select
                  className="param-input select-input"
                  value={evFilters.chargingSpeed}
                  onChange={(e) => handleEvFilterChange('chargingSpeed', e.target.value)}
                  disabled={evConnectionStatus !== 'connected'}
                >
                  <option value="">All Speeds</option>
                  <option value="Ultra Rapid">Ultra Rapid (150kW+)</option>
                  <option value="Rapid">Rapid (50-150kW)</option>
                  <option value="Fast">Fast (22-50kW)</option>
                  <option value="Slow">Slow (7-22kW)</option>
                </select>
              </div>

              <div className="param-group ev">
                <label className="param-label">
                  <Filter size={16} />
                  Network/Operator
                </label>
                <select
                  className="param-input select-input"
                  value={evFilters.operatorId}
                  onChange={(e) => handleEvFilterChange('operatorId', e.target.value)}
                  disabled={evConnectionStatus !== 'connected'}
                >
                  <option value="">All Networks</option>
                  {evOperators.slice(0, 10).map(operator => (
                    <option key={operator.ID} value={operator.ID}>
                      {operator.Title}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="premium-search-btn ev"
                  onClick={handleEvSearch}
                  disabled={evIsLoading || evConnectionStatus !== 'connected'}
                >
                  {evIsLoading ? (
                    <>
                      <Loader2 size={20} className="spinning" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <Search size={20} />
                      <span>🔴 Search EV Stations</span>
                    </>
                  )}
                </button>

                {(evLocationSearch || evChargingStations.length > 0) && (
                  <button
                    className="location-search-btn"
                    onClick={clearSearch}
                    disabled={evIsLoading}
                    style={{ backgroundColor: '#ef4444' }}
                  >
                    <X size={16} />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {userLocation && (
                <button
                  className="location-search-btn"
                  onClick={searchEvStationsByLocation}
                  disabled={evIsLoading || evConnectionStatus !== 'connected'}
                >
                  <Target size={16} />
                  <span>Find Nearest Stations</span>
                </button>
              )}
            </div>

            {/* Search Bar */}
            <div className="search-bar-section">
              <div className="search-input-container">
                <Search size={20} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search charging stations, operators, or connector types..."
                  value={evSearchQuery}
                  onChange={(e) => setEvSearchQuery(e.target.value)}
                  className="search-input"
                  disabled={evConnectionStatus !== 'connected'}
                />
              </div>
            </div>

            {/* View Controls */}
            <div className="view-controls">
              <div className="control-group">
                <button
                  className={`view-control ${viewMode === "gallery" ? "active" : ""}`}
                  onClick={() => setViewMode("gallery")}
                  disabled={evConnectionStatus !== 'connected'}
                >
                  <Zap size={18} />
                  <span>Gallery View</span>
                </button>
                <button
                  className={`view-control ${viewMode === "map" ? "active" : ""}`}
                  onClick={() => setViewMode("map")}
                  disabled={evConnectionStatus !== 'connected'}
                >
                  <MapPin size={18} />
                  <span>Map View</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="ev-main-content">
        {viewMode === "gallery" ? (
          <div className="premium-ev-grid">
            {evConnectionStatus !== 'connected' ? (
              <div className="no-results-premium ev">
                <div className="no-results-icon">
                  <Zap size={64} />
                </div>
                <h3>❌ EV Charging API Required</h3>
                <p>Please start your backend server to load real-time EV charging data</p>
                <div className="backend-instructions">
                  <h4>To get real-time EV data:</h4>
                  <ol>
                    <li>Backend server should be running</li>
                    <li>EV charging routes should be available</li>
                    <li>Check API endpoints at /api/ev-charging/</li>
                  </ol>
                </div>
                <button 
                  className="retry-btn ev"
                  onClick={() => window.location.reload()}
                >
                  Retry Connection
                </button>
              </div>
            ) : evIsLoading ? (
              <div className="premium-loading ev">
                <div className="loading-spinner">
                  <Loader2 size={48} className="spinner-icon spinning" />
                </div>
                <h3>Loading Real-Time EV Data...</h3>
                <p>
                  Fetching live charging stations from Open Charge Map API
                </p>
              </div>
            ) : filteredEvStations.length > 0 ? (
              filteredEvStations.map((station, index) => (
                <PremiumEvStationCard key={`${station.id}-${index}`} station={station} />
              ))
            ) : searchAttempted ? (
              <div className="no-results-premium ev">
                <div className="no-results-icon">
                  <Zap size={64} />
                </div>
                <h3>No EV Charging Stations Found</h3>
                <p>
                  {evLocationSearch 
                    ? `No charging stations found for "${evLocationSearch}"`
                    : "No charging stations found for your search criteria"
                  }
                </p>
                <button 
                  className="retry-btn ev"
                  onClick={clearSearch}
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="no-results-premium ev">
                <div className="no-results-icon">
                  <Zap size={64} />
                </div>
                <h3>Search for EV Charging Stations</h3>
                <p>
                  Enter a location above or use your current location to find nearby charging stations
                </p>
                {userLocation && (
                  <button 
                    className="retry-btn ev"
                    onClick={searchEvStationsByLocation}
                    disabled={evIsLoading}
                  >
                    <Target size={16} />
                    Find Nearest Stations
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="ev-map-container">
            <div ref={mapRef} className="map-container" />
            
            {/* Map Loading Overlay */}
            {(!mapLoaded || evIsLoading) && (
              <div className="loading-overlay">
                <Loader2 size={32} className="spinner spinning" />
                <p>
                  {!mapLoaded 
                    ? 'Loading map resources...' 
                    : 'Loading charging station locations...'
                  }
                </p>
              </div>
            )}

            {/* Map Legend */}
            <div className="map-legend">
              <h4>Legend</h4>
              <div className="legend-items">
                <div className="legend-item">
                  <div className="marker ev-station"></div>
                  <span>EV Charging Stations</span>
                </div>
                {userLocation && (
                  <div className="legend-item">
                    <div className="marker user"></div>
                    <span>Your Location</span>
                  </div>
                )}
              </div>
              
              {/* Location Info */}
              <div className="location-info">
                <Navigation size={14} />
                <span>{currentLocation}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* EV Station Details Modal */}
      {selectedEvStation && (
        <div className="premium-modal-overlay" onClick={() => setSelectedEvStation(null)}>
          <div className="premium-ev-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="premium-close-btn"
              onClick={() => setSelectedEvStation(null)}
            >
              <X size={20} />
            </button>

            <div className="modal-content ev">
              <div className="ev-modal-header">
                <div className="station-image">
                  <img 
                    src={selectedEvStation.image || evChargingImages.default} 
                    alt="Charging Station"
                  />
                  <div className="live-data-badge ev">🔴 LIVE</div>
                </div>
                <div className="header-content">
                  <h2 className="station-title">{selectedEvStation.title}</h2>
                  <p className="station-operator">{selectedEvStation.operator}</p>
                  <div className="station-badges">
                    <span className={`badge ${selectedEvStation.status?.is_operational ? 'operational' : 'offline'}`}>
                      {selectedEvStation.status?.is_operational ? 'Operational' : 'Offline'}
                    </span>
                    <span className="badge speed">🔴 {selectedEvStation.charging_speed_category}</span>
                    {selectedEvStation.distance_km && (
                      <span className="badge distance">{selectedEvStation.distance_km}km away</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="station-overview">
                <h4>Station Details</h4>
                <div className="overview-grid">
                  <div className="overview-item">
                    <Battery size={16} />
                    <span>Max Power: {selectedEvStation.max_power}kW</span>
                  </div>
                  <div className="overview-item">
                    <MapPin size={16} />
                    <span>{selectedEvStation.formatted_address}</span>
                  </div>
                  <div className="overview-item">
                    <Power size={16} />
                    <span>Speed: {selectedEvStation.charging_speed_category}</span>
                  </div>
                  <div className="overview-item">
                    <Clock size={16} />
                    <span>Est. Cost: {selectedEvStation.estimated_cost}</span>
                  </div>
                </div>
              </div>

              {selectedEvStation.connections && selectedEvStation.connections.length > 0 && (
                <div className="connectors-section">
                  <h4>Available Connectors ({selectedEvStation.connections.length})</h4>
                  <div className="connectors-grid">
                    {selectedEvStation.connections.map((connection, index) => (
                      <div key={index} className="connector-card">
                        <div className="connector-header">
                          <Zap size={16} />
                          <span>{connection.type}</span>
                        </div>
                        <div className="connector-details">
                          <span className="power">{connection.power_kw}kW</span>
                          <span className="current">{connection.current_type}</span>
                          <span className={`status ${connection.status?.toLowerCase()}`}>
                            {connection.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedEvStation.features && selectedEvStation.features.length > 0 && (
                <div className="station-features">
                  <h4>Features & Access</h4>
                  <div className="features-grid">
                    {selectedEvStation.features.map((feature, index) => (
                      <div key={index} className="feature-item">
                        <CheckCircle size={14} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedEvStation.access && (
                <div className="access-info">
                  <h4>Access Information</h4>
                  <div className="access-details">
                    <div className="access-item">
                      <span className="access-label">Public Access:</span>
                      <span className={`access-value ${selectedEvStation.access.is_public ? 'yes' : 'no'}`}>
                        {selectedEvStation.access.is_public ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="access-item">
                      <span className="access-label">Membership Required:</span>
                      <span className={`access-value ${selectedEvStation.access.is_membership_required ? 'yes' : 'no'}`}>
                        {selectedEvStation.access.is_membership_required ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {selectedEvStation.access.access_comments && (
                      <div className="access-item">
                        <span className="access-label">Notes:</span>
                        <span className="access-value">{selectedEvStation.access.access_comments}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button 
                  className="action-btn secondary"
                  onClick={() => setSelectedEvStation(null)}
                >
                  Close
                </button>
                {selectedEvStation.location && (
                  <button 
                    className="action-btn primary"
                    onClick={() => {
                      const lat = selectedEvStation.location.latitude;
                      const lng = selectedEvStation.location.longitude;
                      window.open(`https://maps.google.com/maps?q=${lat},${lng}`, '_blank');
                    }}
                  >
                    <Navigation size={16} />
                    Get Directions
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvChargingComponent;