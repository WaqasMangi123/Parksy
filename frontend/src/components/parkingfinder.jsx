import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { 
  FiSearch, 
  FiMapPin, 
  FiClock, 
  FiInfo, 
  FiDollarSign, 
  FiExternalLink, 
  FiFilter, 
  FiX,
  FiAlertCircle,
  FiNavigation,
  FiShield,
  FiChevronDown,
  FiChevronUp,
  FiCheck,
  FiStar,
  FiEdit,
  FiUser,
  FiCalendar,
  FiLock
} from 'react-icons/fi';
import 'leaflet/dist/leaflet.css';
import './parkingfinder.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom parking icons
const parkingIcons = {
  default: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    className: 'parking-marker'
  }),
  named: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    className: 'parking-marker'
  }),
  paid: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    className: 'parking-marker'
  }),
  free: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    className: 'parking-marker'
  }),
  multiStorey: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    className: 'parking-marker'
  })
};

// Enhanced known locations database with comprehensive default values
const knownLocations = {
  'Gardens Hotel, 55 Piccadilly, Manchester, M1 2AP, United Kingdom': {
    name: "Gardens Hotel Parking",
    openingHours: "24/7 for hotel guests",
    restrictions: "Hotel guests only - validation required",
    operator: "Gardens Hotel Management",
    capacity: "50 spaces",
    fee: "no",
    feeDetails: "Free for hotel guests with validation",
    accessibility: "Fully accessible with disabled spaces",
    security: "24-hour CCTV and security patrols",
    parkingType: "surface",
    pricing: null,
    website: "https://www.gardenshotelmanchester.com/parking",
    aiDescription: "Exclusive parking for Gardens Hotel guests. Located just 0.3km from Manchester Piccadilly station. Free validation available at reception. Maximum stay 72 hours for guests."
  },
  'NCP Manchester Great Northern': {
    name: "NCP Manchester Great Northern",
    openingHours: "24/7",
    restrictions: "Maximum stay 24 hours",
    operator: "National Car Parks",
    capacity: "450 spaces",
    fee: "yes",
    feeDetails: "Pay by phone, app, or pay station",
    accessibility: "Disabled spaces and lifts available",
    security: "CCTV monitored",
    parkingType: "multi-storey",
    pricing: [
      { duration: "0-1h", price: "£3.50" },
      { duration: "1-2h", price: "£6.00" },
      { duration: "2-4h", price: "£9.50" },
      { duration: "4-6h", price: "£12.00" },
      { duration: "6-24h", price: "£18.00" }
    ],
    website: "https://www.ncp.co.uk/find-a-car-park/car-parks/manchester-great-northern/",
    aiDescription: "Large multi-storey car park located 0.5km from Manchester city center. Open 24/7 with 450 spaces. Height restriction of 2.1m. Electric vehicle charging available on level 3."
  },
  'Q-Park Deansgate': {
    name: "Q-Park Deansgate",
    openingHours: "24/7",
    restrictions: "No overnight parking without permit",
    operator: "Q-Park",
    capacity: "320 spaces",
    fee: "yes",
    feeDetails: "Contactless payment available",
    accessibility: "Disabled spaces and step-free access",
    security: "24-hour security and CCTV",
    parkingType: "multi-storey",
    pricing: [
      { duration: "0-1h", price: "£4.00" },
      { duration: "1-2h", price: "£7.00" },
      { duration: "2-4h", price: "£10.00" },
      { duration: "4-6h", price: "£14.00" },
      { duration: "6-24h", price: "£20.00" }
    ],
    website: "https://www.q-park.co.uk/en-gb/cities/manchester/deansgate/",
    aiDescription: "Modern multi-storey parking facility just 0.2km from Deansgate station. Features contactless payment and 24/7 security. Evening discounts available after 6pm. Height limit: 2.0m."
  },
  'Manchester Arndale Centre Parking': {
    name: "Manchester Arndale Centre Parking",
    openingHours: "Mon-Sat: 7:00-23:00, Sun: 10:00-18:00",
    restrictions: "No height restrictions",
    operator: "Manchester Arndale",
    capacity: "1200 spaces",
    fee: "yes",
    feeDetails: "Pay stations on each level",
    accessibility: "Wheelchair friendly with lifts",
    security: "Patrolled security",
    parkingType: "multi-storey",
    pricing: [
      { duration: "0-2h", price: "£5.00" },
      { duration: "2-4h", price: "£8.00" },
      { duration: "4-6h", price: "£12.00" },
      { duration: "6+ hours", price: "£15.00" }
    ],
    website: "https://www.manchesterarndale.com/visiting-us/parking/",
    aiDescription: "Huge shopping center parking with 1200 spaces. Direct access to Arndale Centre. First hour free with £20 purchase (validation required). No height restrictions - suitable for vans."
  },
  'Chinatown Car Park, Manchester': {
    name: "Chinatown Car Park",
    openingHours: "24/7",
    restrictions: "No commercial vehicles",
    operator: "Manchester City Council",
    capacity: "180 spaces",
    fee: "yes",
    feeDetails: "Pay and display",
    accessibility: "Limited disabled spaces",
    security: "Basic CCTV coverage",
    parkingType: "surface",
    pricing: [
      { duration: "0-1h", price: "£2.50" },
      { duration: "1-2h", price: "£4.50" },
      { duration: "2-4h", price: "£7.00" },
      { duration: "4-6h", price: "£9.00" },
      { duration: "6-24h", price: "£12.00" }
    ],
    website: "https://www.manchester.gov.uk/parking",
    aiDescription: "Surface parking lot in Manchester's Chinatown district. 180 spaces available 24/7. Pay and display machines accept coins and cards. No overnight parking for commercial vehicles. 0.4km walk to Piccadilly Gardens."
  }
};

// Helper function to extract name from address if title is missing
const extractNameFromAddress = (address) => {
  if (!address) return "Parking Facility";
  
  const parts = address.split(',');
  if (parts.length > 0) {
    const firstPart = parts[0].trim();
    if (/^\d+$/.test(firstPart)) {
      return parts.length > 1 ? parts[1].trim() : "Parking Facility";
    }
    return firstPart;
  }
  
  return "Parking Facility";
};

// Enhanced opening hours formatter
const formatHoursFromObject = (openingHours) => {
  if (!openingHours) return "24/7 (assumed) - please verify";
  
  if (typeof openingHours === 'string') {
    return openingHours;
  }
  
  if (openingHours.text) {
    return openingHours.text;
  }
  
  if (openingHours.hours) {
    const days = {
      mo: "Monday",
      tu: "Tuesday",
      we: "Wednesday",
      th: "Thursday",
      fr: "Friday",
      sa: "Saturday",
      su: "Sunday"
    };
    
    return Object.entries(openingHours.hours)
      .map(([day, times]) => `${days[day] || day}: ${times.join(', ')}`)
      .join('\n');
  }
  
  return "24/7 (assumed) - please verify";
};

// Enhanced restrictions formatter
const formatRestrictions = (restrictions) => {
  if (!restrictions) return "Standard parking restrictions apply";
  
  if (Array.isArray(restrictions)) {
    return restrictions
      .filter(r => r && r.trim())
      .map(r => r.endsWith('.') ? r : `${r}.`)
      .join(' ');
  }
  
  if (typeof restrictions === 'string') {
    return restrictions.endsWith('.') ? restrictions : `${restrictions}.`;
  }
  
  return "Standard parking restrictions apply";
};

// Generate AI description for parking spots
const generateAIDescription = (spot) => {
  if (spot.aiDescription) return spot.aiDescription;
  
  const distanceFromCenter = (Math.random() * 1.5 + 0.2).toFixed(1);
  const features = [];
  
  if (spot.parkingType === 'multi-storey') {
    features.push(`${spot.capacity} covered spaces`);
    features.push(`height restriction of ${(Math.random() > 0.5 ? '2.0m' : '2.1m')}`);
  } else {
    features.push(`${spot.capacity} outdoor spaces`);
  }
  
  if (spot.fee === 'yes') {
    features.push('pay by phone or pay station');
    if (spot.pricing) {
      const minPrice = spot.pricing[0].price;
      const maxPrice = spot.pricing[spot.pricing.length - 1].price;
      features.push(`pricing from ${minPrice} to ${maxPrice}`);
    }
  } else {
    features.push('free parking');
  }
  
  if (spot.accessibility.includes('accessible')) {
    features.push('disabled spaces available');
  }
  
  if (spot.security.includes('CCTV')) {
    features.push('24/7 CCTV surveillance');
  }
  
  return `${spot.name} located approximately ${distanceFromCenter}km from city center. ${features.join(', ')}. ${
    spot.restrictions.includes('Standard') ? 'Standard parking restrictions apply.' : spot.restrictions
  }`;
};

function MapViewUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

const ParkingFinder = () => {
  const [location, setLocation] = useState('');
  const [parkingSpots, setParkingSpots] = useState([]);
  const [filteredSpots, setFilteredSpots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([51.5074, -0.1278]);
  const [mapZoom, setMapZoom] = useState(13);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [filters, setFilters] = useState({
    namedOnly: false,
    paidOnly: false,
    freeOnly: false,
    multiStoreyOnly: false,
    minSpaces: 0,
    hasOpeningHours: false,
    hasRestrictions: false,
    hasOperatorInfo: false,
    hasPricingInfo: false,
    hasAccessibility: false,
    hasSecurity: false
  });
  const [searchNote, setSearchNote] = useState(false);
  const mapRef = useRef(null);

  const ukCities = {
    'london': { center: [51.5074, -0.1278], radius: 5000, name: "London" },
    'manchester': { center: [53.4809, -2.2374], radius: 5000, name: "Manchester" },
    'birmingham': { center: [52.4862, -1.8904], radius: 5000, name: "Birmingham" },
    'leeds': { center: [53.8008, -1.5491], radius: 5000, name: "Leeds" },
    'liverpool': { center: [53.4084, -2.9916], radius: 5000, name: "Liverpool" },
    'glasgow': { center: [55.8642, -4.2518], radius: 5000, name: "Glasgow" },
    'edinburgh': { center: [55.9533, -3.1883], radius: 5000, name: "Edinburgh" },
    'bristol': { center: [51.4545, -2.5879], radius: 5000, name: "Bristol" }
  };

  useEffect(() => {
    filterParkingSpots();
  }, [parkingSpots, filters]);

  useEffect(() => {
    if (location && !isLoading) {
      const timer = setTimeout(() => setSearchNote(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [location, isLoading]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const filterParkingSpots = () => {
    let results = [...parkingSpots];
    
    if (filters.namedOnly) {
      results = results.filter(spot => !spot.name.includes('Parking Facility'));
    }
    
    if (filters.paidOnly) {
      results = results.filter(spot => spot.fee === 'yes');
    }
    
    if (filters.freeOnly) {
      results = results.filter(spot => spot.fee === 'no');
    }
    
    if (filters.multiStoreyOnly) {
      results = results.filter(spot => spot.parkingType === 'multi-storey');
    }
    
    if (filters.minSpaces > 0) {
      results = results.filter(spot => {
        if (!spot.capacity) return false;
        const match = spot.capacity.match(/\d+/);
        if (!match) return false;
        const spaces = parseInt(match[0]);
        return spaces >= filters.minSpaces;
      });
    }
    
    if (filters.hasOpeningHours) {
      results = results.filter(spot => 
        spot.openingHours && !spot.openingHours.includes('assumed)')
      );
    }
    
    if (filters.hasRestrictions) {
      results = results.filter(spot => 
        spot.restrictions && !spot.restrictions.includes('Standard parking')
      );
    }
    
    if (filters.hasOperatorInfo) {
      results = results.filter(spot => 
        spot.operator && !spot.operator.includes('Unknown')
      );
    }
    
    if (filters.hasPricingInfo) {
      results = results.filter(spot => 
        spot.feeDetails && !spot.feeDetails.includes('Not specified')
      );
    }
    
    if (filters.hasAccessibility) {
      results = results.filter(spot => 
        spot.accessibility && spot.accessibility.includes('accessible')
      );
    }
    
    if (filters.hasSecurity) {
      results = results.filter(spot => 
        spot.security && (spot.security.includes('CCTV') || spot.security.includes('security'))
      );
    }
    
    // Sort with named first, then by capacity (descending)
    results.sort((a, b) => {
      if (a.name.includes('Parking Facility') && !b.name.includes('Parking Facility')) return 1;
      if (!a.name.includes('Parking Facility') && b.name.includes('Parking Facility')) return -1;
      
      const aMatch = a.capacity?.match(/\d+/);
      const bMatch = b.capacity?.match(/\d+/);
      const aSpaces = aMatch ? parseInt(aMatch[0]) : 0;
      const bSpaces = bMatch ? parseInt(bMatch[0]) : 0;
      return bSpaces - aSpaces;
    });
    
    setFilteredSpots(results);
  };

  const fetchParkingData = async (city) => {
    setIsLoading(true);
    setError(null);
    setSelectedSpot(null);
    setSearchNote(false);
    
    try {
      const cityKey = city.toLowerCase().replace(/\s+/g, '');
      const cityData = ukCities[cityKey];
      
      if (!cityData) {
        throw new Error('City not recognized. Please try another UK city.');
      }
      
      setMapCenter(cityData.center);
      setMapZoom(13);
      
      // Simulate API call with known data for demo
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Use known locations data for demo
      const demoData = Object.values(knownLocations)
        .filter(spot => spot.name.toLowerCase().includes(cityData.name.toLowerCase()))
        .map((spot, i) => ({
          id: `demo-${i}`,
          name: spot.name,
          address: Object.keys(knownLocations).find(key => knownLocations[key] === spot),
          capacity: spot.capacity,
          fee: spot.fee,
          feeDetails: spot.feeDetails,
          coordinates: [
            cityData.center[0] + (Math.random() * 0.02 - 0.01),
            cityData.center[1] + (Math.random() * 0.02 - 0.01)
          ],
          parkingType: spot.parkingType,
          openingHours: spot.openingHours,
          restrictions: spot.restrictions,
          operator: spot.operator,
          website: spot.website,
          accessibility: spot.accessibility,
          security: spot.security,
          pricing: spot.pricing,
          policies: [
            spot.security.includes('CCTV') ? "Security monitored" : null,
            spot.accessibility.includes('accessible') ? "Disabled access available" : null,
            spot.fee === 'yes' ? "Payment required" : "Free parking",
            spot.parkingType === 'multi-storey' ? "Multi-storey parking" : "Surface parking"
          ].filter(Boolean),
          aiDescription: spot.aiDescription || generateAIDescription(spot)
        }));
      
      // Add some generic spots
      const genericSpots = Array.from({ length: 15 }, (_, i) => {
        const distance = (Math.random() * 3 + 0.5).toFixed(1);
        const spaces = Math.floor(Math.random() * 200) + 20;
        const isPaid = Math.random() > 0.3;
        const isMultiStorey = Math.random() > 0.7;
        
        return {
          id: `generic-${i}`,
          name: `Parking Facility ${i + 1}`,
          address: `${Math.floor(Math.random() * 100) + 1} ${['Main', 'High', 'Station', 'Market', 'Church'][Math.floor(Math.random() * 5)]} Street, ${cityData.name}`,
          capacity: `${spaces} spaces`,
          fee: isPaid ? 'yes' : 'no',
          feeDetails: isPaid ? 'Pay and display' : 'Free parking',
          coordinates: [
            cityData.center[0] + (Math.random() * 0.05 - 0.025),
            cityData.center[1] + (Math.random() * 0.05 - 0.025)
          ],
          parkingType: isMultiStorey ? 'multi-storey' : 'surface',
          openingHours: "24/7 (assumed) - please verify",
          restrictions: "Standard parking restrictions apply",
          operator: "Unknown operator",
          website: null,
          accessibility: "Accessibility not specified",
          security: "Basic security",
          pricing: isPaid ? [
            { duration: "0-1h", price: `£${(Math.random() * 2 + 2).toFixed(2)}` },
            { duration: "1-2h", price: `£${(Math.random() * 3 + 3).toFixed(2)}` },
            { duration: "2-4h", price: `£${(Math.random() * 4 + 5).toFixed(2)}` },
            { duration: "4-6h", price: `£${(Math.random() * 5 + 7).toFixed(2)}` },
            { duration: "6-24h", price: `£${(Math.random() * 8 + 10).toFixed(2)}` }
          ] : null,
          policies: [
            isPaid ? "Payment required" : "Free parking",
            isMultiStorey ? "Multi-storey parking" : "Surface parking"
          ],
          aiDescription: generateAIDescription({
            name: `Parking Facility ${i + 1}`,
            capacity: `${spaces} spaces`,
            fee: isPaid ? 'yes' : 'no',
            parkingType: isMultiStorey ? 'multi-storey' : 'surface',
            restrictions: "Standard parking restrictions apply",
            accessibility: "Accessibility not specified",
            security: "Basic security"
          })
        };
      });
      
      const allSpots = [...demoData, ...genericSpots];
      setParkingSpots(allSpots);
      
      if (allSpots.length === 0) {
        setError('No parking spots found. Try another location or zoom out on the map.');
      }
    } catch (err) {
      console.error('Error fetching parking data:', err);
      let errorMsg = 'Failed to fetch parking data';
      
      if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      setParkingSpots([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (location.trim()) {
      fetchParkingData(location.trim());
    }
  };

  const handleMapMoveEnd = () => {
    if (mapRef.current) {
      const map = mapRef.current;
      const center = map.getCenter();
      setMapCenter([center.lat, center.lng]);
      setMapZoom(map.getZoom());
    }
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const resetFilters = () => {
    setFilters({
      namedOnly: false,
      paidOnly: false,
      freeOnly: false,
      multiStoreyOnly: false,
      minSpaces: 0,
      hasOpeningHours: false,
      hasRestrictions: false,
      hasOperatorInfo: false,
      hasPricingInfo: false,
      hasAccessibility: false,
      hasSecurity: false
    });
  };

  const getMarkerIcon = (spot) => {
    if (spot.parkingType === 'multi-storey') return parkingIcons.multiStorey;
    if (spot.name.includes('Parking Facility')) return parkingIcons.default;
    if (spot.fee === 'yes') return parkingIcons.paid;
    if (spot.fee === 'no') return parkingIcons.free;
    return parkingIcons.named;
  };

  const handleSpotClick = (spot) => {
    setSelectedSpot(spot);
    const element = document.getElementById(`parking-${spot.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      element.classList.add('highlighted');
      setTimeout(() => element.classList.remove('highlighted'), 2000);
    }
    
    if (mapRef.current) {
      mapRef.current.flyTo(spot.coordinates, 16, {
        duration: 1
      });
    }
  };

  return (
    <div className="pf-app">
      <header className="pf-header">
        <motion.div 
          className="pf-title-wrapper"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="pf-main-title">UK Parking Finder</h1>
          <p className="pf-subtitle">Discover parking options across UK cities</p>
        </motion.div>
        
        <motion.form 
          onSubmit={handleSearch} 
          className="pf-search-form"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="pf-search-container">
            <div className="pf-search-group">
              <FiSearch className="pf-search-icon" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter UK city (e.g. London, Manchester)"
                required
                list="ukCities"
                className="pf-search-input"
              />
              <datalist id="ukCities">
                {Object.keys(ukCities).map(city => (
                  <option key={city} value={ukCities[city].name} />
                ))}
              </datalist>
            </div>
            <motion.button 
              type="submit" 
              disabled={isLoading} 
              className="pf-search-button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <span className="pf-button-loading">
                  <span className="pf-loading-spinner" />
                  Searching...
                </span>
              ) : (
                'Find Parking'
              )}
            </motion.button>
          </div>
        </motion.form>
        
        <AnimatePresence>
          {searchNote && (
            <motion.div 
              className="pf-search-note"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p>🔍 Searching within 5km radius of city center</p>
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {error && (
            <motion.div 
              className="pf-error-message"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <FiAlertCircle className="pf-error-icon" />
              <p>{error}</p>
              {error.includes('zoom out') && (
                <button 
                  onClick={() => setMapZoom(mapZoom - 1)} 
                  className="pf-zoom-out-button"
                >
                  <FiChevronDown /> Zoom Out to Search Wider Area
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      
      <main className="pf-main-content">
        <section className="pf-results-section">
          <div className="pf-results-header">
            <motion.h2 
              className="pf-results-title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {location 
                ? `Parking in ${location.charAt(0).toUpperCase() + location.slice(1)}`
                : 'Search for Parking'}
              {filteredSpots.length > 0 && (
                <span className="pf-results-count-badge">
                  {filteredSpots.length} {filteredSpots.length === 1 ? 'spot' : 'spots'} found
                </span>
              )}
            </motion.h2>
            
            <div className="pf-results-controls">
              <motion.button
                className={`pf-filter-toggle ${showFilters ? 'active' : ''}`}
                onClick={toggleFilters}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiFilter className="pf-filter-icon" />
                Filters
                {Object.values(filters).some(Boolean) && (
                  <span className="pf-active-filters-dot"></span>
                )}
              </motion.button>
            </div>
          </div>
          
          <AnimatePresence>
            {showFilters && (
              <motion.div 
                className="pf-filters-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="pf-filter-options">
                  <div className="pf-filter-group">
                    <h4 className="pf-filter-group-title">Parking Type</h4>
                    <label className="pf-filter-checkbox">
                      <input
                        type="checkbox"
                        name="namedOnly"
                        checked={filters.namedOnly}
                        onChange={handleFilterChange}
                      />
                      <span className="pf-checkbox-custom"></span>
                      Named parking only
                    </label>
                    
                    <label className="pf-filter-checkbox">
                      <input
                        type="checkbox"
                        name="multiStoreyOnly"
                        checked={filters.multiStoreyOnly}
                        onChange={handleFilterChange}
                      />
                      <span className="pf-checkbox-custom"></span>
                      Multi-storey only
                    </label>
                  </div>
                  
                  <div className="pf-filter-group">
                    <h4 className="pf-filter-group-title">Pricing</h4>
                    <label className="pf-filter-checkbox">
                      <input
                        type="checkbox"
                        name="paidOnly"
                        checked={filters.paidOnly}
                        onChange={handleFilterChange}
                      />
                      <span className="pf-checkbox-custom"></span>
                      Paid parking only
                    </label>
                    
                    <label className="pf-filter-checkbox">
                      <input
                        type="checkbox"
                        name="freeOnly"
                        checked={filters.freeOnly}
                        onChange={handleFilterChange}
                      />
                      <span className="pf-checkbox-custom"></span>
                      Free parking only
                    </label>
                  </div>
                  
                  <div className="pf-filter-group">
                    <h4 className="pf-filter-group-title">Capacity</h4>
                    <div className="pf-filter-range">
                      <label>Minimum spaces:</label>
                      <input
                        type="range"
                        name="minSpaces"
                        min="0"
                        max="1000"
                        step="10"
                        value={filters.minSpaces}
                        onChange={handleFilterChange}
                      />
                      <span className="pf-range-value">{filters.minSpaces}+</span>
                    </div>
                  </div>
                  
                  <div className="pf-filter-group">
                    <h4 className="pf-filter-group-title">Information Available</h4>
                    <label className="pf-filter-checkbox">
                      <input
                        type="checkbox"
                        name="hasOpeningHours"
                        checked={filters.hasOpeningHours}
                        onChange={handleFilterChange}
                      />
                      <span className="pf-checkbox-custom"></span>
                      Has opening hours
                    </label>
                    
                    <label className="pf-filter-checkbox">
                      <input
                        type="checkbox"
                        name="hasRestrictions"
                        checked={filters.hasRestrictions}
                        onChange={handleFilterChange}
                      />
                      <span className="pf-checkbox-custom"></span>
                      Has restrictions info
                    </label>
                    
                    <label className="pf-filter-checkbox">
                      <input
                        type="checkbox"
                        name="hasOperatorInfo"
                        checked={filters.hasOperatorInfo}
                        onChange={handleFilterChange}
                      />
                      <span className="pf-checkbox-custom"></span>
                      Has operator info
                    </label>
                    
                    <label className="pf-filter-checkbox">
                      <input
                        type="checkbox"
                        name="hasPricingInfo"
                        checked={filters.hasPricingInfo}
                        onChange={handleFilterChange}
                      />
                      <span className="pf-checkbox-custom"></span>
                      Has pricing info
                    </label>
                    
                    <label className="pf-filter-checkbox">
                      <input
                        type="checkbox"
                        name="hasAccessibility"
                        checked={filters.hasAccessibility}
                        onChange={handleFilterChange}
                      />
                      <span className="pf-checkbox-custom"></span>
                      Has accessibility
                    </label>
                    
                    <label className="pf-filter-checkbox">
                      <input
                        type="checkbox"
                        name="hasSecurity"
                        checked={filters.hasSecurity}
                        onChange={handleFilterChange}
                      />
                      <span className="pf-checkbox-custom"></span>
                      Has security
                    </label>
                  </div>
                  
                  <motion.button 
                    className="pf-reset-filters"
                    onClick={resetFilters}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FiX /> Reset All Filters
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="pf-parking-list-container">
            {isLoading ? (
              <motion.div 
                className="pf-loading-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="pf-loading-spinner" />
                <p>Loading parking data...</p>
                <p className="pf-loading-note">Searching for parking spots in {location}</p>
              </motion.div>
            ) : filteredSpots.length > 0 ? (
              <motion.ul 
                className="pf-parking-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.1 }}
              >
                {filteredSpots.map((spot) => (
                  <motion.li
                    key={spot.id}
                    className={`pf-parking-item ${spot.name.includes('Parking Facility') ? 'unnamed' : ''} ${selectedSpot?.id === spot.id ? 'selected' : ''}`}
                    id={`parking-${spot.id}`}
                    onClick={() => handleSpotClick(spot)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="pf-parking-header">
                      <div className={`pf-marker-icon ${spot.parkingType} ${spot.fee}`}>
                        {spot.parkingType === 'multi-storey' ? (
                          <FiNavigation className="icon" />
                        ) : (
                          <FiMapPin className="icon" />
                        )}
                      </div>
                      <div className="pf-parking-title">
                        <h3>{spot.name}</h3>
                        <p className="pf-parking-address">
                          {spot.address}
                        </p>
                        <div className="pf-parking-badges">
                          <span className={`pf-badge ${spot.parkingType}`}>
                            {spot.parkingType === 'multi-storey' ? 'Multi-storey' : 'Surface'}
                          </span>
                          <span className={`pf-badge ${spot.fee}`}>
                            {spot.fee === 'yes' ? 'Paid' : 'Free'}
                          </span>
                          {!spot.capacity.includes('not specified') && (
                            <span className="pf-badge capacity">
                              {spot.capacity}
                            </span>
                          )}
                          {spot.accessibility.includes('accessible') && (
                            <span className="pf-badge accessible">
                              Accessible
                            </span>
                          )}
                          {spot.security.includes('CCTV') && (
                            <span className="pf-badge secured">
                              Secured
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="pf-parking-details">
                      <div className="pf-detail-item">
                        <FiClock className="icon" />
                        <div>
                          <span className="pf-detail-label">Opening Hours:</span>
                          <span className="pf-detail-value">
                            {spot.openingHours}
                          </span>
                        </div>
                      </div>
                      
                      <div className="pf-detail-item">
                        <FiDollarSign className="icon" />
                        <div>
                          <span className="pf-detail-label">Payment:</span>
                          <span className="pf-detail-value">
                            {spot.fee === 'yes' ? 'Paid parking' : 'Free parking'}
                            {spot.feeDetails && (
                              <> - {spot.feeDetails}</>
                            )}
                          </span>
                        </div>
                      </div>
                      
                      <div className="pf-detail-item">
                        <FiAlertCircle className="icon" />
                        <div>
                          <span className="pf-detail-label">Restrictions:</span>
                          <span className="pf-detail-value">
                            {spot.restrictions}
                          </span>
                        </div>
                      </div>
                      
                      <div className="pf-ai-description">
                        <FiInfo className="icon" />
                        <p>{spot.aiDescription}</p>
                      </div>
                    </div>
                    
                    {spot.website && (
                      <a 
                        href={spot.website.startsWith('http') ? spot.website : `https://${spot.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="pf-website-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FiExternalLink /> View official website
                      </a>
                    )}
                  </motion.li>
                ))}
              </motion.ul>
            ) : (
              !error && (
                <motion.div 
                  className="pf-empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <FiMapPin className="pf-empty-icon" />
                  <p>No parking spots match your search criteria</p>
                  <motion.button 
                    onClick={resetFilters}
                    className="pf-empty-action"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Reset filters
                  </motion.button>
                </motion.div>
              )
            )}
          </div>
        </section>
        
        <section className="pf-map-section">
          <div className="pf-map-container">
            <MapContainer 
              center={mapCenter} 
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
              whenCreated={(map) => {
                mapRef.current = map;
                map.on('moveend', handleMapMoveEnd);
              }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <MapViewUpdater center={mapCenter} zoom={mapZoom} />
              
              {filteredSpots.map((spot) => (
                <Marker 
                  key={`${spot.id}-marker`} 
                  position={spot.coordinates} 
                  icon={getMarkerIcon(spot)}
                  eventHandlers={{
                    click: () => handleSpotClick(spot)
                  }}
                >
                  <Popup className="pf-map-popup-container">
                    <div className="pf-map-popup">
                      <h3>{spot.name}</h3>
                      <p className="pf-popup-address">{spot.address}</p>
                      
                      <div className="pf-popup-badges">
                        <span className={`pf-badge ${spot.parkingType}`}>
                          {spot.parkingType === 'multi-storey' ? 'Multi-storey' : 'Surface'}
                        </span>
                        <span className={`pf-badge ${spot.fee}`}>
                          {spot.fee === 'yes' ? 'Paid' : 'Free'}
                        </span>
                        {!spot.capacity.includes('not specified') && (
                          <span className="pf-badge capacity">
                            {spot.capacity}
                          </span>
                        )}
                      </div>
                      
                      <div className="pf-popup-details">
                        <div className="pf-popup-detail">
                          <strong>Operator:</strong> {spot.operator}
                        </div>
                        
                        <div className="pf-popup-detail">
                          <strong>Opening Hours:</strong> 
                          <div className="pf-popup-hours">
                            {spot.openingHours}
                          </div>
                        </div>
                        
                        <div className="pf-popup-detail">
                          <strong>Payment:</strong> {spot.fee === 'yes' ? 'Paid' : 'Free'}
                          {spot.feeDetails && <> - {spot.feeDetails}</>}
                        </div>
                        
                        <div className="pf-popup-detail">
                          <strong>Restrictions:</strong> 
                          <div className="pf-popup-restrictions">
                            {spot.restrictions}
                          </div>
                        </div>

                        {spot.accessibility.includes('accessible') && (
                          <div className="pf-popup-detail">
                            <strong>Accessibility:</strong> {spot.accessibility}
                          </div>
                        )}
                        
                        {spot.security.includes('CCTV') && (
                          <div className="pf-popup-detail">
                            <strong>Security:</strong> {spot.security}
                          </div>
                        )}
                      </div>
                      
                      {spot.website && (
                        <a 
                          href={spot.website.startsWith('http') ? spot.website : `https://${spot.website}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="pf-popup-link"
                        >
                          <FiExternalLink /> Official website
                        </a>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          
          {selectedSpot && (
            <motion.div 
              className="pf-spot-details-panel"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <motion.button 
                className="pf-close-details"
                onClick={() => setSelectedSpot(null)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FiX />
              </motion.button>
              
              <h3 className="pf-spot-details-title">{selectedSpot.name}</h3>
              <p className="pf-spot-details-address">
                <FiMapPin /> {selectedSpot.address}
              </p>
              
              <div className="pf-spot-details-badges">
                <span className={`pf-badge ${selectedSpot.parkingType}`}>
                  {selectedSpot.parkingType === 'multi-storey' ? 'Multi-storey' : 'Surface'}
                </span>
                <span className={`pf-badge ${selectedSpot.fee}`}>
                  {selectedSpot.fee === 'yes' ? 'Paid' : 'Free'}
                </span>
                {!selectedSpot.capacity.includes('not specified') && (
                  <span className="pf-badge capacity">
                    {selectedSpot.capacity}
                  </span>
                )}
                {selectedSpot.accessibility.includes('accessible') && (
                  <span className="pf-badge accessible">
                    Accessible
                  </span>
                )}
                {selectedSpot.security.includes('CCTV') && (
                  <span className="pf-badge secured">
                    Secured
                  </span>
                )}
              </div>
              
              <div className="pf-ai-description-full">
                <FiInfo className="icon" />
                <p>{selectedSpot.aiDescription}</p>
              </div>
              
              <div 
                className={`pf-spot-details-section ${expandedSections.openingHours ? 'expanded' : ''}`}
                onClick={() => toggleSection('openingHours')}
              >
                <div className="pf-section-header">
                  <h4 className="pf-details-section-title">
                    <FiClock /> Opening Hours
                  </h4>
                  {expandedSections.openingHours ? <FiChevronUp /> : <FiChevronDown />}
                </div>
                {expandedSections.openingHours && (
                  <div className="pf-details-section-content">
                    <pre>{selectedSpot.openingHours}</pre>
                  </div>
                )}
              </div>
              
              <div 
                className={`pf-spot-details-section ${expandedSections.pricing ? 'expanded' : ''}`}
                onClick={() => toggleSection('pricing')}
              >
                <div className="pf-section-header">
                  <h4 className="pf-details-section-title">
                    <FiDollarSign /> Pricing Information
                  </h4>
                  {expandedSections.pricing ? <FiChevronUp /> : <FiChevronDown />}
                </div>
                {expandedSections.pricing && (
                  <div className="pf-details-section-content">
                    {selectedSpot.fee === 'yes' ? (
                      selectedSpot.pricing ? (
                        <div className="pf-pricing-table">
                          {selectedSpot.pricing.map((price, index) => (
                            <div key={index} className="pf-pricing-row">
                              <span className="pf-pricing-duration">{price.duration}</span>
                              <span className="pf-pricing-amount">{price.price}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>Standard parking rates apply</p>
                      )
                    ) : (
                      <p>Free parking available</p>
                    )}
                    <p className="pf-pricing-note">
                      Payment methods: {selectedSpot.feeDetails}
                    </p>
                  </div>
                )}
              </div>
              
              <div 
                className={`pf-spot-details-section ${expandedSections.restrictions ? 'expanded' : ''}`}
                onClick={() => toggleSection('restrictions')}
              >
                <div className="pf-section-header">
                  <h4 className="pf-details-section-title">
                    <FiAlertCircle /> Restrictions & Policies
                  </h4>
                  {expandedSections.restrictions ? <FiChevronUp /> : <FiChevronDown />}
                </div>
                {expandedSections.restrictions && (
                  <div className="pf-details-section-content">
                    <h5 className="pf-subsection-title">Parking Restrictions</h5>
                    <p>{selectedSpot.restrictions}</p>
                    
                    <h5 className="pf-subsection-title">Parking Policies</h5>
                    {selectedSpot.policies && selectedSpot.policies.length > 0 ? (
                      <ul className="pf-policies-list">
                        {selectedSpot.policies.map((policy, index) => (
                          <li key={index} className="pf-policy-item">
                            <FiCheck className="pf-policy-icon" /> {policy}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Standard parking policies apply</p>
                    )}
                  </div>
                )}
              </div>

              <div className="pf-spot-details-section">
                <h4 className="pf-details-section-title">
                  <FiInfo /> Additional Information
                </h4>
                <div className="pf-details-section-content">
                  <div className="pf-info-grid">
                    <div className="pf-info-item">
                      <span className="pf-info-label">Operator:</span>
                      <span className="pf-info-value">
                        {selectedSpot.operator}
                      </span>
                    </div>
                    
                    <div className="pf-info-item">
                      <span className="pf-info-label">Accessibility:</span>
                      <span className="pf-info-value">
                        {selectedSpot.accessibility}
                      </span>
                    </div>
                    
                    <div className="pf-info-item">
                      <span className="pf-info-label">Security:</span>
                      <span className="pf-info-value">
                        {selectedSpot.security}
                      </span>
                    </div>
                    
                    <div className="pf-info-item">
                      <span className="pf-info-label">Capacity:</span>
                      <span className="pf-info-value">
                        {selectedSpot.capacity}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedSpot.website && (
                <a 
                  href={selectedSpot.website.startsWith('http') ? selectedSpot.website : `https://${selectedSpot.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="pf-details-link"
                >
                  <FiExternalLink /> Visit official website for latest information
                </a>
              )}
            </motion.div>
          )}
        </section>
      </main>
      
      <footer className="pf-footer">
        <p>© {new Date().getFullYear()} UK Parking Finder</p>
      </footer>
    </div>
  );
};

export default ParkingFinder;