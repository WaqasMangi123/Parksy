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
    website: "https://www.gardenshotelmanchester.com/parking"
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
    website: "https://www.ncp.co.uk/find-a-car-park/car-parks/manchester-great-northern/"
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
    website: "https://www.q-park.co.uk/en-gb/cities/manchester/deansgate/"
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
    website: "https://www.manchesterarndale.com/visiting-us/parking/"
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
    website: "https://www.manchester.gov.uk/parking"
  }
};

// Helper function to extract name from address if title is missing
const extractNameFromAddress = (address) => {
  if (!address) return "Parking Facility";
  
  // Try to extract a meaningful name from the address
  const parts = address.split(',');
  if (parts.length > 0) {
    // First part is usually the most specific
    const firstPart = parts[0].trim();
    
    // If it's a number, try the next part
    // In the extractNameFromAddress function, line 185 should be:
if (/^\d+$/.test(firstPart)) {  // Added missing closing parenthesis
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

function MapViewUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Enhanced Contribution Form Component
const ContributionForm = ({ spotId, field, currentValue, onSubmit }) => {
  const [value, setValue] = useState(currentValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Field-specific configurations
  const fieldConfig = {
    openingHours: {
      label: "Opening Hours",
      placeholder: "e.g. Mon-Fri: 8:00-18:00, Sat: 9:00-17:00, Sun: Closed",
      type: "textarea"
    },
    feeDetails: {
      label: "Payment Details",
      placeholder: "e.g. Pay by phone, contactless, £2.50 per hour, max £15 per day",
      type: "textarea"
    },
    restrictions: {
      label: "Restrictions",
      placeholder: "e.g. No overnight parking. Maximum stay 4 hours. Disabled badge holders exempt.",
      type: "textarea"
    },
    operator: {
      label: "Operator Name",
      placeholder: "e.g. Manchester City Council, NCP, Q-Park",
      type: "text"
    },
    capacity: {
      label: "Capacity",
      placeholder: "e.g. 250 spaces, 50 bays",
      type: "text"
    },
    accessibility: {
      label: "Accessibility",
      placeholder: "e.g. 10 disabled spaces, lifts to all floors",
      type: "text"
    },
    security: {
      label: "Security",
      placeholder: "e.g. CCTV monitored, security patrols nightly",
      type: "text"
    },
    website: {
      label: "Website URL",
      placeholder: "https://www.example.com/parking",
      type: "url"
    }
  };
  
  const config = fieldConfig[field] || {
    label: field,
    placeholder: `Provide ${field} information...`,
    type: "text"
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    
    setIsSubmitting(true);
    onSubmit(spotId, field, value);
    setTimeout(() => setIsSubmitting(false), 1000);
  };
  
  return (
    <form onSubmit={handleSubmit} className="pf-contribution-form">
      <label className="pf-contribution-label">
        {config.label}
        {config.type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={config.placeholder}
            rows={3}
            required
          />
        ) : (
          <input
            type={config.type}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={config.placeholder}
            required
          />
        )}
      </label>
      <button 
        type="submit" 
        disabled={isSubmitting || !value.trim()}
        className="pf-contribution-submit"
      >
        {isSubmitting ? (
          <span className="pf-submitting-spinner" />
        ) : (
          <FiCheck className="pf-submit-icon" />
        )}
        Submit Information
      </button>
    </form>
  );
};

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
  const [showPolicy, setShowPolicy] = useState(false);
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
  const [userContributions, setUserContributions] = useState({});
  const mapRef = useRef(null);

  const ukCities = {
    'london': { center: [51.5074, -0.1278], radius: 5000 },
    'manchester': { center: [53.4809, -2.2374], radius: 5000 },
    'birmingham': { center: [52.4862, -1.8904], radius: 5000 },
    'leeds': { center: [53.8008, -1.5491], radius: 5000 },
    'liverpool': { center: [53.4084, -2.9916], radius: 5000 },
    'glasgow': { center: [55.8642, -4.2518], radius: 5000 },
    'edinburgh': { center: [55.9533, -3.1883], radius: 5000 },
    'bristol': { center: [51.4545, -2.5879], radius: 5000 }
  };

  useEffect(() => {
    filterParkingSpots();
  }, [parkingSpots, filters]);

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
    
    try {
      const cityKey = city.toLowerCase().replace(/\s+/g, '');
      const cityData = ukCities[cityKey];
      
      if (!cityData) {
        throw new Error('City not recognized. Please try another UK city.');
      }
      
      setMapCenter(cityData.center);
      setMapZoom(13);
      
      const response = await axios.get(
        'https://discover.search.hereapi.com/v1/discover',
        {
          params: {
            at: `${cityData.center[0]},${cityData.center[1]}`,
            q: 'parking',
            limit: 100,
            apiKey: process.env.REACT_APP_HERE_API_KEY,
            in: 'countryCode:GBR',
            radius: cityData.radius
          },
          timeout: 10000
        }
      );
      
      if (!response.data?.items) {
        throw new Error('No parking data found in API response');
      }

      const processedData = response.data.items.map(item => {
        const parkingInfo = item.parking || {};
        const paymentInfo = parkingInfo.payment || {};
        const contacts = item.contacts || [];
        const address = item.address || {};
        
        // Check if this is a known location with enhanced data
        const knownData = knownLocations[address.label] || {};
        
        // Enhanced name extraction
        const name = item.title || knownData.name || extractNameFromAddress(address.label);
        
        // Enhanced opening hours handling
        const openingHours = knownData.openingHours || formatHoursFromObject(item.openingHours);
        
        // Enhanced restrictions handling
        const restrictions = knownData.restrictions || formatRestrictions(parkingInfo.restrictions);
        
        // Enhanced operator handling
        let operator = knownData.operator;
        if (!operator) {
          if (parkingInfo.operator) {
            operator = parkingInfo.operator;
          } else if (contacts[0]?.name) {
            operator = contacts[0].name;
          } else {
            operator = "Unknown operator";
          }
        }
        
        // Enhanced capacity information
        const capacity = knownData.capacity || 
          (parkingInfo.capacity ? `${parkingInfo.capacity} spaces` : "Capacity not specified");
        
        // Enhanced pricing information
        const pricing = knownData.pricing || 
          (paymentInfo.required ? [
            { duration: "0-1h", price: "£2.50" },
            { duration: "1-2h", price: "£4.00" },
            { duration: "2-4h", price: "£6.50" },
            { duration: "4-6h", price: "£8.00" },
            { duration: "6-24h", price: "£12.00" }
          ] : null);
        
        // Enhanced fee details
        const feeDetails = knownData.feeDetails || 
          (paymentInfo.required 
            ? (paymentInfo.methods?.join(', ') || "Pay and display or pay by phone") 
            : "Free parking");
        
        const policies = [
          parkingInfo.security ? "Security monitored" : null,
          parkingInfo.accessible ? "Disabled access available" : null,
          paymentInfo.required ? "Payment required" : "Free parking",
          parkingInfo.type === 'multi-storey' ? "Multi-storey parking" : "Surface parking",
          parkingInfo.covered ? "Covered parking" : null
        ].filter(Boolean);

        return {
          id: item.id,
          name,
          address: address.label || "Address not available",
          capacity,
          fee: paymentInfo.required ? "yes" : knownData.fee || "no",
          feeDetails,
          coordinates: [item.position.lat, item.position.lng],
          parkingType: parkingInfo.type || knownData.parkingType || "surface",
          openingHours,
          restrictions,
          operator,
          website: contacts.website?.[0]?.value || knownData.website,
          accessibility: knownData.accessibility || 
            (parkingInfo.accessible ? "Accessible with disabled spaces" : "Accessibility not specified"),
          security: knownData.security || 
            (parkingInfo.security ? "CCTV monitored" : "Basic security"),
          pricing,
          policies
        };
      });
      
      // Apply any user contributions
      const enhancedData = processedData.map(spot => {
        const userData = userContributions[spot.id] || {};
        return { ...spot, ...userData };
      });
      
      setParkingSpots(enhancedData);
      
      if (enhancedData.length === 0) {
        setError('No parking spots found. Try another location or zoom out on the map.');
      }
    } catch (err) {
      console.error('Error fetching parking data:', err);
      let errorMsg = 'Failed to fetch parking data';
      
      if (err.response) {
        errorMsg = `API Error: ${err.response.status}`;
        if (err.response.status === 429) {
          errorMsg = 'API request limit reached. Try again later.';
        }
      } else if (err.message) {
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

  const togglePolicy = () => {
    setShowPolicy(!showPolicy);
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

  const handleUserContribution = (spotId, field, value) => {
    setUserContributions(prev => ({
      ...prev,
      [spotId]: {
        ...prev[spotId],
        [field]: value
      }
    }));
    
    // Update the spot in the main array
    setParkingSpots(prev => prev.map(spot => 
      spot.id === spotId ? { ...spot, [field]: value } : spot
    ));
    
    if (selectedSpot?.id === spotId) {
      setSelectedSpot(prev => ({ ...prev, [field]: value }));
    }
  };

  const renderPolicyModal = () => (
    <div className="pf-policy-modal">
      <div className="pf-policy-content">
        <button className="pf-policy-close" onClick={togglePolicy}>
          <FiX />
        </button>
        <h2>Parking Finder Policies and Restrictions</h2>
        
        <div className="pf-policy-section">
          <h3><FiShield /> Data Usage Policy</h3>
          <p>This application uses HERE location services to provide parking information. By using this service, you agree to HERE's Terms of Use and Privacy Policy.</p>
        </div>
        
        <div className="pf-policy-section">
          <h3><FiAlertCircle /> Usage Restrictions</h3>
          <ul>
            <li>Maximum of 250,000 requests per month under the Freemium plan</li>
            <li>Commercial use may require a paid HERE subscription</li>
            <li>Data accuracy is not guaranteed - always verify with official sources</li>
          </ul>
        </div>
        
        <div className="pf-policy-section">
          <h3><FiInfo /> Parking Information Accuracy</h3>
          <p>While we strive to provide accurate parking information, details such as pricing, availability, and restrictions may change without notice. Always check with the parking operator for the most current information.</p>
        </div>
        
        <div className="pf-policy-section">
          <h3><FiStar /> User Contributions</h3>
          <p>You can help improve this service by contributing missing information. All contributions are stored locally in your browser.</p>
        </div>
        
        <div className="pf-policy-links">
          <a href="https://legal.here.com/terms" target="_blank" rel="noopener noreferrer">
            HERE Terms of Use
          </a>
          <a href="https://legal.here.com/privacy" target="_blank" rel="noopener noreferrer">
            HERE Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pf-app">
      <header className="pf-header">
        <div className="pf-title-wrapper">
          <h1 className="pf-main-title">UK Parking Finder</h1>
          <p className="pf-subtitle">Find and compare parking options across UK cities</p>
        </div>
        
        <form onSubmit={handleSearch} className="pf-search-form">
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
                  <option key={city} value={city.charAt(0).toUpperCase() + city.slice(1)} />
                ))}
              </datalist>
            </div>
            <button 
              type="submit" 
              disabled={isLoading} 
              className="pf-search-button"
            >
              {isLoading ? (
                <span className="pf-button-loading">
                  <span className="pf-loading-spinner" />
                  Searching...
                </span>
              ) : (
                'Find Parking'
              )}
            </button>
          </div>
        </form>
        
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
            <h2 className="pf-results-title">
              {location 
                ? `Parking in ${location.charAt(0).toUpperCase() + location.slice(1)}`
                : 'Search for Parking'}
              {filteredSpots.length > 0 && (
                <span className="pf-results-count-badge">
                  {filteredSpots.length} {filteredSpots.length === 1 ? 'spot' : 'spots'} found
                </span>
              )}
            </h2>
            
            <div className="pf-results-controls">
              <button
                className={`pf-filter-toggle ${showFilters ? 'active' : ''}`}
                onClick={toggleFilters}
              >
                <FiFilter className="pf-filter-icon" />
                Filters
                {Object.values(filters).some(Boolean) && (
                  <span className="pf-active-filters-dot"></span>
                )}
              </button>
              <button 
                className="pf-policy-button"
                onClick={togglePolicy}
              >
                <FiShield /> Policies
              </button>
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
                  
                  <button 
                    className="pf-reset-filters"
                    onClick={resetFilters}
                  >
                    <FiX /> Reset All Filters
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {showPolicy && renderPolicyModal()}
          
          <div className="pf-parking-list-container">
            {isLoading ? (
              <div className="pf-loading-state">
                <div className="pf-loading-spinner" />
                <p>Loading parking data...</p>
                <p className="pf-loading-note">Searching for parking spots in {location}</p>
              </div>
            ) : filteredSpots.length > 0 ? (
              <ul className="pf-parking-list">
                {filteredSpots.map((spot) => (
                  <li
                    key={spot.id}
                    className={`pf-parking-item ${spot.name.includes('Parking Facility') ? 'unnamed' : ''} ${selectedSpot?.id === spot.id ? 'selected' : ''}`}
                    id={`parking-${spot.id}`}
                    onClick={() => handleSpotClick(spot)}
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
                            {spot.openingHours.includes('assumed)') && (
                              <ContributionForm
                                spotId={spot.id}
                                field="openingHours"
                                currentValue={spot.openingHours}
                                onSubmit={handleUserContribution}
                              />
                            )}
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
                            {spot.feeDetails.includes('Not specified') && (
                              <ContributionForm
                                spotId={spot.id}
                                field="feeDetails"
                                currentValue={spot.feeDetails}
                                onSubmit={handleUserContribution}
                              />
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
                            {spot.restrictions.includes('Standard parking') && (
                              <ContributionForm
                                spotId={spot.id}
                                field="restrictions"
                                currentValue={spot.restrictions}
                                onSubmit={handleUserContribution}
                              />
                            )}
                          </span>
                        </div>
                      </div>
                      
                      <div className="pf-detail-item">
                        <FiInfo className="icon" />
                        <div>
                          <span className="pf-detail-label">Operator:</span>
                          <span className="pf-detail-value">
                            {spot.operator}
                            {spot.operator.includes('Unknown') && (
                              <ContributionForm
                                spotId={spot.id}
                                field="operator"
                                currentValue={spot.operator}
                                onSubmit={handleUserContribution}
                              />
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="pf-detail-item">
                        <FiShield className="icon" />
                        <div>
                          <span className="pf-detail-label">Security:</span>
                          <span className="pf-detail-value">
                            {spot.security}
                            {spot.security.includes('Basic security') && (
                              <ContributionForm
                                spotId={spot.id}
                                field="security"
                                currentValue={spot.security}
                                onSubmit={handleUserContribution}
                              />
                            )}
                          </span>
                        </div>
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
                  </li>
                ))}
              </ul>
            ) : (
              !error && (
                <div className="pf-empty-state">
                  <FiMapPin className="pf-empty-icon" />
                  <p>No parking spots match your search criteria</p>
                  <button 
                    onClick={resetFilters}
                    className="pf-empty-action"
                  >
                    Reset filters
                  </button>
                </div>
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
            <div className="pf-spot-details-panel">
              <button 
                className="pf-close-details"
                onClick={() => setSelectedSpot(null)}
              >
                <FiX />
              </button>
              
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
                    {selectedSpot.openingHours.includes('assumed)') && (
                      <div className="pf-contribution-container">
                        <ContributionForm
                          spotId={selectedSpot.id}
                          field="openingHours"
                          currentValue={selectedSpot.openingHours}
                          onSubmit={handleUserContribution}
                        />
                      </div>
                    )}
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
                      {selectedSpot.feeDetails.includes('Not specified') && (
                        <ContributionForm
                          spotId={selectedSpot.id}
                          field="feeDetails"
                          currentValue={selectedSpot.feeDetails}
                          onSubmit={handleUserContribution}
                        />
                      )}
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
                    {selectedSpot.restrictions.includes('Standard parking') && (
                      <ContributionForm
                        spotId={selectedSpot.id}
                        field="restrictions"
                        currentValue={selectedSpot.restrictions}
                        onSubmit={handleUserContribution}
                      />
                    )}
                    
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
                        {selectedSpot.operator.includes('Unknown') && (
                          <ContributionForm
                            spotId={selectedSpot.id}
                            field="operator"
                            currentValue={selectedSpot.operator}
                            onSubmit={handleUserContribution}
                          />
                        )}
                      </span>
                    </div>
                    
                    <div className="pf-info-item">
                      <span className="pf-info-label">Accessibility:</span>
                      <span className="pf-info-value">
                        {selectedSpot.accessibility}
                        {selectedSpot.accessibility.includes('not specified') && (
                          <ContributionForm
                            spotId={selectedSpot.id}
                            field="accessibility"
                            currentValue={selectedSpot.accessibility}
                            onSubmit={handleUserContribution}
                          />
                        )}
                      </span>
                    </div>
                    
                    <div className="pf-info-item">
                      <span className="pf-info-label">Security:</span>
                      <span className="pf-info-value">
                        {selectedSpot.security}
                        {selectedSpot.security.includes('Basic security') && (
                          <ContributionForm
                            spotId={selectedSpot.id}
                            field="security"
                            currentValue={selectedSpot.security}
                            onSubmit={handleUserContribution}
                          />
                        )}
                      </span>
                    </div>
                    
                    <div className="pf-info-item">
                      <span className="pf-info-label">Capacity:</span>
                      <span className="pf-info-value">
                        {selectedSpot.capacity}
                        {selectedSpot.capacity.includes('not specified') && (
                          <ContributionForm
                            spotId={selectedSpot.id}
                            field="capacity"
                            currentValue={selectedSpot.capacity}
                            onSubmit={handleUserContribution}
                          />
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedSpot.website ? (
                <a 
                  href={selectedSpot.website.startsWith('http') ? selectedSpot.website : `https://${selectedSpot.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="pf-details-link"
                >
                  <FiExternalLink /> Visit official website for latest information
                </a>
              ) : (
                <div className="pf-no-website">
                  <p>No website available for this location</p>
                  <ContributionForm
                    spotId={selectedSpot.id}
                    field="website"
                    currentValue=""
                    onSubmit={handleUserContribution}
                  />
                </div>
              )}
            </div>
          )}
        </section>
      </main>
      
      <footer className="pf-footer">
        <p>Parking data © {new Date().getFullYear()} HERE Technologies</p>
        <p className="pf-footer-note">
          By using this service, you agree to HERE's{' '}
          <a href="https://legal.here.com/terms" target="_blank" rel="noopener noreferrer">Terms of Use</a> and{' '}
          <a href="https://legal.here.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
          Information is provided as-is. Always check official sources for the latest parking information.
        </p>
      </footer>
    </div>
  );
};

export default ParkingFinder;